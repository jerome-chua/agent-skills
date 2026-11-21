#!/usr/bin/env node
// Replay one side's flow (before or after) in a headless browser and record it.
//
// Usage:
//   node record.mjs --side before --url http://localhost:4101 --dir <run dir> \
//     [--flow <run dir>/flow.before.mjs] [--steps <run dir>/steps.json] \
//     [--login <module.mjs>] [--viewport 1280x720] [--settle-ms 700]
//
// Writes <run dir>/<side>.webm and <run dir>/<side>.timings.json.
// Exit code 1 means a step failed; the timings file names the step and the error.
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { loadPlaywright, parseViewport, runCommand } from './lib.mjs';

const { values: options } = parseArgs({
  options: {
    side: { type: 'string' },
    url: { type: 'string' },
    dir: { type: 'string' },
    flow: { type: 'string' },
    steps: { type: 'string' },
    login: { type: 'string' },
    viewport: { type: 'string', default: '1280x720' },
    'settle-ms': { type: 'string', default: '700' },
  },
});

if (!['before', 'after'].includes(options.side) || !options.url || !options.dir) {
  console.error('Required: --side before|after --url <base URL> --dir <run dir>');
  process.exit(2);
}

const runDirectory = path.resolve(options.dir);
const side = options.side;
const flowPath = path.resolve(options.flow ?? path.join(runDirectory, `flow.${side}.mjs`));
const stepsPath = path.resolve(options.steps ?? path.join(runDirectory, 'steps.json'));
const viewport = parseViewport(options.viewport);
const settleMilliseconds = Number(options['settle-ms']);

/** Runs in the page. Draws a dot that follows the mouse, because videos do not show the cursor. */
function drawCursorInPage() {
  const attachCursor = () => {
    if (document.getElementById('before-after-cursor')) return;
    const cursorDot = document.createElement('div');
    cursorDot.id = 'before-after-cursor';
    cursorDot.style.cssText = [
      'position:fixed', 'left:-12px', 'top:-12px', 'width:24px', 'height:24px',
      'border-radius:50%', 'background:rgba(255,64,64,.55)', 'border:2px solid #fff',
      'box-shadow:0 0 6px rgba(0,0,0,.5)', 'pointer-events:none', 'z-index:2147483647',
      'opacity:0', 'transition:width .12s,height .12s,left .12s,top .12s',
    ].join(';');
    document.documentElement.appendChild(cursorDot);
    const setPressed = (isPressed) => {
      const size = isPressed ? 14 : 24;
      cursorDot.style.width = cursorDot.style.height = `${size}px`;
      cursorDot.style.left = cursorDot.style.top = `${-size / 2}px`;
    };
    window.addEventListener('mousemove', (mouseEvent) => {
      cursorDot.style.opacity = '1';
      cursorDot.style.transform = `translate(${mouseEvent.clientX}px, ${mouseEvent.clientY}px)`;
    }, true);
    window.addEventListener('mousedown', () => setPressed(true), true);
    window.addEventListener('mouseup', () => setPressed(false), true);
  };
  if (document.documentElement) attachCursor();
  else document.addEventListener('DOMContentLoaded', attachCursor);
}

const FRAMES_PER_SECOND = 25;

/**
 * The video's clock does not start when the page is created; it starts at the first frame the
 * browser paints, some unknown time later. To line the two clocks up, the page flashes magenta
 * then green before the flow starts. We note our clock at the switch, then find the same switch
 * in the finished video.
 */
async function showSyncMarker(page, elapsedMilliseconds) {
  await page.setContent('<body style="margin:0;background:#ff00ff"></body>');
  await page.waitForTimeout(400);
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        document.body.style.background = '#00ff00';
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      }),
  );
  const markerClockMs = elapsedMilliseconds();
  await page.waitForTimeout(300);
  await page.goto('about:blank');
  return markerClockMs;
}

/** Returns the video time, in milliseconds, of the first green frame after a magenta one. */
async function findSyncMarkerInVideo(videoPath) {
  const centrePixels = await runCommand(
    'ffmpeg',
    ['-loglevel', 'error', '-i', videoPath, '-vf', `fps=${FRAMES_PER_SECOND},crop=32:32,scale=1:1`,
      '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'],
    { binary: true },
  );
  let sawMagenta = false;
  for (let frameIndex = 0; frameIndex * 3 < centrePixels.length; frameIndex += 1) {
    const [red, green, blue] = centrePixels.subarray(frameIndex * 3, frameIndex * 3 + 3);
    if (red > 170 && green < 100 && blue > 170) sawMagenta = true;
    else if (sawMagenta && green > 170 && red < 100 && blue < 100) {
      return (frameIndex * 1000) / FRAMES_PER_SECOND;
    }
  }
  return null;
}

