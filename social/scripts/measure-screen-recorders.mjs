/**
 * Which real-time recorder gives steadier frames: the DevTools screencast, or
 * Playwright's recordVideo? Measured on one clip, because the choice decides
 * whether UI text is legible at 1080 wide and whether a view transition arrives
 * as motion or as a few frames.
 *
 * The clip: the portal on a 390x844 phone at dPR 3, two school changes through
 * the switcher with real clicks, 3s between them. Same script, same page state,
 * same GPU, once per backend.
 *
 * Reports, per backend:
 *   native    the frame size the backend actually delivers (not what was asked)
 *   pacing    interval statistics between delivered frames, and how many gaps
 *             exceed 50 / 100ms
 *   during    the same, but only across the ~1s after each school change, where
 *             a recorder that cannot keep up shows itself
 *   at30      what is on screen at each 30Hz tick: how many ticks hold a frame
 *             older than 50ms
 *
 * Usage (dev server up, BDL_GPU=1):  node scripts/measure-screen-recorders.mjs
 * Output: out/.measure-recorders/ (stills from each backend, results.json)
 */
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { run, probe } from '../lib/ffmpeg.mjs';
import { requireDevServer, siteUrl } from '../lib/devserver.mjs';
import {
  assertGpu, jpegSize, launch, normaliseMedia, pacing, phoneContext, rendererString, startScreencast,
} from '../lib/screen-record.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, '..', 'out', '.measure-recorders');
const W = 390;
const H = 844;
const DPR = 3;

await requireDevServer();
await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
const browser = await launch();

/** The take: open the school list, pick a school, rest, twice. Returns trigger times. */
async function take(page) {
  const triggers = [];
  for (const id of ['bauhaus', 'vaporwave']) {
    await page.waitForTimeout(1200);
    const open = await page.evaluateHandle(() => document.querySelector('bdl-switcher').shadowRoot.querySelector('.open'));
    await open.asElement().click();
    await page.waitForTimeout(700);
    const row = await page.evaluateHandle((sid) => document.querySelector('bdl-switcher').shadowRoot.querySelector(`a[data-school="${sid}"]`), id);
    triggers.push(Date.now() / 1000);
    await row.asElement().click();
    await page.waitForTimeout(2200);
  }
  return triggers;
}

async function openPage(context) {
  const page = await context.newPage();
  await normaliseMedia(context, page);
  await page.goto(siteUrl('/t/quiet/'), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);
  return page;
}

const result = { viewport: `${W}x${H}@${DPR}`, backends: {} };

// --- backend 1: screencast -------------------------------------------------
{
  const context = await phoneContext(browser, { width: W, height: H, dpr: DPR });
  const page = await openPage(context);
  result.renderer = await rendererString(page);
  assertGpu(result.renderer);
  const rec = await startScreencast(page, { dir: path.join(OUT, 'screencast'), width: W * DPR, height: H * DPR });
  const t0 = Date.now() / 1000;
  const triggers = await take(page);
  const { frames, endAt } = await rec.stop();
  const first = await readFile(frames[Math.floor(frames.length / 2)].file);
  const times = frames.map((f) => f.at);
  result.backends.screencast = {
    native: jpegSize(first),
    clipSeconds: +(endAt - t0).toFixed(2),
    pacing: pacing(times),
    during: duringTransitions(times, triggers),
    at30: at30(times, t0, endAt),
  };
  await context.close();
}

// --- backend 2: recordVideo ------------------------------------------------
{
  const dir = path.join(OUT, 'recordvideo');
  const context = await phoneContext(browser, {
    width: W, height: H, dpr: DPR,
    recordVideo: { dir, size: { width: W * DPR, height: H * DPR } },
  });
  const page = await openPage(context);
  const t0 = Date.now() / 1000;
  const triggers = await take(page);
  const endAt = Date.now() / 1000;
  const video = page.video();
  await context.close();
  const file = await video.path();
  const info = await probe(file);
  const v = info.streams.find((s) => s.codec_type === 'video');
  // Per-frame presentation times straight from the container.
  const { stdout } = await run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'frame=pts_time', '-of', 'csv=p=0', file]);
  const times = stdout.trim().split('\n').map(Number).filter(Number.isFinite);
  const vt0 = 0; // recordVideo's clock starts when the page opened, not at t0
  const offset = (t0 - (endAt - (times[times.length - 1] ?? 0))); // aligns clip start to video time
  result.backends.recordVideo = {
    native: { width: v.width, height: v.height },
    codec: `${v.codec_name} ${v.avg_frame_rate}`,
    clipSeconds: +(endAt - t0).toFixed(2),
    pacing: pacing(times),
    during: duringTransitions(times.map((t) => t + (endAt - (times[times.length - 1] ?? 0))), triggers),
    at30: at30(times.map((t) => t + (endAt - (times[times.length - 1] ?? 0))), t0, endAt),
    _alignedBy: +offset.toFixed(3),
  };
  void vt0;
}

await browser.close();

/** Intervals between frames in the second after each trigger. */
function duringTransitions(times, triggers) {
  const inside = times.filter((t) => triggers.some((g) => t >= g && t <= g + 1.0));
  return pacing(inside);
}

/** At each 30Hz tick, how old is the frame being shown? */
function at30(times, t0, endAt) {
  let stale = 0;
  let n = 0;
  let worst = 0;
  for (let t = t0; t < endAt; t += 1 / 30) {
    let age = Infinity;
    for (let i = times.length - 1; i >= 0; i--) if (times[i] <= t) { age = t - times[i]; break; }
    n++;
    if (age > 0.05) stale++;
    if (Number.isFinite(age)) worst = Math.max(worst, age);
  }
  return { ticks: n, staleOver50ms: stale, worstAgeMs: +(worst * 1000).toFixed(1) };
}

await writeFile(path.join(OUT, 'results.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
