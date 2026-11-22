/**
 * Stage 6 wave 2, task 16 (CC5): the About hoop in dark (and light as the control), element shots
 * at 1440, 820 and 390, plus the measured contrast of each thread colour on the linen.
 *   BASE=http://127.0.0.1:4470 node scripts/themes/stage6/w2-t16-hoop.mjs <outDir> <tag>
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const BASE = (process.env.BASE || 'http://127.0.0.1:4470').replace(/\/$/, '');
const [OUT, TAG = 'run'] = process.argv.slice(2);
if (!OUT) throw new Error('usage: w2-t16-hoop.mjs <outDir> <tag>');
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
for (const scheme of ['dark', 'light']) for (const w of [1440, 820, 390]) {
  const mobile = w < 900;
  const ctx = await browser.newContext({ viewport: { width: w, height: w < 700 ? 844 : 1000 }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile, colorScheme: scheme, reducedMotion: 'no-preference' });
  await suppressPrompt(ctx);
  await ctx.addInitScript((s) => { try { localStorage.setItem('scheme', s); } catch {} }, scheme);
  await ctx.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
  await page.goto(`${BASE}/t/cottagecore/about/`, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: 'bdl-switcher{display:none!important}' });
  await page.evaluate(() => document.fonts.ready);
  await page.locator('.hoop').scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  await page.locator('.sampler-sec').screenshot({ path: join(OUT, `${TAG}-hoop-${w}-${scheme}.png`) });
  if (w === 1440) {
    const m = await page.evaluate(() => {
      const L = (rgb) => { const c = rgb.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
      const px = (s) => { const e = document.createElement('i'); e.style.color = s; document.body.append(e); const v = getComputedStyle(e).color.match(/[\d.]+/g).map(Number); e.remove(); return v.slice(0, 3); };
      const cloth = getComputedStyle(document.querySelector('.cloth'));
      const bg = px(cloth.backgroundColor);
      const r = (c) => { const a = L(c), b = L(bg); return +((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)).toFixed(2); };
      const out = { bg: cloth.backgroundColor, manifesto: r(px(getComputedStyle(document.querySelector('.manifesto')).color)) };
      for (const [n, sel, prop] of [['stem', '.sk-stem', 'stroke'], ['leaf-edge', '.sk-leaf', 'stroke'], ['rose under', '.sk-chain-rose.sk-under', 'stroke'], ['rose over', '.sk-chain-rose.sk-over', 'stroke'], ['butter under', '.sk-chain-butter.sk-under', 'stroke'], ['butter over', '.sk-chain-butter.sk-over', 'stroke'], ['maker line', '.sig-run', 'stroke']]) {
        const el = document.querySelector('.cc-sampler ' + sel) || document.querySelector('.cc-signature ' + sel);
        if (el) out[n] = r(px(getComputedStyle(el)[prop]));
      }
      return out;
    });
    console.log(scheme, JSON.stringify(m));
  }
  await ctx.close();
}
await browser.close();
