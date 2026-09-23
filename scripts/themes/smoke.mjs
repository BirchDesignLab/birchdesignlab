/**
 * Drive the /t/ portal the way a visitor does and fail on anything broken.
 *
 * Written 09-22-26 for the theme-schools build. The portal's hard parts only
 * exist at runtime, under the ClientRouter: attributes the router wipes on
 * every swap (F001), scripts that must re-run per page (F004), a persisted
 * switcher, per-school WebGL backgrounds that must not leak contexts, scroll
 * and focus handling (F023). No build-time test can see any of it.
 *
 * For every school (read from the portal's own school list):
 *   1. hard-load /t/<id>/ and check the <html> contract;
 *   2. walk home -> about -> services -> contact -> home by clicking the
 *      school's own header links, checking after each swap that it WAS a
 *      client-side swap, the contract survived, focus moved into <main>,
 *      and the switcher is the same element instance;
 *   3. flip the scheme from the switcher and check it sticks across a swap.
 * Then across schools: switch school from the switcher on a scrolled page
 * (scroll position carried proportionally), Shuffle (history replaced, not
 * pushed), Back and Forward, and 24 rapid school changes, after which live
 * WebGL contexts must not exceed the canvases on the page.
 * The portal runtime, on every swap it records (added 09-23-26 for Tier 3
 * stage 1): data-to-theme names the destination when the view transition
 * starts, data-from-theme names the school left when it is ready and is gone
 * once it has finished, and at rest nothing but the wordmark and the
 * switcher carries a view-transition name. The switcher: its busy state is
 * gone after the new page loads, a school picked from the dialog after its
 * warm-up comes from memory (no second fetch of its HTML), and the dialog
 * closes when Back navigates away under it.
 * Throughout: zero page errors, zero console errors, zero failed requests
 * (a cancelled prefetch, or a warm-up cancelled by a hard load, is listed
 * but not failed: see the requestfailed handler).
 *
 * Usage (serve a build, e.g. the "preview" launch config on :4400):
 *   BDL_GPU=1 node scripts/themes/smoke.mjs --base http://localhost:4400 [--schools quiet,swiss] [--headed]
 *   add --contact against `npm run dev:worker` (http://localhost:8787) to submit every school's form
 */
import { chromium } from 'playwright';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}
const base = arg('base', 'http://localhost:4400').replace(/\/$/, '');
const only = (arg('schools', '') || '').split(',').filter(Boolean);
const useGpu = process.env.BDL_GPU === '1';

const browser = await chromium.launch({
  headless: !process.argv.includes('--headed'),
  args: useGpu ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] : [],
});
const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: 'dark' });
await context.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
await context.addInitScript(() => {
  // Count WebGL contexts made and released, per page lifetime (resets on hard load).
  window.__gl = { made: 0, released: 0 };
  const getContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
    const had = this.__glCounted;
    const ctx = getContext.call(this, type, ...rest);
    if (ctx && /webgl/.test(type) && !had) {
      this.__glCounted = true;
      window.__gl.made++;
      const ext = ctx.getExtension('WEBGL_lose_context');
      if (ext) {
        const lose = ext.loseContext.bind(ext);
        ext.loseContext = () => { window.__gl.released++; lose(); };
      }
    }
    return ctx;
  };
  // Mark each completed router swap so the script can wait for it.
  document.addEventListener('astro:page-load', () => { window.__loads = (window.__loads || 0) + 1; });
  // Record the naming attributes around every view transition: when it
  // starts (the old page is captured), when it is ready (the pseudo-elements
  // exist) and when it has finished, plus what is named once at rest.
  const start = Document.prototype.startViewTransition;
  if (start) {
    Document.prototype.startViewTransition = function (...args) {
      const html = document.documentElement;
      const rec = { to: html.dataset.toTheme ?? null };
      (window.__vts ||= []).push(rec);
      const vt = start.apply(this, args);
      const named = () =>
        [...document.querySelectorAll('body *')]
          .filter((el) => el.tagName !== 'BDL-SWITCHER' && !el.hasAttribute('data-astro-transition-scope'))
          .map((el) => getComputedStyle(el).viewTransitionName)
          .filter((n) => n && n !== 'none');
      vt.ready.then(() => {
        rec.readyTheme = html.dataset.theme ?? null;
        rec.readyFrom = html.dataset.fromTheme ?? null;
        rec.namedWhenReady = named();
      }, () => {});
      // A task later, so the runtime's own `finished` handler (registered
      // after this one) has had its turn.
      const settled = new Promise((resolve) => vt.finished.then(() => setTimeout(resolve, 0), () => resolve()));
      settled.then(() => {
        rec.finishedFrom = html.dataset.fromTheme ?? null;
        rec.finishedTo = html.dataset.toTheme ?? null;
        rec.namedAtRest = named();
        rec.done = true;
      });
      return vt;
    };
  }
  try { localStorage.clear(); } catch {}
});

