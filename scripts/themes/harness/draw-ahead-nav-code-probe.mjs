/**
 * Probe the navigation lifecycle of the drawing-ahead fix (953ef7f,
 * `navigating` / `epoch` in src/themes/portal/runtime.ts) at the two exits
 * a code read of Astro 7.3.4's router says it misses.
 *
 * Written 09-24-26 by the "code" lens of the navfix adversarial review
 * (PR #90, Tier 3 Stage 2 wrap-up). Read-only on src/: it only drives a
 * served snapshot.
 *
 *   hashabort  A navigation aborted by a same-page hash link. router.js's
 *              transition() calls abortAndRecreateMostRecentNavigation()
 *              before its same-page-hash early return, so the skip link
 *              (#main) pressed while About's HTML is held aborts About with
 *              no before-preparation of its own, and no after-swap or
 *              page-load ever follows. Rests on switcher rows before (control),
 *              after, and after a later navigation lands.
 *   race       A second navigation that begins after the first has called
 *              document.startViewTransition() but before its update callback
 *              swaps (the capture of the old page: 135 to 271 ms measured in
 *              freeze-investigation.md). The first still swaps and fires
 *              after-swap, which resumes drawing ahead while the second is
 *              loading. Injected with setTimeout(0) from a wrapper around
 *              startViewTransition (a task in that window, as a real click,
 *              Back or Enter would be); the second's HTML held --latency ms.
 *              The mouse then rests on Shuffle.
 *   dbl        The same, from a real double click on Shuffle at several gaps,
 *              with only the second navigation's HTML held: does a second
 *              click land in the window at all, and is a copy drawn into its
 *              load? (First run: Chrome never delivered it; see `back`.)
 *   back       The race by the browser's own Back (CDP navigateToHistoryEntry,
 *              as the toolbar or a mouse's back button sends it), fired the
 *              moment the page calls startViewTransition for a click on About
 *              (grandmillennial); Services, where Back goes, held.
 *
 * Usage (serve a snapshot):
 *   BDL_GPU=1 node scripts/themes/snap.mjs --name navfix-code --reuse --port 4690 -- \
 *     node scripts/themes/harness/draw-ahead-nav-code-probe.mjs [--cases hashabort,race,dbl] \
 *     [--runs 2] [--latency 3000] [--gaps 40,80,120,160,220] [--tag navfix-code]
 * Output: scripts/themes/.out/nav-code-probe/<tag>.json and a line per run.
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
const cases = arg('cases', 'hashabort,race,dbl').split(',').filter(Boolean);
const runs = Number(arg('runs', '2'));
const latency = Number(arg('latency', '3000'));
const gaps = arg('gaps', '40,80,120,160,220').split(',').map(Number);
const tag = arg('tag', 'probe');
const useGpu = process.env.BDL_GPU === '1';
const COPY = 'iframe[aria-hidden="true"][sandbox]';

const RECORDER = `(() => {
  const log = (window.__nav = window.__nav || { copies: [], events: [] });
  for (const type of ['astro:before-preparation', 'astro:after-swap', 'astro:page-load'])
    document.addEventListener(type, (e) => log.events.push({ type, t: performance.now(), path: location.pathname, to: e.to ? e.to.pathname : null }));
  new MutationObserver((rs) => {
    for (const r of rs) for (const n of r.addedNodes)
      if (n.matches?.('${COPY}')) log.copies.push({ t: performance.now(), key: (n.srcdoc.match(/<base href="([^"]+)"/) || [])[1] ?? null });
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
const now = (page) => page.evaluate(() => performance.now());
const box = (page, sel) => page.evaluate((s) => {
  const el = document.querySelector('bdl-switcher').shadowRoot.querySelector(s);
  el.scrollIntoView({ block: 'nearest' });
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}, sel);
const openDialog = (page) => page.evaluate(() => {
  const root = document.querySelector('bdl-switcher').shadowRoot;
  if (!root.querySelector('dialog').open) root.querySelector('.open').click();
});
const closeDialog = (page) => page.evaluate(() => document.querySelector('bdl-switcher').shadowRoot.querySelector('dialog').close());
const here = (page) => page.evaluate(() => location.pathname.split('/')[2]);
const SCHOOLS = ['bauhaus', 'swiss', 'vaporwave', 'grandmillennial', 'glassmorphism', 'quiet', 'cottagecore'];

/** Rest the mouse on a row not drawn yet and not current; ms until a copy, or null. */
async function restOnRow(page, waitMs = 2500) {
  await openDialog(page);
  await page.waitForTimeout(700); // warmOthers() fetches
  const log = await nav(page);
  const cur = await here(page);
  const id = SCHOOLS.find((s) => s !== cur && !log.copies.some((c) => c.key?.includes(`/t/${s}/`)));
  const r = await box(page, `a[data-school="${id}"]`);
  const n0 = log.copies.length;
  await page.mouse.move(r.x, r.y - 30);
  await page.mouse.move(r.x, r.y, { steps: 3 });
  const t0 = await now(page);
  const up = await page.waitForFunction((n) => (window.__nav.copies.length > n ? window.__nav.copies[n].t : false), n0, { timeout: waitMs, polling: 10 })
    .then((h) => h.jsonValue(), () => null);
  await page.mouse.move(40, 880);
  await closeDialog(page);
  return { row: id, drewInMs: up == null ? null : Math.round(up - t0) };
}

