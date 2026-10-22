/**
 * Browser-free proof that toFrames() puts timestamped frames on the right ticks.
 *
 * Three solid frames stamped at 0s (red), 1s (green) and 4s (blue) on a 6s,
 * 30fps clip must read: red for ticks 0-29, green for 30-119, blue for 120-179.
 * Run `npm run selftest:toframes`. Exits non-zero on any wrong tick.
 */
import { mkdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { run } from '../lib/ffmpeg.mjs';
import { toFrames } from '../lib/screen-record.mjs';
import { frameName } from '../lib/frames.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'out', '.selftest-toframes');
await rm(ROOT, { recursive: true, force: true });
await mkdir(ROOT, { recursive: true });

const colours = { red: 'red', green: '0x00ff00', blue: 'blue' };
const stamps = [['red', 0], ['green', 1], ['blue', 4]];
const t0 = 1_000_000;
const frames = [];
for (const [name, at] of stamps) {
  const file = path.join(ROOT, `${name}.jpg`);
  await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', `color=c=${colours[name]}:s=64x64`, '-frames:v', '1', file]);
  frames.push({ file, at: t0 + at });
}
const out = path.join(ROOT, 'frames');
const n = await toFrames({ frames, t0, seconds: 6, fps: 30, outDir: out });

async function dominant(i) {
  const png = path.join(ROOT, `probe-${i}.raw`);
  await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', path.join(out, frameName(i)), '-vf', 'scale=1:1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', png]);
  const [r, g, b] = await readFile(png);
  return r > 200 && g < 60 ? 'red' : g > 200 && r < 60 ? 'green' : b > 200 && r < 60 ? 'blue' : `?${r},${g},${b}`;
}

const expect = (i) => (i < 30 ? 'red' : i < 120 ? 'green' : 'blue');
let bad = 0;
for (const i of [0, 15, 29, 30, 31, 60, 119, 120, 121, 179]) {
  const got = await dominant(i);
  const ok = got === expect(i);
  if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} tick ${String(i).padStart(3)}  want ${expect(i)}  got ${got}`);
}
console.log(`${n} frames written`);

// Dense: a real take delivers ~50 frames a second, each a few ms from the next.
// 300 frames at 20ms, grey level rising with the frame, so a tick that shows the
// wrong moment shows the wrong grey.
const dense = [];
const denseDir = path.join(ROOT, 'dense');
await mkdir(denseDir, { recursive: true });
const levels = 60; // distinct greys, held in runs of 5 frames
for (let l = 0; l < levels; l++) {
  const file = path.join(denseDir, `g${l}.jpg`);
  const v = Math.round((l * 255) / (levels - 1)).toString(16).padStart(2, '0');
  await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', `color=c=0x${v}${v}${v}:s=64x64`, '-frames:v', '1', file]);
  for (let k = 0; k < 5; k++) dense.push({ file, at: t0 + (l * 5 + k) * 0.02 });
}
const denseOut = path.join(ROOT, 'dense-frames');
await toFrames({ frames: dense, t0, seconds: 6, fps: 30, outDir: denseOut });
for (const i of [0, 45, 90, 135, 179]) {
  const raw = path.join(ROOT, `dense-${i}.raw`);
  await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', path.join(denseOut, frameName(i)), '-vf', 'scale=1:1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', raw]);
  const got = (await readFile(raw))[0];
  const wantLevel = Math.floor((i / 30) / 0.02 / 5);
  const want = Math.round((wantLevel * 255) / (levels - 1));
  const ok = Math.abs(got - want) <= 6;
  if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} dense tick ${String(i).padStart(3)}  want grey ~${want}  got ${got}`);
}
process.exit(bad ? 1 : 0);