const page = await context.newPage();
const problems = [];
page.on('pageerror', (e) => problems.push(`pageerror ${page.url()}: ${e.message}`));
page.on('console', (m) => {
  if (m.type() === 'error' && !m.text().includes('net::ERR_FAILED')) problems.push(`console ${page.url()}: ${m.text()}`);
});
/* Two kinds of cancelled load are not failures, and only these two are let
   through, each counted and printed so they stay visible:
   - a speculative load (Sec-Purpose: prefetch) cancelled mid-flight. Astro's
     hover prefetch can fire just after a click, for the page being opened,
     and the swap drops its <link rel=prefetch> from the head;
   - one of the portal's warm-ups (a fetch() for a /t/ page or an /_astro/
     file) cancelled because this script hard-loaded another page. A page
     being torn down cancels its fetches whatever the runtime does.
   Anything else aborted (a router fetch, a stylesheet, a warm-up cancelled
   while the page lives on) is still a failure. */
let unloading = false;
const letThrough = [];
page.on('requestfailed', async (r) => {
  if (r.url().includes('/cdn-cgi/zaraz/')) return;
  const text = r.failure()?.errorText ?? '';
  const where = page.url();
  if (text === 'net::ERR_ABORTED') {
    const purpose = (await r.allHeaders().catch(() => ({})))['sec-purpose'] ?? '';
    if (/prefetch/.test(purpose)) return void letThrough.push(`aborted prefetch ${r.url()}`);
    const path = new URL(r.url()).pathname;
    const warmUp = r.resourceType() === 'fetch' && r.method() === 'GET' && /^\/(t|_astro)\//.test(path);
    if (warmUp && unloading) return void letThrough.push(`warm-up cancelled by a hard load ${r.url()}`);
  }
  problems.push(`requestfailed ${where}: ${r.method()} ${r.resourceType()} ${r.url()} ${text}`);
});

