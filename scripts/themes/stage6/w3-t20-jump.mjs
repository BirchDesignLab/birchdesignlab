/** Diagnostic: the see-saw's re-aim on a second tap, frame by frame. node scripts/themes/snap.mjs --name s6-w3-t20 --reuse --port 4470 -- node scripts/themes/stage6/w3-t20-jump.mjs */
import { launch, open, reach, centre, startSampler, stopSampler } from './w3-t20-lib.mjs';
const { browser } = await launch();
const { ctx, page } = await open(browser, { path: '/t/bauhaus/', width: 1440, scheme: 'light' });
await reach(page, 'button.seesaw');
const [, , l, t, w, h] = await centre(page, 'button.seesaw');
await startSampler(page, () => ({ rot: +(parseFloat(getComputedStyle(document.querySelector('button.seesaw .beam')).rotate) || 0).toFixed(2), sq: Math.round(parseFloat(getComputedStyle(document.querySelector('[data-seat="right"]')).translate) || 0), ci: Math.round(parseFloat(getComputedStyle(document.querySelector('[data-seat="left"]')).translate) || 0) }));
await page.mouse.click(l + w * 0.15, t + h * 0.5);
await page.waitForTimeout(300);
await page.evaluate(() => { window.__tap = performance.now(); });
await page.mouse.click(l + w * 0.85, t + h * 0.5);
await page.waitForTimeout(1300);
const s = await stopSampler(page);
console.log(s.filter((x, i) => x.t > 200 && x.t < 700).map((x) => `${x.t}: rot ${x.rot} sq ${x.sq} ci ${x.ci}`).join('\n'));
await browser.close();
