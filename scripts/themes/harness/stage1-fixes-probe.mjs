/**
 * Stage 1 review fixes, checked against a served build (Tier 3 stage 1,
 * written 09-23-26 by the review's fixer; kept in the repo per the scripts
 * rule). Each check prints ok or FAIL with what it saw:
 *   - the switcher bar keeps one width, and Shuffle one place, in every school
 *     and either scheme (phone and desktop);
 *   - on a landscape phone the dialog (headed "The Portal", no placard since
 *     the founder's 09-23-26 decisions) opens with the current school's row
 *     focused and in view between its head and foot;
 *   - at 320px each list row puts the era on its own line under the name;
 *   - Escape dismisses the first-load prompt;
 *   - the prompt lives until a tap: it survives a router navigation and a
 *     reload unrecorded, and only its dismiss control records the dismissal;
 *   - where Element.moveBefore is missing, the prompt does not replay its
 *     arrival after a swap, and focus stays on Shuffle across the swap it
 *     starts;
 *   - a switch into vaporwave from a warmed dialog fetches none of its Latin
 *     body or mono faces after the click.
 *
 * Usage (serve a build, e.g. `npm run dev:worker` on :8787):
 *   node scripts/themes/harness/stage1-fixes-probe.mjs [--base http://127.0.0.1:8787]
 */
import { chromium } from 'playwright';

const i = process.argv.indexOf('--base');
const base = (i === -1 ? 'http://127.0.0.1:8787' : process.argv[i + 1]).replace(/\/$/, '');
const browser = await chromium.launch();
let failures = 0;
const check = (ok, label, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${detail ? `  ${detail}` : ''}`);
};

async function open(viewport, { prompt = false, init } = {}) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  if (!prompt) await context.addInitScript(() => { try { sessionStorage.setItem('bdl-portal-prompt', 'dismissed'); } catch {} });
  if (init) await context.addInitScript(init);
  const page = await context.newPage();
  // Zaraz blocked through CDP, not context.route(): Playwright turns the HTTP
  // cache off for a context with a route, and the warm-up lives in it.
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setBlockedURLs', { urls: ['*/cdn-cgi/zaraz/*'] });
  return { context, page };
}
const sr = (page, fn, arg) => page.evaluate(([f, a]) => new Function('root', 'arg', `return (${f})(root, arg)`)(document.querySelector('bdl-switcher').shadowRoot, a), [fn.toString(), arg]);
const loads = (page) => page.evaluate(() => window.__loads || 0);
async function swapped(page, n) {
  await page.waitForFunction((k) => (window.__loads || 0) > k, n, { timeout: 15000 });
  await page.waitForFunction(() => !document.documentElement.hasAttribute('data-astro-transition'), null, { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(200);
}
const countLoads = () => document.addEventListener('astro:page-load', () => { window.__loads = (window.__loads || 0) + 1; });

// One width, one place.
const schools = ['quiet', 'bauhaus', 'swiss', 'vaporwave', 'cottagecore', 'grandmillennial', 'glassmorphism'];
for (const [name, viewport] of [['phone', { width: 390, height: 844 }], ['desktop', { width: 1440, height: 900 }]]) {
  const { context, page } = await open(viewport);
  const seen = [];
  for (const id of schools) {
    await page.goto(`${base}/t/${id}/`, { waitUntil: 'networkidle' });
    seen.push(await sr(page, (root) => {
      const bar = root.querySelector('.bar').getBoundingClientRect();
      const shuffle = root.querySelector('.shuffle').getBoundingClientRect();
      return `${bar.left.toFixed(2)}/${bar.width.toFixed(2)}/${shuffle.left.toFixed(2)}`;
    }));
  }
  // Light and Dark share one width too.
  const flip = (page) => sr(page, (root) => { root.querySelector('.scheme').click(); return root.querySelector('.bar').getBoundingClientRect().width.toFixed(2); });
  const w1 = await flip(page);
  const w2 = await flip(page);
  check(w1 === w2 && seen.every((k) => k.includes(`/${w1}/`)), `${name}: the scheme button keeps the bar's width`, `${w1} / ${w2}`);
  const kinds = [...new Set(seen)];
  check(kinds.length === 1, `${name}: bar x/width and Shuffle x the same in all seven schools`, kinds.map((k) => `${k} (${schools.filter((_, j) => seen[j] === k).join(', ')})`).join(' | '));
  await context.close();
}

