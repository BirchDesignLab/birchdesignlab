/**
 * Refute-seat probe for finding code-1 (Tier 3 Stage 2 wrap-up adversarial
 * review of commit 953ef7f, PR #90): does a same-page hash link that aborts
 * an in-flight navigation leave `navigating` stuck true in
 * src/themes/portal/runtime.ts, with no resume until the NEXT navigation
 * lands?
 *
 * Written 09-24-26 for the refute-seat-1 task on code-1.
 *
 * Case hashabort: hold About's HTML for 3s (CDP Fetch domain), click the
 * About link, then 300ms into the load click the skip link
 * (href="#main", src/themes/cottagecore/Header.astro:15). router.js's
 * transition() aborts the in-flight navigation's controller
 * (abortAndRecreateMostRecentNavigation, :215-219) and, because
 * samePage(from, to) && to.hash is true, returns at :232-237 without ever
 * dispatching astro:before-preparation for the hash "navigation" itself.
 * The aborted About navigation's own prepEvent later resolves with
 * signal.aborted (or the fetch returns null and preventDefault() is called),
 * so it also returns without astro:after-swap or astro:page-load
 * (router.js :250-256). runtime.ts's stopDrawingAhead/resumeDrawingAhead
 * only resume on astro:after-swap, pageshow(persisted), or astro:page-load
 * (runtime.ts :712-718) -- none of which fire for this path.
 *
 * A control run (no skip-link click) confirms a normal row rest still draws.
 *
 * Usage:
 *   BDL_GPU=1 node scripts/themes/snap.mjs --name navfix-refute-0 --reuse --port 4692 -- \
 *     node scripts/themes/harness/draw-ahead-hashabort-probe.mjs [--runs 2]
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PROMPT_KEY } from '../lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}
const base = arg('base', process.env.SNAP_BASE || 'http://127.0.0.1:8787').replace(/\/$/, '');
const runs = Number(arg('runs', '2'));
const latency = Number(arg('latency', '3000'));
const label = arg('label', 'hashabort-probe');
const tag = arg('tag', 'probe');
const useGpu = process.env.BDL_GPU === '1';
const COPY = 'iframe[aria-hidden="true"][sandbox]';

const RECORDER = `(() => {
  const log = (window.__nav = window.__nav || { copies: [], events: [] });
  for (const type of ['astro:before-preparation', 'astro:after-swap', 'astro:page-load'])
    document.addEventListener(type, () => log.events.push({ type, t: performance.now(), path: location.pathname }));
  new MutationObserver((rs) => {
    for (const r of rs) for (const n of r.addedNodes)
      if (n.matches?.('${COPY}')) log.copies.push({ t: performance.now(), theme: (n.srcdoc.match(/data-theme="([^"]+)"/) || [])[1] ?? null });
  }).observe(document, { childList: true, subtree: true });
})();`;

async function start() {
  const browser = await chromium.launch({
    args: ['--hide-scrollbars', ...(useGpu ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] : [])],
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark', reducedMotion: 'no-preference' });
  await context.addInitScript(([key]) => { try { sessionStorage.setItem(key, 'dismissed'); } catch {} }, [PROMPT_KEY]);
  await context.addInitScript(RECORDER);
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setBlockedURLs', { urls: ['*/cdn-cgi/zaraz/*'] });
  return { browser, page, cdp };
}

const nav = (page) => page.evaluate(() => JSON.parse(JSON.stringify(window.__nav)));

/** Rest on a dialog row not drawn yet; returns ms to draw or null (timeout). */
async function tryRowRest(page, timeoutMs) {
  const mid = await nav(page);
  await page.evaluate(() => document.querySelector('bdl-switcher').shadowRoot.querySelector('.open').click());
  await page.waitForTimeout(400);
  const row = ['bauhaus', 'swiss', 'vaporwave', 'grandmillennial', 'glassmorphism'].find((id) => !mid.copies.some((c) => c.theme === id));
  const r = await page.evaluate((id) => {
    const a = document.querySelector('bdl-switcher').shadowRoot.querySelector(`a[data-school="${id}"]`);
    a.scrollIntoView({ block: 'nearest' });
    const b = a.getBoundingClientRect();
    return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
  }, row);
  const n0 = (await nav(page)).copies.length;
  await page.mouse.move(r.x, r.y);
  const t0 = await page.evaluate(() => performance.now());
  const up = await page.waitForFunction((n) => (window.__nav.copies.length > n ? window.__nav.copies[n].t : false), n0, { timeout: timeoutMs, polling: 10 })
    .then((h) => h.jsonValue(), () => null);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  return up == null ? null : Math.round(up - t0);
}

