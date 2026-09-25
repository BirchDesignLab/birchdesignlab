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
 *     [--crop switcher|header|wordmark] [--dense] [--from <school>] \
 *     [--show-prompt] [--unname-switcher]
 * Output: scripts/themes/.out/<label>/<school>__<scenario>[__from-<school>]__<scheme>__<viewport>[__crop-<name>].png
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
 * --unname-switcher is the hold-still check's negative control: the switcher
 * loses its view-transition name (set to none on the element, so no special
 * build is needed) and rides the root snapshot like the rest of the page.
 * Every school whose arrival moves the root should then FAIL hold-still;
 * one that still passes has shown the check cannot see its motion. Film it
 * under its own --label.
 *
 * manifest.json merges with the one already in the --label folder: a strip
 * filmed again replaces its old entry (and that entry's problems), and every
 * other entry stays, so a run can be topped up one school at a time.
 *
 * Added 09-23-26 for Tier 3 stage 2 (the P5 wordmark proof):
 *
 * --from <school>: the arrive scenario starts on /t/<school>/ instead of
 * /t/quiet/, and its file name gains `__from-<school>` after the scenario
 * (without --from, names are exactly as before). The target may be quiet
 * (`--schools quiet --from cottagecore` films arriving at quiet). A school
 * never arrives from itself. page and fx ignore it.
 *
 * --crop wordmark: the crop is the union of the old wordmark's box (the
 * element whose computed view-transition-name is `wordmark`, measured on the
 * departing page before the trigger) and the new one's (measured on the
 * arriving page once the film settles), padded by the difference in their
 * sizes so a morph between them, or an image drawn at its own size inside
 * the morphing box, stays in frame. For page, Home's wordmark and About's.
 *
 * Dense frames (always with --crop wordmark; --dense for any crop or full
 * frame): the sheet shows every screencast frame from the trigger until the
 * transition's `finished` resolves plus 100 ms, not 16 evenly spaced picks,
 * each labelled with its time since the trigger, in as many rows as it
 * takes. Nothing is dropped. The screencast itself only sends a frame when
 * the page repaints and waits for each acknowledgement, so the manifest
 * records the longest gap between frames. Dense films are encoded at JPEG
 * 92 so a small wordmark stays legible; everything else stays at 82 (the
 * hold-still thresholds are measured at 82).
 *
 * The wordmark judge (with --crop wordmark or --dense, for arrive and page):
 * lib/wordmark-sampler.mjs watches the wordmark's view-transition images
 * from `ready` to `finished` and lib/wordmark-judge.mjs gives the verdict,
 * stored per strip in the manifest and printed:
 *   wordmarkOverlap  arrive (two schools' wordmarks): fails when both images
 *                    are above 0.10 effective opacity at once;
 *   wordmarkBlink    page (one school's wordmark on both sides): fails when
 *                    the wordmark's coverage drops below 0.90 (the two
 *                    images summed under plus-lighter, composited under
 *                    normal, by the new image's resolved blend mode).
 * Added 09-23-26 (tooling hardening before the sweep):
 *   wordmarkBlank    arrive: the longest span where both images are under
 *                    0.10 (ms, start, end); fails above 80 ms (founder
 *                    decision b at the P5 checkpoint).
 *   wordmarkDrawn    any moment an image counted visible was clipped or
 *                    transformed out of sight (each is a problem), or
 *                    `checked: false` for samples that do not record it.
 * The manifest also records what the browser resolved for each image's and
 * the group's animation (name, duration, delay, timing function, fill), and
 * whether the group animates. A strip the judge could not sample (no
 * transition, no wordmark on one side) is a problem, never a pass. The
 * verdicts and their limits are in lib/wordmark-judge.mjs; re-judging a
 * folder's sample files without filming is rejudge-wordmark.mjs.
 *
 * Every 4xx or 5xx response and every failed request (other than the
 * blocked analytics) is a problem too, so a missing font or model shows up
 * beside the strip it spoiled instead of as a silent 404.
 *
 * --draw-ahead (added 09-23-26, the freeze investigation's agent D): before
 * an arrive or page trigger, let the portal draw the destination ahead of
 * time (runtime.ts) the way a visitor makes it: for arrive, open the
 * switcher's dialog and rest the pointer on the destination's row until its
 * copy has been drawn and taken down, then close the dialog; for page, rest
 * the pointer on the header's link to About the same way. Then film as
 * usual. The judges then see a swap to a page drawn ahead of time.
 * Changed 09-24-26 (the investigation's fixer): a link in the page is no
 * longer drawn ahead, so for page the pointer rests on About for 800 ms and
 * a copy going up there is reported as a problem.
 *
 * --stub <names> (added 09-24-26, the same fixer): film with the named
 * script stubs from harness/freeze-stubs.mjs run before the page's own
 * scripts (trace-arrival.mjs --stub's, script ones only), e.g. slowlink600
 * to see what a visitor on a GPU that links vaporwave's sunset slowly sees.
 * A diagnostic: a stubbed film is not what this machine shows.
 *
 * --base defaults to $SNAP_BASE when set (snap.mjs sets it), else :8787.
 */
import { chromium } from 'playwright';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VIEWPORTS } from './capture.mjs';
import { toPixels, judgeHoldStill, barMismatch, HOLD_STILL } from './lib/hold-still.mjs';
import { suppressPrompt } from './lib/portal-prompt.mjs';
import { PSEUDOS, samplerInit, markTrigger, collect } from './lib/wordmark-sampler.mjs';
import { judgeStripWordmark, describeWordmark, effective } from './lib/wordmark-judge.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}
const list = (name, fallback) => (arg(name, fallback) || '').split(',').filter(Boolean);

const base = arg('base', process.env.SNAP_BASE || 'http://127.0.0.1:8787').replace(/\/$/, '');
const schools = list('schools', '');
const scenarios = list('scenarios', 'arrive,page,fx');
const viewports = list('viewports', 'desktop,mobile');
const schemes = list('schemes', 'dark');
const label = arg('label', 'motion');
const showPrompt = process.argv.includes('--show-prompt');
const unnameSwitcher = process.argv.includes('--unname-switcher');
/* The switcher keeps its longest label's width in every school, but its crop
   is still padded sideways, so a bar that grows or shifts stays in frame. */
const CROPS = {
  switcher: { sel: 'bdl-switcher', padX: 90, padY: 10 },
  header: { sel: 'header', padX: 0, padY: 8 },
  // No selector: the wordmark is found by its computed view-transition-name,
  // and its crop is the union of the old and new boxes (see wordmarkCrop).
  wordmark: { sel: null, padX: 24, padY: 10 },
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
const from = arg('from', '');
if (from && !/^[a-z][a-z0-9-]{0,31}$/.test(from)) {
  console.error(`bad --from ${from}`);
  process.exit(1);
}
if (from && schools.includes(from) && scenarios.includes('arrive')) {
  console.error(`--from ${from}: a school never arrives from itself; drop ${from} from --schools`);
  process.exit(1);
}
const dense = crop === 'wordmark' || process.argv.includes('--dense');
/* --draw-ahead (header comment). */
const drawAhead = process.argv.includes('--draw-ahead');
/* --stub <names> (header comment): script stubs only. */
const stubNames = list('stub', '');
const stubs = stubNames.length ? (await import('./harness/freeze-stubs.mjs')).pick(stubNames) : [];
if (stubs.some((s) => s.css)) {
  console.error('--stub: motion.mjs takes script stubs only (trace-arrival.mjs takes the CSS ones)');
  process.exit(1);
}

/** Rest the pointer on `box` until the portal's copy drawn ahead has gone up
    and come down again; false if none went up. */
async function restForCopy(page, box, wait = 8000) {
  await page.mouse.move(box.x, box.y);
  const sel = 'iframe[aria-hidden="true"][sandbox]';
  // Polled every 10 ms in the page: waitForSelector missed every copy at the
  // 400 ms rest (freeze-investigation.md, "Wrap-up: a longer mouse rest";
  // draw-ahead-check.mjs made the same change), reporting none drawn.
  const poll = (gone, timeout) => page.waitForFunction(
    ({ sel, gone }) => !!document.querySelector(sel) !== gone, { sel, gone }, { polling: 10, timeout },
  ).then(() => true, () => false);
  const up = await poll(false, wait);
  if (up) await poll(true, 8000);
  return up;
}
/** The arrive file-name tag: only when --from was given, so every name
    filmed before it existed stays the same. */
const fromTag = (scenario) => (from && scenario === 'arrive' ? `__from-${from}` : '');

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
async function film(page, ms, trigger, settle = false, quality = 82) {
  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  let t0 = null;
  cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
    frames.push({ data, at: metadata.timestamp });
    try { await cdp.send('Page.screencastFrameAck', { sessionId }); } catch {}
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality, everyNthFrame: 1 });
  await page.waitForTimeout(250);
  // A page with nothing to repaint may send no frame before the trigger, and
  // then the strip has no "before" picture. A screenshot stands in (the same
  // size as a screencast frame: both are CSS px, even at a device scale of
  // 2), marked so the manifest can say so.
  if (!frames.length) {
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality });
    frames.push({ data, at: Date.now() / 1000, screenshot: true });
  }
  t0 = Date.now() / 1000;
  // A trigger may return the page's own clock at the moment it fired (epoch
  // ms, from markTrigger), so frames share a zero with the wordmark samples.
  const marked = await trigger();
  if (typeof marked === 'number') t0 = marked / 1000;
  await page.waitForTimeout(ms);
  if (settle) {
    // Keep filming until the router's transition has finished (it drops
    // data-astro-transition from <html>), so the last frame is the settled
    // page. Frames past `ms` never reach the sheet; pick() stops at `ms`.
    await page
      .waitForFunction(() => !document.documentElement.hasAttribute('data-astro-transition'), null, { timeout: 3000 })
      .catch(() => {});
    // With the wordmark sampler in the page, also wait for the transition
    // that followed the trigger to report `finished`.
    await page
      .waitForFunction(() => {
        const s = window.__bdlWm;
        if (!s || s.trigger == null) return true;
        const run = s.runs.find((r) => r.calledAt >= s.trigger);
        return !run || run.finishedAt != null || run.error != null;
      }, null, { timeout: 3000 })
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
async function sheet(frames, file, cols, cellW, box = null, vpWidth = 0, title = null) {
  const images = await Promise.all(frames.map((f) => loadImage(Buffer.from(f.data, 'base64'))));
  const k = box ? images[0].width / vpWidth : 1;
  const src = box
    ? { x: box.x * k, y: box.y * k, w: box.w * k, h: box.h * k }
    : { x: 0, y: 0, w: images[0].width, h: images[0].height };
  const cellH = Math.round((src.h / src.w) * cellW);
  const PAD = 12;
  const CAP = 26;
  // A title band (dense films only) says what the strip is and what the
  // judge found, so a sheet read on its own is not misread.
  const HEAD = title ? CAP + PAD : 0;
  const rows = Math.ceil(images.length / cols);
  let width = PAD + cols * (cellW + PAD);
  if (title) {
    const m = createCanvas(1, 1).getContext('2d');
    m.font = '600 15px sans-serif';
    width = Math.max(width, Math.ceil(m.measureText(title).width) + 2 * PAD);
  }
  const canvas = createCanvas(width, HEAD + PAD + rows * (cellH + CAP + PAD));
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1b1b1d';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = '600 15px sans-serif';
  ctx.textBaseline = 'middle';
  if (title) {
    ctx.fillStyle = '#e8e6e1';
    ctx.fillText(title, PAD, PAD + CAP / 2);
  }
  images.forEach((img, i) => {
    const x = PAD + (i % cols) * (cellW + PAD);
    const y = HEAD + PAD + Math.floor(i / cols) * (cellH + CAP + PAD);
    ctx.drawImage(img, src.x, src.y, src.w, src.h, x, y, cellW, cellH);
    ctx.fillStyle = '#e8e6e1';
    const ms = frames[i].ms;
    ctx.fillText(ms < 0 ? 'before' : `+${ms} ms`, x, y + cellH + CAP / 2);
  });
  await writeFile(file, await canvas.encode('png'));
}

/** The switcher bar's box and its buttons' boxes, in CSS px, from inside its
    shadow root. The buttons leave out the bar's translucent border and the
    1px seams between them, which show the page underneath. `drawn` lists
    anything on the host or an ancestor that changes how the bar draws (a
    school rule left on it after the swap), which the pixel check cannot see
    when the settled frame is its own reference. */
function measureSwitcher(page) {
  return page.evaluate(() => {
    const host = document.querySelector('bdl-switcher');
    const bar = host?.shadowRoot?.querySelector('.bar');
    if (!bar) return null;
    const box = (el) => {
      const r = el.getBoundingClientRect();
      return { x: r.left, y: r.top, w: r.width, h: r.height };
    };
    const neutral = { opacity: '1', filter: 'none', transform: 'none', clipPath: 'none', mixBlendMode: 'normal', visibility: 'visible' };
    const drawn = [];
    for (let el = host; el; el = el.parentElement) {
      const cs = getComputedStyle(el);
      for (const [prop, want] of Object.entries(neutral)) {
        if (cs[prop] !== want) drawn.push(`${el.tagName.toLowerCase()} ${prop}: ${cs[prop]}`);
      }
    }
    return { bar: box(bar), buttons: [...bar.children].map(box).filter((b) => b.w && b.h), drawn };
  });
}

/** The wordmark's box in CSS px: the element whose computed
    view-transition-name is `wordmark` (Astro names it through a
    data-astro-transition-scope rule, so no selector is assumed). `count`
    above 1 would abort every transition, so it is reported. */
function measureWordmark(page) {
  return page.evaluate(() => {
    const named = [...document.querySelectorAll('*')].filter((el) => getComputedStyle(el).viewTransitionName === 'wordmark');
    const r = named[0]?.getBoundingClientRect();
    if (!r || !r.width || !r.height) return null;
    return { x: r.left, y: r.top, w: r.width, h: r.height, count: named.length, tag: named[0].tagName.toLowerCase() };
  });
}

/** The union of the two wordmark boxes, padded by at least the difference in
    their sizes: an image drawn at its own size (object-fit: none) inside a
    box morphing from one to the other can overhang the box by that much.
    Clamped to the viewport. */
function wordmarkCrop(a, b, vw, vh) {
  const { padX, padY } = CROPS.wordmark;
  const px = Math.max(padX, Math.abs(a.w - b.w));
  const py = Math.max(padY, Math.abs(a.h - b.h));
  const x = Math.max(0, Math.min(a.x, b.x) - px);
  const y = Math.max(0, Math.min(a.y, b.y) - py);
  const right = Math.min(vw, Math.max(a.x + a.w, b.x + b.w) + px);
  const bottom = Math.min(vh, Math.max(a.y + a.h, b.y + b.h) + py);
  return { x, y, w: right - x, h: bottom - y };
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
async function holdStill(frames, before, after, vpWidth, sameLabel) {
  const imgs = await Promise.all(frames.map(decode));
  const k = imgs[0].width / vpWidth;
  const refs = [
    { img: imgs[0], boxes: toPixels(before.buttons, k) },
    { img: imgs[imgs.length - 1], boxes: toPixels(after.buttons, k) },
  ];
  const verdict = judgeHoldStill(frames.map((f, i) => ({ ms: f.ms, img: imgs[i] })), refs);
  // An in-school swap keeps the label, so the settled bar must be the bar
  // from before the trigger, not merely a picture every later frame matches.
  const settled = sameLabel ? Math.round(barMismatch(refs[1].img, refs[0].img, refs[0].boxes) * 1000) / 1000 : null;
  const settledOk = settled === null || settled <= HOLD_STILL.cell;
  return {
    ...verdict,
    stable: verdict.stable && settledOk,
    ...(settled === null ? {} : { settledVsBefore: settled }),
    bar: { before: before.bar, after: after.bar },
    framesJudged: frames.length,
  };
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

/** A manifest entry for a strip that bailed out before it was filmed, so it
    replaces (and is replaced by) that strip's entry like any other, and its
    problems travel with it rather than being carried forward loose. */
function stub(id, scenario, scheme, vpName) {
  const file = `${id}__${scenario}${fromTag(scenario)}__${scheme}__${vpName}${crop ? `__crop-${crop}` : ''}__FAILED.png`;
  return {
    school: id, scenario, ...(fromTag(scenario) ? { from } : {}), scheme, viewport: vpName, crop: crop || null, file,
    framesFilmed: 0, failed: true, noImage: true, problems: strip.problems,
  };
}

/** Judge the wordmark through the transition that followed the trigger.
    Arrivals are judged for overlap (two schools' wordmarks), in-school swaps
    for blink (one wordmark on both sides). Returns the manifest entry's
    `wordmark` block, and raises a problem for a failure or anything the
    judge could not see. */
async function judgeStrip(page, where, scenario, before, after) {
  const got = await collect(page);
  const { samples, ...rest } = got;
  const boxes = { before, after };
  // Every verdict and its problems come from one place, shared with
  // rejudge-wordmark.mjs.
  const judged = judgeStripWordmark({ got, samples, boxes, scenario, where });
  for (const p of judged.problems) problem(p);
  return {
    entry: {
      ...judged.fields,
      judge: { ...rest, samplesJudged: judged.verdict.samples },
      boxes,
    },
    ...judged,
    samples: samples ?? [],
    finishedMs: got.finishedMs ?? null,
    readyMs: got.readyMs ?? null,
  };
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
    if (!showPrompt) await suppressPrompt(context);
    if (unnameSwitcher) {
      await context.addInitScript(() => {
        document.addEventListener('DOMContentLoaded', () => {
          const sw = document.querySelector('bdl-switcher');
          if (sw) sw.style.viewTransitionName = 'none';
        });
      });
    }
    if (dense) await context.addInitScript(samplerInit, PSEUDOS);
    for (const s of stubs) await context.addInitScript(s.js);
    await context.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
    const page = await context.newPage();
    // Playwright has no `reducedTransparency` context option; headless
    // Chromium here otherwise reports prefers-reduced-transparency: reduce
    // by default, which pushed glass's E10 fallback into every strip
    // ("B1-sheets-invalid-light"). Forced to no-preference via CDP.
    try {
      const cdp = await context.newCDPSession(page);
      await cdp.send('Emulation.setEmulatedMedia', {
        features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }],
      });
    } catch {}
    page.on('pageerror', (e) => problem(`${page.url()} pageerror: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') problem(`${page.url()} console: ${m.text()}`); });
    page.on('response', (r) => { if (r.status() >= 400) problem(`${page.url()} ${r.status()} for ${r.url()}`); });
    page.on('requestfailed', (r) => {
      if (!r.url().includes('/cdn-cgi/zaraz/')) problem(`${page.url()} request failed: ${r.url()} (${r.failure()?.errorText})`);
    });

    for (const id of schools) {
      for (const scenario of scenarios) {
        const plan = PLAN[scenario];
        if (!plan) throw new Error(`unknown scenario ${scenario}`);
        const start = scenario === 'arrive' ? `/t/${from || 'quiet'}/` : `/t/${id}/`;
        const judged = dense && scenario !== 'fx';
        strip = { problems: [] };
        await page.goto(base + start, { waitUntil: 'networkidle' });
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(600);
        if (drawAhead && scenario !== 'fx') {
          let drawn = false;
          if (scenario === 'arrive') {
            await page.evaluate(() => document.querySelector('bdl-switcher').shadowRoot.querySelector('.open').click());
            await page.waitForTimeout(500);
            const box = await page.evaluate((id) => {
              const a = document.querySelector('bdl-switcher').shadowRoot.querySelector(`a[data-school="${id}"]`);
              a?.scrollIntoView({ block: 'nearest' }); // the list scrolls on a phone
              const r = a?.getBoundingClientRect();
              return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
            }, id);
            if (box) drawn = await restForCopy(page, box);
            await page.evaluate(() => document.querySelector('bdl-switcher').shadowRoot.querySelector('dialog').close());
            if (!drawn) problem(`${id} ${scenario} ${vpName}: --draw-ahead saw no copy drawn ahead`);
          } else {
            // A link in the page is not drawn ahead (withdrawn by the fixer,
            // 09-24-26): rest on About as a visitor would, and a copy going
            // up is the problem.
            const box = await page.locator(`header a[href="/t/${id}/about/"]`).first().boundingBox().catch(() => null);
            if (box) drawn = await restForCopy(page, { x: box.x + box.width / 2, y: box.y + box.height / 2 }, 800);
            if (drawn) problem(`${id} ${scenario} ${vpName}: resting on a page link drew a copy`);
          }
          await page.mouse.move(vp.width - 2, Math.round(vp.height * 0.6));
          await page.waitForTimeout(600);
        }
        // The crop box is measured on the page before the trigger, padded,
        // and clamped to the viewport. The wordmark's is widened to take in
        // the arriving page's wordmark once the film has settled.
        let box = null;
        const mark0 = judged || crop === 'wordmark' ? await measureWordmark(page) : null;
        if (crop === 'wordmark') {
          box = mark0 && wordmarkCrop(mark0, mark0, vp.width, vp.height);
          if (!box) {
            problem(`${id} ${scenario} ${vpName}: no element named wordmark on ${start} to crop to`);
            made.push(stub(id, scenario, scheme, vpName));
            continue;
          }
        } else if (crop) {
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
            made.push(stub(id, scenario, scheme, vpName));
            continue;
          }
        }
        const still0 = crop === 'switcher' ? await measureSwitcher(page) : null;
        const frames = await film(page, plan.ms, async () => {
          // The mark goes in just before the click is dispatched.
          const marked = dense ? await markTrigger(page) : undefined;
          if (scenario === 'arrive') await followLink(page, `/t/${id}/`);
          else if (scenario === 'page') await followLink(page, `/t/${id}/about/`);
          return marked;
        }, crop === 'switcher' || dense, dense ? 92 : 82);
        const still1 = crop === 'switcher' ? await measureSwitcher(page) : null;
        const where = `${id} ${scenario}${from && scenario === 'arrive' ? ` from ${from}` : ''} ${scheme} ${vpName}`;
        const mark1 = judged || crop === 'wordmark' ? await measureWordmark(page) : null;
        if (crop === 'wordmark' && mark1) box = wordmarkCrop(mark0, mark1, vp.width, vp.height);
        const wm = judged ? await judgeStrip(page, where, scenario, mark0, mark1) : null;
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
          if (!frames.length) {
            made.push(stub(id, scenario, scheme, vpName));
            continue;
          }
        }
        // Without a frame from before the trigger, the first frame (a later
        // one) stands in as the "before" picture and hides any change.
        if (frames[0].ms >= 0) problem(`${id} ${scenario} ${scheme} ${vpName}: no frame from before the trigger`);
        const file = `${id}__${scenario}${fromTag(scenario)}__${scheme}__${vpName}${crop ? `__crop-${crop}` : ''}${failed ? '__FAILED' : ''}.png`;
        const mobile = !!vp.mobile;
        let denseInfo = null;
        if (dense && scenario !== 'fx') {
          // Every frame from the trigger to `finished` + 100 ms, plus the one
          // before. Without a `finished` there is no end to be dense up to,
          // so the plan's span stands in and the strip says so.
          const end = wm?.finishedMs != null ? wm.finishedMs + 100 : plan.ms;
          if (wm?.finishedMs == null) problem(`${where}: no transition finish to film up to; dense frames cover the plan's ${plan.ms} ms`);
          const shown = frames.filter((f) => f.ms < 0 || f.ms <= end);
          const after = shown.filter((f) => f.ms >= 0);
          const gaps = after.slice(1).map((f, i) => f.ms - after[i].ms);
          // Which filmed frames fall where the judge saw both wordmarks above
          // the overlap threshold. The judge reads the animation timeline;
          // the screencast shows what was presented, and a busy compositor
          // can present nothing at all through the fade (seen on desktop
          // cottagecore arrivals at HEAD: no frame for 300+ ms). A strip
          // with a failing verdict and no frame in its window cannot be
          // checked by eye, and says so.
          const hot = (wm?.samples ?? []).filter((s) => Math.min(effective(s.old), effective(s.new)) > 0.1);
          const hotSpan = hot.length ? { fromMs: hot[0].ms, toMs: hot[hot.length - 1].ms } : null;
          denseInfo = {
            untilMs: end,
            frames: shown.length,
            framesAfterEnd: frames.length - shown.length,
            firstMs: after[0]?.ms ?? null,
            maxGapMs: gaps.length ? Math.max(...gaps) : null,
            ...(frames[0]?.screenshot ? { beforeFromScreenshot: true } : {}),
            overlapWindow: hotSpan,
            framesInOverlapWindow: hotSpan ? after.filter((f) => f.ms >= hotSpan.fromMs && f.ms <= hotSpan.toMs).length : 0,
            frameMs: shown.map((f) => f.ms),
          };
          const cellW = box ? Math.min(720, Math.round(box.w * (mobile ? 2 : 1))) : mobile ? 220 : 480;
          // As many columns as fit about 2000 px, and more if the sheet
          // would outgrow a canvas; never fewer frames.
          let cols = Math.max(2, Math.min(box ? 6 : mobile ? 8 : 4, Math.floor(2000 / (cellW + 12))));
          const cellH = box ? (box.h / box.w) * cellW : (vp.height / vp.width) * cellW;
          while (Math.ceil(shown.length / cols) * (cellH + 50) > 30000) cols++;
          const v = wm?.verdict;
          const title = [
            `${id} ${scenario}${from && scenario === 'arrive' ? ` from ${from}` : ''} ${scheme} ${vpName}`,
            `${shown.length} frames`,
            wm?.readyMs != null ? `ready +${wm.readyMs} ms` : null,
            wm?.finishedMs != null ? `finished +${wm.finishedMs} ms` : null,
            v ? `${wm.key} ${v.unsampled ? 'UNSAMPLED' : v.pass ? 'pass' : 'FAIL'}${v.worst ? ` (worst ${v.worst.score} at +${v.worst.ms} ms)` : ''}` : null,
            wm?.blank ? `blank ${wm.blank.unsampled ? 'UNSAMPLED' : `${wm.blank.ms} ms ${wm.blank.pass ? 'pass' : 'FAIL'}`}` : null,
            wm?.drawn?.suspects.length ? 'drawn SUSPECT' : null,
          ].filter(Boolean).join('   ');
          await sheet(shown, join(outDir, file), cols, cellW, box, vp.width, title);
        } else {
          const picked = pick(frames, plan.frames, plan.ms);
          if (box) await sheet(picked, join(outDir, file), 2, Math.min(720, Math.round(box.w * (mobile ? 2 : 1))), box, vp.width);
          else await sheet(picked, join(outDir, file), mobile ? 8 : 4, mobile ? 220 : 480);
        }
        // The full sample series goes beside the strip, not in the manifest.
        let samplesFile = null;
        if (wm) {
          samplesFile = file.replace(/\.png$/, '.wordmark.json');
          await writeFile(join(outDir, samplesFile), JSON.stringify({ where, ...wm.entry, samples: wm.samples }, null, 1));
        }
        let still = null;
        if (crop === 'switcher') {
          if (!still0?.buttons.length || !still1?.buttons.length) {
            problem(`${id} ${scenario} ${scheme} ${vpName}: could not measure the switcher's buttons`);
          } else {
            still = await holdStill(frames, still0, still1, vp.width, scenario === 'page');
            const pct = (still.worst.score * 100).toFixed(1);
            if (still.settledVsBefore > HOLD_STILL.cell) {
              problem(`${id} ${scenario} ${scheme} ${vpName}: switcher settled unlike its before picture (${(still.settledVsBefore * 100).toFixed(1)}% of a button off)`);
            }
            if (!still.stable && still.worst.score > HOLD_STILL.cell) {
              problem(`${id} ${scenario} ${scheme} ${vpName}: switcher moved, worst at +${still.worst.ms} ms (${pct}% of a button off)`);
            }
            if (still1.drawn.length) {
              still = { ...still, stable: false, drawn: still1.drawn };
              problem(`${id} ${scenario} ${scheme} ${vpName}: switcher settled with ${still1.drawn.join(', ')}`);
            }
          }
        }
        made.push({
          school: id, scenario, ...(fromTag(scenario) ? { from } : {}), scheme, viewport: vpName, crop: crop || null, file,
          framesFilmed: frames.length, failed,
          ...(still ? { holdStill: still } : {}),
          ...(denseInfo ? { dense: denseInfo } : {}),
          ...(wm ? { ...wm.entry, samplesFile } : {}),
          problems: strip.problems,
        });
        let verdict = still
          ? `  switcher ${still.stable ? 'held still' : `MOVED at +${still.worst.ms} ms`} (worst ${(still.worst.score * 100).toFixed(1)}%)`
          : '';
        if (wm) verdict += `  ${describeWordmark(wm, wm.entry.judge)}`;
        console.log(`${file}  (${frames.length} frames filmed${denseInfo ? `, ${denseInfo.frames} on the sheet` : ''})${verdict}`);
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