async function importDefault(modulePath) {
  const loadedModule = await import(pathToFileURL(modulePath).href);
  return loadedModule.default ?? loadedModule.steps ?? loadedModule;
}

const stepList = JSON.parse(await readFile(stepsPath, 'utf8'));
const stepActions = await importDefault(flowPath);
const unknownActions = Object.keys(stepActions).filter(
  (actionId) => !stepList.some((step) => step.id === actionId),
);
if (unknownActions.length > 0) {
  console.error(`${flowPath} has actions for ids not in steps.json: ${unknownActions.join(', ')}`);
  process.exit(2);
}

const { chromium } = loadPlaywright();
const rawVideoDirectory = path.join(runDirectory, `.raw-${side}`);
await mkdir(rawVideoDirectory, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  baseURL: options.url,
  viewport,
  recordVideo: { dir: rawVideoDirectory, size: viewport },
});
await context.addInitScript(drawCursorInPage);

// Time zero of our own clock. The sync marker later converts it to the video's clock.
const recordingStartedAt = Date.now();
const page = await context.newPage();
const elapsedMilliseconds = () => Date.now() - recordingStartedAt;
const flowContext = { baseURL: options.url, side };

const timings = { side, url: options.url, viewport, steps: [] };
let markerClockMs = null;
try {
  markerClockMs = await showSyncMarker(page, elapsedMilliseconds);
  if (options.login) {
    const logIn = await importDefault(path.resolve(options.login));
    await logIn(page, flowContext);
  }
  for (const step of stepList) {
    const runStep = stepActions[step.id];
    if (!runStep) {
      // This side cannot do the step. The stitcher holds the frame shown at this moment.
      timings.steps.push({ id: step.id, skipped: true, atMs: elapsedMilliseconds() });
      continue;
    }
    const startMs = elapsedMilliseconds();
    try {
      await runStep(page, flowContext);
    } catch (stepError) {
      timings.failedStep = step.id;
      timings.error = String(stepError?.stack ?? stepError);
      await page
        .screenshot({ path: path.join(runDirectory, `${side}.failure.png`) })
        .catch(() => {});
      break;
    }
    await page.waitForTimeout(settleMilliseconds);
    timings.steps.push({ id: step.id, startMs, endMs: elapsedMilliseconds() });
  }
} catch (setupError) {
  timings.failedStep = '(login)';
  timings.error = String(setupError?.stack ?? setupError);
} finally {
  const video = page.video();
  await context.close(); // Closing the context is what finishes the video file.
  await browser.close();
  const videoPath = path.join(runDirectory, `${side}.webm`);
  await rename(await video.path(), videoPath);
  await rm(rawVideoDirectory, { recursive: true, force: true });
  timings.videoFile = path.basename(videoPath);

  // Convert every time from our clock to the video's clock.
  const markerVideoMs = markerClockMs === null ? null : await findSyncMarkerInVideo(videoPath);
  if (markerVideoMs === null) {
    timings.syncWarning = 'Sync marker not found in the video; step cuts may be off by up to a second.';
    console.warn(`[${side}] ${timings.syncWarning}`);
  }
  const clockAheadOfVideoMs = markerVideoMs === null ? 0 : markerClockMs - markerVideoMs;
  timings.clockAheadOfVideoMs = Math.round(clockAheadOfVideoMs);
  const toVideoMs = (clockMs) => Math.max(0, Math.round(clockMs - clockAheadOfVideoMs));
  timings.steps = timings.steps.map((stepTiming) =>
    stepTiming.skipped
      ? { ...stepTiming, atMs: toVideoMs(stepTiming.atMs) }
      : { ...stepTiming, startMs: toVideoMs(stepTiming.startMs), endMs: toVideoMs(stepTiming.endMs) },
  );
  await writeFile(
    path.join(runDirectory, `${side}.timings.json`),
    JSON.stringify(timings, null, 2) + '\n',
  );
}

if (timings.error) {
  console.error(`[${side}] step "${timings.failedStep}" failed:\n${timings.error}`);
  console.error(`[${side}] screenshot: ${path.join(runDirectory, `${side}.failure.png`)}`);
  process.exit(1);
}
console.log(`[${side}] recorded ${timings.steps.length} steps -> ${timings.videoFile}`);
