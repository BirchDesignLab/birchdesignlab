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
 *     [--viewports desktop,mobile] [--schemes dark] [--label motion] \
 *     [--crop switcher|header] [--show-prompt]
 * Output: scripts/themes/.out/<label>/<school>__<scenario>__<scheme>__<viewport>.png
 * plus manifest.json.
 *
 * --crop (added 09-23-26 for Tier 3 stage 1): film the same scenario but lay
 * out only one element's box, measured before the trigger, so a reviewer can
 * see whether the thing that should hold still did. `switcher` is the
 * portal's <bdl-switcher>; `header` is the page's first <header>. The file
 * name gains `__crop-<name>`.
 *
 * With --crop switcher each strip is also judged for holding still
 * (portal.md P1): the bar's buttons are measured before the trigger and again
 * after the film, and every filmed frame must show the bar as it was before
 * (in the before place) or as it ends (in the after place), within JPEG
 * noise. Anything between (scaled, tilted, blurred, ghosted, sliced, gone)
 * fails. The verdict and the worst frame go in the manifest (`holdStill`) and
 * the console, and a failure is a problem. The pixel rule is
 * lib/hold-still.mjs, proven by lib/hold-still.selftest.mjs.
 *
 * The switcher's first-load prompt is marked dismissed before any page script
 * runs, so it never sits in a strip; --show-prompt keeps it.
 *
 * manifest.json merges with the one already in the --label folder: a strip
 * filmed again replaces its old entry (and that entry's problems), and every
 * other entry stays, so a run can be topped up one school at a time.
 */
import { chromium } from 'playwright';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VIEWPORTS } from './capture.mjs';
import { toPixels, judgeHoldStill } from './lib/hold-still.mjs';

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
const showPrompt = process.argv.includes('--show-prompt');
/* The switcher's width follows its label ("Quiet" to "Grandmillennial"), so its
   crop is padded sideways enough to keep a longer label in frame. */
const CROPS = {
  switcher: { sel: 'bdl-switcher', padX: 90, padY: 10 },
  header: { sel: 'header', padX: 0, padY: 8 },
};
const crop = arg('crop', '');
if (crop && !CROPS[crop]) {
  console.error(`unknown --crop ${crop}; use ${Object.keys(CROPS).join(' or ')}`);
  process.exit(1);
}
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
/* The strip being filmed, so a page error lands on the strip it spoiled. */
let strip = null;
function problem(message) {
  problems.push(message);
  strip?.problems.push(message);
}

/** Film `ms` of the page after `trigger()`, returning frames with their time
    since the trigger. The screencast only emits a frame when the page
    repaints, so a still page yields few frames and a moving one many. */
async function film(page, ms, trigger, settle = false) {
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
  if (settle) {
    // Keep filming until the router's transition has finished (it drops
    // data-astro-transition from <html>), so the last frame is the settled
    // page. Frames past `ms` never reach the sheet; pick() stops at `ms`.
    await page
      .waitForFunction(() => !document.documentElement.hasAttribute('data-astro-transition'), null, { timeout: 3000 })
      .catch(() => {});
    await page.waitForTimeout(150);
  }
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

/** `box` (CSS px, optional) crops every frame to one element; `vpWidth` maps
    CSS px onto the screencast's frame pixels, which need not match. */
async function sheet(frames, file, cols, cellW, box = null, vpWidth = 0) {
  const images = await Promise.all(frames.map((f) => loadImage(Buffer.from(f.data, 'base64'))));
  const k = box ? images[0].width / vpWidth : 1;
  const src = box
    ? { x: box.x * k, y: box.y * k, w: box.w * k, h: box.h * k }
    : { x: 0, y: 0, w: images[0].width, h: images[0].height };
  const cellH = Math.round((src.h / src.w) * cellW);
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
    ctx.drawImage(img, src.x, src.y, src.w, src.h, x, y, cellW, cellH);
    ctx.fillStyle = '#e8e6e1';
    const ms = frames[i].ms;
    ctx.fillText(ms < 0 ? 'before' : `+${ms} ms`, x, y + cellH + CAP / 2);
  });
  await writeFile(file, await canvas.encode('png'));
}

/** The switcher bar's box and its buttons' boxes, in CSS px, from inside its
    shadow root. The buttons leave out the bar's translucent border and the
    1px seams between them, which show the page underneath. */
function measureSwitcher(page) {
  return page.evaluate(() => {
    const bar = document.querySelector('bdl-switcher')?.shadowRoot?.querySelector('.bar');
    if (!bar) return null;
    const box = (el) => {
      const r = el.getBoundingClientRect();
      return { x: r.left, y: r.top, w: r.width, h: r.height };
    };
    return { bar: box(bar), buttons: [...bar.children].map(box).filter((b) => b.w && b.h) };
  });
}

async function decode(frame) {
  const img = await loadImage(Buffer.from(frame.data, 'base64'));
  const ctx = createCanvas(img.width, img.height).getContext('2d');
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, img.width, img.height);
}

/** Did the bar show only its before or its after picture in every frame?
    The first filmed frame is the last one before the trigger (film() keeps
    it); the last is the settled page. */