async function caseHashabort(run) {
  const { browser, page, cdp } = await start();
  try {
    await page.goto(`${base}/t/cottagecore/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    // Control: confirm a row rest draws normally BEFORE the hash-abort.
    const controlMs = await tryRowRest(page, 2500);

    // Hold About's HTML.
    cdp.on('Fetch.requestPaused', (e) => {
      setTimeout(() => cdp.send('Fetch.continueRequest', { requestId: e.requestId }).catch(() => {}), latency);
    });
    await cdp.send('Fetch.enable', { patterns: [{ urlPattern: '*/t/cottagecore/about/*', requestStage: 'Request' }] });
    const link = page.locator('header a[href="/t/cottagecore/about/"]').first();
    await link.click();
    await page.waitForTimeout(300);
    // The skip link (href="#main"): same-page hash, aborts the in-flight
    // navigation per router.js :215-238.
    await page.evaluate(() => document.querySelector('.cc-header .skip')?.click()
      ?? document.querySelector('a.skip')?.click());
    await page.waitForTimeout(200);
    const atHash = await page.evaluate(() => location.pathname + location.hash);

    // While the aborted navigation is still "in flight" from the runtime's
    // point of view, try a row rest: stuck means it never draws.
    const stuckMs = await tryRowRest(page, 2500);
    const shuffleStuck = await page.evaluate(() => {
      const el = document.querySelector('bdl-switcher').shadowRoot.querySelector('.shuffle');
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
    const n0 = (await nav(page)).copies.length;
    await page.mouse.move(shuffleStuck.x, shuffleStuck.y);
    const shuffleDrew = await page.waitForFunction((n) => (window.__nav.copies.length > n), n0, { timeout: 1500, polling: 10 })
      .then(() => true, () => false);
    await page.mouse.move(700, 450);

    // The held About request was itself aborted client-side (the router's
    // AbortController), so it may never actually land -- release the CDP
    // hold and drive a genuinely NEXT navigation (Home) instead, the way
    // the finding's evidence does ("after the next navigation landed").
    await cdp.send('Fetch.disable').catch(() => {});
    const home = page.locator('a.wordmark').first();
    await home.click();
    await page.waitForFunction(() => location.pathname === '/t/cottagecore/'
      && window.__nav.events.some((e) => e.type === 'astro:page-load' && e.path === '/t/cottagecore/'),
      null, { timeout: 15000, polling: 20 });
    await page.waitForTimeout(300);

    // After that (unrelated) navigation lands, drawing ahead should resume.
    const recoveredMs = await tryRowRest(page, 2500);

    const bug = stuckMs == null && !shuffleDrew;
    const out = {
      run, controlRestMs: controlMs, atHash, hashAbortStuckRestMs: stuckMs, shuffleDrewWhileStuck: shuffleDrew,
      recoveredAfterNextNavRestMs: recoveredMs, bug,
    };
    console.log(`hashabort run ${run}: control rest ${controlMs} ms; after skip-link abort at ${atHash}, row rest ${stuckMs ?? 'never (2.5s)'} ms, Shuffle drew ${shuffleDrew}; after the next nav landed, row rest ${recoveredMs ?? 'never (2.5s)'} ms -> ${bug ? 'STUCK (bug)' : 'ok'}`);
    return out;
  } finally {
    await browser.close();
  }
}

const results = { base, latency, hashabort: [] };
for (let run = 1; run <= runs; run++) {
  results.hashabort.push(await caseHashabort(run));
}
const outDir = join(HERE, '..', '.out', label);
await mkdir(outDir, { recursive: true });
await writeFile(join(outDir, `${tag}.json`), JSON.stringify(results, null, 2));
const bugs = results.hashabort.filter((r) => r.bug).length;
console.log(`\n${tag}: ${bugs} of ${results.hashabort.length} runs STUCK (${join(outDir, `${tag}.json`)})`);
process.exitCode = bugs ? 1 : 0;
