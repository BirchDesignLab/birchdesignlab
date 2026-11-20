/**
 * Stage 6 wave 2, task 10 (S1, T4 C3): the dial's snap-back time and the bar's
 * and the drag's geometry against the word's real ink.
 *   BASE=http://127.0.0.1:4470 node scripts/themes/stage6/w2-t10-dial.mjs
 *   SNAP=<name> node ...   (serves the snap on 4470)
 * Per width (1440, 1280, 390): for the keyboard values 62, rest and 125 (End),
 * the px from the word's last ink pixel to the bar's left edge (the spec: one
 * gutter); a mouse drag of +-120px and how far the ink's right edge moved (1:1);
 * and the time from release to the word at rest, from the farthest drag
 * (min on a desktop, max on a phone) and from 100 to min.
 */
import { chromium } from 'playwright';
import sharp from 'sharp';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveDist } from '../lib/serve-dist.mjs';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const OUTROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '.out');
let server = null;
let BASE = process.env.BASE;
if (!BASE) { server = await serveDist(4470, join(OUTROOT, `snap-${process.env.SNAP}`)); BASE = 'http://127.0.0.1:4470'; }
const browser = await chromium.launch({ args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--font-render-hinting=none', '--disable-lcd-text'] });
const heights = { 1440: 900, 1280: 800, 390: 844 };

/** Last ink pixel (not the red bar) in the word's line, and the bar's left, in page px. */
const inkRight = async (page) => {
  const g = await page.evaluate(() => {
    const word = document.querySelectorAll('.billboard .ln')[1];
    const lr = word.getBoundingClientRect();
    const bar = document.querySelector('.dial-mark').getBoundingClientRect();
    return { y: lr.top + scrollY, h: lr.height, barL: bar.left };
  });
  const vw = await page.evaluate(() => innerWidth);
  const buf = await page.screenshot({ clip: { x: 0, y: g.y, width: vw, height: g.h }, fullPage: true });
  const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
  let right = -1;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const i = (y * info.width + x) * info.channels;
    if (data[i] < 70 && data[i + 1] < 70 && data[i + 2] < 70 && x > right) right = x;
  }
  return { inkR: right + 1, barL: g.barL };
};
const timeToRest = (page) => page.evaluate(() => new Promise((resolve) => {
  const dial = document.querySelector('[data-sw-dial]');
  const word = document.querySelectorAll('.billboard .ln')[1];
  const t0 = performance.now();
  const tick = () => {
    const now = performance.now() - t0;
    if (word.style.getPropertyValue('--sw-d') === '' && !dial.hasAttribute('data-active')) { resolve(Math.round(now)); return; }
    if (now > 3000) { resolve(-1); return; }
    requestAnimationFrame(tick);
  };
  tick();
}));
try {
  for (const w of [1440, 1280, 390]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: heights[w] }, deviceScaleFactor: 1, colorScheme: 'light' });
    await suppressPrompt(ctx);
    await ctx.addInitScript(() => { try { sessionStorage.setItem('bdl-swiss-dial-hint', '1'); } catch {} });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
    await page.goto(`${BASE}/t/swiss/`, { waitUntil: 'networkidle' });
    await page.addStyleTag({ content: 'bdl-switcher{display:none!important} .lede,.lead,.subline{visibility:hidden} .dial{outline:none!important} .dial::before{display:none}' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(500);
    const res = { w, bar: {} };
    const dial = page.locator('[data-sw-dial]');
    const val = () => page.evaluate(() => Number(document.querySelector('[data-sw-dial]').getAttribute('aria-valuenow')));
    res.rest = await val();
    const r0 = await inkRight(page);
    res.bar.rest = { value: res.rest, gapInkToBar: +(r0.barL - r0.inkR).toFixed(1) };
    await dial.focus();
    for (const [name, key] of [['Home', 'Home'], ['End', 'End']]) {
      await page.keyboard.press(key);
      await page.waitForTimeout(120);
      const r = await inkRight(page);
      res.bar[name] = { value: await val(), gapInkToBar: +(r.barL - r.inkR).toFixed(1), inkR: r.inkR };
    }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    // 1:1 drag: from the word's right part, 80px left and (if room) right.
    const box = await dial.boundingBox();
    const y = box.y + box.height / 2;
    const startX = Math.min(w - 20, box.x + box.width * 0.5);
    const before = await inkRight(page);
    for (const dx of [-120, -60, 60]) {
      await page.mouse.move(startX, y); await page.mouse.down();
      await page.mouse.move(startX + dx, y, { steps: 6 });
      await page.waitForTimeout(80);
      const r = await inkRight(page);
      res.bar[`drag ${dx}`] = { value: await val(), inkMoved: r.inkR - before.inkR, gapInkToBar: +(r.barL - r.inkR).toFixed(1) };
      await page.mouse.up();
      res.bar[`drag ${dx}`].restMs = await timeToRest(page);
      await page.waitForTimeout(150);
    }
    // Snap-back from the far end and from 100 (mouse, release).
    const farDx = w >= 1024 ? -(box.width) : Math.max(60, w - startX - 2);
    for (const [label, dx] of [['far', farDx], ['to 62 from rest', -2000]]) {
      await page.mouse.move(startX, y); await page.mouse.down();
      await page.mouse.move(Math.max(1, Math.min(w - 1, startX + dx)), y, { steps: 10 });
      await page.waitForTimeout(100);
      const v = await val();
      await page.mouse.up();
      res.bar[`release ${label}`] = { fromValue: v, restMs: await timeToRest(page) };
      await page.waitForTimeout(200);
    }
    console.log(JSON.stringify(res));
    await ctx.close();
  }
} finally {
  await browser.close();
  if (server) await new Promise((r) => server.close(r));
}