// Landscape phone: the current row, focused and in view. glassmorphism is
// the last row, so the list has to scroll to it.
{
  const { context, page } = await open({ width: 844, height: 390 });
  for (const id of ['glassmorphism', 'bauhaus']) {
    await page.goto(`${base}/t/${id}/about/`, { waitUntil: 'networkidle' });
    const r = await sr(page, (root) => {
      root.querySelector('.open').click();
      const d = root.querySelector('dialog').getBoundingClientRect();
      const head = root.querySelector('.head').getBoundingClientRect();
      const foot = root.querySelector('.foot').getBoundingClientRect();
      const row = root.querySelector('a[aria-current="page"]').getBoundingClientRect();
      return {
        title: root.querySelector('#bdl-schools-title').textContent,
        placard: !!root.querySelector('.placard'),
        focus: root.activeElement?.dataset.school,
        inView: row.top >= head.bottom - 1 && row.bottom <= foot.top + 1,
        fits: d.top >= 0 && d.bottom <= innerHeight,
      };
    });
    check(r.title === 'The Portal' && !r.placard && r.focus === id && r.inView && r.fits, `844x390 ${id}: dialog fits, current row focused and in view`, JSON.stringify(r));
  }
  await context.close();
}

// 320px: era on its own line.
{
  const { context, page } = await open({ width: 320, height: 640 });
  await page.goto(`${base}/t/bauhaus/`, { waitUntil: 'networkidle' });
  const rows = await sr(page, (root) => {
    root.querySelector('.open').click();
    return [...root.querySelectorAll('li a')].map((a) => {
      const n = a.querySelector('.name').getBoundingClientRect();
      const e = a.querySelector('.era').getBoundingClientRect();
      return { id: a.dataset.school, below: e.top >= n.bottom - 1, left: Math.abs(e.left - n.left) < 1 };
    });
  });
  check(rows.every((r) => r.below && r.left), '320px: every era sits under its name, left-aligned', JSON.stringify(rows.filter((r) => !r.below || !r.left)));
  await context.close();
}

// Escape dismisses the prompt.
{
  const { context, page } = await open({ width: 1280, height: 800 }, { prompt: true });
  await page.goto(`${base}/t/swiss/`, { waitUntil: 'networkidle' });
  await sr(page, (root) => root.querySelector('.prompt .go').focus());
  await page.keyboard.press('Escape');
  const r = await sr(page, (root) => ({ hidden: root.querySelector('.prompt').hidden, focus: root.activeElement?.className }));
  check(r.hidden && r.focus === 'open', 'Escape dismisses the prompt and hands focus to the school button', JSON.stringify(r));
  await context.close();
}

// The prompt lives until a tap: a router navigation and a reload keep it,
// unrecorded; its dismiss control records the dismissal.
{
  const { context, page } = await open({ width: 390, height: 844 }, { prompt: true, init: countLoads });
  await page.goto(`${base}/t/swiss/`, { waitUntil: 'networkidle' });
  const state = () => page.evaluate(() => {
    const root = document.querySelector('bdl-switcher').shadowRoot;
    let flag = null;
    try { flag = sessionStorage.getItem('bdl-portal-prompt'); } catch {}
    return { shown: !root.querySelector('.prompt').hidden, flag, label: root.querySelector('.prompt .dismiss').getAttribute('aria-label') };
  });
  const first = await state();
  // A plain link in the page (not the switcher): the router takes it.
  const n = await loads(page);
  await page.evaluate(() => document.querySelector('main a[href^="/t/swiss/"]:not([href="/t/swiss/"]), header a[href^="/t/swiss/"]:not([href="/t/swiss/"])').click());
  await swapped(page, n);
  const afterNav = { ...(await state()), path: await page.evaluate(() => location.pathname) };
  await page.reload({ waitUntil: 'networkidle' });
  const afterReload = await state();
  await sr(page, (root) => root.querySelector('.prompt .dismiss').click());
  const afterDismiss = await state();
  await page.reload({ waitUntil: 'networkidle' });
  const afterDismissReload = await state();
  check(
    first.shown && first.flag === null && first.label === 'Dismiss the Portal prompt' &&
      afterNav.shown && afterNav.flag === null && afterNav.path !== '/t/swiss/' &&
      afterReload.shown && afterReload.flag === null &&
      !afterDismiss.shown && afterDismiss.flag === 'dismissed' && !afterDismissReload.shown,
    'the prompt survives a navigation and a reload, and goes on a tap of its dismiss control',
    JSON.stringify({ first, afterNav, afterReload, afterDismiss, afterDismissReload }),
  );
  await context.close();
}

