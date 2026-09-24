/**
 * Film an in-school swap started from low down a page: scroll Home to the
 * bottom and click the footer's link to another page of the same school.
 *
 * Written 09-23-26 for Tier 3 stage 2 (the swiss follow-up). motion.mjs only
 * films swaps clicked from the top of a page, so anything a school keeps
 * pinned at the top of the viewport through an in-school swap (a named
 * header) was never seen over the old page's scrolled content. This films
 * every screencast frame from the click until the transition's `finished`
 * resolves plus 150 ms, full frame, and lays them out like a dense
 * motion.mjs strip.
 *
 * Usage (serve a build first; snap.mjs sets SNAP_BASE):
 *   BDL_GPU=1 node scripts/themes/snap.mjs --name swiss-fu --reuse --port 4463 -- \
 *     node scripts/themes/probe-scrolled-swap.mjs --school swiss [--to about] \
 *     [--schemes dark,light] [--viewports desktop,mobile] [--label scrolled] [--top 160]
 * --top <px> lays out only the top <px> CSS px of each frame (the header
 * band), at full size, and the file name gains `__top`.
 * Output: scripts/themes/.out/<label>/<school>__scrolled-page__<scheme>__<viewport>[__top].png
 *
 * Added 09-23-26 for Tier 3 stage 2 (held item 3, the wordmark dropping in
 * after a scrolled swap):
 *
 * --to-school <id>: film a school change instead. From the bottom of the
 * source school's Home, follow a link to /t/<id>/ the way motion.mjs's
 * followLink does (the header's own link if it is on screen, otherwise a
 * link the probe adds, since the header has scrolled away). The file name
 * reads `__scrolled-to-<id>__` in place of `__scrolled-page__`. Home to
 * Home is the switcher's path, so the portal keeps the proportional scroll
 * and the new page lands scrolled to its bottom too, its header off screen.
 * `--to <page>` with --to-school goes to that page of the other school
 * instead (/t/<id>/<page>/, file name `__scrolled-to-<id>-<page>__`), which
 * lands at the top, so the new header and its wordmark are in view:
 *   BDL_GPU=1 node scripts/themes/snap.mjs --name fu-portal --reuse --port 4467 -- \
 *     node scripts/themes/probe-scrolled-swap.mjs --school quiet --to-school cottagecore [--to about]
 *
 * Every sheet's title and console line also say what the wordmark did: the
 * departing wordmark's computed view-transition-name when the transition
 * started (`none` once the portal has taken it out of the pair) and where
 * its box sat against the viewport, and the wordmark pseudo-elements that
 * ran (`group`, `old`, `new`), so a sheet with no old image is told from one
 * that morphed.
 *
 * Added 09-23-26 for Tier 3 stage 2 (closing held item 3's soft spots):
 *
 * --seen <fraction>: scroll only far enough that about <fraction> of the
 * departing wordmark's box is still on screen (0.3 leaves its lower 30% in
 * view), to film either side of the portal's half-visible line. The file
 * name gains `__seen-<percent>`, and the title gives the fraction the
 * capture actually saw.
 * --scroll <px>: scroll to <px> instead of the bottom (`__y-<px>`).
 * With either, the link is clicked in place (a synthetic click, which never
 * scrolls), so the page is captured exactly where it was put; a footer link
 * off screen is still followed.
 * The title also says what the arriving wordmark's name was once the
 * transition was ready (`new none` when the portal took it out as well).
 */
import { chromium } from 'playwright';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VIEWPORTS } from './capture.mjs';
import { suppressPrompt } from './lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}
const list = (name, fallback) => (arg(name, fallback) || '').split(',').filter(Boolean);

