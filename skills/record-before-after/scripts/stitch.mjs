#!/usr/bin/env node
// Build the side-by-side video from the two recordings made by record.mjs.
//
// Usage:
//   node stitch.mjs --dir <run dir> --before-label main --after-label feature/x \
//     [--narrate] [--tts auto|local|openai|elevenlabs] [--font excalidraw|system|<font file>]
//     [--width 1920] [--out before-after.mp4]
//
// Reads  <run dir>/{steps.json, before.webm, before.timings.json, after.webm, after.timings.json}
// Writes <run dir>/{before-after.mp4, captions.srt}
//
// Text (labels, captions) is drawn as PNG images by the browser and laid over the video, so
// ffmpeg needs no font or subtitle libraries.
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { loadPlaywright, runCommand } from './lib.mjs';

const FRAMES_PER_SECOND = 25;
const HEADER_HEIGHT = 64;
const FOOTER_HEIGHT = 104;
const MINIMUM_STEP_SECONDS = 1.8;
const READING_SECONDS_PER_WORD = 0.33;
const NARRATION_TAIL_SECONDS = 0.4;
const HELD_FRAME_SECONDS = 0.12;

const { values: options } = parseArgs({
  options: {
    dir: { type: 'string' },
    'before-label': { type: 'string', default: 'base' },
    'after-label': { type: 'string', default: 'feature' },
    narrate: { type: 'boolean', default: false },
    tts: { type: 'string', default: 'auto' },
    font: { type: 'string', default: 'excalidraw' },
    width: { type: 'string', default: '1920' },
    out: { type: 'string', default: 'before-after.mp4' },
  },
});
if (!options.dir) {
  console.error('Required: --dir <run dir>');
  process.exit(2);
}

const runDirectory = path.resolve(options.dir);
const workDirectory = path.join(runDirectory, '.stitch');
const inRun = (fileName) => path.join(runDirectory, fileName);
const inWork = (fileName) => path.join(workDirectory, fileName);
const readJson = async (filePath) => JSON.parse(await readFile(filePath, 'utf8'));
const seconds = (value) => value.toFixed(3);

// ---------------------------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------------------------

async function probeDurationSeconds(mediaPath) {
  const output = await runCommand('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mediaPath,
  ]);
  const duration = Number(output.trim());
  if (!Number.isFinite(duration)) throw new Error(`Could not read the duration of ${mediaPath}`);
  return duration;
}

async function loadSide(side, stepList) {
  const timings = await readJson(inRun(`${side}.timings.json`));
  if (timings.error) {
    throw new Error(`The ${side} recording failed at step "${timings.failedStep}". Record it again.`);
  }
  const videoPath = inRun(timings.videoFile);
  const videoSeconds = await probeDurationSeconds(videoPath);
  const timingById = new Map(timings.steps.map((stepTiming) => [stepTiming.id, stepTiming]));
  const segments = stepList.map((step) => {
    const stepTiming = timingById.get(step.id);
    if (!stepTiming) throw new Error(`${side}.timings.json has no entry for step "${step.id}"`);
    // Keep every cut inside the video, so a segment is never empty.
    const latestStart = Math.max(0, videoSeconds - HELD_FRAME_SECONDS);
    if (stepTiming.skipped) {
      const startSeconds = Math.min(Math.max(0, stepTiming.atMs / 1000 - HELD_FRAME_SECONDS), latestStart);
      return { skipped: true, startSeconds, endSeconds: startSeconds + HELD_FRAME_SECONDS, actionSeconds: 0 };
    }
    const startSeconds = Math.min(stepTiming.startMs / 1000, latestStart);
    const endSeconds = Math.max(stepTiming.endMs / 1000, startSeconds + HELD_FRAME_SECONDS);
    return { skipped: false, startSeconds, endSeconds, actionSeconds: endSeconds - startSeconds };
  });
  return { side, videoPath, viewport: timings.viewport, segments };
}

// ---------------------------------------------------------------------------------------------
// Narration (optional)
// ---------------------------------------------------------------------------------------------

