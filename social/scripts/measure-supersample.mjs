/**
 * Does rendering at 1440 CSS move the framing?
 *
 * The problem: stage.ts caps the renderer at
 * `setPixelRatio(Math.min(window.devicePixelRatio, 1.5))`. So overriding
 * devicePixelRatio alone cannot get past 1.5x CSS — at a 1080 viewport the
 * WebGL buffer is 1620px however high dSF goes, and Playwright's dSF 2 just
 * upscales that to 2160 in the compositor before the encoder scales it back.
 * Net: a 1.5x supersample wearing a 2x costume.
 *
 * The way to a real 2x is SIZE, not ratio: a 1440 CSS viewport at dPR 1.5 gives
 * a 2160px buffer natively, which downscales to 1080 as a true 2x.
 *
 * The risk: the scene measures itself in CSS pixels (canvas.getBoundingClientRect,
 * window.innerHeight, camera.aspect from clientWidth/clientHeight). Those are all
 * ratios, so the framing SHOULD be identical — but "should" is not a measurement.
 * This renders the same frame both ways, downscales both to 1080, and diffs.
 *
 *   node scripts/measure-supersample.mjs [--variant A] [--framing SQ]
 */
import { mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { capture } from '../lib/capture.mjs';
import { lumaDelta, psnr, run } from '../lib/ffmpeg.mjs';
import { frameName } from '../lib/frames.mjs';
import { requireDevServer, harnessUrl } from '../lib/devserver.mjs';
import { OUTPUT } from '../render/framing.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SOCIAL_DIR = path.resolve(HERE, '..');
const WORK = path.join(SOCIAL_DIR, 'out', '.supersample');

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const VARIANT = arg('variant', 'A').toUpperCase();
const FRAMING = arg('framing', 'SQ').toUpperCase();
const FRAMES = 3;

const out = OUTPUT[FRAMING];
const LONG_EDGE = Math.max(out.width, out.height);
// 1440 on the long edge, keeping the output aspect exactly.
const scaleTo1440 = (n) => Math.round((n * 1440) / LONG_EDGE);

const CASES = [
  {
    name: 'current',
    label: `${out.width}x${out.height} CSS @ dSF 2`,
    viewport: { width: out.width, height: out.height },
    deviceScaleFactor: 2,
    // renderer caps at 1.5, so the real buffer is 1.5x CSS and the compositor
    // stretches it to the 2x screenshot.
    effectiveBuffer: `${Math.round(out.width * 1.5)}x${Math.round(out.height * 1.5)}`,
  },
  {
    name: 'true2x',
    label: `${scaleTo1440(out.width)}x${scaleTo1440(out.height)} CSS @ dSF 1.5`,
    viewport: { width: scaleTo1440(out.width), height: scaleTo1440(out.height) },
    deviceScaleFactor: 1.5,
    effectiveBuffer: `${Math.round(scaleTo1440(out.width) * 1.5)}x${Math.round(scaleTo1440(out.height) * 1.5)}`,
  },
];

async function shoot(c) {
  const framesDir = path.join(WORK, c.name);
  await capture({
    url: harnessUrl('bdl-007.html', { variant: VARIANT, framing: FRAMING }),
    viewport: c.viewport,
    deviceScaleFactor: c.deviceScaleFactor,
    fps: 30,
    seconds: FRAMES / 30,
    settleFrames: 17,
    framesDir,
    readyFlag: '__BDL_MODEL',
    stageFn: '__BDL_STAGE',
    readyTimeoutMs: 60_000,
    loop: false,
  });

  // Both cases land on the same delivery size before anything is compared.
  const norm = path.join(WORK, `${c.name}-1080.png`);
  await run('ffmpeg', [
    '-v', 'error', '-y',
    '-i', path.join(framesDir, frameName(0)),
    '-vf', `scale=${out.width}:${out.height}:flags=lanczos`,
    norm,
  ]);
  return norm;
}

async function main() {
  await requireDevServer();
  await rm(WORK, { recursive: true, force: true });
  await mkdir(WORK, { recursive: true });

  console.log(`supersample comparison: variant ${VARIANT}, ${FRAMING}, both normalised to ${out.width}x${out.height}\n`);
  for (const c of CASES) {
    console.log(`  ${c.name.padEnd(8)} ${c.label.padEnd(26)} WebGL buffer ~${c.effectiveBuffer}`);
  }
  console.log('');

  const a = await shoot(CASES[0]);
  const b = await shoot(CASES[1]);

  const p = await psnr(a, b);
  const { max, avg } = await lumaDelta(a, b);

  // An amplified difference, so a framing shift is visible rather than inferred.
  const diff = path.join(WORK, 'difference-amplified.png');
  await run('ffmpeg', [
    '-v', 'error', '-y', '-i', a, '-i', b,
    '-filter_complex', 'blend=all_mode=difference,format=gray,lutyuv=y=clip(val*14\\,0\\,255)',
    diff,
  ]);

  console.log('  difference between the two, at delivery size:');
  console.log(`    PSNR        ${p === Infinity ? 'identical' : `${p.toFixed(2)}dB`}`);
  console.log(`    mean delta  ${avg.toFixed(4)}`);
  console.log(`    peak delta  ${max.toFixed(0)}`);
  console.log('');

  // A framing shift moves edges, which shows up as a large mean over the whole
  // silhouette. Pure resampling differences are low-mean and concentrated on
  // high-contrast edges only.
  if (avg < 0.35) {
    console.log('  VERDICT: framing did NOT move. The difference is resampling detail only.');
    console.log('           Safe to adopt the 1440 CSS / dPR 1.5 path for a true 2x.');
  } else {
    console.log('  VERDICT: framing MOVED. Something derives from CSS pixels, not ratios.');
    console.log('           Stay at the current 1.5x supersample; sharper is not worth a different crop.');
  }
  console.log(`\n  amplified difference: ${path.relative(SOCIAL_DIR, diff)}`);
}

await main();