async function caseHashAbort(run) {
  const { browser, page, cdp } = await start();
  try {
    await page.goto(`${base}/t/cottagecore/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    const control = await restOnRow(page);
    let held = 0;
    cdp.on('Fetch.requestPaused', (e) => {
      held++;
      setTimeout(() => cdp.send('Fetch.continueRequest', { requestId: e.requestId }).catch(() => {}), latency);
    });
    await cdp.send('Fetch.enable', { patterns: [{ urlPattern: '*/t/cottagecore/about/*', requestStage: 'Request' }] });
    await page.locator('header a[href="/t/cottagecore/about/"]').first().click();
    await page.waitForTimeout(300);
    // The skip link, by keyboard (it is shown on focus).
    await page.evaluate(() => document.querySelector('a.skip').focus());
    await page.keyboard.press('Enter');
    await page.waitForTimeout(latency + 1000); // About's hold ends; nothing should land
    await cdp.send('Fetch.disable');
    const mid = await nav(page);
    const aboutLanded = mid.events.some((e) => e.type === 'astro:after-swap' && e.path === '/t/cottagecore/about/');
    const url = await page.evaluate(() => location.pathname + location.hash);
    const afterAbort = await restOnRow(page);
    // Shuffle too.
    const s = await box(page, '.shuffle');
    const n0 = (await nav(page)).copies.length;
    await page.mouse.move(s.x, s.y + 40);
    await page.mouse.move(s.x, s.y, { steps: 3 });
    await page.waitForTimeout(2500);
    const shuffleDrew = (await nav(page)).copies.length - n0;
    await page.mouse.move(40, 880);
    // Heals at the next navigation that lands?
    await page.locator('header a[href="/t/cottagecore/services/"]').first().click();
    await page.waitForFunction(() => window.__nav.events.some((e) => e.type === 'astro:page-load' && e.path === '/t/cottagecore/services/'), null, { timeout: 15000 });
    await page.waitForTimeout(1200);
    const afterNext = await restOnRow(page);
    const stuck = control.drewInMs != null && afterAbort.drewInMs == null && shuffleDrew === 0;
    const out = { run, heldRequests: held, urlAfter: url, aboutLanded, control, afterAbort, shuffleDrewAfterAbort: shuffleDrew, afterNext, stuck };
    console.log(`hashabort run ${run}: control row ${control.row} drew in ${control.drewInMs} ms; skip link during About's load -> at ${url}, About landed ${aboutLanded}; row ${afterAbort.row} drew in ${afterAbort.drewInMs ?? 'never (2.5 s)'}, Shuffle drew ${shuffleDrew}; after the next navigation row ${afterNext.row} drew in ${afterNext.drewInMs ?? 'never'} -> ${stuck ? 'STUCK' : 'ok'}`);
    return out;
  } finally {
    await browser.close();
  }
}

async function caseRace(run) {
  const { browser, page, cdp } = await start();
  try {
    await page.goto(`${base}/t/cottagecore/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    cdp.on('Fetch.requestPaused', (e) => {
      setTimeout(() => cdp.send('Fetch.continueRequest', { requestId: e.requestId }).catch(() => {}), latency);
    });
    await cdp.send('Fetch.enable', { patterns: [{ urlPattern: '*/t/cottagecore/services/*', requestStage: 'Request' }] });
    // A second navigation (Services) begins in the window between the first's
    // startViewTransition() and its update callback.
    await page.evaluate(() => {
      const orig = document.startViewTransition.bind(document);
      let armed = true;
      document.startViewTransition = (arg) => {
        const vt = orig(arg);
        if (armed) {
          armed = false;
          setTimeout(() => {
            window.__nav.events.push({ type: 'second-click', t: performance.now(), path: location.pathname });
            document.querySelector('header a[href="/t/cottagecore/services/"]').click();
          }, 0);
        }
        return vt;
      };
    });
    const t0 = await now(page);
    await page.locator('header a[href="/t/cottagecore/about/"]').first().click();
    await page.waitForFunction(() => window.__nav.events.some((e) => e.type === 'astro:after-swap' && e.path === '/t/cottagecore/about/'), null, { timeout: 15000 });
    await page.waitForTimeout(600); // the arrival's transition
    const s = await box(page, '.shuffle');
    await page.mouse.move(s.x, s.y + 40);
    await page.mouse.move(s.x, s.y, { steps: 3 });
    await page.waitForFunction(() => window.__nav.events.some((e) => e.type === 'astro:after-swap' && e.path === '/t/cottagecore/services/'), null, { timeout: latency + 15000 });
    await page.waitForTimeout(3500); // any lost copy's 3 s cap
    await page.mouse.move(40, 880);
    const log = await nav(page);
    const ev = log.events.filter((e) => e.t >= t0);
    const prep2 = ev.find((e) => e.type === 'astro:before-preparation' && e.to === '/t/cottagecore/services/');
    const swap1 = ev.find((e) => e.type === 'astro:after-swap' && e.path === '/t/cottagecore/about/');
    const swap2 = ev.find((e) => e.type === 'astro:after-swap' && e.path === '/t/cottagecore/services/');
    const inWindow = !!prep2 && !!swap1 && prep2.t < swap1.t;
    const duringLoad = log.copies.filter((c) => prep2 && swap2 && c.t > prep2.t && c.t < swap2.t);
    const afterNext = await restOnRow(page);
    const bug = inWindow && duringLoad.length > 0;
    const out = {
      run, secondBeganBeforeFirstSwap: inWindow,
      firstSwapAfterSecondPrepMs: inWindow ? Math.round(swap1.t - prep2.t) : null,
      secondLoadMs: prep2 && swap2 ? Math.round(swap2.t - prep2.t) : null,
      copiesDuringSecondLoad: duringLoad.map((c) => ({ key: c.key, msBeforeSwap: Math.round(swap2.t - c.t) })),
      afterNext, events: ev.map((e) => ({ ...e, t: Math.round(e.t - t0) })), bug,
    };
    console.log(`race run ${run}: second began before the first's swap ${inWindow} (first swapped ${out.firstSwapAfterSecondPrepMs} ms into the second's load of ${out.secondLoadMs} ms); copies drawn during the second's load ${duringLoad.length} [${duringLoad.map((c) => c.key).join(', ')}]; row rest after landing drew in ${afterNext.drewInMs ?? 'never'} -> ${bug ? 'BUG' : 'ok'}`);
    return out;
  } finally {
    await browser.close();
  }
}

async function caseDbl(run, gap) {
  const { browser, page, cdp } = await start();
  try {
    await page.goto(`${base}/t/cottagecore/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    const s = await box(page, '.shuffle');
    await page.mouse.move(s.x, s.y); // warms the first pick
    await page.waitForTimeout(250);
    await page.mouse.move(700, 450);
    await page.waitForTimeout(2000);
    // Hold only the next page request after the first click lands in the router.
    let arm = false;
    let heldUrl = null;
    cdp.on('Fetch.requestPaused', (e) => {
      const hold = arm && heldUrl === null && /\/t\/[^/]+\/$/.test(new URL(e.request.url).pathname);
      if (hold) heldUrl = e.request.url;
      setTimeout(() => cdp.send('Fetch.continueRequest', { requestId: e.requestId }).catch(() => {}), hold ? latency : 0);
    });
    await cdp.send('Fetch.enable', { patterns: [{ urlPattern: '*/t/*', requestStage: 'Request' }] });
    const t0 = await now(page);
    await page.mouse.move(s.x, s.y);
    await page.mouse.down();
    await page.mouse.up();
    arm = true;
    await page.waitForTimeout(gap);
    await page.mouse.down();
    await page.mouse.up();
    await page.mouse.move(s.x + 3, s.y + 1, { steps: 2 });
    await page.waitForTimeout(latency + 2500);
    await page.mouse.move(40, 880);
    await cdp.send('Fetch.disable');
    const log = await nav(page);
    const ev = log.events.filter((e) => e.t >= t0);
    const preps = ev.filter((e) => e.type === 'astro:before-preparation');
    const swaps = ev.filter((e) => e.type === 'astro:after-swap');
    const second = preps[1];
    const firstSwap = swaps[0];
    const inWindow = !!second && !!firstSwap && second.t < firstSwap.t && firstSwap.path !== second.to;
    const lastSwap = swaps.at(-1);
    const duringLoad = second && lastSwap ? log.copies.filter((c) => c.t > second.t && c.t < lastSwap.t && (!firstSwap || c.t > firstSwap.t)) : [];
    const out = {
      run, gap, heldUrl, preps: preps.length, swaps: swaps.map((e) => e.path), secondBeganBeforeFirstSwap: inWindow,
      copiesDuringSecondLoad: duringLoad.map((c) => c.key), events: ev.map((e) => ({ ...e, t: Math.round(e.t - t0) })),
      bug: inWindow && duringLoad.length > 0,
    };
    console.log(`dbl run ${run} gap ${gap} ms: ${preps.length} preparations, swaps [${out.swaps.join(', ')}], second began before the first's swap ${inWindow}; copies drawn during the second's load ${duringLoad.length} -> ${out.bug ? 'BUG' : 'ok'}`);
    return out;
  } finally {
    await browser.close();
  }
}

/** The race by the browser's own Back (CDP Page.navigateToHistoryEntry, as
    the toolbar button or a mouse's back button sends it), fired from Node the
    moment the page calls startViewTransition for a click on About; the
    page Back goes to (Services) has its HTML held. Grandmillennial, whose
    capture is among the longest measured. */
async function caseBack(run) {
  const { browser, page, cdp } = await start();
  try {
    const S = '/t/grandmillennial/services/';
    await page.goto(`${base}${S}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.locator('header a[href="/t/grandmillennial/"]').first().click();
    await page.waitForFunction(() => window.__nav.events.some((e) => e.type === 'astro:page-load' && e.path === '/t/grandmillennial/'), null, { timeout: 15000 });
    await page.waitForTimeout(1500);
    const hist = await cdp.send('Page.getNavigationHistory');
    const prev = hist.entries[hist.currentIndex - 1];
    cdp.on('Fetch.requestPaused', (e) => {
      setTimeout(() => cdp.send('Fetch.continueRequest', { requestId: e.requestId }).catch(() => {}), latency);
    });
    await cdp.send('Fetch.enable', { patterns: [{ urlPattern: `*${S}*`, requestStage: 'Request' }] });
    let fired = false;
    await page.exposeBinding('__onVT', () => {
      if (fired) return;
      fired = true;
      cdp.send('Page.navigateToHistoryEntry', { entryId: prev.id }).catch(() => {});
    });
    await page.evaluate(() => {
      const orig = document.startViewTransition.bind(document);
      document.startViewTransition = (arg) => {
        window.__nav.events.push({ type: 'startViewTransition', t: performance.now(), path: location.pathname });
        window.__onVT();
        return orig(arg);
      };
    });
    const t0 = await now(page);
    await page.locator('header a[href="/t/grandmillennial/about/"]').first().click();
    await page.waitForTimeout(900);
    const s = await box(page, '.shuffle');
    await page.mouse.move(s.x, s.y + 40);
    await page.mouse.move(s.x, s.y, { steps: 3 });
    await page.waitForTimeout(latency + 2000);
    await page.mouse.move(40, 880);
    const log = await nav(page);
    const ev = log.events.filter((e) => e.t >= t0);
    const prepBack = ev.find((e) => e.type === 'astro:before-preparation' && e.to === S);
    const swapAbout = ev.find((e) => e.type === 'astro:after-swap' && e.path === '/t/grandmillennial/about/');
    const swapBack = ev.find((e) => e.type === 'astro:after-swap' && e.t > (prepBack?.t ?? Infinity) && e !== swapAbout && e.t > (swapAbout?.t ?? 0));
    const inWindow = !!prepBack && !!swapAbout && prepBack.t < swapAbout.t;
    const duringLoad = prepBack && swapBack ? log.copies.filter((c) => c.t > prepBack.t && c.t < swapBack.t) : [];
    const out = {
      run, backBeganBeforeAboutSwap: inWindow, copiesDuringBackLoad: duringLoad.map((c) => c.key),
      finalUrl: await page.evaluate(() => location.pathname), events: ev.map((e) => ({ ...e, t: Math.round(e.t - t0) })),
      bug: inWindow && duringLoad.length > 0,
    };
    console.log(`back run ${run}: Back began before About's swap ${inWindow}; copies drawn during Back's load ${duringLoad.length} [${out.copiesDuringBackLoad.join(', ')}]; ended at ${out.finalUrl} -> ${out.bug ? 'BUG' : 'ok'}`);
    return out;
  } finally {
    await browser.close();
  }
}

const results = { base, latency, hashabort: [], race: [], dbl: [], back: [] };
for (let run = 1; run <= runs; run++) {
  if (cases.includes('hashabort')) results.hashabort.push(await caseHashAbort(run));
  if (cases.includes('race')) results.race.push(await caseRace(run));
  if (cases.includes('dbl')) for (const gap of gaps) results.dbl.push(await caseDbl(run, gap));
  if (cases.includes('back')) results.back.push(await caseBack(run));
}
const outDir = join(HERE, '..', '.out', 'nav-code-probe');
await mkdir(outDir, { recursive: true });
await writeFile(join(outDir, `${tag}.json`), JSON.stringify(results, null, 2));
console.log(`\n${tag}: written ${join(outDir, `${tag}.json`)}`);
