/**
 * Wave B2 glass RE-CRITIC round 2 (09-26-26): where Home's hero orbs sit at
 * scroll 0 with the lens clock (as built) versus B1's CSS path (the same
 * page with [data-js-driven] removed, so B1's view() timeline and
 * glass-drift take over again), 1440x900 light. Also compares the
 * orbs-clock's progress model with CSS view() by sampling both at several
 * scroll positions. GPU Chromium, reduced transparency forced off, prompt
 * suppressed.
 * Usage: BDL_GPU=1 node scripts/themes/glassmorphism/b2r3-glass-critic2-orbpos.mjs --base http://127.0.0.1:4475
 */
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
// PROBE_OUT (added by the round-4 re-critic): rerun into another seat's folder.
const OUT = process.env.PROBE_OUT || join(HERE, '..', '.out', 'stage3-b2', 'glass-recritic-r2', 'own');
const base = process.argv[process.argv.indexOf('--base') + 1] || 'http://127.0.0.1:4475';
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
await suppressPrompt(context);
const page = await context.newPage();
const cdp = await context.newCDPSession(page);
await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
const renderer = await page.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl'); return gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL); });
if (/swiftshader|llvmpipe/i.test(renderer)) throw new Error('software renderer; abort');
await page.goto(`${base}/t/glassmorphism/`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => document.querySelector('.lens-poster')?.style.display === 'none', { timeout: 10000 }).catch(() => {});
await page.waitForTimeout(600);
const pos = () => page.evaluate(() => [...document.querySelectorAll('.hero .orb')].map((o) => { const q = o.getBoundingClientRect(); return { cls: o.className, cx: Math.round(q.left + q.width / 2), cy: Math.round(q.top + q.height / 2), d: Math.round(q.width) }; }));
const R = { renderer, js: {}, css: {} };
for (const y of [0, 200, 400]) { await page.evaluate((v) => scrollTo(0, v), y); await page.waitForTimeout(300); R.js[y] = await pos(); }
await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(300);
await page.screenshot({ path: join(OUT, 'orbpos__js-clock__scroll0.png') });
// B1's CSS path: drop the attribute and the inline translates.
await page.evaluate(() => { for (const g of document.querySelectorAll('.orbs[data-js-driven]')) g.removeAttribute('data-js-driven'); for (const o of document.querySelectorAll('.orb')) o.style.removeProperty('translate'); });
await page.waitForTimeout(400);
for (const y of [0, 200, 400]) { await page.evaluate((v) => scrollTo(0, v), y); await page.waitForTimeout(300); R.css[y] = await pos(); }
await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(300);
await page.screenshot({ path: join(OUT, 'orbpos__css-b1-path-with-drift__scroll0.png') });
// no-drift CSS path (view() only), to separate the drift from the progress model
await page.addStyleTag({ content: '.orb { animation-name: none, glass-orb-scroll !important; }' });
R.cssNoDrift = {};
for (const y of [0, 200, 400]) { await page.evaluate((v) => scrollTo(0, v), y); await page.waitForTimeout(300); R.cssNoDrift[y] = await pos(); }
await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(300);
await page.screenshot({ path: join(OUT, 'orbpos__css-view-no-drift__scroll0.png') });
await writeFile(join(OUT, 'orbpos.json'), JSON.stringify(R, null, 1));
console.log(JSON.stringify(R));
await browser.close();
