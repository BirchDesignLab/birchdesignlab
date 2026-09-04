/**
 * Candidate framings for review, as stills — not clips.
 *
 * Variant B is "close-up or low angle, moss in the foreground, one firefly
 * crossing frame". That is a description, not a camera position, and picking
 * the position is the founder's call. So render several and let them choose.
 *
 * Variant C is "exactly one slow orbit per loop". How slow is also a call, so
 * render the candidate speeds as contact sheets across a whole loop.
 *
 *   node scripts/render-candidates.mjs --variant B
 *   node scripts/render-candidates.mjs --variant C
 */
import { mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { capture } from '../lib/capture.mjs';
import { contactSheet, evenIndices } from '../lib/contact.mjs';
import { run } from '../lib/ffmpeg.mjs';
import { frameName } from '../lib/frames.mjs';
import { requireDevServer, harnessUrl } from '../lib/devserver.mjs';
import { CAPTURE, CLIP_S, FPS, OUTPUT, TIME_SCALE, settleFramesFor } from '../render/framing.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SOCIAL_DIR = path.resolve(HERE, '..');
const REVIEW = path.join(SOCIAL_DIR, 'out', 'review');

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const VARIANT = arg('variant', 'B').toUpperCase();
const FRAMING = arg('framing', 'SQ').toUpperCase();

/**
 * Four angles, varying height and distance independently so the two axes can be
 * judged apart rather than as one blur. Yaw is nudged with them: turning the
 * mark slightly presents the mossy edge of a stroke to camera instead of its
 * flat face, which is what actually puts moss in the foreground.
 */
const B_CANDIDATES = [
  { id: 'B1', yaw: 0.40, pitch: -0.24, zoom: 4,  note: 'mild low angle, moderate close' },
  { id: 'B2', yaw: 0.55, pitch: -0.42, zoom: 6,  note: 'lower, closer (the current default)' },
  { id: 'B3', yaw: 0.75, pitch: -0.30, zoom: 9,  note: 'tight crop, mark turned further' },
  { id: 'B4', yaw: 0.30, pitch: -0.58, zoom: 5,  note: 'near the 35deg tilt limit, raking up' },
];

/** Two orbit speeds. One revolution per loop, and a half. */
const C_CANDIDATES = [
  { id: 'C3', turns: 0, sweep: 0.70, note: 'sweep +-40deg and back; never edge-on, closes on yaw' },
  { id: 'C4', turns: 0, sweep: 0.45, note: 'sweep +-26deg and back; gentler' },
];

const out = OUTPUT[FRAMING];

async function shoot(c, { seconds, keep }) {
  const framesDir = path.join(REVIEW, `cand-${c.id}-frames`);
  const params = { variant: VARIANT, framing: FRAMING };
  if (VARIANT === 'B') Object.assign(params, { yaw: c.yaw, pitch: c.pitch, zoom: c.zoom });
  if (VARIANT === 'C') Object.assign(params, { turns: c.turns, sweep: c.sweep ?? 0 });

  const shot = await capture({
    url: harnessUrl('bdl-007.html', params),
    viewport: CAPTURE[FRAMING],
    deviceScaleFactor: CAPTURE.deviceScaleFactor,
    fps: FPS,
    timeScale: TIME_SCALE,
    seconds,
    settleFrames: settleFramesFor(FPS, TIME_SCALE),
    framesDir,
    readyFlag: '__BDL_MODEL',
    stageFn: '__BDL_STAGE',
    readyTimeoutMs: 60_000,
    loop: false,
    keepFrames: keep,
    onFrame:
      VARIANT === 'C'
        ? async (page, i, total) => { await page.evaluate((f) => globalThis.__BDL_ORBIT?.(f), i / total); }
        : undefined,
    onProgress: (i, t) => process.stdout.write(`\r    ${c.id} ${i}/${t}`),
  });
  process.stdout.write('\r                          \r');
  return { framesDir, shot };
}

async function main() {
  await requireDevServer();
  await mkdir(REVIEW, { recursive: true });

  if (VARIANT === 'B') {
    console.log(`variant B candidates, ${FRAMING}, one still each\n`);
    const stills = [];
    for (const c of B_CANDIDATES) {
      console.log(`  ${c.id}  yaw ${c.yaw}  pitch ${c.pitch}  zoom ${c.zoom}  — ${c.note}`);
      const { framesDir } = await shoot(c, { seconds: 1 / 30, keep: [0] });
      const still = path.join(REVIEW, `cand-${c.id}.png`);
      await run('ffmpeg', [
        '-v', 'error', '-y',
        '-i', path.join(framesDir, frameName(0)),
        '-vf', `scale=${out.width}:${out.height}:flags=lanczos`,
        still,
      ]);
      stills.push(still);
      await rm(framesDir, { recursive: true, force: true });
    }

    // Tile the four into one sheet, so they are compared rather than scrolled.
    const staging = path.join(REVIEW, '.b-staging');
    await rm(staging, { recursive: true, force: true });
    await mkdir(staging, { recursive: true });
    const { copyFile } = await import('node:fs/promises');
    for (let i = 0; i < stills.length; i++) await copyFile(stills[i], path.join(staging, frameName(i)));
    const sheet = path.join(REVIEW, `candidates-B-${FRAMING}.png`);
    await contactSheet({ framesDir: staging, indices: [0, 1, 2, 3], outFile: sheet, cellWidth: 480, columns: 2 });
    await rm(staging, { recursive: true, force: true });

    console.log(`\n  sheet: ${path.relative(SOCIAL_DIR, sheet)}`);
    console.log('  order: B1 top-left, B2 top-right, B3 bottom-left, B4 bottom-right');
    for (const s of stills) console.log(`  full:  ${path.relative(SOCIAL_DIR, s)}`);
    return;
  }

  // --- variant C -----------------------------------------------------------
  console.log(`variant C orbit speeds, ${FRAMING}, 5-frame contact sheet across one loop\n`);
  const seconds = CLIP_S;
  const total = Math.round(seconds * FPS);
  const keep = evenIndices(total, 5);

  for (const c of C_CANDIDATES) {
    console.log(`  ${c.id}  ${c.turns} turn(s) per loop — ${c.note}`);
    const { framesDir } = await shoot(c, { seconds, keep });

    // The kept frames are sparse; restage them consecutively for the tiler.
    const staging = path.join(REVIEW, `.c-${c.id}`);
    await rm(staging, { recursive: true, force: true });
    await mkdir(staging, { recursive: true });
    const { copyFile } = await import('node:fs/promises');
    for (let i = 0; i < keep.length; i++) {
      await copyFile(path.join(framesDir, frameName(keep[i])), path.join(staging, frameName(i)));
    }
    const sheet = path.join(REVIEW, `candidates-${c.id}-${FRAMING}.png`);
    await contactSheet({
      framesDir: staging,
      indices: keep.map((_, i) => i),
      outFile: sheet,
      cellWidth: 340,
      columns: 5,
    });
    await rm(staging, { recursive: true, force: true });
    await rm(framesDir, { recursive: true, force: true });
    console.log(`    ${path.relative(SOCIAL_DIR, sheet)}`);
  }
}

await main();
