/** B1 task 5 fix round 1 probe: touch drag on the bell pull, nav clearance 761..820, swatch lift rotation, selvedge shot.
 *   node scripts/themes/grandmillennial/b1-t5-fix1-check.mjs --base http://127.0.0.1:4460 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const OUT = join(REPO, 'scripts', 'themes', '.out', 'stage5', 'b1', 't5');
await mkdir(OUT, { recursive: true });
const i = process.argv.indexOf('--base'); const base = process.argv[i + 1].replace(/\/$/, '');
const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu'] });
const url = (p) => `${base}/t/grandmillennial/${p}`;
for (const [w, h] of [[820, 1180], [390, 844]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(url('services/'), { waitUntil: 'networkidle' });
  const cdp = await ctx.newCDPSession(page);
  const r = await page.evaluate(() => { const e = document.querySelector('.bp-hit').getBoundingClientRect(); return { x: e.x + e.width / 2, y: e.y + 10 }; });
  await page.evaluate(() => { window.__ev = []; for (const t of ['pointerdown','pointermove','pointerup','pointercancel']) document.addEventListener(t, (e) => window.__ev.push(t), true); });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: r.x, y: r.y }] });
  for (let k = 1; k <= 10; k++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: r.x, y: r.y + k * 9 }] });
  const held = await page.evaluate(() => document.querySelector('.bell-pull svg').getBoundingClientRect().height);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const ev = await page.evaluate(() => { const c = {}; window.__ev.forEach((t) => (c[t] = (c[t] || 0) + 1)); return c; });
  console.log('touch', w, JSON.stringify(ev), 'held svg h', held);
  await ctx.close();
}
for (const w of [761, 780, 800, 820]) {
  const page = await b.newPage({ viewport: { width: w, height: 800 } });
  await page.goto(url('services/'), { waitUntil: 'networkidle' });
  const g = await page.evaluate(() => { const p = document.querySelector('.bp-hit').getBoundingClientRect(); const ls = [...document.querySelectorAll('nav a')].map((a) => a.getBoundingClientRect().right); return Math.round(p.left - Math.max(...ls)); });
  console.log('gap', w, g);
  await page.close();
}
for (const [w, h, mob] of [[1440, 900, false], [390, 844, true]]) {
  for (const scheme of ['light', 'dark']) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, hasTouch: mob, isMobile: mob });
    const page = await ctx.newPage();
    await page.goto(url('services/'), { waitUntil: 'networkidle' });
    await page.addStyleTag({ content: 'bdl-switcher{display:none!important} *{transition:none!important}' });
    const rots = [];
    for (const idx of [0, 1]) {
      const sw = page.locator('.swatch-hang').nth(idx);
      await sw.scrollIntoViewIfNeeded();
      const rot = (l) => sw.evaluate((e) => getComputedStyle(e).rotate);
      const before = await rot();
      await sw.evaluate((e) => e.classList.add('lifted'));
      rots.push(`${before}->${await rot()}`);
      if (idx === 1 || w === 390) { const bb = await sw.boundingBox(); await page.screenshot({ path: join(OUT, `fix1-swatch__${scheme}__${w}__${idx}.png`), clip: { x: Math.max(0, bb.x - 10), y: Math.max(0, bb.y + bb.height - 140), width: Math.min(w - Math.max(0, bb.x - 10), bb.width + 30), height: 190 } }); }
      await sw.evaluate((e) => e.classList.remove('lifted'));
    }
    console.log('rot', w, scheme, rots.join(' | '));
    await ctx.close();
  }
}
await b.close();
