/**
 * Stage 6 w3 task 18, item 4: the swiss phone "From the lab" chip.
 *   node scripts/themes/stage6/w3-t18-chip.mjs <snapDir> <outDir> [port=4470]
 * Serves the snap, opens /t/swiss/ at 390 and 360 (touch, both schemes), measures
 * the kicker's words (a Range over its text) against the painted chip (the .cut
 * box plus its box-shadow clear zone) and shoots the band. GPU Chromium,
 * reduced transparency forced to no-preference, portal prompt suppressed.
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { serveDist, waitForServer } from '../lib/serve-dist.mjs';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const [snap, out, portArg] = process.argv.slice(2);
const PORT = Number(portArg || 4470);
const BASE = `http://127.0.0.1:${PORT}`;
mkdirSync(out, { recursive: true });
const server = await serveDist(PORT, resolve(snap));
await waitForServer(BASE + '/', 5000);
const browser = await chromium.launch({ headless: true, args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--enable-gpu-rasterization', '--ignore-gpu-blocklist'] });
const R = {};
try {
  for (const w of [390, 360]) for (const scheme of ['light', 'dark']) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
    await suppressPrompt(ctx);
    await ctx.addInitScript((s) => { try { localStorage.setItem('scheme', s); } catch {} }, scheme);
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
    await page.goto(`${BASE}/t/swiss/`, { waitUntil: 'networkidle' });
    if (!R.renderer) R.renderer = await page.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl'); return gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL); });
    const m = await page.evaluate(() => {
      const cut = document.querySelector('.lab-kicker .cut');
      const range = document.createRange(); range.selectNodeContents(cut);
      const words = range.getBoundingClientRect();
      const box = cut.getBoundingClientRect();
      const cs = getComputedStyle(cut);
      const sh = /(-?[\d.]+)px/.exec(cs.boxShadow);
      return { words: { l: words.left, r: words.right }, box: { l: box.left, r: box.right, t: box.top + scrollY, b: box.bottom + scrollY }, shadow: cs.boxShadow, paintedRight: box.right + (sh ? Number(sh[1]) : 0), extra: box.right + (sh ? Number(sh[1]) : 0) - words.right };
    });
    R[`${w}-${scheme}`] = m;
    await page.evaluate((y) => scrollTo(0, y - 80), m.box.t);
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(out, `chip-${w}-${scheme}.png`) });
    await ctx.close();
  }
} finally { await browser.close(); server.close(); }
writeFileSync(join(out, 'chip.json'), JSON.stringify(R, null, 1));
console.log(JSON.stringify(R, null, 1));
