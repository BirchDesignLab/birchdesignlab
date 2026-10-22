/**
 * `node render/screens.mjs` — record the interactive screen captures.
 *
 * The real-time sibling of render/loops.mjs. loops.mjs freezes the page clock
 * and steps it by hand; these clips cannot work that way, because a view
 * transition runs on the compositor and a click is a real input event. So the
 * page runs on its own clock, a script drives it with a real mouse, and the
 * Chrome DevTools screencast films whatever the compositor presents (see
 * lib/screen-record.mjs for why the screencast and not recordVideo, and
 * scripts/measure-screen-recorders.mjs for the numbers behind that choice).
 *
 *   node render/screens.mjs --stills                    framing options, as stills
 *   node render/screens.mjs --id VP1 --framing PHONE    one clip, one framing
 *   node render/screens.mjs                             every take, both framings
 *
 *   --report        rewrite out/report.md from the clips already rendered
 *   --keep-frames   leave the 1080x1920 PNG sequences in out/.frames/screens
 *   --keep-raw      leave the raw screencast JPEGs
 *
 * Local only, as everywhere in this pipeline: there is no fallback to
 * production. The dev server (:4321) by default; BDL_BASE=http://localhost:4400
 * points it at a fresh `npm run build` of the checked-out tree served by
 * `npm run preview -- --port 4400`, for when `astro dev` will not start (see
 * lib/devserver.mjs). Run with BDL_GPU=1; the run refuses to film on SwiftShader.
 *
 * Output: out/<post date>/<ID>-<FRAMING>-VT.mp4, a contact sheet beside it, and
 * out/report.md. Both framings are rendered because the choice between them is
 * the founder's; the file name carries it.
 */
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { contactSheet, evenIndices } from '../lib/contact.mjs';
import { encode } from '../lib/encode.mjs';
import { currentCommit, DEV_ORIGIN, requireDevServer, siteUrl } from '../lib/devserver.mjs';
import { run } from '../lib/ffmpeg.mjs';
import { frameName } from '../lib/frames.mjs';
import {
  assertGpu, launch, normaliseMedia, pacing, phoneContext, rendererString, startScreencast, toFrames, useGpu,
} from '../lib/screen-record.mjs';
import { renderReport, verifyFile } from '../lib/verify.mjs';
import { readManifest } from '../scripts/manifest.mjs';
import { FRAMINGS, SAFE, SAFE_Y } from './screen-framing.mjs';
import { controller, TAKES } from './screen-takes.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SOCIAL_DIR = path.resolve(HERE, '..');
const OUT_DIR = path.join(SOCIAL_DIR, 'out');
const WORK = path.join(OUT_DIR, '.frames', 'screens');
const FPS = 30;

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);
const arg = (n, d = null) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const IDS = arg('id') ? arg('id').split(',') : null;
const FRAMING_IDS = (arg('framing') ?? 'PHONE,SHORT').toUpperCase().split(',');
for (const f of FRAMING_IDS) if (!FRAMINGS[f]) throw new Error(`unknown framing ${f}; use ${Object.keys(FRAMINGS).join(', ')}`);

/**
 * A real window of the framing's size on a real device scale factor, on the
 * GPU, with the bottom inset applied where the framing wants one. One browser
 * per framing, because the window size and scale factor are launch flags.
 */
async function openPage(framing, take, startUrl) {
  const browser = await launch({ width: framing.css.width, height: framing.css.height, dpr: framing.dpr });
  try {
  const context = await phoneContext(browser, {
    width: framing.css.width,
    height: framing.css.height,
    dpr: framing.dpr,
    scheme: take.scheme,
    native: true,
  });
  const page = await context.newPage();
  await normaliseMedia(context, page);
  if (framing.safeAreaInsetBottomPx > 0) {
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setSafeAreaInsetsOverride', {
      insets: { top: 0, left: 0, right: 0, bottom: framing.safeAreaInsetBottomPx },
    });
  }
  await page.goto(siteUrl(startUrl), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(900);
  const renderer = await rendererString(page);
  // Always asserted, whatever BDL_GPU says: a clip filmed on a software
  // rasteriser verifies cleanly and looks subtly different from the rest.
  assertGpu(renderer);
  // The window must really be the phone the framing assumes.
  const seen = await page.evaluate(() => ({ w: innerWidth, h: innerHeight, dpr: devicePixelRatio }));
  if (seen.w !== framing.css.width || seen.h !== framing.css.height || seen.dpr !== framing.dpr) {
    throw new Error(`window is ${seen.w}x${seen.h}@${seen.dpr}, wanted ${framing.css.width}x${framing.css.height}@${framing.dpr}`);
  }
  return { browser, context, page, renderer };
  } catch (err) {
    await browser.close().catch(() => {});
    throw err;
  }
}

