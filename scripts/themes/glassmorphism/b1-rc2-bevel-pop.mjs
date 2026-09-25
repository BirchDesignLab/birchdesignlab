/**
 * Wave B1 glass re-critic, fix round 2 (09-25-26): after a cross-school
 * arrival, fx.ts now defers each pane's bevel url() to idle slots. Does the
 * late landing read as a visible pop on the panes' rims? Arrives on
 * /t/glassmorphism/ from /t/quiet/ by clicking a link (like motion.mjs), logs
 * when each pane's inline backdrop-filter changes (ms since the click), and
 * shoots the viewport just after the view transition finishes (frosted, no
 * bevel yet) and again once every bevel has landed. Writes both shots, a
 * per-pane rim-band diff, and the timings.
 *
 * Usage: BDL_GPU=1 node scripts/themes/glassmorphism/b1-rc2-bevel-pop.mjs
 *   [--base URL] [--scheme light|dark] [--vw 1440 --vh 900]
 * Out: scripts/themes/.out/b1-glass-rc2/bevel-pop-<scheme>-<vw>/
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i === -1 ? d : process.argv[i + 1]; };
const BASE = arg('base', process.env.SNAP_BASE || 'http://127.0.0.1:4473');
const scheme = arg('scheme', 'light');
const vw = Number(arg('vw', '1440'));
const vh = Number(arg('vh', '900'));
const OUT = join(HERE, '..', '.out', 'b1-glass-rc2', `bevel-pop-${scheme}-${vw}`);
await mkdir(OUT, { recursive: true });
const gpu = process.env.BDL_GPU === '1';
const browser = await chromium.launch({ args: gpu ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] : [] });
const c = await browser.newContext({ viewport: { width: vw, height: vh }, colorScheme: scheme });
await c.addInitScript((s) => {
  try { localStorage.setItem('scheme', s); localStorage.setItem('bdl-switcher-prompt', 'dismissed'); } catch {}
}, scheme);
await c.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
const page = await c.newPage();
const cdp = await c.newCDPSession(page);
await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
const renderer = await page.evaluate(() => {
  const gl = document.createElement('canvas').getContext('webgl');
  const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
  return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown';
});
await page.goto(BASE + '/t/quiet/', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await page.evaluate(() => {
  window.__t0 = 0;
  window.__log = [];
  const mo = new MutationObserver((recs) => {
    for (const r of recs) {
      const el = r.target;
      if (!(el instanceof HTMLElement)) continue;
      if (!el.matches('.glass, .glass-strong')) continue;
      window.__log.push({ ms: Math.round(performance.now() - window.__t0), cls: el.className, bf: el.style.backdropFilter.slice(0, 30) });
    }
  });
  // survives the ClientRouter swap: observe the document root subtree
  mo.observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ['style'] });
  window.__mo = mo;
});
await page.evaluate(() => {
  window.__t0 = performance.now();
  const a = document.createElement('a');
  a.href = '/t/glassmorphism/';
  document.body.appendChild(a);
  a.click();
});
// wait for the transition to finish (data-from-theme cleared), then shoot at once
await page.waitForFunction(() => document.documentElement.dataset.theme === 'glassmorphism' && !('fromTheme' in document.documentElement.dataset), null, { timeout: 5000 });
const tFinished = await page.evaluate(() => Math.round(performance.now() - window.__t0));
await page.screenshot({ path: join(OUT, 'a-finished.png') });
const tShotA = await page.evaluate(() => Math.round(performance.now() - window.__t0));
await page.waitForTimeout(3000);
await page.screenshot({ path: join(OUT, 'b-settled.png') });
const log = await page.evaluate(() => window.__log);
const panes = await page.evaluate(() => [...document.querySelectorAll('.glass, .glass-strong')].map((el) => {
  const r = el.getBoundingClientRect();
  return { cls: el.className, x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), bf: el.style.backdropFilter.slice(0, 30) };
}).filter((p) => p.y < innerHeight && p.y + p.h > 0));
// rim-band diff between the two shots, per pane (band 24 px inside the box)
const diffs = await page.evaluate(async ({ a, b, panes }) => {
  const load = (src) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = src; });
  const [ia, ib] = await Promise.all([load(a), load(b)]);
  const cv = (img) => { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0); return x.getImageData(0, 0, c.width, c.height).data; };
  const da = cv(ia), db = cv(ib), W = ia.width;
  return panes.map((p) => {
    let sumRim = 0, nRim = 0, sumMid = 0, nMid = 0, maxRim = 0;
    for (let y = Math.max(0, p.y); y < Math.min(ia.height, p.y + p.h); y++) for (let x = Math.max(0, p.x); x < Math.min(W, p.x + p.w); x++) {
      const i = (y * W + x) * 4;
      const d = (Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2])) / 3;
      const edge = Math.min(x - p.x, p.x + p.w - 1 - x, y - p.y, p.y + p.h - 1 - y);
      if (edge < 24) { sumRim += d; nRim++; if (d > maxRim) maxRim = d; } else { sumMid += d; nMid++; }
    }
    return { cls: p.cls, rimMean: +(sumRim / Math.max(1, nRim)).toFixed(2), rimMax: Math.round(maxRim), midMean: +(sumMid / Math.max(1, nMid)).toFixed(2) };
  });
}, { a: 'data:image/png;base64,' + (await import('node:fs')).readFileSync(join(OUT, 'a-finished.png')).toString('base64'), b: 'data:image/png;base64,' + (await import('node:fs')).readFileSync(join(OUT, 'b-settled.png')).toString('base64'), panes });
const report = { renderer, scheme, vw, tFinished, tShotA, log, panes, diffs };
await writeFile(join(OUT, 'report.json'), JSON.stringify(report, null, 1));
console.log(JSON.stringify({ renderer, tFinished, tShotA, landings: log.map((l) => `${l.ms} ${l.cls.split(' ')[0]} ${l.bf}`), diffs }, null, 1));
await browser.close();
