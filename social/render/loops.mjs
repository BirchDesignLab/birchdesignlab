/**
 * `npm run loops` — capture, encode and report every video asset.
 *
 * Reads the founder-specified framing table in ./framing.mjs, records each row
 * through lib/capture.mjs, encodes through lib/encode.mjs, and verifies through
 * lib/verify.mjs. Nothing about a shot is decided here; this file is the runner.
 *
 *   node render/loops.mjs                 every row
 *   node render/loops.mjs --id V007       one asset, all its framings
 *   node render/loops.mjs --id V007,V007B two assets
 *   node render/loops.mjs --id V007 --framing VT
 *   node render/loops.mjs --keep-frames   leave the PNG sequences on disk
 */
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { capture } from '../lib/capture.mjs';
import { encode } from '../lib/encode.mjs';
import { seamFromFrames, verifyFile } from '../lib/verify.mjs';
import { renderReport } from '../lib/verify.mjs';
import { currentCommit, requireDevServer } from '../lib/devserver.mjs';
import { B_ANGLE, C_ORBIT, resolveAll, VARIANT_NOTES } from './framing.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SOCIAL_DIR = path.resolve(HERE, '..');
const OUT_DIR = path.join(SOCIAL_DIR, 'out');
const FRAMES_ROOT = path.join(OUT_DIR, '.frames');

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const arg = (name, fallback = null) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const ONLY_ID = arg('id');
const ONLY_FRAMING = arg('framing');
const KEEP_FRAMES = flag('keep-frames');

