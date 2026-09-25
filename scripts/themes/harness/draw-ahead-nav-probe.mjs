/**
 * Reproduce the two drawing-ahead bugs the Stage 2 review's code lens found,
 * so their fix can be shown before and after on real builds.
 *
 * Written 09-24-26 for the Tier 3 stage 2 wrap-up (stage2-report.md,
 * "Decisions for the founder" 1; the founder: fix both before merging).
 *
 *   load     (code-1) a slow in-school navigation (cottagecore Home to About,
 *            its HTML held --latency ms through the CDP Fetch domain: network
 *            emulation would also make navigator.connection read as 2G, and
 *            the runtime rightly warms and draws nothing there), with the
 *            mouse moved onto
 *            Shuffle the moment the link is clicked and held there through
 *            the load. Shuffle's pick is warmed first, so a rest can draw at
 *            once. Before the fix a copy goes up while the next page loads
 *            and is swapped away with the old body; the runtime then thinks
 *            a copy is still up. After landing, the pointer is moved off
 *            Shuffle and back: its rest must draw within about 400 ms (not
 *            be blocked).
 *   refocus  (code-2) Safari's and Firefox's path, emulated in Chromium by
 *            removing Element.prototype.moveBefore (Astro's swap then
 *            re-parents the switcher with appendChild, which drops focus,
 *            and the switcher puts it back). Keyboard focus on Shuffle
 *            (its 500 ms focus rest draws the pick, which is right), Enter,
 *            and after landing: before the fix a second copy goes up about
 *            500 ms later, of a school the next Shuffle does not go to.
 *            Enter again says where Shuffle really goes.
 *
 * Every copy is recorded as it goes up, with its school and its time against
 * the router's events, from an init script (the page's own timing).
 *
 * Usage (serve a snapshot):
 *   BDL_GPU=1 node scripts/themes/snap.mjs --name <snap> --reuse --port 4680 -- \
 *     node scripts/themes/harness/draw-ahead-nav-probe.mjs [--cases load,refocus] [--runs 3] \
 *     [--latency 1500] [--label nav-probe] [--tag <snap>]
 * Output: scripts/themes/.out/<label>/<tag>.json, and a verdict line per run.
 * Exit 1 when a run shows either bug.
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
const cases = arg('cases', 'load,refocus').split(',').filter(Boolean);
const runs = Number(arg('runs', '3'));
const latency = Number(arg('latency', '1500'));
const label = arg('label', 'nav-probe');
const tag = arg('tag', 'probe');
const useGpu = process.env.BDL_GPU === '1';
const COPY = 'iframe[aria-hidden="true"][sandbox]';

/** Recorded in every document the window shows: copies going up, and the
    router's events, on the page's clock. */
const RECORDER = `(() => {
  const log = (window.__nav = window.__nav || { copies: [], events: [] });
  for (const type of ['astro:before-preparation', 'astro:after-swap', 'astro:page-load'])
    document.addEventListener(type, () => log.events.push({ type, t: performance.now(), path: location.pathname }));
  new MutationObserver((rs) => {
    for (const r of rs) for (const n of r.addedNodes)
      if (n.matches?.('${COPY}')) log.copies.push({ t: performance.now(), theme: (n.srcdoc.match(/data-theme="([^"]+)"/) || [])[1] ?? null });
  }).observe(document, { childList: true, subtree: true }); // no documentElement yet when an init script runs
})();`;