async function recordClip(row, framingId) {
  const framing = FRAMINGS[framingId];
  const take = TAKES[row.id];
  const date = row.use[0];
  const label = `${row.id}-${framingId}`;
  const raw = path.join(WORK, `${label}.raw`);
  const frames = path.join(WORK, label);
  const outDir = path.join(OUT_DIR, date);
  const outFile = path.join(outDir, `${label}-VT.mp4`);
  const seconds = row.duration_s;

  console.log(`\n${label}: ${seconds}s, ${framing.css.width}x${framing.css.height}@${framing.dpr}`);
  const { browser, context, page, renderer } = await openPage(framing, take, take.start);
  console.log(`  renderer: ${renderer}`);

  // Native frame size: the screencast delivers device pixels when asked for them.
  const rec = await startScreencast(page, {
    dir: raw,
    width: framing.css.width * framing.dpr,
    height: framing.css.height * framing.dpr,
    quality: 92,
  });
  const t0 = Date.now() / 1000;
  const c = controller(page, t0);
  let failure = null;
  let tookS = 0;
  let shot = [];
  try {
    try {
      await take.run(c);
    } catch (err) {
      failure = err;
    }
    tookS = c.now();
    if (!failure && tookS <= seconds) {
      c.log('take ended');
      // Keep filming to the end of the slot. Whatever the page is still doing
      // (a shape falling back, a transition finishing) belongs in the clip; the
      // alternative is a recorder that stops with the take and a clip that holds
      // its last frame, which verification cannot see.
      await c.until(seconds + 0.1);
    }
  } finally {
    try {
      ({ frames: shot } = await rec.stop());
    } catch (err) {
      failure ??= err;
    }
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
  if (failure) throw new Error(`${label}: take failed at ${tookS.toFixed(2)}s: ${failure.message}\n${JSON.stringify(c.events)}`);
  if (tookS > seconds) {
    throw new Error(`${label}: the take ran ${tookS.toFixed(2)}s, past its ${seconds}s slot. Tighten the script rather than trimming the clip.\n${JSON.stringify(c.events)}`);
  }
  if (flag('keep-raw')) {
    await writeFile(path.join(raw, 'frames.json'), JSON.stringify({ t0, seconds, frames: shot.map((f) => ({ file: path.basename(f.file), at: f.at })), events: c.events }));
  }

  const frameCount = await toFrames({
    frames: shot, t0, seconds, fps: FPS, outDir: frames, filterComplex: framing.filterComplex,
  });
  const enc = await encode({ framesDir: frames, frameCount, outFile, fps: FPS, crf: 18, loop: false });
  const verify = await verifyFile(outFile, { fps: FPS, loop: false, expectSeconds: seconds, framing: 'VT' });
  const sheetFile = path.join(outDir, `${label}-VT-contact.png`);
  await contactSheet({
    framesDir: frames,
    indices: evenIndices(frameCount, 18),
    outFile: sheetFile,
    cellWidth: 300,
    columns: 9,
  });

  const times = shot.map((f) => f.at).filter((t) => t >= t0 && t <= t0 + seconds);
  const delivered = pacing(times) ?? { frames: times.length, meanMs: 0, sdMs: 0, p50Ms: 0, p95Ms: 0, maxMs: 0, over50ms: 0, over100ms: 0 };
  const stale = staleTicks(shot.map((f) => f.at), t0, seconds);

  if (!flag('keep-frames')) await rm(frames, { recursive: true, force: true });
  if (!flag('keep-raw')) await rm(raw, { recursive: true, force: true });

  console.log(`  ${path.relative(SOCIAL_DIR, outFile)}  ${(enc.bytes / 1024 / 1024).toFixed(1)} MB  ${verify.pass ? 'verified' : 'VERIFY FAILED'}`);
  return {
    label, id: row.id, framing: framingId, date, seconds, outFile, sheetFile, bytes: enc.bytes,
    verify, renderer, delivered, stale, events: c.events, tookS: +tookS.toFixed(2),
    rawFrames: shot.length,
  };
}

/** Of the 30Hz ticks across the clip, how many show a frame older than 50ms / 100ms. */
function staleTicks(times, t0, seconds) {
  let over50 = 0;
  let over100 = 0;
  let worst = 0;
  const n = Math.round(seconds * FPS);
  for (let i = 0; i < n; i++) {
    const t = t0 + i / FPS;
    let age = Infinity;
    for (let k = times.length - 1; k >= 0; k--) if (times[k] <= t) { age = t - times[k]; break; }
    if (!Number.isFinite(age)) continue;
    if (age > 0.05) over50++;
    if (age > 0.1) over100++;
    worst = Math.max(worst, age);
  }
  return { ticks: n, over50ms: over50, over100ms: over100, worstMs: Math.round(worst * 1000) };
}

/** The framing options as stills: idle, list open, list open with Instagram's zones shaded. */
async function framingStills() {
  const dir = path.join(OUT_DIR, 'framing');
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  const sheetStage = path.join(WORK, 'framing-sheet');
  await rm(sheetStage, { recursive: true, force: true });
  await mkdir(sheetStage, { recursive: true });

  let n = 0;
  const made = [];
  for (const fid of FRAMING_IDS) {
    const framing = FRAMINGS[fid];
    const frames = path.join(WORK, `framing-${fid}`);
    const { browser, context, page, renderer } = await openPage(framing, { scheme: 'dark' }, '/t/quiet/');
    console.log(`${fid}: ${renderer}`);
    const rec = await startScreencast(page, {
      dir: path.join(WORK, `framing-${fid}.raw`),
      width: framing.css.width * framing.dpr,
      height: framing.css.height * framing.dpr,
    });
    const t0 = Date.now() / 1000;
    const c = controller(page, t0);
    await c.until(0.8);
    await c.openList();
    await c.until(3.0);
    const { frames: shot } = await rec.stop();
    await context.close();
    await browser.close();
    await toFrames({ frames: shot, t0, seconds: 3.2, fps: FPS, outDir: frames, filterComplex: framing.filterComplex });

    const idle = path.join(dir, `${fid}-idle.png`);
    const list = path.join(dir, `${fid}-list.png`);
    const zones = path.join(dir, `${fid}-list-zones.png`);
    await copyFile(path.join(frames, frameName(Math.round(0.6 * FPS))), idle);
    await copyFile(path.join(frames, frameName(Math.round(3.0 * FPS))), list);
    // Instagram's own UI, shaded: the bar must sit in the clear band between.
    await run('ffmpeg', [
      '-hide_banner', '-y', '-i', list,
      '-vf',
      `drawbox=x=0:y=0:w=iw:h=${SAFE_Y.top}:color=red@0.38:t=fill,` +
        `drawbox=x=0:y=${SAFE_Y.bottom}:w=iw:h=ih-${SAFE_Y.bottom}:color=red@0.38:t=fill,` +
        `drawbox=x=0:y=${SAFE_Y.bottom}:w=iw:h=2:color=red@0.9:t=fill`,
      zones,
    ]);
    for (const f of [idle, list, zones]) await copyFile(f, path.join(sheetStage, frameName(n++)));
    made.push({ fid, framing, files: { idle, list, zones } });
    await rm(frames, { recursive: true, force: true });
    await rm(path.join(WORK, `framing-${fid}.raw`), { recursive: true, force: true });
  }
  const sheet = path.join(dir, 'framing-options.png');
  await contactSheet({
    framesDir: sheetStage,
    indices: Array.from({ length: n }, (_, i) => i),
    outFile: sheet,
    cellWidth: 360,
    columns: 3,
  });
  await rm(sheetStage, { recursive: true, force: true });
  console.log(`\nframing stills: ${path.relative(SOCIAL_DIR, dir)}`);
  return { made, sheet };
}

async function main() {
  await requireDevServer({ harness: false });
  const commit = await currentCommit();
  console.log(`commit ${commit?.slice(0, 8) ?? 'unknown'}  base ${DEV_ORIGIN}  gpu=${useGpu()}`);
  await mkdir(WORK, { recursive: true });
  if (flag('stills')) {
    await framingStills();
    return;
  }
  if (flag('report')) {
    await writeReport([], commit); // regenerate report.md from the clips already rendered
    return;
  }
  const manifest = await readManifest();
  const known = new Set((manifest.screen_captures ?? []).filter((r) => TAKES[r.id]).map((r) => r.id));
  for (const id of IDS ?? []) if (!known.has(id)) throw new Error(`--id ${id}: no scripted take with that id (have ${[...known].join(', ')})`);
  const rows = (manifest.screen_captures ?? []).filter((r) => TAKES[r.id] && (!IDS || IDS.includes(r.id)));
  if (!rows.length) throw new Error(`no scripted take matched ${IDS?.join(',') ?? '*'}`);
  const results = [];
  for (const row of rows) {
    for (const fid of FRAMING_IDS) {
      results.push(await recordClip(row, fid));
      await writeReport([results[results.length - 1]], commit); // a later failure never loses finished clips
    }
  }
  if (results.some((r) => !r.verify.pass)) {
    console.error('\nVERIFY FAILED on at least one clip; see out/report.md');
    process.exitCode = 1;
  }
}

/**
 * Results persist in out/screens-results.json, keyed by clip label, so a run of
 * one take tops up the report instead of replacing it: report.md always covers
 * every clip rendered so far.
 */
async function mergeResults(fresh) {
  const file = path.join(OUT_DIR, 'screens-results.json');
  let prior = {};
  let text = null;
  try {
    text = await readFile(file, 'utf8');
  } catch (err) {
    if (err.code !== 'ENOENT') throw err; // first run: nothing yet
  }
  // A file that exists but does not parse is an error, not a fresh start:
  // resetting it would silently drop every clip rendered so far.
  if (text !== null) prior = JSON.parse(text);
  for (const r of fresh) prior[r.label] = r;
  await writeFile(file, JSON.stringify(prior, null, 2));
  return Object.values(prior).sort((a, b) => a.date.localeCompare(b.date) || a.label.localeCompare(b.label));
}

async function writeReport(fresh, commit) {
  const results = await mergeResults(fresh);
  const notes = await readFile(path.join(HERE, 'screen-notes.md'), 'utf8');
  const mb = (n) => `${(n / 1024 / 1024).toFixed(2)} MB`;
  const md = [
    renderReport(results.map((r) => r.verify)).replace('# Social asset verification', '# Screen captures: verification'),
    '## Files',
    '',
    'Drafts for review. Nothing here has been posted. Choose a framing per clip; the other set goes.',
    '',
    '| Post date | File | Length | Size | Contact sheet |',
    '| --- | --- | --- | --- | --- |',
    ...results.map((r) =>
      `| ${r.date} | out/${r.date}/${path.basename(r.outFile)} | ${r.seconds}s | ${mb(r.bytes)} | out/${r.date}/${path.basename(r.sheetFile)} |`),
    '',
    '## Framing options',
    '',
    `Instagram covers the top ${SAFE.topPct}% (y 0 to ${SAFE_Y.top}) and the bottom ${SAFE.bottomPct}% (y ${SAFE_Y.bottom} to 1920) of a Reel. The switcher bar sits at the bottom of the viewport, so a full-bleed phone recording puts it near y 1800. Stills with the covered zones shaded: out/framing/framing-options.png.`,
    '',
    '| Option | Window | Scale | Window top | Bar bottom edge | Sides | What it costs |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    `| PHONE | ${FRAMINGS.PHONE.css.width}x${FRAMINGS.PHONE.css.height} drawn as a device on the charcoal field | ${FRAMINGS.PHONE.scale}x | y ${FRAMINGS.PHONE.screen.y} | y ${FRAMINGS.PHONE.barBottom} | ${FRAMINGS.PHONE.screen.x}px | The real phone layout, whole pages in frame, but UI text is small (about 1.4x). The bezel runs past y ${SAFE_Y.bottom}; it is decoration. |`,
    `| SHORT | ${FRAMINGS.SHORT.css.width}x${FRAMINGS.SHORT.css.height} full width on the charcoal field | ${FRAMINGS.SHORT.scale}x | y ${FRAMINGS.SHORT.screen.y} | y ${FRAMINGS.SHORT.barBottom} | ${FRAMINGS.SHORT.screen.x}px | Large legible text, but each page is cropped to its top and the school list shows two rows at a time. |`,
    '',
    '## Recording',
    '',
    `Commit ${commit ?? 'unknown'}, served from ${DEV_ORIGIN}. Real-time DevTools screencast, ${FPS}fps grid, GPU=${useGpu()}.`,
    '',
    '| Clip | Take ran | Frames delivered | Mean gap | p95 gap | Worst gap | Ticks showing a frame >50ms old | >100ms | Worst age |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...results.map((r) =>
      `| ${r.label} | ${r.tookS}s of ${r.seconds}s | ${r.delivered.frames} | ${r.delivered.meanMs}ms | ${r.delivered.p95Ms}ms | ${r.delivered.maxMs}ms | ${r.stale.over50ms} of ${r.stale.ticks} | ${r.stale.over100ms} | ${r.stale.worstMs}ms |`),
    '',
    ...results.flatMap((r) => [`### ${r.label} timeline`, '', r.events.map((e) => `- ${e.t.toFixed(2)}s  ${e.label}`).join('\n'), '']),
    notes,
  ].join('\n');
  await writeFile(path.join(OUT_DIR, 'report.md'), md, 'utf8');
  console.log(`\nreport: out/report.md`);
}

await main();
