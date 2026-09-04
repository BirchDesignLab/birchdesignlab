/**
 * Render exactly one asset, with a contact sheet, for review before it ships.
 *
 * Deliberately separate from render/loops.mjs: this one is for answering a
 * question ("does 2.5x time compression look frantic?"), so it keeps its frames,
 * always emits a contact sheet, and writes to out/review/ rather than out/.
 *
 *   node scripts/render-one.mjs --variant A --framing SQ --seconds 8 --time-scale 2.5
 *   node scripts/render-one.mjs --variant A --framing SQ --seconds 10 --dissolve 0.4
 */
import { mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { capture } from '../lib/capture.mjs';
import { encode } from '../lib/encode.mjs';
import { contactSheet, evenIndices } from '../lib/contact.mjs';
import { lumaDelta, psnr } from '../lib/ffmpeg.mjs';
import { frameName } from '../lib/frames.mjs';
import { verifyFile } from '../lib/verify.mjs';
import { requireDevServer } from '../lib/devserver.mjs';
import { resolveRow } from '../render/framing.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SOCIAL_DIR = path.resolve(HERE, '..');
const REVIEW = path.join(SOCIAL_DIR, 'out', 'review');

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};

const VARIANT = arg('variant', 'A').toUpperCase();
const FRAMING = arg('framing', 'SQ').toUpperCase();
const SECONDS = Number(arg('seconds', '8'));
const TIME_SCALE = Number(arg('time-scale', '1'));
const DISSOLVE = Number(arg('dissolve', '0'));
const FPS = 30;
const SETTLE = Number(arg('settle', TIME_SCALE >= 1.2 ? '17' : '60'));
const TAG = arg('tag', `V007-${VARIANT}-${FRAMING}-${SECONDS}s-ts${TIME_SCALE}${DISSOLVE ? `-x${DISSOLVE}` : ''}`);

async function main() {
  await requireDevServer();

  const row = resolveRow({
    id: 'REVIEW', variant: VARIANT, kind: 'harness', framing: FRAMING,
    fps: FPS, seconds: SECONDS, settle: SETTLE, loop: true,
  });

  const framesDir = path.join(REVIEW, `${TAG}-frames`);
  const outFile = path.join(REVIEW, `${TAG}.mp4`);
  const sheetFile = path.join(REVIEW, `${TAG}-contact.png`);

  await mkdir(REVIEW, { recursive: true });

  console.log(`${TAG}`);
  console.log(`  ${row.viewport.width}x${row.viewport.height} @ dSF ${row.deviceScaleFactor} -> ${row.output.width}x${row.output.height}`);
  console.log(`  ${SECONDS}s video = ${(SECONDS * TIME_SCALE).toFixed(2)}s scene time = ` +
    `${((SECONDS * TIME_SCALE) / 20).toFixed(3)} breaths, settle ${SETTLE}\n`);

  const shot = await capture({
    url: row.url,
    viewport: row.viewport,
    deviceScaleFactor: row.deviceScaleFactor,
    fps: FPS,
    timeScale: TIME_SCALE,
    seconds: SECONDS,
    settleFrames: SETTLE,
    framesDir,
    readyFlag: row.readyFlag ?? undefined,
    stageFn: row.stageFn ?? undefined,
    readyTimeoutMs: 60_000,
    loop: true,
    onFrame:
      VARIANT === 'C'
        ? async (page, i, total) => { await page.evaluate((f) => globalThis.__BDL_ORBIT?.(f), i / total); }
        : undefined,
    onProgress: (i, t) => process.stdout.write(`\r  frame ${i}/${t}`),
  });
  process.stdout.write('\r                        \r');

  // --- seam, measured two ways -------------------------------------------
  const f0 = path.join(framesDir, frameName(0));
  const f1 = path.join(framesDir, frameName(1));
  const fN = path.join(framesDir, frameName(shot.frameCount));

  const seamPsnr = await psnr(fN, f0);
  const seamDelta = await lumaDelta(fN, f0);
  const baseDelta = await lumaDelta(f0, f1);

  console.log('  seam (frame N vs frame 0):');
  console.log(`    PSNR        ${seamPsnr === Infinity ? 'identical' : `${seamPsnr.toFixed(2)}dB`}`);
  // Mean, not peak: the breath moves a large dim area, the fireflies move a few
  // very bright pixels. PSNR is dominated by the second and nearly blind to the
  // first, which is exactly backwards for judging whether a loop closes.
  console.log(`    mean delta  ${seamDelta.avg.toFixed(4)}  (one ordinary frame step: ${baseDelta.avg.toFixed(4)})`);
  console.log(`    ratio       ${(seamDelta.avg / baseDelta.avg).toFixed(2)}x a normal frame step\n`);

  const enc = await encode({
    framesDir,
    frameCount: shot.frameCount,
    outFile,
    fps: FPS,
    loop: true,
    size: row.output,
    dissolveSeconds: DISSOLVE,
  });

  const verified = await verifyFile(outFile, {
    expectSeconds: SECONDS, fps: FPS, loop: true, framing: FRAMING,
  });

  console.log(`  encoded ${(enc.bytes / 1024 / 1024).toFixed(2)} MB, ${enc.frames} frames` +
    (DISSOLVE ? `, ${DISSOLVE}s cross-dissolve` : ''));
  for (const c of verified.checks.filter((c) => !c.pass)) console.log(`    FAIL ${c.name}: ${c.detail}`);

  // Contact sheet across the whole loop, so motion is judgeable on paper.
  await contactSheet({
    framesDir,
    indices: evenIndices(shot.frameCount, 8),
    outFile: sheetFile,
    cellWidth: 360,
    columns: 4,
  });

  console.log(`\n  video:   ${path.relative(SOCIAL_DIR, outFile)}`);
  console.log(`  contact: ${path.relative(SOCIAL_DIR, sheetFile)}`);
  console.log(`  frames kept in ${path.relative(SOCIAL_DIR, framesDir)}`);
}

await main();