function chooseVoiceProvider() {
  if (options.tts !== 'auto') return options.tts;
  if (process.env.OPENAI_API_KEY) return 'openai';
  if (process.env.ELEVENLABS_API_KEY) return 'elevenlabs';
  return 'local';
}

async function fetchSpeech(url, headers, body, audioPath) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${url} answered ${response.status}: ${await response.text()}`);
  await writeFile(audioPath, Buffer.from(await response.arrayBuffer()));
  return audioPath;
}

const speakWith = {
  // Free and offline. macOS only.
  local: async (text, basePath) => {
    const audioPath = `${basePath}.aiff`;
    const voiceArguments = process.env.BEFORE_AFTER_SAY_VOICE ? ['-v', process.env.BEFORE_AFTER_SAY_VOICE] : [];
    await runCommand('say', [...voiceArguments, '-o', audioPath, text]);
    return audioPath;
  },
  openai: (text, basePath) =>
    fetchSpeech(
      'https://api.openai.com/v1/audio/speech',
      { authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      {
        model: process.env.BEFORE_AFTER_TTS_MODEL ?? 'gpt-4o-mini-tts',
        voice: process.env.BEFORE_AFTER_TTS_VOICE ?? 'alloy',
        input: text,
      },
      `${basePath}.mp3`,
    ),
  elevenlabs: (text, basePath) =>
    fetchSpeech(
      `https://api.elevenlabs.io/v1/text-to-speech/${process.env.BEFORE_AFTER_TTS_VOICE ?? '21m00Tcm4TlvDq8ikWAM'}`,
      { 'xi-api-key': process.env.ELEVENLABS_API_KEY },
      { text, model_id: process.env.BEFORE_AFTER_TTS_MODEL ?? 'eleven_multilingual_v2' },
      `${basePath}.mp3`,
    ),
};

/** Returns one { audioPath, audioSeconds } or null per step. */
async function synthesiseNarration(stepList) {
  if (!options.narrate) return stepList.map(() => null);
  let provider = chooseVoiceProvider();
  if (!speakWith[provider]) throw new Error(`Unknown --tts value "${provider}"`);
  console.log(`Narration voice: ${provider}`);
  const clips = [];
  for (const [stepIndex, step] of stepList.entries()) {
    const text = step.narration ?? step.caption;
    const basePath = inWork(`narration-${stepIndex}`);
    let audioPath;
    try {
      audioPath = await speakWith[provider](text, basePath);
    } catch (speechError) {
      if (provider === 'local') throw speechError;
      console.warn(`${provider} speech failed (${speechError.message}). Using the local voice instead.`);
      provider = 'local';
      audioPath = await speakWith.local(text, basePath);
    }
    clips.push({ audioPath, audioSeconds: await probeDurationSeconds(audioPath) });
  }
  return clips;
}

// ---------------------------------------------------------------------------------------------
// Text overlays, drawn by the browser
// ---------------------------------------------------------------------------------------------

