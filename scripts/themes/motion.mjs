/**
 * Film a school's motion as timestamped frame strips a reviewer can read as
 * a still image.
 *
 * Written 09-23-26 for the theme-schools A+ pass. render.mjs captures full
 * pages under reduced motion, so the part of each school that moves (the
 * arrival view transition, the page-to-page swap with its wordmark morph, the
 * background fx) had never been looked at by anyone reviewing a school. This
 * records real composited frames over the Chrome DevTools screencast while
 * the motion runs, then lays them out on one sheet with the time since the
 * trigger under each frame.
 *
 * Scenarios, per school and viewport:
 *   arrive  on /t/quiet/, follow a link to /t/<id>/ (the school switch: the
 *           arrival transition keyed on html[data-theme='<id>']);
 *   page    on /t/<id>/, click the header's About link (the in-school swap);
 *   fx      idle on /t/<id>/ for three seconds (background motion).
 *
 * Usage (serve a build first, e.g. `npm run dev:worker` on :8787):
 *   BDL_GPU=1 node scripts/themes/motion.mjs --base http://127.0.0.1:8787 \
 *     --schools vaporwave,swiss [--scenarios arrive,page,fx] \
 *     [--viewports desktop,mobile] [--schemes dark] [--label motion]
 * Output: scripts/themes/.out/<label>/<school>__<scenario>__<scheme>__<viewport>.png
 * plus manifest.json.
 */
import { chromium } from 'playwright';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VIEWPORTS } from './capture.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}
const list = (name, fallback) => (arg(name, fallback) || '').split(',').filter(Boolean);

const base = arg('base', 'http://127.0.0.1:8787').replace(/\/$/, '');
const schools = list('schools', '');
const scenarios = list('scenarios', 'arrive,page,fx');
const viewports = list('viewports', 'desktop,mobile');
const schemes = list('schemes', 'dark');
const label = arg('label', 'motion');
if (!schools.length) {
  console.error('usage: node scripts/themes/motion.mjs --schools <id,...> [--base ...] [--scenarios arrive,page,fx]');
  process.exit(1);
}

/* How long to film after the trigger, and how many moments the sheet shows.
   A school's arrival is held to about 700 ms (README), so 1.2 s covers the
   fetch, the swap and the settle at one moment every 75 ms; fx gets a
   longer, sparser look. */
const PLAN = {
  arrive: { ms: 1200, frames: 16 },
  page: { ms: 1200, frames: 16 },
  fx: { ms: 3000, frames: 8 },
};

const useGpu = process.env.BDL_GPU === '1';
const browser = await chromium.launch({
  args: ['--hide-scrollbars', ...(useGpu ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] : [])],
});
const outDir = join(HERE, '.out', label);
await mkdir(outDir, { recursive: true });
const made = [];
const problems = [];

/** Film `ms` of the page after `trigger()`, returning frames with their time
    since the trigger. The screencast only emits a frame when the page
    repaints, so a still page yields few frames and a moving one many. */
async function film(page, ms, trigger) {
  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  let t0 = null;
  cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
    frames.push({ data, at: metadata.timestamp });
    try { await cdp.send('Page.screencastFrameAck', { sessionId }); } catch {}
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 82, everyNthFrame: 1 });
  await page.waitForTimeout(250);
  t0 = Date.now() / 1000;
  await trigger();
  await page.waitForTimeout(ms);
  await cdp.send('Page.stopScreencast');
  await cdp.detach();
  // The last frame before the trigger is the "before" picture.
  const before = frames.filter((f) => f.at < t0).slice(-1);
  const after = frames.filter((f) => f.at >= t0);
  return [...before, ...after].map((f) => ({ ...f, ms: Math.round((f.at - t0) * 1000) }));
}

/** What was on screen at `n` moments spread evenly over the filmed span: for
    each moment, the newest frame at or before it, relabelled with the moment.
    Picking by time rather than by frame index keeps a busy fx from crowding
    the sheet with frames from after the transition has settled. */
function pick(frames, n, ms) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const at = i === 0 ? -1 : Math.round((i * ms) / (n - 1));
    const shown = frames.filter((f) => f.ms <= at).pop() ?? frames[0];
    out.push({ ...shown, ms: at });
  }
  return out;
}

