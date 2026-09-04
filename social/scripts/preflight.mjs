/**
 * Preflight: refuse to start a render run that is going to die halfway through.
 *
 * Checks, in order of how annoying it is to discover them late:
 *   1. node >= 20.11
 *   2. ffmpeg and ffprobe on PATH (the encoder and the verifier both shell out)
 *   3. playwright installed, and a chromium browser actually downloaded
 *
 * Exits non-zero with a plain-English fix for whichever one failed.
 */
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const failures = [];
const notes = [];

// --- 1. node -------------------------------------------------------------
{
  const [major, minor] = process.versions.node.split('.').map(Number);
  const ok = major > 20 || (major === 20 && minor >= 11);
  if (!ok) failures.push(`node ${process.versions.node} is too old; need >= 20.11`);
  else notes.push(`node ${process.versions.node}`);
}

// --- 2. ffmpeg / ffprobe -------------------------------------------------
/** Run `<bin> -version` and return its first line, or null if the binary is missing. */
function probeBinary(bin) {
  const res = spawnSync(bin, ['-version'], { encoding: 'utf8', windowsHide: true });
  if (res.error || res.status !== 0) return null;
  return (res.stdout || '').split('\n')[0].trim();
}

for (const bin of ['ffmpeg', 'ffprobe']) {
  const line = probeBinary(bin);
  if (!line) {
    failures.push(
      `${bin} is not on PATH. Install ffmpeg (which ships both) and reopen the shell. ` +
        `Windows: winget install Gyan.FFmpeg`
    );
  } else {
    notes.push(line.replace(/ Copyright.*$/, ''));
  }
}

// --- 3. playwright + chromium -------------------------------------------
let chromium = null;
try {
  ({ chromium } = require('playwright'));
  notes.push(`playwright ${require('playwright/package.json').version}`);
} catch {
  failures.push('playwright is not installed. Run `npm install` inside social/.');
}

if (chromium) {
  try {
    // executablePath() throws if the browser was never downloaded.
    const exe = chromium.executablePath();
    notes.push(`chromium ${exe}`);
  } catch {
    failures.push('chromium is not downloaded. Run `npx playwright install chromium` inside social/.');
  }
}

// --- report --------------------------------------------------------------
for (const n of notes) console.log(`  ok  ${n}`);

if (failures.length) {
  console.error('\npreflight failed:');
  for (const f of failures) console.error(`  !!  ${f}`);
  process.exit(1);
}

console.log('\npreflight passed.');
