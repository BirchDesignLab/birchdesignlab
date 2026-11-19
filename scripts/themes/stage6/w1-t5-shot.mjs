/**
 * Stage 6 wave 1, task 5: serve dist/ and shoot the bauhaus questionnaire card.
 *   node scripts/themes/stage6/w1-t5-shot.mjs <outDir> [scheme] [width] [height]
 * Writes initial, picked, filled-wrong, revealed and whole-page shots for one
 * scheme and size. GPU Chromium; prefers-reduced-transparency forced to
 * no-preference; the portal prompt suppressed.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { serveDist } from '../lib/serve-dist.mjs';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const [out, scheme = 'light', w = '1440', h = '900'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const PORT = 4470;
const server = await serveDist(PORT);
const browser = await chromium.launch({ args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
try {
  const mobile = +w < 900;
  const ctx = await browser.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile, colorScheme: scheme, reducedMotion: 'no-preference' });
  await suppressPrompt(ctx);
  await ctx.addInitScript((s) => { try { localStorage.setItem('scheme', s); } catch {} }, scheme);
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });
  await page.goto(`http://127.0.0.1:${PORT}/t/bauhaus/about/`, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: 'bdl-switcher{display:none!important}' });
  const gpu = await page.evaluate(() => { const g = document.createElement('canvas').getContext('webgl'); const e = g && g.getExtension('WEBGL_debug_renderer_info'); return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'n/a'; });
  console.log('renderer', gpu);
  await page.evaluate(() => document.fonts.ready);
  const card = page.locator('[data-quiz] .qcard');
  await card.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);
  const shot = async (path) => { await page.evaluate(() => { const r = document.querySelector('[data-quiz]').getBoundingClientRect(); scrollBy(0, r.top); }); await page.waitForTimeout(120); await page.screenshot({ path }); };
  await shot(join(out, `${scheme}-${w}-0-initial.png`));
  await page.locator('[data-shape="triangle"]').click();
  await page.waitForTimeout(250);
  await shot(join(out, `${scheme}-${w}-1-picked.png`));
  await page.locator('[data-pick="red"]').click();
  await page.locator('[data-shape="square"]').click();
  await page.locator('[data-pick="yellow"]').click();
  await page.waitForTimeout(400);
  await shot(join(out, `${scheme}-${w}-2-two.png`));
  await page.locator('[data-pick="blue"]').click();
  await page.locator('[data-shape="circle"]').click();
  await page.waitForTimeout(1100 + 400 + 300);
  await shot(join(out, `${scheme}-${w}-3-revealed.png`));
  console.log('status:', await page.locator('[data-qstatus]').textContent());
  await page.screenshot({ path: join(out, `${scheme}-${w}-4-page.png`), fullPage: true });
} finally {
  await browser.close();
  server.close();
}
process.exit(0);
