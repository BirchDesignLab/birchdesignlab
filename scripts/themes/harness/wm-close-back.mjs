/**
 * Back and forward after a scrolled swap: what the wordmark does.
 *
 * Written 09-23-26 for Tier 3 stage 2 (the critic's pass on closing held
 * item 3's soft spots). From the bottom of a school's Home, follow the
 * footer's link to About (the portal takes both wordmarks out of the
 * morph), then go back (the router restores Home scrolled to its bottom)
 * and forward again. For each swap it prints the departing wordmark's
 * computed view-transition-name and seen fraction at the capture, the
 * arriving one's name and seen fraction at ready, and the wordmark
 * pseudo-elements that ran; at rest it prints the inline and computed
 * name, which must be empty and `wordmark`.
 *
 * Usage:
 *   BDL_GPU=1 node scripts/themes/snap.mjs --name wm-close-verify --reuse --port 4490 -- \
 *     node scripts/themes/harness/wm-close-back.mjs [--schools swiss,quiet]
 */
import { chromium } from 'playwright';
import { suppressPrompt } from '../lib/portal-prompt.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// The back swap's frames: .out/stage2-wm-close-critic/back/<school>/back__<ms>.jpg
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', '.out', 'stage2-wm-close-critic', 'back');

const i = process.argv.indexOf('--schools');
const schools = (i === -1 ? 'quiet,swiss,cottagecore,bauhaus' : process.argv[i + 1]).split(',');
const base = (process.env.SNAP_BASE || '').replace(/\/$/, '');
if (!base) throw new Error('run under snap.mjs (SNAP_BASE)');
const gpu = process.env.BDL_GPU === '1' ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] : [];
const browser = await chromium.launch({ args: gpu });

for (const school of schools) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await suppressPrompt(context);
  await context.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
  await context.addInitScript(() => {
    const orig = document.startViewTransition?.bind(document);
    if (!orig) return;
    const seen = (el) => {
      const b = el?.getBoundingClientRect();
      if (!b?.height) return null;
      return Math.round((100 * Math.max(0, Math.min(b.bottom, innerHeight) - Math.max(b.top, 0))) / b.height);
    };
    window.__runs = [];
    document.startViewTransition = (...a) => {
      const mark = document.querySelector('[data-astro-transition-scope]');
      const run = { old: getComputedStyle(mark).viewTransitionName, oldSeen: seen(mark) };
      const vt = orig(...a);
      window.__runs.push(run);
      vt.ready.then(() => {
        const next = document.querySelector('[data-astro-transition-scope]');
        run.neu = getComputedStyle(next).viewTransitionName;
        run.newSeen = seen(next);
        run.ran = [...new Set(document.getAnimations().map((x) => x.effect?.pseudoElement ?? '')
          .filter((p) => /\(wordmark\)/.test(p)))].join(' ');
      }, () => {});
      vt.finished.then(() => { run.done = true; }, () => { run.done = true; });
      return vt;
    };
  });
  const page = await context.newPage();
  await page.goto(`${base}/t/${school}/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
  await page.waitForTimeout(400);
  const settle = async () => {
    await page.waitForFunction(() => window.__runs?.at(-1)?.done, null, { timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(200);
    const rest = await page.evaluate(() => {
      const m = document.querySelector('[data-astro-transition-scope]');
      return { inline: m.style.viewTransitionName, computed: getComputedStyle(m).viewTransitionName, y: scrollY };
    });
    const run = await page.evaluate(() => window.__runs.at(-1));
    return JSON.stringify({ ...run, rest });
  };
  await page.locator(`footer a[href="/t/${school}/about/"]`).first().evaluate((a) => a.click());
  console.log(`${school} link   ${await settle()}`);
  // Film the back swap's frames (every screencast frame, one jpg each).
  const dir = join(OUT, school);
  await mkdir(dir, { recursive: true });
  const cdp = await context.newCDPSession(page);
  const frames = [];
  cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
    frames.push({ data, at: metadata.timestamp });
    try { await cdp.send('Page.screencastFrameAck', { sessionId }); } catch {}
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 85, everyNthFrame: 1 });
  await page.waitForTimeout(200);
  const t0 = await page.evaluate(() => Date.now());
  await page.goBack();
  console.log(`${school} back   ${await settle()}`);
  await cdp.send('Page.stopScreencast');
  await cdp.detach();
  for (const f of frames) {
    const ms = Math.round(f.at * 1000 - t0);
    if (ms >= 0) await writeFile(join(dir, `back__${String(ms).padStart(4, '0')}.jpg`), Buffer.from(f.data, 'base64'));
  }
  await page.goForward();
  console.log(`${school} fwd    ${await settle()}`);
  await context.close();
}
await browser.close();
