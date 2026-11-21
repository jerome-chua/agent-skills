// Shared helpers for record.mjs and stitch.mjs.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';

/** Folder that holds the Playwright install. It is outside every project on purpose. */
export function toolsDirectory() {
  return process.env.BEFORE_AFTER_TOOLS ?? path.join(os.homedir(), '.cache', 'before-after');
}

/** Load Playwright from the tools folder, not from the project under test. */
export function loadPlaywright() {
  const requireFromTools = createRequire(path.join(toolsDirectory(), 'package.json'));
  try {
    return requireFromTools('playwright');
  } catch (loadError) {
    throw new Error(
      `Playwright is not installed in ${toolsDirectory()}. Run:\n` +
        `  mkdir -p "${toolsDirectory()}" && cd "${toolsDirectory()}" && npm init -y && ` +
        `npm install playwright && npx playwright install chromium\n(${loadError.message})`,
    );
  }
}

/**
 * Run a command without a shell. Resolves with stdout (text, or a Buffer when `binary` is set),
 * rejects with stderr on a non-zero exit.
 */
export function runCommand(command, commandArguments, { binary = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArguments, { stdio: ['ignore', 'pipe', 'pipe'] });
    const outputChunks = [];
    let standardError = '';
    child.stdout.on('data', (chunk) => outputChunks.push(chunk));
    child.stderr.on('data', (chunk) => (standardError += chunk));
    child.on('error', (spawnError) =>
      reject(new Error(`Could not run ${command}: ${spawnError.message}`)),
    );
    child.on('close', (exitCode) => {
      if (exitCode !== 0) {
        reject(new Error(`${command} exited with ${exitCode}:\n${standardError.slice(-4000)}`));
        return;
      }
      const output = Buffer.concat(outputChunks);
      resolve(binary ? output : output.toString('utf8'));
    });
  });
}

/** Parse "1280x720" into { width, height }. */
export function parseViewport(viewportText) {
  const match = /^(\d+)x(\d+)$/.exec(viewportText ?? '');
  if (!match) throw new Error(`Viewport must look like 1280x720, got "${viewportText}"`);
  return { width: Number(match[1]), height: Number(match[2]) };
}
