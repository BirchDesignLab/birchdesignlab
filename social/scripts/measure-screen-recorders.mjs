/**
 * Which real-time recorder gives steadier, sharper frames? Measured on one clip,
 * because the choice decides whether UI text is legible at 1080 wide and whether
 * a view transition arrives as motion or as a few frames.
 *
 * The clip: the portal on a 390x844 phone at dPR 3, two school changes through
 * the switcher with real clicks and a rest after each. Same script, same GPU,
 * once per backend:
 *
 *   screencast-emulated  DevTools screencast, Playwright's emulated dPR 3
 *   screencast-native    DevTools screencast, a real window at a real dPR 3
 *   recordVideo          Playwright's recordVideo, asked for 1170x2532
 *
 * Reports, per backend:
 *   frame     the size a frame really has (a recordVideo canvas can be 1170x2532
 *             with the picture in one corner at 1x)
 *   pacing    interval statistics between delivered frames over the whole take
 *   inTransition   the longest gap between frames, and gaps over 50ms, measured
 *             separately inside the second after each school change (a recorder
 *             that cannot keep up shows itself there); static stretches are not
 *             held against a backend, because a page that does not repaint has
 *             nothing to deliver
 *
 * Usage:  BDL_BASE=http://localhost:4400 BDL_GPU=1 node scripts/measure-screen-recorders.mjs
 * Output: out/.measure-recorders/results.json plus a frame from each backend.
 */
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { probe, run } from '../lib/ffmpeg.mjs';
import { DEV_ORIGIN, requireDevServer, siteUrl } from '../lib/devserver.mjs';
import {
  assertGpu, jpegSize, launch, normaliseMedia, pacing, phoneContext, rendererString, startScreencast,
} from '../lib/screen-record.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, '..', 'out', '.measure-recorders');
const W = 390;
const H = 844;
const DPR = 3;

await requireDevServer({ harness: false });
await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

/** The take: open the school list, pick a school, rest, twice. Returns trigger times (epoch s). */
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

/** Gap statistics inside the second after each trigger, windows kept apart. */
function inTransition(times, triggers) {
  let worst = 0;
  let over50 = 0;
  let frames = 0;
  for (const g of triggers) {
    const inside = times.filter((t) => t >= g && t <= g + 1.0);
    frames += inside.length;
    for (let i = 1; i < inside.length; i++) {
      const gap = (inside[i] - inside[i - 1]) * 1000;
      worst = Math.max(worst, gap);
      if (gap > 50) over50++;
    }
  }
  return { framesInWindows: frames, worstGapMs: +worst.toFixed(1), gapsOver50ms: over50 };
}

const result = { phone: `${W}x${H}@${DPR}`, base: DEV_ORIGIN, backends: {} };

async function screencastBackend(name, native) {
  const browser = await launch(native ? { width: W, height: H, dpr: DPR } : null);
  const context = await phoneContext(browser, { width: W, height: H, dpr: DPR, native });
  const page = await openPage(context);
  result.renderer ??= await rendererString(page);
  assertGpu(result.renderer);
  const rec = await startScreencast(page, { dir: path.join(OUT, name), width: W * DPR, height: H * DPR });
  const t0 = Date.now() / 1000;
  const triggers = await take(page);
  const { frames } = await rec.stop();
  const times = frames.map((f) => f.at);
  const jpg = await readFile(frames[Math.floor(frames.length / 2)].file);
  result.backends[name] = {
    frame: jpegSize(jpg),
    clipSeconds: +(Date.now() / 1000 - t0).toFixed(2),
    pacing: pacing(times),
    inTransition: inTransition(times, triggers),
  };
  await context.close();
  await browser.close();
}

await screencastBackend('screencast-emulated', false);
await screencastBackend('screencast-native', true);

{ // recordVideo
  const dir = path.join(OUT, 'recordvideo');
  const browser = await launch();
  const context = await phoneContext(browser, {
    width: W, height: H, dpr: DPR,
    recordVideo: { dir, size: { width: W * DPR, height: H * DPR } },
  });
  const page = await openPage(context);
  // recordVideo's clock starts when the page is created; the take starts later.
  const pageOpenedAt = Date.now() / 1000;
  const triggers = await take(page);
  const video = page.video();
  await context.close();
  await browser.close();
  const file = await video.path();
  const info = await probe(file);
  const v = info.streams.find((s) => s.codec_type === 'video');
  const { stdout } = await run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'frame=pts_time', '-of', 'csv=p=0', file]);
  const times = stdout.trim().split('\n').map(Number).filter(Number.isFinite);
  // The video starts roughly when the context did, a second or two before the
  // take; align its last frame to the take's end so windows land on the right frames.
  const takeEnd = Date.now() / 1000;
  const shift = takeEnd - times[times.length - 1];
  const aligned = times.map((t) => t + shift);
  result.backends.recordVideo = {
    canvas: { width: v.width, height: v.height },
    codec: `${v.codec_name} ${v.avg_frame_rate}`,
    pacing: pacing(times),
    inTransition: inTransition(aligned, triggers),
    note: 'constant 25fps; the 390x844 picture sits in the corner of the canvas at 1x (see rv.png)',
  };
  void pageOpenedAt;
  await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-ss', '3', '-i', file, '-frames:v', '1', path.join(OUT, 'rv.png')]);
}

await writeFile(path.join(OUT, 'results.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