async function start({ noMoveBefore = false } = {}) {
  const browser = await chromium.launch({
    args: ['--hide-scrollbars', ...(useGpu ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] : [])],
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
const nav = (page) => page.evaluate(() => JSON.parse(JSON.stringify(window.__nav)));
const landed = (page, path) => page.waitForFunction(
  (p) => location.pathname === p && window.__nav.events.some((e) => e.type === 'astro:page-load' && e.path === p),
  path, { timeout: 15000, polling: 20 },
);

async function caseLoad(run) {
  const { browser, page, cdp } = await start();
  try {
    await page.goto(`${base}/t/cottagecore/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    // Warm Shuffle's pick (pointing at it warms it) without resting 400 ms.
    const s = await shuffleBox(page);
    await page.mouse.move(s.x, s.y);
    await page.waitForTimeout(250);
    await page.mouse.move(700, 450);
    await page.waitForTimeout(2000);
    const before = (await nav(page)).copies.length;
    // Hold About's HTML (the router's fetch and its hover prefetch alike).
    cdp.on('Fetch.requestPaused', (e) => {
      setTimeout(() => cdp.send('Fetch.continueRequest', { requestId: e.requestId }).catch(() => {}), latency);
    });
    await cdp.send('Fetch.enable', { patterns: [{ urlPattern: '*/t/cottagecore/about/*', requestStage: 'Request' }] });
    const link = page.locator('header a[href="/t/cottagecore/about/"]').first();
    await link.click();
    await page.mouse.move(s.x, s.y, { steps: 2 });
    await landed(page, '/t/cottagecore/about/');
    await cdp.send('Fetch.disable');
    await page.waitForTimeout(1200); // the pointer left still on Shuffle
    const mid = await nav(page);
    const prep = [...mid.events].reverse().find((e) => e.type === 'astro:before-preparation');
    const swap = [...mid.events].reverse().find((e) => e.type === 'astro:after-swap');
    const copies = mid.copies.slice(before);
    const duringLoad = copies.filter((c) => c.t >= prep.t && c.t < swap.t);
    // Chrome sends the still pointer a pointerover once the page under it
    // changes, so a rest on the new page may draw Shuffle's new pick: that
    // is right, if it is the school Shuffle then goes to (checked below).
    const afterStill = copies.filter((c) => c.t >= swap.t).map((c) => c.theme);
    // Drawing ahead is not blocked: rest on a dialog row not drawn yet.
    await page.mouse.move(700, 450);
    await page.evaluate(() => document.querySelector('bdl-switcher').shadowRoot.querySelector('.open').click());
    await page.waitForTimeout(600);
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
    const up = await page.waitForFunction((n) => (window.__nav.copies.length > n ? window.__nav.copies[n].t : false), n0, { timeout: 5000, polling: 10 })
      .then((h) => h.jsonValue(), () => null);
    const restMs = up == null ? null : Math.round(up - t0);
    // Where Shuffle goes from here, against what was drawn for it.
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await page.mouse.click(s.x, s.y);
    await page.waitForFunction(() => location.pathname !== '/t/cottagecore/about/', null, { timeout: 15000, polling: 20 });
    const shuffleWent = (await page.evaluate(() => location.pathname)).split('/')[2];
    const wasted = afterStill.filter((t) => t !== shuffleWent);
    const bug = duringLoad.length > 0 || wasted.length > 0 || restMs == null || restMs > 900;
    const out = {
      run, loadMs: Math.round(swap.t - prep.t), copiesDuringLoad: duringLoad.length, copiesAfterLanding: afterStill,
      shuffleWent, wasted: wasted.length, rowRested: row, rowRestDrewInMs: restMs, bug,
    };
    console.log(`load run ${run}: load ${out.loadMs} ms, copies during the load ${out.copiesDuringLoad}, after landing [${afterStill.join(', ')}] (Shuffle went ${shuffleWent}, wasted ${wasted.length}), rest on ${row} drew in ${restMs ?? 'never (5 s)'} ms -> ${bug ? 'BUG' : 'ok'}`);
    return out;
  } finally {
    await browser.close();
  }
}

async function caseRefocus(run) {
  const { browser, page } = await start({ noMoveBefore: true });
  try {
    await page.goto(`${base}/t/quiet/`, { waitUntil: 'networkidle' });
    const hasMoveBefore = await page.evaluate(() => typeof document.documentElement.moveBefore === 'function');
    await page.waitForTimeout(800);
    await page.evaluate(() => document.querySelector('bdl-switcher').shadowRoot.querySelector('.shuffle').focus());
    await page.waitForTimeout(1500); // the focus rest draws Shuffle's pick: expected
    const first = await nav(page);
    const drawnFirst = first.copies.at(-1)?.theme ?? null;
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => location.pathname !== '/t/quiet/', null, { timeout: 15000, polling: 20 });
    const to1 = await page.evaluate(() => location.pathname);
    await landed(page, to1);
    const refocused = await page.evaluate(() => document.querySelector('bdl-switcher').shadowRoot.activeElement?.className ?? null);
    await page.waitForTimeout(2500); // the arrival finishes, then any refocus rest would fire
    const after = await nav(page);
    const swap = [...after.events].reverse().find((e) => e.type === 'astro:after-swap');
    const late = after.copies.filter((c) => c.t >= swap.t);
    // Where Shuffle really goes next.
    await page.keyboard.press('Enter');
    await page.waitForFunction((p) => location.pathname !== p, to1, { timeout: 15000, polling: 20 });
    const to2 = await page.evaluate(() => location.pathname);
    const next = to2.split('/')[2];
    const wasted = late.filter((c) => c.theme !== next);
    const bug = late.length > 0;
    const out = {
      run, moveBeforeRemoved: !hasMoveBefore, firstDrawn: drawnFirst, firstWent: to1.split('/')[2], refocusedControl: refocused,
      copiesAfterLanding: late.map((c) => c.theme), nextShuffleWent: next, wastedCopies: wasted.length, bug,
    };
    console.log(`refocus run ${run}: moveBefore removed ${out.moveBeforeRemoved}, focus back on ${refocused}; first pick drawn ${drawnFirst}, went ${out.firstWent}; copies after landing [${out.copiesAfterLanding.join(', ')}], next Shuffle went ${next}, wasted ${wasted.length} -> ${bug ? 'BUG' : 'ok'}`);
    return out;
  } finally {
    await browser.close();
  }
}

const results = { base, latency, load: [], refocus: [] };
for (let run = 1; run <= runs; run++) {
  if (cases.includes('load')) results.load.push(await caseLoad(run));
  if (cases.includes('refocus')) results.refocus.push(await caseRefocus(run));
}
const outDir = join(HERE, '..', '.out', label);
await mkdir(outDir, { recursive: true });
await writeFile(join(outDir, `${tag}.json`), JSON.stringify(results, null, 2));
const bugs = [...results.load, ...results.refocus].filter((r) => r.bug).length;
console.log(`\n${tag}: ${bugs} of ${results.load.length + results.refocus.length} runs show a bug (${join(outDir, `${tag}.json`)})`);
process.exitCode = bugs ? 1 : 0;