const escapeHtml = (text) =>
  String(text).replace(/[&<>"']/g, (character) => `&#${character.charCodeAt(0)};`);

const SYSTEM_FONTS = "-apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";
const BUNDLED_FONTS = {
  excalidraw: fileURLToPath(new URL('../fonts/Excalifont-Regular-Latin.woff2', import.meta.url)),
};

/** CSS that sets the caption font: a bundled name, a path to a font file, or "system". */
async function buildFontStyle(fontOption) {
  if (fontOption === 'system') return `body { font-family: ${SYSTEM_FONTS}; }`;
  const fontPath = BUNDLED_FONTS[fontOption] ?? path.resolve(fontOption);
  const fontData = (await readFile(fontPath)).toString('base64');
  // Hand-drawn fonts have one weight; asking for bold would make the browser fake it.
  return `
    @font-face { font-family: 'Caption Font'; src: url(data:font/woff2;base64,${fontData}); }
    body { font-family: 'Caption Font', ${SYSTEM_FONTS}; }
    .tag, .unavailable span { font-weight: 400 !important; }
  `;
}

const OVERLAY_STYLE = `
  * { box-sizing: border-box; margin: 0; }
  html, body { background: transparent; height: 100%; }
  body { color: #fff; }
  .header { display: flex; height: 100%; background: #111418; }
  .header > div { flex: 1; display: flex; align-items: center; justify-content: center; gap: 14px; font-size: 26px; }
  .header > div + div { border-left: 2px solid #2b3038; }
  .tag { font-weight: 700; letter-spacing: .08em; font-size: 20px; padding: 4px 12px; border-radius: 6px; }
  .tag.before { background: #6b7280; } .tag.after { background: #16a34a; }
  .branch { font-family: ui-monospace, Menlo, monospace; color: #cbd5e1; }
  .caption { height: 100%; background: #111418; display: flex; align-items: center; justify-content: center; gap: 22px; padding: 0 48px; }
  .caption .count { font-size: 22px; color: #94a3b8; white-space: nowrap; }
  .caption .text { font-size: 34px; line-height: 1.2; text-align: center; }
  .unavailable { height: 100%; background: rgba(10,12,16,.55); display: flex; align-items: center; justify-content: center; }
  .unavailable span { font-size: 30px; font-weight: 600; background: #111418; border: 2px solid #475569; border-radius: 12px; padding: 16px 28px; }
`;

async function renderOverlays({ stepList, paneSize, canvasWidth, needsUnavailable }) {
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const fontStyle = await buildFontStyle(options.font);
  const renderPng = async (fileName, width, height, bodyHtml) => {
    await page.setViewportSize({ width, height });
    await page.setContent(`<style>${OVERLAY_STYLE}${fontStyle}</style>${bodyHtml}`);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: inWork(fileName), omitBackground: true });
    return inWork(fileName);
  };
  try {
    const headerPath = await renderPng('header.png', canvasWidth, HEADER_HEIGHT, `
      <div class="header">
        <div><span class="tag before">BEFORE</span><span class="branch">${escapeHtml(options['before-label'])}</span></div>
        <div><span class="tag after">AFTER</span><span class="branch">${escapeHtml(options['after-label'])}</span></div>
      </div>`);
    const captionPaths = [];
    for (const [stepIndex, step] of stepList.entries()) {
      captionPaths.push(await renderPng(`caption-${stepIndex}.png`, canvasWidth, FOOTER_HEIGHT, `
        <div class="caption">
          <span class="count">${stepIndex + 1} / ${stepList.length}</span>
          <span class="text">${escapeHtml(step.caption)}</span>
        </div>`));
    }
    const unavailablePaths = {};
    for (const side of ['before', 'after']) {
      if (!needsUnavailable[side]) continue;
      unavailablePaths[side] = await renderPng(`unavailable-${side}.png`, paneSize.width, paneSize.height,
        `<div class="unavailable"><span>Not available ${side} this change</span></div>`);
    }
    return { headerPath, captionPaths, unavailablePaths };
  } finally {
    await browser.close();
  }
}

// ---------------------------------------------------------------------------------------------
// The ffmpeg filter graph
// ---------------------------------------------------------------------------------------------

/** Cut one side into per-step segments, stretch each to the step length, and join them. */
function paneFilters({ inputIndex, name, segments, stepSeconds, paneSize }) {
  const sourceLabels = segments.map((_, stepIndex) => `[${name}src${stepIndex}]`);
  const filters = [
    `[${inputIndex}:v]fps=${FRAMES_PER_SECOND},scale=${paneSize.width}:${paneSize.height},setsar=1,` +
      `split=${segments.length}${sourceLabels.join('')}`,
  ];
  segments.forEach((segment, stepIndex) => {
    const duration = seconds(stepSeconds[stepIndex]);
    filters.push(
      `${sourceLabels[stepIndex]}trim=start=${seconds(segment.startSeconds)}:end=${seconds(segment.endSeconds)},` +
        `setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration=${duration},` +
        `trim=duration=${duration},setpts=PTS-STARTPTS[${name}seg${stepIndex}]`,
    );
  });
  const segmentLabels = segments.map((_, stepIndex) => `[${name}seg${stepIndex}]`).join('');
  filters.push(`${segmentLabels}concat=n=${segments.length}:v=1:a=0[${name}]`);
  return filters;
}

