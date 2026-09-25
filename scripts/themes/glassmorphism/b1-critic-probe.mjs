/**
 * Wave B1 glass critic probe (09-25-26). Read-only checks against a served
 * snap (default http://127.0.0.1:4473, snap b1-glass):
 *   1. scripts off: is the wallpaper on first paint, light and dark (Home);
 *   2. Chromium: the showpiece pane's computed/inline backdrop-filter, the
 *      pane bend present, the lens poster's box vs the orbs around it;
 *   3. WebKit: the bend absent (no url()), frosted -webkit- fallback present;
 *   4. viewport stills: Home light/dark desktop at scroll 0 / 900 / 1800,
 *      Chromium and WebKit, and phone (390) Home light top.
 * Outputs scripts/themes/.out/b1-glass-critic/. GPU: BDL_GPU=1.
 *
 * Usage: BDL_GPU=1 node scripts/themes/glassmorphism/b1-critic-probe.mjs [--base URL]
 */
import { chromium, webkit } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', '.out', 'b1-glass-critic');
const bi = process.argv.indexOf('--base');
const BASE = bi === -1 ? 'http://127.0.0.1:4473' : process.argv[bi + 1];
const useGpu = process.env.BDL_GPU === '1';
const report = {};

async function ctx(browser, scheme, opts = {}) {
  const c = await browser.newContext({
    viewport: opts.viewport || { width: 1440, height: 900 },
    deviceScaleFactor: opts.dsf || 1,
    colorScheme: scheme,
    javaScriptEnabled: opts.js !== false,
    isMobile: !!opts.mobile,
    hasTouch: !!opts.mobile,
  });
  await c.addInitScript((s) => { try { localStorage.setItem('scheme', s); localStorage.setItem('theme', s); } catch {} }, scheme);
  await c.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
  return c;
}

const paneProbe = () => {
  const q = (s) => document.querySelector(s);
  const cs = (el, p) => el ? getComputedStyle(el, p) : null;
  const win = q('.window');
  const main = q('main');
  const before = cs(main, '::before');
  const poster = q('.lens-poster');
  const orbs = [...document.querySelectorAll('.orb')].map((o) => {
    const r = o.getBoundingClientRect();
    return { cls: o.className, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), z: getComputedStyle(o).zIndex, parentZ: getComputedStyle(o.parentElement).zIndex };
  }).filter((o) => o.y < 1000);
  const pr = poster?.getBoundingClientRect();
  return {
    scheme: document.documentElement.dataset.scheme,
    wallpaper: before?.backgroundImage?.slice(0, 160),
    wallpaperPosition: before?.position,
    windowBg: cs(win)?.backgroundColor,
    windowBackdrop: cs(win)?.backdropFilter,
    windowWebkitBackdrop: cs(win)?.webkitBackdropFilter,
    windowInline: win?.style.backdropFilter || '',
    tint: win ? [win.style.getPropertyValue('--pane-tint-rgb'), win.style.getPropertyValue('--pane-tint-alpha')] : null,
    poster: pr ? { x: Math.round(pr.x), y: Math.round(pr.y), w: Math.round(pr.width), display: getComputedStyle(poster).display, pos: getComputedStyle(poster).position } : null,
    orbs,
    ua: navigator.userAgent.slice(0, 80),
    svgFilters: document.querySelectorAll('filter[id^="glass-pane-bevel"]').length,
    overflowX: document.documentElement.scrollWidth - innerWidth,
  };
};

async function run(engine, name) {
  const browser = await engine.launch(engine === chromium ? {
    args: ['--hide-scrollbars', ...(useGpu ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] : [])],
  } : {});
  if (engine === chromium) {
    const p = await browser.newPage();
    const r = await p.evaluate(() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      const e = gl?.getExtension('WEBGL_debug_renderer_info');
      return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'none';
    });
    console.log('renderer:', r);
    if (useGpu && /swiftshader|llvmpipe/i.test(r)) throw new Error('software renderer');
    report.renderer = r;
    await p.close();
  }
  for (const scheme of ['light', 'dark']) {
    for (const js of [true, false]) {
      if (engine === webkit && !js) continue;
      const c = await ctx(browser, scheme, { js });
      const page = await c.newPage();
      await page.goto(`${BASE}/t/glassmorphism/`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(800);
      const tag = `${name}-${scheme}-${js ? 'js' : 'nojs'}`;
      report[tag] = await page.evaluate(paneProbe);
      for (const y of js ? [0, 900, 1800] : [0]) {
        await page.evaluate((yy) => window.scrollTo(0, yy), y);
        await page.waitForTimeout(500);
        await page.screenshot({ path: join(OUT, `${tag}-y${y}.png`) });
      }
      await c.close();
    }
  }
  // phone Home light, top + mid
  const c = await ctx(browser, 'light', { viewport: { width: 390, height: 844 }, dsf: 2, mobile: engine === chromium });
  const page = await c.newPage();
  await page.goto(`${BASE}/t/glassmorphism/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  report[`${name}-phone`] = await page.evaluate(paneProbe);
  await page.screenshot({ path: join(OUT, `${name}-phone-light-y0.png`) });
  await c.close();
  await browser.close();
}

await mkdir(OUT, { recursive: true });
await run(chromium, 'chromium');
await run(webkit, 'webkit');
await writeFile(join(OUT, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