// No moveBefore: the router reinserts the switcher on every swap, which
// would restart the prompt's arrival; once it has arrived it stays arrived.
{
  const { context, page } = await open({ width: 1280, height: 800 }, {
    prompt: true,
    init: () => {
      delete Element.prototype.moveBefore;
      document.addEventListener('astro:page-load', () => { window.__loads = (window.__loads || 0) + 1; });
    },
  });
  await page.goto(`${base}/t/swiss/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000); // 1000ms delay, 560ms arrival
  const n = await loads(page);
  await page.evaluate(() => document.querySelector('header a[href^="/t/swiss/"]:not([href="/t/swiss/"]), main a[href^="/t/swiss/"]:not([href="/t/swiss/"])').click());
  await swapped(page, n);
  const r = await sr(page, (root) => {
    const p = root.querySelector('.prompt');
    return { shown: !p.hidden, arrived: p.classList.contains('arrived'), running: p.getAnimations().map((x) => x.animationName), opacity: getComputedStyle(p).opacity };
  });
  check(r.shown && r.arrived && r.running.length === 0 && r.opacity === '1', 'without moveBefore, the prompt does not replay its arrival after a swap', JSON.stringify(r));
  await context.close();
}

// No moveBefore: focus stays on Shuffle.
{
  const { context, page } = await open({ width: 1280, height: 800 }, {
    init: () => {
      delete Element.prototype.moveBefore;
      document.addEventListener('astro:page-load', () => { window.__loads = (window.__loads || 0) + 1; });
    },
  });
  await page.goto(`${base}/t/vaporwave/`, { waitUntil: 'networkidle' });
  await sr(page, (root) => root.querySelector('.shuffle').focus());
  const n = await loads(page);
  await page.keyboard.press('Enter');
  await swapped(page, n);
  const r = await page.evaluate(() => ({
    path: location.pathname,
    active: document.activeElement?.tagName,
    inner: document.querySelector('bdl-switcher').shadowRoot.activeElement?.className,
    moveBefore: typeof Element.prototype.moveBefore,
  }));
  check(r.active === 'BDL-SWITCHER' && r.inner === 'shuffle', 'without moveBefore, focus stays on Shuffle across the swap', JSON.stringify(r));
  await context.close();
}

// Warmed switch into vaporwave: its Latin faces come with the warm-up.
{
  const { context, page } = await open({ width: 1280, height: 800 }, { init: countLoads });
  await page.goto(`${base}/t/swiss/`, { waitUntil: 'networkidle' });
  await sr(page, (root) => root.querySelector('.open').click());
  await page.waitForTimeout(4000);
  const late = [];
  page.on('request', (r) => { if (/\.woff2$/.test(r.url())) late.push(r.url().split('/').pop()); });
  const n = await loads(page);
  await sr(page, (root) => root.querySelector('a[data-school="vaporwave"]').click());
  await swapped(page, n);
  await page.waitForTimeout(800);
  // Requests served from the HTTP cache still fire `request`; ask the page
  // which ones went to the network.
  const net = await page.evaluate(() =>
    performance.getEntriesByType('resource')
      .filter((e) => /\.woff2$/.test(e.name) && e.transferSize > 0 && e.startTime > performance.now() - 2500)
      .map((e) => e.name.split('/').pop()),
  );
  const latin = net.filter((f) => /-latin-(?!ext)/.test(f));
  check(latin.length === 0, 'warmed switch into vaporwave downloads no Latin face after the click', JSON.stringify({ network: net, requested: late }));
  await context.close();
}

await browser.close();
console.log(failures ? `${failures} FAILED` : 'all passed');
process.exitCode = failures ? 2 : 0;