function buildFfmpegArguments({ sides, overlays, narrationClips, stepSeconds, stepStarts, paneSize, canvas, encoderArguments, outputPath }) {
  const inputArguments = [];
  let inputCount = 0;
  const addInput = (filePath) => {
    inputArguments.push('-i', filePath);
    return inputCount++;
  };

  const beforeInput = addInput(sides.before.videoPath);
  const afterInput = addInput(sides.after.videoPath);
  const filters = [
    ...paneFilters({ inputIndex: beforeInput, name: 'before', segments: sides.before.segments, stepSeconds, paneSize }),
    ...paneFilters({ inputIndex: afterInput, name: 'after', segments: sides.after.segments, stepSeconds, paneSize }),
    `[before][after]hstack=inputs=2,pad=${canvas.width}:${canvas.height}:0:${HEADER_HEIGHT}:color=0x111418[layer0]`,
  ];

  let layerCount = 0;
  const overlay = (imagePath, horizontal, vertical, window) => {
    const imageInput = addInput(imagePath);
    const enable = window
      ? `:enable='gte(t,${seconds(window.start)})*lt(t,${seconds(window.end)})'`
      : '';
    filters.push(`[layer${layerCount}][${imageInput}:v]overlay=${horizontal}:${vertical}${enable}[layer${layerCount + 1}]`);
    layerCount += 1;
  };

  overlay(overlays.headerPath, 0, 0);
  stepSeconds.forEach((duration, stepIndex) => {
    const window = { start: stepStarts[stepIndex], end: stepStarts[stepIndex] + duration };
    overlay(overlays.captionPaths[stepIndex], 0, HEADER_HEIGHT + paneSize.height, window);
    if (sides.before.segments[stepIndex].skipped) overlay(overlays.unavailablePaths.before, 0, HEADER_HEIGHT, window);
    if (sides.after.segments[stepIndex].skipped) overlay(overlays.unavailablePaths.after, paneSize.width, HEADER_HEIGHT, window);
  });
  filters.push(`[layer${layerCount}]scale=${canvas.outputWidth}:-2,format=yuv420p[video]`);

  const mapArguments = ['-map', '[video]'];
  const spokenClips = narrationClips
    .map((clip, stepIndex) => clip && { ...clip, startSeconds: stepStarts[stepIndex] })
    .filter(Boolean);
  if (spokenClips.length > 0) {
    const delayedLabels = spokenClips.map((clip, clipIndex) => {
      const audioInput = addInput(clip.audioPath);
      const delayMilliseconds = Math.round(clip.startSeconds * 1000);
      filters.push(`[${audioInput}:a]aresample=48000,adelay=${delayMilliseconds}:all=1[voice${clipIndex}]`);
      return `[voice${clipIndex}]`;
    });
    filters.push(`${delayedLabels.join('')}amix=inputs=${spokenClips.length}:normalize=0:duration=longest[audio]`);
    mapArguments.push('-map', '[audio]', '-c:a', 'aac', '-b:a', '160k');
  }

  const totalSeconds = stepSeconds.reduce((total, duration) => total + duration, 0);
  return [
    '-hide_banner', '-loglevel', 'error', '-y',
    ...inputArguments,
    '-filter_complex', filters.join(';'),
    ...mapArguments,
    ...encoderArguments,
    '-r', String(FRAMES_PER_SECOND), '-t', seconds(totalSeconds), '-movflags', '+faststart',
    outputPath,
  ];
}

async function chooseEncoderArguments() {
  const encoders = await runCommand('ffmpeg', ['-hide_banner', '-encoders']);
  if (encoders.includes('libx264')) return ['-c:v', 'libx264', '-preset', 'medium', '-crf', '20'];
  if (encoders.includes('h264_videotoolbox')) return ['-c:v', 'h264_videotoolbox', '-b:v', '6M'];
  throw new Error('This ffmpeg has no H.264 encoder (libx264 or h264_videotoolbox).');
}

// ---------------------------------------------------------------------------------------------
// Subtitles file
// ---------------------------------------------------------------------------------------------