let failures = 0;
const check = (ok, label, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${detail ? `  ${detail}` : ''}`);
};

const state = () =>
  page.evaluate(() => {
    const html = document.documentElement;
    const sw = document.querySelector('bdl-switcher');
    return {
      path: location.pathname,
      theme: html.dataset.theme,
      scheme: html.dataset.scheme,
      js: html.classList.contains('js'),
      reveal: html.classList.contains('reveal-on'),
      loads: window.__loads || 0,
      focusMain: document.activeElement?.id === 'main',
      switcherId: sw ? (sw.__id ??= Math.random().toString(36).slice(2)) : null,
      switcherLabel: sw?.shadowRoot?.querySelector('.current')?.textContent ?? null,
      gl: { ...window.__gl },
      canvases: document.querySelectorAll('canvas').length,
      hardLoadMarker: window.__hard,
      histLen: history.length,
      scrollRatio: (() => {
        const room = html.scrollHeight - innerHeight;
        return room > 0 ? scrollY / room : 0;
      })(),
    };
  });

async function waitForSwap(prevLoads) {
  await page.waitForFunction((n) => (window.__loads || 0) > n, prevLoads, { timeout: 15000 });
  await page.waitForTimeout(250);
}

/** The last view transition's record, once it has finished. */
async function lastTransition() {
  await page.waitForFunction(() => window.__vts?.at(-1)?.done, null, { timeout: 5000 }).catch(() => {});
  return page.evaluate(() => window.__vts?.at(-1) ?? null);
}

/** The naming contract around the swap just made, from `fromId` to `toId`. */
async function checkNaming(label, fromId, toId) {
  const t = await lastTransition();
  check(
    !!t && t.to === toId && t.readyTheme === toId && t.readyFrom === fromId,
    `${label}: data-to-theme at capture, data-from-theme when ready`,
    JSON.stringify(t && { to: t.to, readyTheme: t.readyTheme, readyFrom: t.readyFrom }),
  );
  check(!!t && t.finishedFrom === null && t.finishedTo === null, `${label}: both attributes gone once the transition finished`, JSON.stringify(t && { from: t.finishedFrom, to: t.finishedTo }));
  check(!!t && t.namedAtRest?.length === 0, `${label}: nothing but the wordmark and the switcher named at rest`, JSON.stringify(t?.namedAtRest));
  // A school's own <id>-* chrome is named only on an in-school swap.
  const chrome = t?.namedWhenReady ?? [];
  const ok = fromId === toId ? chrome.every((n) => n.startsWith(`${toId}-`)) : chrome.length === 0;
  check(ok, `${label}: school chrome named only in-school`, JSON.stringify(chrome));
  // Vaporwave's taskbar is the one piece of named chrome today (README).
  if (fromId === toId && toId === 'vaporwave') check(chrome.includes('vaporwave-taskbar'), `${label}: the taskbar is named for the swap`, JSON.stringify(chrome));
}

const busyControls = () =>
  page.evaluate(() => [...document.querySelector('bdl-switcher').shadowRoot.querySelectorAll('[aria-busy]')].map((el) => el.className));

async function hardLoad(path) {
  unloading = true;
  await page.goto(base + path, { waitUntil: 'networkidle' }).finally(() => { unloading = false; });
  await page.evaluate(() => { window.__hard = Math.random(); });
  await page.waitForTimeout(300);
}

// The portal's own school list.
await hardLoad('/t/quiet/');
const schools = (await page.evaluate(() => JSON.parse(document.getElementById('bdl-schools').textContent).schools)).map((s) => s.id);
const targets = only.length ? schools.filter((s) => only.includes(s)) : schools;
check(targets.length > 0, 'portal lists schools', schools.join(', '));

const WALK = [
  ['about', 'about/'],
  ['services', 'services/'],
  ['contact', 'contact/'],
  ['home', ''],
];

for (const id of targets) {
  await hardLoad(`/t/${id}/`);
  let s = await state();
  check(s.theme === id && !!s.scheme && s.js, `${id}: hard load contract`, JSON.stringify({ theme: s.theme, scheme: s.scheme, js: s.js }));
  const marker = s.hardLoadMarker;
  const switcher = s.switcherId;

  for (const [name, seg] of WALK) {
    const href = `/t/${id}/${seg}`;
    const before = await state();
    const link = page.locator(`header a[href="${href}"], nav a[href="${href}"], a[href="${href}"]`).first();
    if ((await link.count()) === 0) {
      check(false, `${id}: link to ${name}`, `no <a href="${href}"> on ${before.path}`);
      continue;
    }
    await link.click();
    await waitForSwap(before.loads);
    s = await state();
    check(
      s.path === href && s.hardLoadMarker === marker && s.theme === id && s.scheme === before.scheme && s.js,
      `${id}: client nav to ${name}`,
      JSON.stringify({ path: s.path, swapped: s.hardLoadMarker === marker, theme: s.theme, scheme: s.scheme, js: s.js }),
    );
    check(s.switcherId === switcher, `${id}: switcher persisted to ${name}`);
    check(s.focusMain, `${id}: focus moved into main on ${name}`);
    if (name === 'about') await checkNaming(`${id}: in-school swap`, id, id);
  }

  // Four swaps through pages with and without WebGL fields: every context a
  // page made must have been released when it left.
  s = await state();
  check(s.gl.made - s.gl.released <= s.canvases, `${id}: no leaked WebGL contexts after the walk`, `made ${s.gl.made}, released ${s.gl.released}, canvases now ${s.canvases}`);

  // Scheme from the switcher, then survive a swap.
  const before = await state();
  await page.evaluate(() => document.querySelector('bdl-switcher').shadowRoot.querySelector('.scheme').click());
  s = await state();
  check(s.scheme !== before.scheme, `${id}: switcher flips scheme`, `${before.scheme} -> ${s.scheme}`);
  const flipped = s.scheme;
  const link = page.locator(`a[href="/t/${id}/about/"]`).first();
  await link.click();
  await waitForSwap(s.loads);
  s = await state();
  check(s.scheme === flipped, `${id}: scheme survives the swap`, s.scheme);
  const stored = await page.evaluate(() => localStorage.getItem('scheme'));
  check(stored === flipped, `${id}: scheme persisted`, stored);
}

// Across schools.
if (schools.length > 1) {
  const [a, b] = schools.includes('quiet') ? ['quiet', schools.find((x) => x !== 'quiet')] : schools;
  await hardLoad(`/t/${a}/services/`);
  await page.evaluate(() => scrollTo({ top: (document.documentElement.scrollHeight - innerHeight) * 0.5, behavior: 'instant' }));
  await page.waitForTimeout(200);
  let s = await state();
  const marker = s.hardLoadMarker;
  await page.evaluate(() => document.querySelector('bdl-switcher').shadowRoot.querySelector('.open').click());
  await page.evaluate((id) => document.querySelector('bdl-switcher').shadowRoot.querySelector(`a[data-school="${id}"]`).click(), b);
  await waitForSwap(s.loads);
  s = await state();
  check(s.theme === b && s.path === `/t/${b}/services/` && s.hardLoadMarker === marker, `switch ${a} -> ${b} keeps the page, client-side`, s.path);
  check(Math.abs(s.scrollRatio - 0.5) < 0.12, 'scroll position carried proportionally', s.scrollRatio.toFixed(2));
  await checkNaming(`switch ${a} -> ${b}`, a, b);
  check((await busyControls()).length === 0, 'the busy state is gone once the new page has loaded', JSON.stringify(await busyControls()));
  check(s.switcherLabel === (await page.evaluate((id) => JSON.parse(document.getElementById('bdl-schools').textContent).schools.find((x) => x.id === id).name, b)), 'switcher names the new school');

  const hist = s.histLen;
  await page.evaluate(() => document.querySelector('bdl-switcher').shadowRoot.querySelector('.shuffle').click());
  await waitForSwap(s.loads);
  s = await state();
  const shuffled = s.theme;
  check(s.theme !== b && s.path.endsWith('/services/'), 'shuffle lands on another school, same page', s.path);
  check(s.histLen === hist, 'shuffle replaces history rather than pushing', `${hist} -> ${s.histLen}`);

  await page.goBack();
  await page.waitForTimeout(900);
  s = await state();
  check(s.theme === a && s.js && !!s.scheme, 'Back returns to the first school with the contract intact', JSON.stringify({ theme: s.theme, scheme: s.scheme }));
  await page.goForward();
  await page.waitForTimeout(900);
  s = await state();
  check(s.theme === shuffled && s.js && !!s.scheme, 'Forward returns to the shuffled school', s.theme);

  // A pick from the dialog after its warm-up comes from memory: the page's
  // HTML is fetched once, by the warm-up, and not again by the router.
  await hardLoad(`/t/${a}/about/`);
  const target = `/t/${b}/about/`;
  const fetched = [];
  const onRequest = (r) => { if (new URL(r.url()).pathname === target) fetched.push(r.resourceType()); };
  page.on('request', onRequest);
  const warmed = page.waitForResponse((r) => new URL(r.url()).pathname === target, { timeout: 10000 }).catch(() => null);
  await page.evaluate(() => document.querySelector('bdl-switcher').shadowRoot.querySelector('.open').click());
  check(!!(await warmed), `opening the dialog warms ${target}`);
  await page.waitForTimeout(1500); // its files too
  s = await state();
  await page.evaluate((id) => document.querySelector('bdl-switcher').shadowRoot.querySelector(`a[data-school="${id}"]`).click(), b);
  await waitForSwap(s.loads);
  page.off('request', onRequest);
  s = await state();
  check(s.path === target && fetched.length === 1, 'a warmed pick is not fetched again', `${s.path}, fetched ${fetched.length}x`);

  // Back with the dialog open closes it: the visitor did not pick the page
  // Back goes to from the dialog.
  await page.evaluate(() => document.querySelector('bdl-switcher').shadowRoot.querySelector('.open').click());
  s = await state();
  await page.goBack();
  await page.waitForFunction((n) => (window.__loads || 0) > n, s.loads, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(300);
  const dialogOpen = await page.evaluate(() => document.querySelector('bdl-switcher').shadowRoot.querySelector('dialog').open);
  check(!dialogOpen && (await state()).path === `/t/${a}/about/`, 'Back with the dialog open closes it', `open ${dialogOpen}`);

  // Churn: rapid school changes on the home page (where the backgrounds live),
  // then count live WebGL contexts.
  await hardLoad(`/t/${a}/`);
  for (let i = 0; i < 24; i++) {
    const n = (await state()).loads;
    await page.evaluate(() => document.querySelector('bdl-switcher').shadowRoot.querySelector('.shuffle').click());
    await waitForSwap(n);
  }
  await page.waitForTimeout(600);
  s = await state();
  const live = s.gl.made - s.gl.released;
  check(live <= s.canvases, 'no leaked WebGL contexts after 24 school changes', `made ${s.gl.made}, released ${s.gl.released}, canvases now ${s.canvases}`);
}

// Contact: with --contact (serve through `npm run dev:worker`, so /api/contact
// exists), submit each school's form as a bot would, honeypot filled, so the
// Worker takes its no-email path. It must be a real navigation (the form opts
// out of the router) that lands on that school's own sent page.
if (process.argv.includes('--contact')) {
  for (const id of targets) {
    await hardLoad(`/t/${id}/contact/`);
    const marker = (await state()).hardLoadMarker;
    await page.evaluate(() => {
      const form = document.querySelector('form[action="/api/contact"]');
      form.querySelector('[name="name"]').value = 'Smoke Test';
      form.querySelector('[name="email"]').value = 'smoke@example.com';
      form.querySelector('[name="message"]').value = 'Portal smoke test.';
      form.querySelector('[name="company"]').value = 'honeypot';
    });
    await Promise.all([
      page.waitForURL(`**/t/${id}/contact/sent/`, { timeout: 15000 }).catch(() => {}),
      page.evaluate(() => document.querySelector('form[action="/api/contact"] [type="submit"]').click()),
    ]);
    await page.waitForLoadState('networkidle');
    const s = await state();
    check(s.path === `/t/${id}/contact/sent/` && s.theme === id, `${id}: contact form lands on its own sent page`, s.path);
    check(s.hardLoadMarker !== marker, `${id}: contact submit was a real navigation, not a router swap`);
  }
}

// Leaving: the switcher's Leave goes to the same page on the root site, full load.
await hardLoad('/t/quiet/about/');
const leaveHref = await page.evaluate(() => document.querySelector('bdl-switcher').shadowRoot.querySelector('.leave').getAttribute('href'));
check(leaveHref === '/about/', 'Leave points at the same page on the root site', leaveHref);

await browser.close();
if (letThrough.length) {
  console.log(`${letThrough.length} cancelled loads let through (not failures):`);
  for (const p of letThrough) console.log(`  ${p}`);
}
if (problems.length) {
  failures += problems.length;
  console.log(`${problems.length} runtime problems:`);
  for (const p of problems) console.log(`  ${p}`);
}
console.log(failures ? `${failures} FAILED` : 'all passed');
process.exitCode = failures ? 2 : 0;
