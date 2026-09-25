/**
 * Adversarial browser probes for the Stage 2 review's "browser" lens, on top
 * of harness/draw-ahead-nav-probe.mjs (its `load` and `refocus` cases run
 * as-is; this file is the sibling that covers the cases the review brief
 * asked for beyond those two). Written 09-24-26 against commit 953ef7f
 * ("Fix two drawing-ahead bugs the Stage 2 review found").
 *
 * Every case checks the same three things:
 *   1. no copy is added to the document between astro:before-preparation and
 *      astro:after-swap (nothing is drawn into a navigation's own load);
 *   2. any copy that goes up after landing is of the school Shuffle, or the
 *      rested row, actually then goes to (never a wasted draw);
 *   3. drawing ahead still works afterwards: a mouse rest on a not-yet-drawn
 *      dialog row draws in about 400-600 ms.
 *
 * Cases (letters match the review brief):
 *   b  a click on one dialog row, then a click on another row before the
 *      first page lands (the first navigation aborted by the second).
 *   c  five Shuffles in a row, the mouse resting on Shuffle between them.
 *   d  keyboard: Tab to Shuffle, Enter, Enter, Enter, with
 *      Element.prototype.moveBefore removed (Safari's/Firefox's path: the
 *      switcher's post-swap refocus runs).
 *   e  a page left by a full load (the footer's Lab link, data-astro-reload)
 *      mid-load of a slow in-school navigation, then Back — the left page is
 *      restored from the back/forward cache with `navigating` still true in
 *      its frozen heap.
 *   f  the contact form's full load (honeypot filled, so nothing would be
 *      sent even if the snapshot had a live /api/contact; it does not, so a
 *      404/405 page is the expected response), then Back.
 *
 * Usage (serve a snapshot):
 *   BDL_GPU=1 node scripts/themes/snap.mjs --name navfix-browser --reuse --port 4691 -- \
 *     node scripts/themes/harness/draw-ahead-nav-probe-2.mjs [--cases b,c,d,e,f] [--latency 1200]
 * Output: scripts/themes/.out/<label>/<tag>.json, and a verdict line per case.
 * Exit 1 when any case shows a bug.
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
const cases = arg('cases', 'a,b,c,d,e,f').split(',').filter(Boolean);
const latency = Number(arg('latency', '1200'));
const label = arg('label', 'nav-probe-2');
const tag = arg('tag', 'probe');
const useGpu = process.env.BDL_GPU === '1';
const COPY = 'iframe[aria-hidden="true"][sandbox]';
const ROWS = ['bauhaus', 'swiss', 'vaporwave', 'grandmillennial', 'glassmorphism'];

const RECORDER = `(() => {
  const log = (window.__nav = window.__nav || { copies: [], events: [] });
  for (const type of ['astro:before-preparation', 'astro:after-swap', 'astro:page-load'])
    document.addEventListener(type, () => log.events.push({ type, t: performance.now(), path: location.pathname }));
  new MutationObserver((rs) => {
    for (const r of rs) for (const n of r.addedNodes)
      if (n.matches?.('${COPY}')) log.copies.push({ t: performance.now(), theme: (n.srcdoc.match(/data-theme="([^"]+)"/) || [])[1] ?? null });
  }).observe(document, { childList: true, subtree: true });
})();`;

async function start({ noMoveBefore = false } = {}) {
  const browser = await chromium.launch({
    args: ['--hide-scrollbars', '--headless=new', ...(useGpu ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] : [])],
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark', reducedMotion: 'no-preference' });
  await context.addInitScript(([key]) => { try { sessionStorage.setItem(key, 'dismissed'); } catch {} }, [PROMPT_KEY]);
  if (noMoveBefore) await context.addInitScript(() => { delete Element.prototype.moveBefore; delete Node.prototype.moveBefore; });
  await context.addInitScript(RECORDER);
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setBlockedURLs', { urls: ['*/cdn-cgi/zaraz/*'] });
  return { browser, page, cdp };
}

const shuffleBox = (page) => page.evaluate(() => {
  const r = document.querySelector('bdl-switcher').shadowRoot.querySelector('.shuffle').getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
});
const rowBox = (page, id) => page.evaluate((sid) => {
  const a = document.querySelector('bdl-switcher').shadowRoot.querySelector(`a[data-school="${sid}"]`);
  a.scrollIntoView({ block: 'nearest' });
  const b = a.getBoundingClientRect();
  return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
}, id);
const openDialog = (page) => page.evaluate(() => document.querySelector('bdl-switcher').shadowRoot.querySelector('.open').click());
const nav = (page) => page.evaluate(() => JSON.parse(JSON.stringify(window.__nav)));
const clearNav = (page) => page.evaluate(() => { window.__nav.copies = []; window.__nav.events = []; });
const landed = (page, path) => page.waitForFunction(
  (p) => location.pathname === p && window.__nav.events.some((e) => e.type === 'astro:page-load' && e.path === p),
  path, { timeout: 15000, polling: 20 },
);

/** Rest on a not-yet-drawn dialog row: drawing ahead must fire in ~400-600 ms. */
async function checkRestStillWorks(page, avoidThemes) {
  await openDialog(page);
  await page.waitForTimeout(400);
  const before = await nav(page);
  const row = ROWS.find((id) => !avoidThemes.includes(id));
  const r = await rowBox(page, row);
  const n0 = before.copies.length;
  await page.mouse.move(200, 200);
  await page.mouse.move(r.x, r.y, { steps: 3 });
  const t0 = await page.evaluate(() => performance.now());
  const up = await page.waitForFunction((n) => (window.__nav.copies.length > n ? window.__nav.copies[n].t : false), n0, { timeout: 3000, polling: 10 })
    .then((h) => h.jsonValue(), () => null);
  const restMs = up == null ? null : Math.round(up - t0);
  await page.keyboard.press('Escape').catch(() => {});
  return { row, restMs, ok: restMs != null && restMs >= 250 && restMs <= 900 };
}

