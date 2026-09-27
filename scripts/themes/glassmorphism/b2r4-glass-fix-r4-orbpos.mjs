/**
 * Wave B2 round 4, seat glass-fix-r4 (G1): the round-3 re-critic's orbpos
 * check (b2r3-glass-critic2-orbpos.mjs) at both review sizes. Home's hero orbs
 * on the lens clock (as built) versus CSS view() with drift off (the same page
 * with [data-js-driven] removed and glass-drift stripped), at scroll 0, 200
 * and 400, 1440x900 and 390x844 (touch, DPR 2). Pass: every JS row within 1 px
 * of its CSS row. GPU Chromium (aborts on SwiftShader), reduced transparency
 * forced off, the portal prompt suppressed.
 * Usage: node scripts/themes/glassmorphism/b2r4-glass-fix-r4-orbpos.mjs --base http://127.0.0.1:4471 [--out dir]
 */
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const arg = (n, f) => { const i = args.indexOf(`--${n}`); return i === -1 ? f : args[i + 1]; };
const base = arg('base', 'http://127.0.0.1:4471');
const OUT = arg('out', join(HERE, '..', '.out', 'stage3-b2', 'glass-fix-r4', 'orbpos'));
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const R = { sizes: {} };
let worst = 0;
for (const [w, h, phone] of [[1440, 900, false], [390, 844, true]]) {
  const context = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: 'light', hasTouch: phone, isMobile: phone, deviceScaleFactor: phone ? 2 : 1 });
  await suppressPrompt(context);
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
  if (!R.renderer) {
    R.renderer = await page.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl'); return gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL); });
    console.log('renderer:', R.renderer);
    if (/swiftshader|llvmpipe/i.test(R.renderer)) throw new Error('software renderer; abort');
  }
  await page.goto(`${base}/t/glassmorphism/`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelector('.lens-poster')?.style.display === 'none', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(600);
  const pos = () => page.evaluate(() => [...document.querySelectorAll('.hero .orb')].map((o) => { const q = o.getBoundingClientRect(); return { cls: o.className, cx: +(q.left + q.width / 2).toFixed(1), cy: +(q.top + q.height / 2).toFixed(1), d: Math.round(q.width) }; }));
  const S = { js: {}, cssNoDrift: {} };
  for (const y of [0, 200, 400]) { await page.evaluate((v) => scrollTo(0, v), y); await page.waitForTimeout(300); S.js[y] = await pos(); }
  await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(300);
  await page.screenshot({ path: join(OUT, `orbpos__${w}x${h}__js-clock__scroll0.png`) });
  await page.evaluate(() => { for (const g of document.querySelectorAll('.orbs[data-js-driven]')) g.removeAttribute('data-js-driven'); for (const o of document.querySelectorAll('.orb')) o.style.removeProperty('translate'); });
  await page.addStyleTag({ content: '.orb { animation-name: none, glass-orb-scroll !important; }' });
  await page.waitForTimeout(400);
  for (const y of [0, 200, 400]) { await page.evaluate((v) => scrollTo(0, v), y); await page.waitForTimeout(300); S.cssNoDrift[y] = await pos(); }
  await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(300);
  await page.screenshot({ path: join(OUT, `orbpos__${w}x${h}__css-view-no-drift__scroll0.png`) });
  S.table = [];
  for (const y of [0, 200, 400]) {
    S.js[y].forEach((o, i) => {
      const c = S.cssNoDrift[y][i];
      const dy = +(o.cy - c.cy).toFixed(1);
      const dx = +(o.cx - c.cx).toFixed(1);
      worst = Math.max(worst, Math.abs(dy), Math.abs(dx));
      S.table.push({ scroll: y, orb: o.cls, jsCy: o.cy, cssCy: c.cy, dy, dx });
    });
  }
  R.sizes[`${w}x${h}`] = S;
  console.log(`${w}x${h}`); console.table(S.table);
  await context.close();
}
R.worstPx = worst;
R.pass = worst <= 1;
await writeFile(join(OUT, 'orbpos.json'), JSON.stringify(R, null, 1));
console.log('worst |JS - CSS| px:', worst, R.pass ? 'PASS' : 'FAIL');
await browser.close();