function formatSrtTime(totalSeconds) {
  const totalMilliseconds = Math.round(totalSeconds * 1000);
  const pad = (value, length = 2) => String(value).padStart(length, '0');
  const hours = Math.floor(totalMilliseconds / 3_600_000);
  const minutes = Math.floor(totalMilliseconds / 60_000) % 60;
  const wholeSeconds = Math.floor(totalMilliseconds / 1000) % 60;
  return `${pad(hours)}:${pad(minutes)}:${pad(wholeSeconds)},${pad(totalMilliseconds % 1000, 3)}`;
}

function buildSrt(stepList, stepStarts, stepSeconds) {
  return stepList
    .map((step, stepIndex) => {
      const start = formatSrtTime(stepStarts[stepIndex]);
      const end = formatSrtTime(stepStarts[stepIndex] + stepSeconds[stepIndex]);
      return `${stepIndex + 1}\n${start} --> ${end}\n${step.caption}\n`;
    })
    .join('\n');
}

// ---------------------------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------------------------

const stepList = await readJson(inRun('steps.json'));
if (!Array.isArray(stepList) || stepList.length === 0) throw new Error('steps.json must be a non-empty list');

await rm(workDirectory, { recursive: true, force: true });
await mkdir(workDirectory, { recursive: true });

const sides = { before: await loadSide('before', stepList), after: await loadSide('after', stepList) };
const paneSize = sides.before.viewport;
if (sides.after.viewport.width !== paneSize.width || sides.after.viewport.height !== paneSize.height) {
  throw new Error('Both sides must be recorded with the same viewport.');
}
stepList.forEach((step, stepIndex) => {
  if (sides.before.segments[stepIndex].skipped && sides.after.segments[stepIndex].skipped) {
    throw new Error(`Step "${step.id}" is skipped on both sides. Remove it from steps.json.`);
  }
});

const narrationClips = await synthesiseNarration(stepList);
const stepSeconds = stepList.map((step, stepIndex) => {
  const readingSeconds = step.caption.split(/\s+/).length * READING_SECONDS_PER_WORD + 0.5;
  const narrationSeconds = narrationClips[stepIndex]
    ? narrationClips[stepIndex].audioSeconds + NARRATION_TAIL_SECONDS
    : 0;
  const longest = Math.max(
    MINIMUM_STEP_SECONDS,
    readingSeconds,
    narrationSeconds,
    sides.before.segments[stepIndex].actionSeconds,
    sides.after.segments[stepIndex].actionSeconds,
  );
  // Whole frames only, so both panes and the captions stay aligned.
  return Math.ceil(longest * FRAMES_PER_SECOND) / FRAMES_PER_SECOND;
});
const stepStarts = [];
stepSeconds.reduce((startSeconds, duration) => {
  stepStarts.push(startSeconds);
  return startSeconds + duration;
}, 0);

const canvas = {
  width: paneSize.width * 2,
  height: HEADER_HEIGHT + paneSize.height + FOOTER_HEIGHT,
  outputWidth: Math.min(Number(options.width), paneSize.width * 2),
};
const overlays = await renderOverlays({
  stepList,
  paneSize,
  canvasWidth: canvas.width,
  needsUnavailable: {
    before: sides.before.segments.some((segment) => segment.skipped),
    after: sides.after.segments.some((segment) => segment.skipped),
  },
});

const outputPath = path.resolve(runDirectory, options.out);
await runCommand('ffmpeg', buildFfmpegArguments({
  sides, overlays, narrationClips, stepSeconds, stepStarts, paneSize, canvas,
  encoderArguments: await chooseEncoderArguments(),
  outputPath,
}));
await writeFile(inRun('captions.srt'), buildSrt(stepList, stepStarts, stepSeconds));
await rm(workDirectory, { recursive: true, force: true });

const totalSeconds = stepSeconds.reduce((total, duration) => total + duration, 0);
console.log(`Wrote ${outputPath} (${totalSeconds.toFixed(1)}s, ${stepList.length} steps)`);
console.log(`Wrote ${inRun('captions.srt')}`);
