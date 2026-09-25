/**
 * Wave B1 glass fix round 2 (09-25-26): filter order on EVERY pane. The lens
 * proof noted that with url() in front, a pane's blur came out about 4 px
 * where the frosted list asked for 14 (proofs/lens.md, finding 1), and the
 * header ghost is the same thing over text. This films one frozen viewport
 * of a page three ways, the change applied to every pane's inline
 * backdrop-filter:
 *   first   as built (url() in front of the list);
 *   last    url() moved after the blur/saturate/brightness list;
 *   none    url() stripped (frosted only).
 * Saves full-viewport PNGs to scripts/themes/.out/b1-glass-fix2/order-<scheme>-<vw>/
 * for crop.mjs, and prints the orbs' crossings of pane rims (where a bend
 * shows) so the crops can be aimed.
 * prefers-reduced-transparency is forced to no-preference over CDP.
 *
 * Usage: BDL_GPU=1 node scripts/themes/glassmorphism/b1-fix2-order-compare.mjs [--base URL] [--path /t/glassmorphism/] [--scheme light] [--vw 1440 --vh 900] [--scroll 0]
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i === -1 ? d : process.argv[i + 1]; };
const BASE = arg('base', process.env.SNAP_BASE || 'http://127.0.0.1:4471');
const path = arg('path', '/t/glassmorphism/');
const scheme = arg('scheme', 'light');
const vw = Number(arg('vw', '1440'));
const vh = Number(arg('vh', '900'));
const scroll = Number(arg('scroll', '0'));
const OUT = join(HERE, '..', '.out', 'b1-glass-fix2', `order-${scheme}-${vw}`);
await mkdir(OUT, { recursive: true });
const gpu = process.env.BDL_GPU === '1';
const browser = await chromium.launch({ args: ['--hide-scrollbars', ...(gpu ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] : [])] });
const c = await browser.newContext({ viewport: { width: vw, height: vh }, colorScheme: scheme, deviceScaleFactor: 1 });
await c.addInitScript((s) => { try { localStorage.setItem('scheme', s); localStorage.setItem('bdl-switcher-prompt', 'dismissed'); } catch {} }, scheme);
await c.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
const page = await c.newPage();
const cdp = await c.newCDPSession(page);
await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
await page.goto(BASE + path, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.evaluate((y) => scrollTo(0, y), scroll);
await page.waitForTimeout(800);
await page.evaluate(() => document.getAnimations().forEach((a) => a.pause()));
const orig = await page.evaluate(() => [...document.querySelectorAll('.glass, .glass-strong')].map((el) => el.style.backdropFilter));
const slug = path.replace(/\W+/g, '-').replace(/^-|-$/g, '') || 'home';
for (const v of ['first', 'last', 'none']) {
  await page.evaluate(([v, orig]) => {
    [...document.querySelectorAll('.glass, .glass-strong')].forEach((el, i) => {
      const bf = orig[i] || '';
      const u = bf.match(/url\([^)]*\)/)?.[0];
      const rest = bf.replace(/url\([^)]*\)\s*/g, '').trim();
      el.style.backdropFilter = !u ? bf : v === 'first' ? `${u} ${rest}` : v === 'last' ? `${rest} ${u}` : rest;
    });
  }, [v, orig]);
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(OUT, `${slug}-s${scroll}-${v}.png`) });
}
console.log(JSON.stringify(orig));
await browser.close();