async function holdStill(frames, before, after, vpWidth) {
  const imgs = await Promise.all(frames.map(decode));
  const k = imgs[0].width / vpWidth;
  const refs = [
    { img: imgs[0], boxes: toPixels(before.buttons, k) },
    { img: imgs[imgs.length - 1], boxes: toPixels(after.buttons, k) },
  ];
  const verdict = judgeHoldStill(frames.map((f, i) => ({ ms: f.ms, img: imgs[i] })), refs);
  return { ...verdict, bar: { before: before.bar, after: after.bar }, framesJudged: frames.length };
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
    if (!showPrompt) {
      await context.addInitScript(() => {
        try { sessionStorage.setItem('bdl-portal-prompt', 'dismissed'); } catch {}
      });
    }
    await context.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
    const page = await context.newPage();
    page.on('pageerror', (e) => problem(`${page.url()} pageerror: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') problem(`${page.url()} console: ${m.text()}`); });

    for (const id of schools) {
      for (const scenario of scenarios) {
        const plan = PLAN[scenario];
        if (!plan) throw new Error(`unknown scenario ${scenario}`);
        const start = scenario === 'arrive' ? '/t/quiet/' : `/t/${id}/`;
        strip = { problems: [] };
        await page.goto(base + start, { waitUntil: 'networkidle' });
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(600);
        // The crop box is measured on the page before the trigger, padded,
        // and clamped to the viewport.
        let box = null;
        if (crop) {
          box = await page.evaluate(
            ([{ sel, padX, padY }, w, h]) => {
              const r = document.querySelector(sel)?.getBoundingClientRect();
              if (!r || !r.width || !r.height) return null;
              const x = Math.max(0, r.left - padX);
              const y = Math.max(0, r.top - padY);
              return { x, y, w: Math.min(w, r.right + padX) - x, h: Math.min(h, r.bottom + padY) - y };
            },
            [CROPS[crop], vp.width, vp.height],
          );
          if (!box) {
            problem(`${id} ${scenario} ${vpName}: no ${CROPS[crop].sel} to crop to`);
            continue;
          }
        }
        const still0 = crop === 'switcher' ? await measureSwitcher(page) : null;
        const frames = await film(page, plan.ms, async () => {
          if (scenario === 'arrive') await followLink(page, `/t/${id}/`);
          else if (scenario === 'page') await followLink(page, `/t/${id}/about/`);
        }, crop === 'switcher');
        const still1 = crop === 'switcher' ? await measureSwitcher(page) : null;
        // A strip whose navigation never landed would pass for a real
        // transition, so it is written under a name that says it failed.
        let failed = false;
        if (scenario !== 'fx') {
          const want = scenario === 'arrive' ? `/t/${id}/` : `/t/${id}/about/`;
          if (new URL(page.url()).pathname !== want) {
            failed = true;
            problem(`${id} ${scenario} ${vpName}: ended on ${page.url()}, wanted ${want}`);
          }
        }
        if (frames.length < 2) {
          problem(`${id} ${scenario} ${vpName}: only ${frames.length} frame(s), nothing moved`);
          if (!frames.length) continue;
        }
        const file = `${id}__${scenario}__${scheme}__${vpName}${crop ? `__crop-${crop}` : ''}${failed ? '__FAILED' : ''}.png`;
        const mobile = !!vp.mobile;
        const picked = pick(frames, plan.frames, plan.ms);
        if (box) await sheet(picked, join(outDir, file), 2, Math.min(720, Math.round(box.w * (mobile ? 2 : 1))), box, vp.width);
        else await sheet(picked, join(outDir, file), mobile ? 8 : 4, mobile ? 220 : 480);
        let still = null;
        if (crop === 'switcher') {
          if (!still0?.buttons.length || !still1?.buttons.length) {
            problem(`${id} ${scenario} ${scheme} ${vpName}: could not measure the switcher's buttons`);
          } else {
            still = await holdStill(frames, still0, still1, vp.width);
            const pct = (still.worst.score * 100).toFixed(1);
            if (!still.stable) problem(`${id} ${scenario} ${scheme} ${vpName}: switcher moved, worst at +${still.worst.ms} ms (${pct}% of a button off)`);
          }
        }
        made.push({
          school: id, scenario, scheme, viewport: vpName, crop: crop || null, file, framesFilmed: frames.length, failed,
          ...(still ? { holdStill: still } : {}),
          problems: strip.problems,
        });
        const verdict = still
          ? `  switcher ${still.stable ? 'held still' : `MOVED at +${still.worst.ms} ms`} (worst ${(still.worst.score * 100).toFixed(1)}%)`
          : '';
        console.log(`${file}  (${frames.length} frames filmed)${verdict}`);
      }
    }
    await context.close();
  }
}
await browser.close();

/* Merge with the manifest already in this folder: a strip filmed again
   replaces its old entry, keyed by file name with any __FAILED suffix
   ignored (so a strip that now lands replaces the one that did not), and
   takes that entry's problems with it. Everything else is kept. */
const stripKey = (file) => file.replace('__FAILED.png', '.png');
let prior = {};
try {
  prior = JSON.parse(await readFile(join(outDir, 'manifest.json'), 'utf8'));
} catch {
  /* first run into this folder */
}
const refilmed = new Set(made.map((m) => stripKey(m.file)));
const priorMade = prior.made ?? [];
const kept = priorMade.filter((m) => !refilmed.has(stripKey(m.file)));
// Problems no strip owns (a run-level failure, or a manifest from before
// strips carried their own) are kept as they were.
const owned = new Set(priorMade.flatMap((m) => m.problems ?? []));
const unowned = (prior.problems ?? []).filter((p) => !owned.has(p));
const allMade = [...kept, ...made];
const allProblems = [...new Set([...unowned, ...kept.flatMap((m) => m.problems ?? []), ...problems])];
await writeFile(join(outDir, 'manifest.json'), JSON.stringify({ base, made: allMade, problems: allProblems }, null, 2));
console.log(`${made.length} strips -> ${outDir} (manifest now lists ${allMade.length})`);
if (problems.length) {
  console.log(`${problems.length} problems:`);
  for (const p of problems) console.log(`  ${p}`);
  process.exitCode = 2;
}
