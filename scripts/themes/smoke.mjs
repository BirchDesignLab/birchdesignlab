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
 * Throughout: zero page errors, zero console errors, zero failed requests.
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
  try { localStorage.clear(); } catch {}
});

const page = await context.newPage();
const problems = [];
page.on('pageerror', (e) => problems.push(`pageerror ${page.url()}: ${e.message}`));
page.on('console', (m) => {
  if (m.type() === 'error' && !m.text().includes('net::ERR_FAILED')) problems.push(`console ${page.url()}: ${m.text()}`);
});
page.on('requestfailed', (r) => {
  if (r.url().includes('/cdn-cgi/zaraz/')) return;
  problems.push(`requestfailed ${page.url()}: ${r.url()} ${r.failure()?.errorText}`);
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

async function hardLoad(path) {
  await page.goto(base + path, { waitUntil: 'networkidle' });
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
if (problems.length) {
  failures += problems.length;
  console.log(`${problems.length} runtime problems:`);
  for (const p of problems) console.log(`  ${p}`);
}
console.log(failures ? `${failures} FAILED` : 'all passed');
process.exitCode = failures ? 2 : 0;