async function main() {
  // Loud, never silent: no dev server means no run. It does NOT fall through
  // to production — that would render a different commit than the one checked
  // out and nothing downstream would notice.
  await requireDevServer();
  const commit = await currentCommit();

  let rows = resolveAll();
  if (ONLY_ID) {
    const ids = new Set(ONLY_ID.split(',').map((x) => x.trim()));
    rows = rows.filter((r) => ids.has(r.id));
  }
  if (ONLY_FRAMING) rows = rows.filter((r) => r.framing === ONLY_FRAMING.toUpperCase());

  if (rows.length === 0) {
    console.error(`no rows matched --id ${ONLY_ID ?? '*'} --framing ${ONLY_FRAMING ?? '*'}`);
    process.exit(1);
  }

  console.log(`commit ${commit?.slice(0, 8) ?? 'unknown'} — ${rows.length} file(s) to build\n`);

  await mkdir(OUT_DIR, { recursive: true });

  // Variants B and C have no camera position until the founder picks one from
  // scripts/render-candidates.mjs. Rendering a guess and calling it a
  // deliverable is worse than not rendering: refuse, and say which is missing.
  const unchosen = rows.filter(
    (r) => (r.variant === 'B' && !B_ANGLE) || (r.variant === 'C' && !C_ORBIT)
  );
  if (unchosen.length) {
    console.error('Refusing to render, because the framing has not been chosen yet:\n');
    for (const r of unchosen) console.error(`  ${r.id}-${r.framing} (variant ${r.variant})`);
    console.error('\nRun `node scripts/render-candidates.mjs --variant B` (and `--variant C`),');
    console.error('pick one, then set B_ANGLE / C_ORBIT in render/framing.mjs.');
    process.exit(1);
  }

  const results = [];

  for (const row of rows) {
    const label = `${row.id}-${row.framing}`;
    const framesDir = path.join(FRAMES_ROOT, label);
    const outFile = path.join(OUT_DIR, row.outFile);

    console.log(`--- ${label} (variant ${row.variant}) ---`);
    console.log(`    ${VARIANT_NOTES[row.variant] ?? row.variant}`);
    console.log(
      `    ${row.viewport.width}x${row.viewport.height} @ dSF ${row.deviceScaleFactor} ` +
        `-> ${row.captureSize.width}x${row.captureSize.height} -> ${row.output.width}x${row.output.height}`
    );
    console.log(
      `    ${row.seconds}s @ ${row.fps}fps x${row.timeScale} = ${row.sceneSeconds}s scene ` +
        `(${row.breaths} breaths), ${row.settle} settle, loop=${row.loop}`
    );

    const shot = await capture({
      url: row.url,
      viewport: row.viewport,
      deviceScaleFactor: row.deviceScaleFactor,
      fps: row.fps,
      timeScale: row.timeScale,
      seconds: row.seconds,
      settleFrames: row.settle,
      framesDir,
      readyFlag: row.readyFlag ?? undefined,
      readySelector: row.readySelector ?? undefined,
      readyTimeoutMs: 60_000,
      stageFn: row.stageFn ?? undefined,
      loop: row.loop,
      // A dissolve needs a whole dissolve's worth of frames past the end of the
      // loop, not just the single probe frame.
      extraFrames: Math.max(1, row.dissolveFrames),
      // Variant C's sweep: sweep * sin(2*PI*fraction), spread across exactly the
      // frames that are kept. Its period therefore equals the loop period, so
      // the wrap is continuous in position (sin 0 = sin 2PI) and in velocity
      // (cos 0 = cos 2PI) — no direction flip at the seam.
      onFrame:
        row.variant === 'C'
          ? async (page, i, total) => {
              await page.evaluate((f) => globalThis.__BDL_ORBIT?.(f), i / total);
            }
          : undefined,
      onProgress: (i, total) => process.stdout.write(`\r    frame ${i}/${total}`),
    });
    process.stdout.write('\r');

    // Frames come off the browser at a native 2160px long edge. The encoder
    // does the downscale, so the anti-aliasing is a proper lanczos resample
    // rather than whatever the GPU's own MSAA managed.
    const enc = await encode({
      framesDir,
      frameCount: shot.frameCount,
      outFile,
      fps: row.fps,
      loop: row.loop,
      size: row.output,
      dissolveSeconds: row.dissolveSeconds,
    });

    // Seam is measured on the frames, not the mp4 — see seamFromFrames() for
    // why the mp4 answer is the encoder's, not the animation's. verifyFile is
    // therefore asked for conformance only.
    const seam = row.loop
      ? await seamFromFrames({ framesDir, frameCount: shot.frameCount, fps: row.fps })
      : null;

    const verified = await verifyFile(outFile, {
      expectSeconds: row.seconds,
      fps: row.fps,
      loop: false,
      framing: row.framing,
    });

    if (seam) {
      verified.seam = seam;
      verified.checks.push({
        name: 'loop seam (source frames)',
        pass: seam.pass,
        detail: `wrap ${seam.wrap.toFixed(4)} vs adjacent ${seam.adjacent.toFixed(4)} — ${seam.verdict}`,
      });
      verified.pass = verified.checks.every((c) => c.pass);
    }

    const failures = verified.checks.filter((c) => !c.pass);
    console.log(
      `    ${(enc.bytes / 1024 / 1024).toFixed(2)} MB, ${enc.frames} frames` +
        (enc.dissolveFrames ? `, ${enc.dissolveFrames}f dissolve` : '') +
        (seam ? `, seam ${seam.ratio.toFixed(2)}x` : '') +
        ` — ${verified.pass ? 'pass' : 'FAIL'}`
    );
    for (const f of failures) console.log(`      FAIL ${f.name}: ${f.detail}`);

    results.push(verified);
    if (!KEEP_FRAMES) await rm(framesDir, { recursive: true, force: true });
  }

  const md = [
    renderReport(results),
    '',
    '## Run context',
    '',
    `- commit: \`${commit ?? 'unknown'}\``,
    `- source: http://localhost:4321 (local dev server, never production)`,
    `- loops run at timeScale ${rows[0]?.timeScale ?? 1}: one 20s moss breath per 8s clip`,
    '',
  ];

  await writeFile(path.join(OUT_DIR, 'report.md'), md.join('\n'), 'utf8');

  const pass = results.every((r) => r.pass);
  console.log(`\n${results.filter((r) => r.pass).length}/${results.length} passed. report: out/report.md`);
  process.exit(pass ? 0 : 1);
}

await main();