async function sheet(frames, file, cols, cellW) {
  const images = await Promise.all(frames.map((f) => loadImage(Buffer.from(f.data, 'base64'))));
  const cellH = Math.round((images[0].height / images[0].width) * cellW);
  const PAD = 12;
  const CAP = 26;
  const rows = Math.ceil(images.length / cols);
  const canvas = createCanvas(PAD + cols * (cellW + PAD), PAD + rows * (cellH + CAP + PAD));
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1b1b1d';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = '600 15px sans-serif';
  ctx.textBaseline = 'middle';
  images.forEach((img, i) => {
    const x = PAD + (i % cols) * (cellW + PAD);
    const y = PAD + Math.floor(i / cols) * (cellH + CAP + PAD);
    ctx.drawImage(img, x, y, cellW, cellH);
    ctx.fillStyle = '#e8e6e1';
    const ms = frames[i].ms;
    ctx.fillText(ms < 0 ? 'before' : `+${ms} ms`, x, y + cellH + CAP / 2);
  });
  await writeFile(file, await canvas.encode('png'));
}

/** Follow a link the way a visitor does, so the ClientRouter handles it. */
async function followLink(page, href) {
  const link = page.locator(`header a[href="${href}"]`).first();
  if (await link.isVisible().catch(() => false)) return link.click();
  await page.evaluate((h) => {
    const a = document.createElement('a');
    a.href = h;
    a.textContent = 'go';
    a.style.cssText = 'position:fixed;left:0;top:0;opacity:0';
    document.body.append(a);
    a.click();
  }, href);
}

for (const scheme of schemes) {
  for (const vpName of viewports) {
    const vp = VIEWPORTS[vpName];
    if (!vp) throw new Error(`unknown viewport ${vpName}`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: vp.mobile ? 2 : 1,
      isMobile: !!vp.mobile,
      hasTouch: !!vp.mobile,
      colorScheme: scheme,
      reducedMotion: 'no-preference',
    });
    await context.addInitScript((s) => {
      try { localStorage.setItem('scheme', s); } catch {}
    }, scheme);
    await context.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
    const page = await context.newPage();
    page.on('pageerror', (e) => problems.push(`${page.url()} pageerror: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') problems.push(`${page.url()} console: ${m.text()}`); });

    for (const id of schools) {
      for (const scenario of scenarios) {
        const plan = PLAN[scenario];
        if (!plan) throw new Error(`unknown scenario ${scenario}`);
        const start = scenario === 'arrive' ? '/t/quiet/' : `/t/${id}/`;
        await page.goto(base + start, { waitUntil: 'networkidle' });
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(600);
        const frames = await film(page, plan.ms, async () => {
          if (scenario === 'arrive') await followLink(page, `/t/${id}/`);
          else if (scenario === 'page') await followLink(page, `/t/${id}/about/`);
        });
        // A strip whose navigation never landed would pass for a real
        // transition, so it is written under a name that says it failed.
        let failed = false;
        if (scenario !== 'fx') {
          const want = scenario === 'arrive' ? `/t/${id}/` : `/t/${id}/about/`;
          if (new URL(page.url()).pathname !== want) {
            failed = true;
            problems.push(`${id} ${scenario} ${vpName}: ended on ${page.url()}, wanted ${want}`);
          }
        }
        if (frames.length < 2) {
          problems.push(`${id} ${scenario} ${vpName}: only ${frames.length} frame(s), nothing moved`);
          if (!frames.length) continue;
        }
        const file = `${id}__${scenario}__${scheme}__${vpName}${failed ? '__FAILED' : ''}.png`;
        const mobile = !!vp.mobile;
        await sheet(pick(frames, plan.frames, plan.ms), join(outDir, file), mobile ? 8 : 4, mobile ? 220 : 480);
        made.push({ school: id, scenario, scheme, viewport: vpName, file, framesFilmed: frames.length, failed });
        console.log(`${file}  (${frames.length} frames filmed)`);
      }
    }
    await context.close();
  }
}
await browser.close();
await writeFile(join(outDir, 'manifest.json'), JSON.stringify({ base, made, problems }, null, 2));
console.log(`${made.length} strips -> ${outDir}`);
if (problems.length) {
  console.log(`${problems.length} problems:`);
  for (const p of problems) console.log(`  ${p}`);
  process.exitCode = 2;
}
