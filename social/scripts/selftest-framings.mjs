/**
 * Browser-free proof that every framing's filter graph yields a full clip.
 *
 * A solid frame, stamped once, resampled for 3.2s through each framing in
 * render/screen-framing.mjs: it must come out as 96 frames of 1080x1920, not
 * fewer. A filter graph that ends its stream early (an overlay with
 * shortest=1 against a finite input does) shortens the clip silently.
 * Usage: node scripts/selftest-framings.mjs
 */
import { mkdir, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { probe, run } from '../lib/ffmpeg.mjs';
import { frameName } from '../lib/frames.mjs';
import { toFrames } from '../lib/screen-record.mjs';
import { FRAMINGS, OUTPUT } from '../render/screen-framing.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'out', '.selftest-framings');
await rm(ROOT, { recursive: true, force: true });
await mkdir(ROOT, { recursive: true });

let bad = 0;
for (const f of Object.values(FRAMINGS)) {
  const src = path.join(ROOT, `${f.id}.jpg`);
  await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', `color=c=red:s=${f.css.width * f.dpr}x${f.css.height * f.dpr}`, '-frames:v', '1', src]);
  const out = path.join(ROOT, f.id);
  const want = Math.round(3.2 * 30);
  await toFrames({ frames: [{ file: src, at: 100 }], t0: 100, seconds: 3.2, outDir: out, filterComplex: f.filterComplex });
  const got = (await readdir(out)).filter((n) => n.endsWith('.png')).length;
  const last = path.join(out, frameName(want - 1));
  let dims = 'missing';
  try {
    const s = (await probe(last)).streams[0];
    dims = `${s.width}x${s.height}`;
  } catch {}
  const ok = got === want && dims === `${OUTPUT.width}x${OUTPUT.height}`;
  if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${f.id.padEnd(6)} ${got}/${want} frames, last frame ${dims}`);
}
process.exit(bad ? 1 : 0);