function copiesDuringLoads(events, copies) {
  // Every before-preparation..after-swap (or the next before-preparation, if
  // the swap never came because that navigation was aborted) window.
  const preps = events.filter((e) => e.type === 'astro:before-preparation');
  const windows = preps.map((p, i) => {
    const nextPrep = preps[i + 1]?.t ?? Infinity;
    const swap = events.find((e) => e.type === 'astro:after-swap' && e.t >= p.t && e.t < nextPrep);
    return { start: p.t, end: swap ? swap.t : nextPrep };
  });
  return copies.filter((c) => windows.some((w) => c.t >= w.start && c.t < w.end));
}

async function caseSlowLoadThenBack(run) {
  const { browser, page, cdp } = await start();
  try {
    await page.goto(`${base}/t/cottagecore/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    // A real prior history entry, so Back mid-load has somewhere to land:
    // an in-school SPA hop that completes normally before the slow one.
    await page.locator('header a[href="/t/cottagecore/about/"]').first().click();
    await landed(page, '/t/cottagecore/about/');
    await page.waitForTimeout(400);
    const s = await shuffleBox(page);
    await page.mouse.move(s.x, s.y);
    await page.waitForTimeout(250);
    await page.mouse.move(700, 450);
    await page.waitForTimeout(600);
    await clearNav(page);
    // From /about/, a slow hop back to Home (held), mouse resting on Shuffle.
    cdp.on('Fetch.requestPaused', (e) => {
      setTimeout(() => cdp.send('Fetch.continueRequest', { requestId: e.requestId }).catch(() => {}), latency);
    });
    await cdp.send('Fetch.enable', { patterns: [{ urlPattern: '*/t/cottagecore/', requestStage: 'Request' }] });
    const link = page.locator('a.wordmark[href="/t/cottagecore/"]').first();
    await link.click();
    await page.mouse.move(s.x, s.y, { steps: 2 }); // rests on Shuffle through the load
    await page.waitForTimeout(latency / 2); // press Back mid-load, before Home lands
    const pathAtBack = await page.evaluate(() => location.pathname);
    await page.goBack({ timeout: 15000 }).catch(() => {});
    // The router may already have pushed Home's URL before its swap (which
    // never came), so Back can land on either address.
    await page.waitForFunction(
      () => location.pathname === '/t/cottagecore/' || location.pathname === '/t/cottagecore/about/',
      null, { timeout: 15000, polling: 20 },
    ).catch(() => {});
    await cdp.send('Fetch.disable').catch(() => {});
    await page.waitForTimeout(800);
    const landedPath = await page.evaluate(() => location.pathname);
    const after = await nav(page);
    const during = copiesDuringLoads(after.events, after.copies);
    const onPortalPage = await page.evaluate(() => !!document.querySelector('bdl-switcher'));
    const rest = onPortalPage ? await checkRestStillWorks(page, ['cottagecore']) : { row: null, restMs: null, ok: false };
    const bug = during.length > 0 || !onPortalPage || !rest.ok;
    const out = { run, pathAtBack, landedPath, duringLoad: during.length, restRow: rest.row, restMs: rest.restMs, bug };
    console.log(`a (slow-load-back) run ${run}: back pressed at ${pathAtBack}, landed ${landedPath}, copies during either load ${out.duringLoad}, rest on ${rest.row ?? 'n/a'} drew in ${rest.restMs ?? 'never'} ms -> ${bug ? 'BUG' : 'ok'}`);
    return out;
  } finally {
    await browser.close();
  }
}

async function caseAbortedNav(run) {
  const { browser, page, cdp } = await start();
  try {
    await page.goto(`${base}/t/cottagecore/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await openDialog(page);
    await page.waitForTimeout(400);
    // Hold the first row's HTML so the click cannot land before the second click.
    cdp.on('Fetch.requestPaused', (e) => {
      setTimeout(() => cdp.send('Fetch.continueRequest', { requestId: e.requestId }).catch(() => {}), latency);
    });
    await cdp.send('Fetch.enable', { patterns: [{ urlPattern: `*/t/bauhaus/*`, requestStage: 'Request' }] });
    await clearNav(page);
    const rowA = await rowBox(page, 'bauhaus');
    await page.mouse.move(rowA.x, rowA.y);
    await page.mouse.down();
    await page.mouse.up();
    await page.waitForTimeout(200); // first navigation begins (before-preparation fires)
    await cdp.send('Fetch.disable');
    // Second click, on Shuffle, before the first page lands.
    const s = await shuffleBox(page);
    await page.mouse.move(s.x, s.y, { steps: 2 });
    await page.mouse.down();
    await page.mouse.up();
    await page.waitForFunction(() => location.pathname !== '/t/cottagecore/', null, { timeout: 15000, polling: 20 });
    const to = await page.evaluate(() => location.pathname);
    await landed(page, to);
    await page.waitForTimeout(800);
    const after = nav.name && (await nav(page));
    const during = copiesDuringLoads(after.events, after.copies);
    const swaps = after.events.filter((e) => e.type === 'astro:after-swap');
    const lastSwap = swaps.at(-1);
    const afterLanding = after.copies.filter((c) => c.t >= lastSwap.t).map((c) => c.theme);
    const landedTheme = to.split('/')[2];
    const wasted = afterLanding.filter((t) => t !== landedTheme);
    const rest = await checkRestStillWorks(page, [landedTheme, 'bauhaus']);
    const bug = during.length > 0 || wasted.length > 0 || !rest.ok;
    const out = { run, to, duringLoad: during.length, afterLanding, wasted: wasted.length, restRow: rest.row, restMs: rest.restMs, bug };
    console.log(`b (aborted-nav) run ${run}: landed ${to}, copies during either load ${out.duringLoad}, after landing [${afterLanding.join(', ')}] (wasted ${out.wasted}), rest on ${rest.row} drew in ${rest.restMs ?? 'never'} ms -> ${bug ? 'BUG' : 'ok'}`);
    return out;
  } finally {
    await browser.close();
  }
}

async function caseFiveShuffles(run) {
  const { browser, page } = await start();
  try {
    await page.goto(`${base}/t/cottagecore/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    // 6 rounds: a copy drawn after landing round i (the pointer still resting
    // on Shuffle) is for round i's NEW pick, so it is checked against where
    // round i+1 actually goes, not against where round i itself landed.
    const perShuffle = [];
    for (let i = 0; i < 6; i++) {
      await clearNav(page);
      const s = await shuffleBox(page);
      await page.mouse.move(s.x, s.y, { steps: 2 });
      await page.waitForTimeout(500); // the rest draws the pick
      const before = await nav(page);
      const drawn = before.copies.at(-1)?.theme ?? null;
      const fromPath = await page.evaluate(() => location.pathname);
      await page.mouse.down();
      await page.mouse.up();
      await page.waitForFunction((p) => location.pathname !== p, fromPath, { timeout: 15000, polling: 20 });
      const to = await page.evaluate(() => location.pathname);
      await landed(page, to);
      await page.waitForTimeout(700); // ~1.2 s apart total with the rest above
      const after = await nav(page);
      const during = copiesDuringLoads(after.events, after.copies);
      const swap = [...after.events].reverse().find((e) => e.type === 'astro:after-swap');
      const afterLanding = after.copies.filter((c) => c.t >= swap.t).map((c) => c.theme);
      const landedTheme = to.split('/')[2];
      const bug = during.length > 0 || (drawn != null && drawn !== landedTheme);
      perShuffle.push({ i, drawn, to: landedTheme, duringLoad: during.length, afterLanding, bug });
    }
    // Now that every round's destination is known, check each round's
    // after-landing copies against the round that actually followed it.
    let bugAny = false;
    for (let i = 0; i < perShuffle.length; i++) {
      const p = perShuffle[i];
      const next = perShuffle[i + 1]?.to; // undefined for the last round: nothing to compare, not a bug
      const wasted = next ? p.afterLanding.filter((t) => t !== next) : [];
      p.wasted = wasted.length;
      p.bug = p.bug || wasted.length > 0;
      bugAny = bugAny || p.bug;
    }
    const rest = await checkRestStillWorks(page, [perShuffle.at(-1).to]);
    bugAny = bugAny || !rest.ok;
    console.log(`c (five-shuffles) run ${run}: ${perShuffle.map((p) => `${p.drawn ?? '-'}->${p.to}${p.bug ? '!' : ''}`).join(', ')}; rest on ${rest.row} drew in ${rest.restMs ?? 'never'} ms -> ${bugAny ? 'BUG' : 'ok'}`);
    return { run, perShuffle, restRow: rest.row, restMs: rest.restMs, bug: bugAny };
  } finally {
    await browser.close();
  }
}

async function caseKeyboardTriple(run) {
  const { browser, page } = await start({ noMoveBefore: true });
  try {
    await page.goto(`${base}/t/quiet/`, { waitUntil: 'networkidle' });
    const hasMoveBefore = await page.evaluate(() => typeof document.documentElement.moveBefore === 'function');
    await page.waitForTimeout(600);
    let bugAny = false;
    const rounds = [];
    for (let i = 0; i < 3; i++) {
      await clearNav(page);
      await page.evaluate(() => document.querySelector('bdl-switcher').shadowRoot.querySelector('.shuffle').focus());
      await page.waitForTimeout(650); // the 500 ms focus rest draws the pick
      const before = await nav(page);
      const drawn = before.copies.at(-1)?.theme ?? null;
      const fromPath = await page.evaluate(() => location.pathname);
      await page.keyboard.press('Enter');
      await page.waitForFunction((p) => location.pathname !== p, fromPath, { timeout: 15000, polling: 20 });
      const to = await page.evaluate(() => location.pathname);
      await landed(page, to);
      await page.waitForTimeout(2200); // any refocus rest would have fired by now
      const after = await nav(page);
      const during = copiesDuringLoads(after.events, after.copies);
      const swap = [...after.events].reverse().find((e) => e.type === 'astro:after-swap');
      const afterLanding = after.copies.filter((c) => c.t >= swap.t).map((c) => c.theme);
      const landedTheme = to.split('/')[2];
      const wasted = afterLanding.filter((t) => t !== landedTheme);
      const bug = during.length > 0 || wasted.length > 0 || (drawn != null && drawn !== landedTheme);
      bugAny = bugAny || bug;
      rounds.push({ i, drawn, to: landedTheme, duringLoad: during.length, afterLanding, wasted: wasted.length, bug });
    }
    const rest = await checkRestStillWorks(page, [rounds.at(-1).to]);
    bugAny = bugAny || !rest.ok;
    console.log(`d (keyboard-triple) run ${run}: moveBefore removed ${!hasMoveBefore}; ${rounds.map((r) => `${r.drawn ?? '-'}->${r.to}${r.bug ? '!' : ''}`).join(', ')}; rest on ${rest.row} drew in ${rest.restMs ?? 'never'} ms -> ${bugAny ? 'BUG' : 'ok'}`);
    return { run, moveBeforeRemoved: !hasMoveBefore, rounds, restRow: rest.row, restMs: rest.restMs, bug: bugAny };
  } finally {
    await browser.close();
  }
}

async function caseBfcacheFullLoad(run) {
  const { browser, page, cdp } = await start();
  try {
    await page.goto(`${base}/t/cottagecore/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    const s = await shuffleBox(page);
    await page.mouse.move(s.x, s.y);
    await page.waitForTimeout(250);
    await page.mouse.move(700, 450);
    await page.waitForTimeout(600);
    // Hold About's HTML so the in-school navigation is still loading.
    cdp.on('Fetch.requestPaused', (e) => {
      setTimeout(() => cdp.send('Fetch.continueRequest', { requestId: e.requestId }).catch(() => {}), latency);
    });
    await cdp.send('Fetch.enable', { patterns: [{ urlPattern: '*/t/cottagecore/about/*', requestStage: 'Request' }] });
    const link = page.locator('header a[href="/t/cottagecore/about/"]').first();
    await link.click();
    await page.waitForTimeout(300); // mid-load: before-preparation has fired, no swap yet
    const pathAtLeave = await page.evaluate(() => location.pathname);
    await cdp.send('Fetch.disable').catch(() => {});
    // Leave by a full load: the footer's Lab link carries data-astro-reload.
    const lab = page.locator('footer a[data-astro-reload]').filter({ hasText: /lab/i }).first();
    await Promise.all([
      page.waitForURL(/\/lab\/?$/, { timeout: 15000 }),
      lab.click(),
    ]);
    await page.waitForLoadState('load');
    await page.waitForTimeout(300);
    // Back: the left page is restored from bfcache (if eligible) or reloaded.
    // The router may have pushed the about/ URL before the swap that never
    // came, so Back can land on either address; a second Back covers that.
    const [resp] = await Promise.all([
      page.waitForEvent('response', { predicate: (r) => r.url().includes('/t/cottagecore') && r.request().isNavigationRequest(), timeout: 15000 }).catch(() => null),
      page.goBack({ timeout: 15000 }).catch(() => {}),
    ]);
    await page.waitForTimeout(500);
    let landedPath = await page.evaluate(() => location.pathname);
    if (landedPath !== '/t/cottagecore/' && landedPath !== '/t/cottagecore/about/') {
      await page.goBack({ timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(500);
      landedPath = await page.evaluate(() => location.pathname);
    }
    const bfcache = resp === null; // no navigation request observed => served from bfcache
    await page.waitForTimeout(300);
    const onPortalPage = await page.evaluate(() => !!document.querySelector('bdl-switcher'));
    const rest = onPortalPage ? await checkRestStillWorks(page, ['cottagecore']) : { row: null, restMs: null, ok: false };
    const bug = !onPortalPage || !rest.ok;
    const out = { run, pathAtLeave, landedPath, bfcacheRestored: bfcache, restRow: rest.row, restMs: rest.restMs, bug };
    console.log(`e (bfcache-full-load) run ${run}: left mid-load at ${pathAtLeave}, back landed at ${landedPath}, bfcache-restored ${bfcache}; rest on ${rest.row ?? 'n/a'} drew in ${rest.restMs ?? 'never'} ms -> ${bug ? 'BUG' : 'ok'}`);
    return out;
  } finally {
    await browser.close();
  }
}

async function caseContactForm(run) {
  const { browser, page } = await start();
  try {
    await page.goto(`${base}/t/cottagecore/contact/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await page.fill('#cf-name', 'Probe Runner');
    await page.fill('#cf-email', 'probe@example.com');
    await page.fill('#cf-message', 'Adversarial review probe, case f.');
    // The honeypot: filled, as a bot would (per the brief). Its input id is
    // theme-scoped (ContactHidden.astro): cf-company-<theme>.
    const hp = page.locator('input[name="company"]');
    await hp.evaluate((el) => el.removeAttribute('tabindex')); // just to make fill() happy on an off-screen field
    await hp.fill('I am a bot');
    const [resp] = await Promise.all([
      page.waitForResponse((r) => r.request().isNavigationRequest(), { timeout: 15000 }),
      page.click('button[type="submit"]'),
    ]);
    const code = resp.status();
    await page.waitForLoadState('load');
    await page.waitForTimeout(300);
    await page.goBack({ timeout: 15000 }).catch(() => {});
    await page.waitForFunction(() => location.pathname === '/t/cottagecore/contact/', null, { timeout: 15000, polling: 20 }).catch(() => {});
    const landedPath = await page.evaluate(() => location.pathname);
    await page.waitForTimeout(500);
    let rest = { row: null, restMs: null, ok: true };
    if (landedPath === '/t/cottagecore/contact/' && await page.evaluate(() => !!document.querySelector('bdl-switcher'))) {
      rest = await checkRestStillWorks(page, ['cottagecore']);
    }
    const expected404or405 = code === 404 || code === 405;
    const bug = !expected404or405 || !rest.ok;
    const out = { run, submitStatus: code, expected404or405, landedPath, restRow: rest.row, restMs: rest.restMs, bug };
    console.log(`f (contact-form) run ${run}: submit responded ${code} (expected 404/405: ${expected404or405}), Back landed ${landedPath}, rest on ${rest.row ?? 'n/a'} drew in ${rest.restMs ?? 'never'} ms -> ${bug ? 'BUG' : 'ok'}`);
    return out;
  } finally {
    await browser.close();
  }
}

const runners = { a: caseSlowLoadThenBack, b: caseAbortedNav, c: caseFiveShuffles, d: caseKeyboardTriple, e: caseBfcacheFullLoad, f: caseContactForm };
const results = { base, latency, cases: {} };
for (const c of cases) {
  if (!runners[c]) continue;
  results.cases[c] = [await runners[c](1)];
}
const outDir = join(HERE, '..', '.out', label);
await mkdir(outDir, { recursive: true });
await writeFile(join(outDir, `${tag}.json`), JSON.stringify(results, null, 2));
const all = Object.values(results.cases).flat();
const bugs = all.filter((r) => r.bug).length;
console.log(`\n${tag}: ${bugs} of ${all.length} cases show a bug (${join(outDir, `${tag}.json`)})`);
process.exitCode = bugs ? 1 : 0;
