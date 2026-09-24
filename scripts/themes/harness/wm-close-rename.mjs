/**
 * Does the portal give the wordmark its name back after a scrolled swap?
 *
 * Written 09-23-26 for Tier 3 stage 2 (closing held item 3's soft spots).
 * On a swap clicked from low down a page the portal takes both the departing
 * and the arriving wordmark out of the morph (src/themes/portal/runtime.ts).
 * The films show the swap; this checks what they cannot: the page at rest
 * afterwards, whose wordmark must carry no inline name and compute
 * `wordmark`, so its own next swap can morph. Three runs per school:
 *   settled      scroll Home to the bottom, click the footer's About link,
 *                wait for the transition to finish;
 *   interrupted  the same, then follow a link to Services 60 ms after the
 *                click (mid-arrival), and wait for everything to settle;
 *   top          click About from the top of Home: the arriving wordmark
 *                must stay named during the swap (the morph is kept).
 * In every run each swap's arriving wordmark must be named exactly when its
 * departing one was.
 *
 * Usage (snap.mjs sets SNAP_BASE):
 *   BDL_GPU=1 node scripts/themes/snap.mjs --name wm-close --reuse --port 4497 -- \
 *     node scripts/themes/harness/wm-close-rename.mjs [--schools swiss,bauhaus]
 * Exit code 1 if any run fails.
 */
import { chromium } from 'playwright';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}
const base = (process.env.SNAP_BASE || '').replace(/\/$/, '');
const schools = arg('schools', 'quiet,vaporwave,glassmorphism,swiss,cottagecore,grandmillennial,bauhaus').split(',');
if (!base) {
  console.error('usage (under snap.mjs): node scripts/themes/harness/wm-close-rename.mjs [--schools a,b]');
  process.exit(1);
}
const gpu = process.env.BDL_GPU === '1' ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] : [];
const browser = await chromium.launch({ args: ['--hide-scrollbars', ...gpu] });
let failed = 0;

/** The wordmark's inline and computed name, once no transition is running. */
const settledName = (page) =>
  page.evaluate(async () => {
    for (let i = 0; i < 100 && (document.documentElement.hasAttribute('data-astro-transition') || window.__vtRunning); i++) {
      await new Promise((r) => setTimeout(r, 30));
    }
    await new Promise((r) => setTimeout(r, 300));
    const mark = document.querySelector('[data-astro-transition-scope]');
    return { path: location.pathname, inline: mark?.style.viewTransitionName ?? null, computed: mark ? getComputedStyle(mark).viewTransitionName : null };
  });

const follow = (page, href) =>
  page.evaluate((h) => {
    const a = document.createElement('a');
    a.href = h;
    a.style.cssText = 'position:fixed;left:0;top:0;opacity:0';
    document.body.append(a);
    a.click();
  }, href);

for (const school of schools) {
  for (const run of ['settled', 'interrupted', 'top']) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
    await suppressPrompt(context);
    await context.addInitScript(() => {
      const orig = document.startViewTransition?.bind(document);
      if (!orig) return;
      window.__names = [];
      document.startViewTransition = (...a) => {
        const old = document.querySelector('[data-astro-transition-scope]');
        const oldName = old ? getComputedStyle(old).viewTransitionName : null;
        const vt = orig(...a);
        window.__vtRunning = true;
        vt.ready.then(() => {
          const mark = document.querySelector('[data-astro-transition-scope]');
          window.__names.push([oldName, mark ? getComputedStyle(mark).viewTransitionName : null]);
        }, () => {});
        const done = () => { window.__vtRunning = false; };
        vt.finished.then(done, done);
        return vt;
      };
    });
    await context.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
    const page = await context.newPage();
    await page.goto(`${base}/t/${school}/`, { waitUntil: 'networkidle' });
    if (run !== 'top') await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
    await page.waitForTimeout(400);
    await follow(page, `/t/${school}/about/`);
    if (run === 'interrupted') {
      await page.waitForTimeout(60);
      await follow(page, `/t/${school}/services/`);
    }
    await page.waitForURL(`**/t/${school}/${run === 'interrupted' ? 'services' : 'about'}/`, { timeout: 5000 }).catch(() => {});
    const rest = await settledName(page);
    const during = await page.evaluate(() => window.__names);
    // The arriving wordmark is named exactly when the departing one was
    // (a sticky header keeps it in view, and so named, however far down).
    const want = during.length > 0 && during.every(([o, n]) => o === n) && (run !== 'top' || during[0][0] === 'wordmark');
    const ok = rest.inline === '' && rest.computed === 'wordmark' && want;
    if (!ok) failed++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${school} ${run}: arriving name during swap(s) ${JSON.stringify(during)}; at rest on ${rest.path} inline '${rest.inline}', computed ${rest.computed}`);
    await context.close();
  }
}
await browser.close();
process.exit(failed ? 1 : 0);
