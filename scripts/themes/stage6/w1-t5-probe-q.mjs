/** Probe: does the question mark's assembly replay after the reveal? node w1-t5-probe-q.mjs */
import { chromium } from 'playwright';
import { serveDist } from '../lib/serve-dist.mjs';
import { suppressPrompt } from '../lib/portal-prompt.mjs';
const server = await serveDist(4470);
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
await suppressPrompt(ctx);
const page = await ctx.newPage();
await page.goto('http://127.0.0.1:4470/t/bauhaus/about/', { waitUntil: 'networkidle' });
await page.locator('[data-quiz]').scrollIntoViewIfNeeded();
const snap = (l) => page.evaluate((l) => { const q = document.querySelector('.quiz-q'); return { l, cls: q.getAttribute('class'), anims: q.getAnimations({ subtree: true }).map((a) => a.playState + ':' + Math.round(a.currentTime)), op: [...q.querySelectorAll('path')].map((p) => getComputedStyle(p).opacity) }; }, l);
await page.waitForTimeout(2000);
console.log(await snap('before'));
for (const [sh,c] of [['triangle','red'],['square','yellow'],['circle','blue']]) { await page.locator(`[data-shape=${sh}]`).click(); await page.locator(`[data-pick=${c}]`).click(); console.log(await snap('fill '+sh)); }
for (const t of [100, 500, 1500]) { await page.waitForTimeout(t); console.log(await snap('after+' + t)); }
await page.screenshot({ path: 'scripts/themes/.out/stage6/w1/t5/probe-q.png' });
await browser.close(); server.close(); process.exit(0);
