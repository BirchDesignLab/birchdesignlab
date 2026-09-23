// P4 remedy harness (Tier 3 stage 1, B4; kept in the repo 09-23-26 per the scripts rule): bundles the real Astro 7.3.4 router with the
// working-tree runtime.ts and switcher.ts, serves the HEAD dist through
// Playwright interception with added HTML latency, and checks the warming,
// the memory loader, Shuffle's pick and the busy state. No server, no build.
import { createRequire } from 'node:module';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const REPO = 'C:/git/birchdesignlab';
const require = createRequire(`${REPO}/package.json`);
const esbuild = require('esbuild');
const { chromium } = require('playwright');
const OUT = join(import.meta.dirname, '..', '.out', 'harness-p4');
mkdirSync(OUT, { recursive: true });
const HTML_DELAY = Number(process.env.HTML_DELAY ?? 150);

const AST = `${REPO}/node_modules/astro/dist/transitions`;
const stubs = {
  name: 'stubs',
  setup(b) {
    b.onResolve({ filter: /^astro:transitions\/client$/ }, () => ({ path: 'client', namespace: 'stub' }));
    b.onResolve({ filter: /^virtual:astro:adapter-config\/client$/ }, () => ({ path: 'adapter', namespace: 'stub' }));
    b.onLoad({ filter: /^client$/, namespace: 'stub' }, () => ({
      contents: `export { navigate, supportsViewTransitions, transitionEnabledOnThisPage } from '${AST}/router.js';
export { TransitionBeforePreparationEvent, TransitionBeforeSwapEvent } from '${AST}/events.js';`,
      loader: 'js',
      resolveDir: REPO,
    }));
    b.onLoad({ filter: /^adapter$/, namespace: 'stub' }, () => ({ contents: 'export const internalFetchHeaders = {};', loader: 'js' }));
  },
};
const entry = `
import { initPortal } from '${REPO}/src/themes/portal/runtime.ts';
import '${REPO}/src/themes/portal/switcher.ts';
// timing marks on one clock
const t = (window.__marks = []);
const mark = (n) => t.push([n, performance.now()]);
for (const n of ['astro:before-preparation', 'astro:after-preparation', 'astro:before-swap', 'astro:after-swap', 'astro:page-load'])
  document.addEventListener(n, () => mark(n));
const svt = document.startViewTransition.bind(document);
document.startViewTransition = (cb) => { mark('startViewTransition'); const vt = svt(cb); vt.ready.then(() => mark('ready'), () => {}); return vt; };
initPortal();
`;
const bundle = await esbuild.build({
  stdin: { contents: entry, resolveDir: REPO, loader: 'ts' },
  bundle: true, write: false, format: 'esm', platform: 'browser', plugins: [stubs],
  define: { 'import.meta.env.SSR': 'false', 'import.meta.env.DEV': 'false' },
});
const js = bundle.outputFiles[0].text;

function fileFor(pathname) {
  let p = join(REPO, 'dist', decodeURIComponent(pathname));
  if (pathname.endsWith('/')) p = join(p, 'index.html');
  return existsSync(p) ? p : null;
}
const types = { '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2', '.html': 'text/html; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.json': 'application/json' };

const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const results = {};