const base = arg('base', process.env.SNAP_BASE || 'http://127.0.0.1:8787').replace(/\/$/, '');
const school = arg('school', '');
const toSchool = arg('to-school', '');
const to = arg('to', toSchool ? 'home' : 'about');
const schemes = list('schemes', 'dark,light');
const viewports = list('viewports', 'desktop,mobile');
const label = arg('label', 'scrolled');
const top = Number(arg('top', '0'));
const seen = arg('seen', null) === null ? null : Number(arg('seen'));
const scrollPx = arg('scroll', null) === null ? null : Number(arg('scroll'));
const ID =/^[a-z][a-z0-9-]{0,31}$/;
if (
  !ID.test(school) || !ID.test(to) || (toSchool && (!ID.test(toSchool) || toSchool === school)) ||
  (seen !== null && !(seen > 0 && seen < 1)) || (scrollPx !== null && !(scrollPx >= 0)) || (seen !== null && scrollPx !== null)
) {
  console.error('usage: node scripts/themes/probe-scrolled-swap.mjs --school <id> [--to about] [--to-school <other id>] [--seen <0..1> | --scroll <px>]');
  process.exit(1);
}
const toHome = !!toSchool && to === 'home';
const kind = toSchool ? `scrolled-to-${toSchool}${toHome ? '' : `-${to}`}` : 'scrolled-page';
const where = seen !== null ? `__seen-${Math.round(seen * 100)}` : scrollPx !== null ? `__y-${scrollPx}` : '';

const useGpu = process.env.BDL_GPU === '1';
const browser = await chromium.launch({
  args: ['--hide-scrollbars', ...(useGpu ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] : [])],
});
const outDir = join(HERE, '.out', label);
await mkdir(outDir, { recursive: true });
let failed = false;

