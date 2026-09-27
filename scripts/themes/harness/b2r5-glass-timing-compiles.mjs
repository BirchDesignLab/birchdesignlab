/**
 * For a saved Chrome trace of a glass arrival (b2r5-glass-timing-ab.mjs
 * --keep-traces): every Skia shader_compile on the GPU main thread between
 * the trigger and the first presented frames, with the Skia op or raster
 * call that enclosed it, and where the compositor's frames landed. Answers
 * "what kinds of paint needed a new GPU program" per build.
 *
 * Written 09-26-26, Tier 3 Stage 3 B2 round 5, seat glass-timing (read-only).
 * Usage: node scripts/themes/harness/b2r5-glass-timing-compiles.mjs <trace.json> [...]
 */
import { readFile } from 'node:fs/promises';

for (const file of process.argv.slice(2)) {
  const raw = JSON.parse(await readFile(file, 'utf8'));
  const events = raw.traceEvents || raw;
  const tn = new Map();
  for (const e of events) if (e.ph === 'M' && e.name === 'thread_name') tn.set(`${e.pid}:${e.tid}`, e.args.name);
  const trig = events.filter((e) => e.name === 'bdl:trigger').sort((p, q) => p.ts - q.ts).pop();
  const ready = events.filter((e) => e.name === 'bdl:vt-ready' && e.ts > trig.ts).sort((p, q) => p.ts - q.ts)[0];
  const t0 = trig.ts;
  const rel = (t) => Math.round((t - t0) / 1000);
  const x = events.filter((e) => e.ph === 'X' && typeof e.dur === 'number');
  const gpuMain = x.filter((e) => tn.get(`${e.pid}:${e.tid}`) === 'CrGpuMain' && e.ts > t0 && e.ts < t0 + 1.2e6);
  const compiles = gpuMain.filter((e) => e.name === 'shader_compile');
  console.log(`\n== ${file.split(/[\\/]/).pop()}  ready +${ready ? rel(ready.ts) : '?'}  compiles ${compiles.length} (${Math.round(compiles.reduce((s, e) => s + e.dur, 0) / 1000)} ms)`);
  const byOp = {};
  for (const c of compiles) {
    const enclosing = gpuMain.filter((e) => e !== c && e.ts <= c.ts && e.ts + e.dur >= c.ts + c.dur && !/RunTask|ThreadController|shader_compile|GrGLProgramBuilder|Scheduler|CommandBuffer|GpuChannel|Decoder|flush|Flush|onFlush|executeOpsTask|OpsTask|GrDrawingManager|GrOpFlushState|Surface|Receive mojo/i.test(e.name));
    enclosing.sort((p, q) => p.dur - q.dur);
    const op = (enclosing.find((e) => /Op$|Op::|draw|Draw|copy|Copy|blur|Blur|Filter|Mask/i.test(e.name)) || enclosing[0] || { name: '?' }).name.slice(0, 70);
    byOp[op] ??= { n: 0, ms: 0, at: [] };
    byOp[op].n++;
    byOp[op].ms += c.dur / 1000;
    byOp[op].at.push(rel(c.ts));
  }
  for (const [op, v] of Object.entries(byOp).sort((p, q) => q[1].ms - p[1].ms)) console.log(`  ${String(v.n).padStart(3)} ${String(Math.round(v.ms)).padStart(4)} ms  ${op}  @${v.at.join(',')}`);
  const raster = gpuMain.filter((e) => /RasterDecoderImpl::DoEndRasterCHROMIUM|DoRasterCHROMIUM$/.test(e.name));
  console.log(`  raster calls (EndRaster) at: ${raster.filter((e) => e.name.includes('End')).map((e) => `${rel(e.ts)}(${Math.round(e.dur / 1000)})`).join(' ')}`);
  const viz = x.filter((e) => tn.get(`${e.pid}:${e.tid}`) === 'VizCompositorThread' && e.name === 'Display::DrawAndSwap' && e.ts > t0 - 50000 && e.ts < t0 + 1e6);
  console.log(`  presented at: ${viz.map((e) => rel(e.ts + e.dur)).join(' ')}`);
  const act = x.filter((e) => /ActivateSyncTree|LayerTreeHostImpl::ActivateSyncTree|NotifyReadyToActivate|ReadyToActivate/.test(e.name) && e.ts > t0 && e.ts < t0 + 1e6);
  console.log(`  activations/ready-to-activate: ${act.map((e) => `${e.name.replace('LayerTreeHostImpl::', '')}@${rel(e.ts)}`).join(' ')}`);
}