async function newPage() {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => { try { sessionStorage.setItem('bdl-portal-prompt', 'dismissed'); } catch {} });
  const log = [];
  let slow = null; // { path, ms } for an extra-slow HTML
  await ctx.route('http://portal.test/**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.pathname === '/harness.js') return route.fulfill({ contentType: 'text/javascript', body: js });
    const f = fileFor(url.pathname);
    if (!f) return route.fulfill({ status: 404, body: 'nope' });
    const ext = f.slice(f.lastIndexOf('.'));
    const isHtml = ext === '.html';
    const at = Date.now();
    if (isHtml) await new Promise((r) => setTimeout(r, slow && (slow.path === '*' || slow.path === url.pathname) ? slow.ms : HTML_DELAY));
    let body = readFileSync(f);
    if (isHtml) {
      body = body.toString()
        .replace(/<script type="module" src="\/_astro\/ClientRouter[^"]*"><\/script>/, '')
        .replace(/<script type="module" src="\/_astro\/PortalLayout[^"]*"><\/script>/, '<script type="module" src="/harness.js"></script>');
    }
    log.push({ path: url.pathname, type: req.resourceType(), at });
    try { await route.fulfill({ contentType: types[ext] ?? 'application/octet-stream', body }); } catch {}
  });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(String(e)));
  p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`); });
  return { ctx, p, log, errors, setSlow: (s) => (slow = s) };
}
const sw = (p, fn) => p.evaluate(fn);
const html = (log, since) => log.filter((r) => r.path.startsWith('/t/') && r.at >= since).map((r) => r.path);

// 1. Dialog open warms every other school's same page, then a dialog pick loads from memory.
{
  const { ctx, p, log, errors } = await newPage();
  await p.goto('http://portal.test/t/quiet/about/');
  await p.waitForTimeout(500);
  const t0 = Date.now();
  await sw(p, () => document.querySelector('bdl-switcher').shadowRoot.querySelector('.open').click());
  await p.waitForTimeout(2500);
  const warmedHtml = html(log, t0);
  const warmedFiles = log.filter((r) => r.at >= t0 && !r.path.startsWith('/t/')).map((r) => r.path);
  const t1 = Date.now();
  const click = await sw(p, () => {
    const r = document.querySelector('bdl-switcher').shadowRoot;
    window.__marks.length = 0;
    const t = performance.now();
    r.querySelector('a[data-school="vaporwave"]').click();
    return { t, busyAtClick: r.querySelector('.open').getAttribute('aria-busy') };
  });
  await p.waitForFunction(() => window.__marks.some(([n]) => n === 'astro:page-load'));
  const after = await sw(p, () => ({
    path: location.pathname, theme: document.documentElement.dataset.theme,
    busy: document.querySelector('bdl-switcher').shadowRoot.querySelector('.open').getAttribute('aria-busy'),
    marks: window.__marks, sheets: [...document.querySelectorAll('link[rel=stylesheet]')].map((l) => l.getAttribute('href')),
    label: document.querySelector('bdl-switcher').shadowRoot.querySelector('.current').textContent,
  }));
  const rel = Object.fromEntries(after.marks.map(([n, t]) => [n, Math.round(t - click.t)]));
  results.dialog = { warmedHtml, warmedFiles, htmlFetchedOnClick: html(log, t1), busyAtClick: click.busyAtClick, after: { ...after, marks: rel }, errors };
  await ctx.close();
}

// 2. The same pick with nothing warmed (the old path), for the comparison.
{
  const { ctx, p, log, errors } = await newPage();
  await p.goto('http://portal.test/t/quiet/about/');
  await p.waitForTimeout(500);
  // Open the dialog without warming: showModal directly.
  await sw(p, () => document.querySelector('bdl-switcher').shadowRoot.querySelector('dialog').showModal());
  const t1 = Date.now();
  const click = await sw(p, () => { window.__marks.length = 0; const t = performance.now(); document.querySelector('bdl-switcher').shadowRoot.querySelector('a[data-school="vaporwave"]').click(); return { t }; });
  await p.waitForFunction(() => window.__marks.some(([n]) => n === 'astro:page-load'));
  const marks = await sw(p, () => window.__marks);
  results.cold = { htmlFetchedOnClick: html(log, t1), marks: Object.fromEntries(marks.map(([n, t]) => [n, Math.round(t - click.t)])), errors };
  await ctx.close();
}

// 3. Shuffle: pointing picks and warms; the click takes that pick and replaces the history entry.
{
  const { ctx, p, log, errors } = await newPage();
  await p.goto('http://portal.test/t/swiss/services/');
  await p.waitForTimeout(500);
  const len0 = await sw(p, () => history.length);
  const t0 = Date.now();
  await p.hover('bdl-switcher .shuffle');
  await p.waitForTimeout(1200);
  const warmed = html(log, t0);
  const t1 = Date.now();
  await p.click('bdl-switcher .shuffle');
  const busy = await sw(p, () => document.querySelector('bdl-switcher').shadowRoot.querySelector('.shuffle').getAttribute('aria-busy'));
  await p.waitForFunction((from) => location.pathname !== from, '/t/swiss/services/');
  await p.waitForTimeout(600);
  const s = await sw(p, () => ({ path: location.pathname, len: history.length, busy: document.querySelector('bdl-switcher').shadowRoot.querySelector('.shuffle').getAttribute('aria-busy') }));
  // Still hovering: the next pick is warmed at page-load.
  await p.waitForTimeout(1200);
  const t2 = Date.now() - 1800;
  const rewarm = html(log, t2).filter((x) => x !== s.path);
  // Shuffle ten more times, pointer resting on it: never the current school, never a history push.
  const walk = [];
  for (let i = 0; i < 10; i++) {
    const from = await sw(p, () => location.pathname);
    await p.waitForTimeout(400);
    const tc = Date.now();
    await p.click('bdl-switcher .shuffle');
    await p.waitForFunction((f) => location.pathname !== f, from);
    const to = await sw(p, () => location.pathname);
    await p.waitForTimeout(400);
    const before = log.filter((r) => r.path === to && r.at < tc).length;
    const atClick = log.filter((r) => r.path === to && r.at >= tc).length;
    walk.push({ to, warmedBefore: before > 0, fetchedAtClick: atClick });
  }
  const len1 = await sw(p, () => history.length);
  results.shuffle = { warmedOnHover: warmed, busyAtClick: busy, landed: s, htmlFetchedOnClick: html(log, t1).filter((x) => x === s.path).length, rewarmAfterLoad: rewarm, walk, historyLength: [len0, s.len, len1], errors };
  await ctx.close();
}

// 4. Abandoned: a second switcher navigation takes over a slow one; busy moves, then clears.
{
  const { ctx, p, errors, setSlow } = await newPage();
  await p.goto('http://portal.test/t/quiet/');
  await p.waitForTimeout(500);
  setSlow({ path: '*', ms: 1200 });
  const target = await sw(p, () => {
    window.__marks.length = 0;
    const r = document.querySelector('bdl-switcher').shadowRoot;
    r.querySelector('.shuffle').click(); // programmatic: no pointerenter, nothing warmed
    return location.pathname;
  });
  const mid = await sw(p, () => {
    const r = document.querySelector('bdl-switcher').shadowRoot;
    const a = { shuffle: r.querySelector('.shuffle').getAttribute('aria-busy'), open: r.querySelector('.open').getAttribute('aria-busy') };
    r.querySelector('dialog').showModal();
    const other = [...r.querySelectorAll('a[data-school]')].find((x) => x.dataset.school !== 'quiet');
    other.click();
    return { before: a, after: { shuffle: r.querySelector('.shuffle').getAttribute('aria-busy'), open: r.querySelector('.open').getAttribute('aria-busy') }, went: other.dataset.school };
  });
  await p.waitForFunction(() => window.__marks.some(([n]) => n === 'astro:page-load'));
  await p.waitForTimeout(300);
  const end = await sw(p, () => {
    const r = document.querySelector('bdl-switcher').shadowRoot;
    return { path: location.pathname, shuffle: r.querySelector('.shuffle').getAttribute('aria-busy'), open: r.querySelector('.open').getAttribute('aria-busy'), pageLoads: window.__marks.filter(([n]) => n === 'astro:page-load').length };
  });
  results.abandon = { startedFrom: target, mid, end, errors };
  await ctx.close();
}

// 5. The busy cue does not move the bar, and paints (screenshot of the bar mid-load).
{
  const { ctx, p, errors, setSlow } = await newPage();
  await p.goto('http://portal.test/t/quiet/');
  await p.waitForTimeout(500);
  setSlow({ path: '/t/bauhaus/', ms: 1500 });
  const box = () => sw(p, () => { const r = document.querySelector('bdl-switcher').shadowRoot; return [r.querySelector('.bar'), ...r.querySelector('.bar').children].map((el) => { const b = el.getBoundingClientRect(); return [b.x, b.y, b.width, b.height].map((n) => Math.round(n * 100) / 100).join(','); }); });
  const b0 = await box();
  await sw(p, () => { window.__marks.length = 0; const r = document.querySelector('bdl-switcher').shadowRoot; r.querySelector('dialog').showModal(); r.querySelector('a[data-school="bauhaus"]').click(); });
  await p.waitForTimeout(250);
  const b1 = await box();
  results.busyStyle = await sw(p, () => {
    const o = document.querySelector('bdl-switcher').shadowRoot.querySelector('.open');
    const a = getComputedStyle(o, '::after');
    return { busy: o.getAttribute('aria-busy'), bg: getComputedStyle(o).backgroundColor, pos: getComputedStyle(o).position, after: [a.content, a.position, a.height, a.width, a.backgroundImage.slice(0, 60), a.backgroundPosition, a.animationName], html: document.documentElement.getAttribute('data-astro-transition') };
  });
  const bar = await p.$('bdl-switcher');
  await bar.screenshot({ path: join(OUT, 'busy-open-a.png') });
  await p.waitForTimeout(300);
  await bar.screenshot({ path: join(OUT, 'busy-open-b.png') });
  await p.waitForFunction(() => window.__marks.some(([n]) => n === 'astro:page-load'));
  await p.waitForTimeout(800);
  const b2 = await box();
  await bar.screenshot({ path: join(OUT, 'busy-open-after.png') });
  results.noShift = { same: JSON.stringify(b0) === JSON.stringify(b1) && JSON.stringify(b1) === JSON.stringify(b2), b0, b1, b2, errors };
  await ctx.close();
}

await browser.close();
console.log(JSON.stringify(results, null, 1));
