/**
 * Wave B1 glass fix round 2, fix B: measure pane/orb bounding boxes for the
 * re-critic's failing (scheme, viewport, page, scroll%) cases, to place
 * orbs by hand against real geometry instead of guessing from a screenshot.
 * Forces prefers-reduced-transparency: no-preference over CDP.
 *
 * Usage: BDL_GPU=1 node scripts/themes/glassmorphism/b1-fixB-measure.mjs [--base URL]
 */
import { chromium } from 'playwright';
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i === -1 ? d : process.argv[i + 1]; };
const BASE = arg('base', 'http://127.0.0.1:4471');
const useGpu = process.env.BDL_GPU === '1';
const PAGES = { home: '/t/glassmorphism/', services: '/t/glassmorphism/services/', about: '/t/glassmorphism/about/' };
const cases = [
  ['home', 0], ['home', 25],
  ['services', 25], ['services', 75],
  ['about', 0], ['about', 25],
];
const browser = await chromium.launch({ args: ['--hide-scrollbars', ...(useGpu ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] : [])] });
const c = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
await c.addInitScript(() => { try { localStorage.setItem('scheme', 'light'); localStorage.setItem('theme', 'light'); localStorage.setItem('bdl-switcher-prompt', 'dismissed'); } catch {} });
await c.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
const page = await c.newPage();
const cdp = await c.newCDPSession(page);
await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
for (const [name, pct] of cases) {
  await page.goto(BASE + PAGES[name], { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate((p) => scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * p / 100), pct);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await page.waitForTimeout(120);
  const data = await page.evaluate(() => {
    const rect = (e) => { const r = e.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; };
    const panes = [...document.querySelectorAll('.glass, .glass-strong, .surface-solid')].map((e) => ({ cls: e.className.split(' ').filter(c=>c!=='glass'&&c!=='glass-strong').join('.'), ...rect(e) }));
    const orbs = [...document.querySelectorAll('.orb')].map((e) => ({ cls: e.className, ...rect(e) }));
    return { scrollY: Math.round(scrollY), scrollH: document.documentElement.scrollHeight, panes, orbs };
  });
  console.log(`=== ${name} pct=${pct} scrollY=${data.scrollY}/${data.scrollH} viewport 1440x900 ===`);
  console.log('panes:', JSON.stringify(data.panes));
  console.log('orbs:', JSON.stringify(data.orbs));
}
await c.close();
await browser.close();