/** Same layout as motion.mjs's dense sheets: every frame, time under each. */
async function sheet(frames, file, cols, cellW, title, vpWidth) {
  const images = await Promise.all(frames.map((f) => loadImage(Buffer.from(f.data, 'base64'))));
  const k = images[0].width / vpWidth;
  const srcH = top ? Math.min(images[0].height, top * k) : images[0].height;
  const cellH = Math.round((srcH / images[0].width) * cellW);
  const PAD = 12;
  const CAP = 26;
  const HEAD = CAP + PAD;
  const rows = Math.ceil(images.length / cols);
  const canvas = createCanvas(PAD + cols * (cellW + PAD), HEAD + PAD + rows * (cellH + CAP + PAD));
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1b1b1d';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = '600 15px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#e8e6e1';
  ctx.fillText(title, PAD, PAD + CAP / 2);
  images.forEach((img, i) => {
    const x = PAD + (i % cols) * (cellW + PAD);
    const y = HEAD + PAD + Math.floor(i / cols) * (cellH + CAP + PAD);
    ctx.drawImage(img, 0, 0, img.width, srcH, x, y, cellW, cellH);
    ctx.fillStyle = '#e8e6e1';
    ctx.fillText(frames[i].ms < 0 ? 'before' : `+${frames[i].ms} ms`, x, y + cellH + CAP / 2);
  });
  await writeFile(file, await canvas.encode('png'));
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
    await suppressPrompt(context);
    // Record the swap's own clock: when the transition started and finished.
    await context.addInitScript(() => {
      const orig = document.startViewTransition?.bind(document);
      if (!orig) return;
      window.__probe = { runs: [] };
      document.startViewTransition = (...a) => {
        // The departing wordmark as the capture will see it: the page's one
        // transition:name element (README, "Links").
        const mark = document.querySelector('[data-astro-transition-scope]');
        const box = mark?.getBoundingClientRect();
        const vt = orig(...a);
        const seenH = box ? Math.max(0, Math.min(box.bottom, innerHeight) - Math.max(box.top, 0)) : 0;
        const run = {
          at: Date.now(), ready: null, finished: null,
          oldName: mark ? getComputedStyle(mark).viewTransitionName : null,
          oldBox: box ? { top: Math.round(box.top), bottom: Math.round(box.bottom), vh: innerHeight } : null,
          oldSeen: box?.height ? seenH / box.height : null,
          newName: null,
          pseudos: [],
        };
        window.__probe.runs.push(run);
        vt.ready.then(() => {
          run.ready = Date.now();
          const next = document.querySelector('[data-astro-transition-scope]');
          run.newName = next ? getComputedStyle(next).viewTransitionName : null;
          const ran = document.getAnimations()
            .map((an) => an.effect?.pseudoElement ?? '')
            .filter((p) => /\(wordmark\)/.test(p))
            .map((p) => p.replace(/^::view-transition-(image-pair|group|old|new)\(wordmark\)$/, '$1'));
          run.pseudos = [...new Set(ran)];
        }, () => {});
        vt.finished.then(() => { run.finished = Date.now(); }, () => {});
        return vt;
      };
    });
    await context.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
    const page = await context.newPage();
    page.on('pageerror', (e) => { failed = true; console.log(`pageerror: ${e.message}`); });

    await page.goto(`${base}/t/${school}/`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(
      ([f, px]) => {
        let y = document.documentElement.scrollHeight;
        if (px !== null) y = px;
        if (f !== null) {
          // The wordmark's upper (1 - f) scrolled above the viewport.
          const box = document.querySelector('[data-astro-transition-scope]')?.getBoundingClientRect();
          if (box) y = Math.round(scrollY + box.top + (1 - f) * box.height);
        }
        window.scrollTo({ top: y, left: 0, behavior: 'instant' });
      },
      [seen, scrollPx],
    );
    await page.waitForTimeout(600);
    const href = toSchool ? `/t/${toSchool}/${toHome ? '' : `${to}/`}` : `/t/${school}/${to}/`;
    const link = page.locator(`${toSchool ? 'header' : 'footer'} a[href="${href}"]`).first();
    if (!toSchool && !(await link.count())) {
      failed = true;
      console.log(`${scheme} ${vpName}: no footer link to ${href}`);
      await context.close();
      continue;
    }
    /** motion.mjs's followLink: the header's link if it is on screen, else an added one. */
    const go = async () => {
      const inPlace = seen !== null || scrollPx !== null;
      if (inPlace && (await link.count())) return link.evaluate((a) => a.click());
      if (!inPlace && (!toSchool || (await link.isVisible().catch(() => false)))) return link.click();
      await page.evaluate((h) => {
        const a = document.createElement('a');
        a.href = h;
        a.textContent = 'go';
        a.style.cssText = 'position:fixed;left:0;top:0;opacity:0';
        document.body.append(a);
        a.click();
      }, href);
    };

    const cdp = await context.newCDPSession(page);
    const frames = [];
    cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
      frames.push({ data, at: metadata.timestamp });
      try { await cdp.send('Page.screencastFrameAck', { sessionId }); } catch {}
    });
    await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, everyNthFrame: 1 });
    await page.waitForTimeout(250);
    if (!frames.length) {
      const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 92 });
      frames.push({ data, at: Date.now() / 1000 });
    }
    const t0 = await page.evaluate(() => Date.now());
    await go();
    await page
      .waitForFunction(() => window.__probe?.runs.some((r) => r.finished != null), null, { timeout: 4000 })
      .catch(() => {});
    await page.waitForTimeout(150);
    await cdp.send('Page.stopScreencast');
    await cdp.detach();
    const run = await page.evaluate(() => window.__probe?.runs.at(-1) ?? null);
    if (new URL(page.url()).pathname !== href) {
      failed = true;
      console.log(`${scheme} ${vpName}: ended on ${page.url()}, wanted ${href}`);
    }
    const before = frames.filter((f) => f.at * 1000 < t0).slice(-1);
    const after = frames.filter((f) => f.at * 1000 >= t0);
    const shown = [...before, ...after].map((f) => ({ ...f, ms: Math.round(f.at * 1000 - t0) }));
    const timing = run ? `ready +${run.ready - t0}, finished +${run.finished - t0}` : 'no transition seen';
    const box = run?.oldBox ? ` at ${run.oldBox.top}..${run.oldBox.bottom} of ${run.oldBox.vh}` : '';
    const pct = run?.oldSeen != null ? ` (${Math.round(run.oldSeen * 100)}% seen)` : '';
    const mark = run
      ? `; wordmark ${run.oldName ?? 'missing'}${box}${pct}, new ${run.newName ?? 'missing'}, ran ${run.pseudos.join('+') || 'nothing'}`
      : '';
    const file = join(outDir, `${school}__${kind}${where}__${scheme}__${vpName}${top ? '__top' : ''}.png`);
    const cols = top ? (vp.mobile ? 4 : 2) : vp.mobile ? 8 : 5;
    const cellW = top ? (vp.mobile ? 390 : 720) : vp.mobile ? 200 : 300;
    const what = toSchool ? `school change to ${href}` : `page swap (footer ${to})`;
    await sheet(shown, file, cols, cellW,
      `${school} scrolled ${what}, ${scheme} ${vpName}: ${shown.length} frames, ${timing}${mark}`, vp.width);
    console.log(`${file}  (${shown.length} frames; ${timing}${mark})`);
    await context.close();
  }
}
await browser.close();
process.exit(failed ? 1 : 0);
