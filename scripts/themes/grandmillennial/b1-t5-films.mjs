/**
 * B1 task 5 films: the bell-pull tassel, the swatch lift, the button press, the wordmark focus ring and an
 * in-school swap with the tassel present, as timestamped strips (GPU Chromium).
 *   node scripts/themes/grandmillennial/b1-t5-films.mjs --base http://127.0.0.1:4460 [--only tassel,swatch,btn,focus,swap]
 * Output: scripts/themes/.out/stage5/b1/t5/<name>__<scheme>__<size>.png (scratch, not committed).
 */
import { chromium } from 'playwright';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { mkdir } from 'node:fs/promises';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { open } from './t2-common.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const OUT = join(REPO, 'scripts', 'themes', '.out', 'stage5', 'b1', 't5');
await mkdir(OUT, { recursive: true });
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i < 0 ? d : process.argv[i + 1]; };
const base = arg('base', '').replace(/\/$/, '');
const only = arg('only', 'tassel,swatch,btn,focus,swap').split(',');
const SZ = { 1440: { id: '1440', w: 1440, h: 900, dpr: 1 }, 820: { id: '820', w: 820, h: 1180, dpr: 1, mobile: true }, 390: { id: '390', w: 390, h: 844, dpr: 2, mobile: true } };

async function strip(frames, file, cols) {
  const imgs = await Promise.all(frames.map((f) => loadImage(f.buf)));
  const cw = imgs[0].width, ch = imgs[0].height, rows = Math.ceil(imgs.length / cols);
  const cv = createCanvas(cols * (cw + 8) + 8, rows * (ch + 26) + 8);
  const g = cv.getContext('2d');
  g.fillStyle = '#777'; g.fillRect(0, 0, cv.width, cv.height);
  g.font = '14px sans-serif'; g.fillStyle = '#fff';
  imgs.forEach((im, i) => {
    const x = 8 + (i % cols) * (cw + 8), y = 8 + Math.floor(i / cols) * (ch + 26);
    g.drawImage(im, x, y + 16);
    g.fillText(frames[i].label, x, y + 12);
  });
  writeFileSync(join(OUT, file), cv.toBuffer('image/png'));
}
const go = async (page, path) => {
  await page.goto(`${base}/t/grandmillennial/${path}`, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: 'bdl-switcher{display:none!important}' });
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.waitForTimeout(400);
};
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
{
  const { context, page } = await open(browser, 'light', SZ[1440]);
  await page.goto('about:blank');
  const r = await page.evaluate(() => { const c = document.createElement('canvas').getContext('webgl'); const e = c && c.getExtension('WEBGL_debug_renderer_info'); return e ? c.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'none'; });
  console.log('renderer', r);
  await context.close();
}

for (const scheme of ['light', 'dark']) {
  for (const key of ['1440', '820', '390']) {
    const sz = SZ[key];
    const clipH = sz.id === '390' ? 190 : 230;
    if (only.includes('tassel')) {
      const { context, page } = await open(browser, scheme, sz);
      const cdp = await context.newCDPSession(page);
      await go(page, 'about/');
      const box = await page.locator('.bp-hit').boundingBox();
      const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
      const tx = Math.round(cx - 70), clip = { x: Math.max(0, tx), y: 0, width: 140, height: clipH };
      const frames = [];
      const t0 = Date.now();
      const snap = async (label) => frames.push({ label: `${label} +${Date.now() - t0}ms`, buf: await page.screenshot({ clip }) });
      await snap('rest');
      const touch = async (type, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: cx, y, id: 1 }] });
      if (sz.mobile) { await touch('touchStart', cy); await touch('touchMove', cy + 20); await touch('touchMove', cy + 50); }
      else { await page.mouse.move(cx, cy); await page.mouse.down(); await page.mouse.move(cx, cy + 20, { steps: 4 }); await page.mouse.move(cx, cy + 50, { steps: 4 }); }
      await snap('held');
      if (sz.mobile) await touch('touchEnd'); else await page.mouse.up();
      const t1 = Date.now();
      for (const w of [30, 50, 50, 60, 60, 80, 120]) { await page.waitForTimeout(w); frames.push({ label: `rel +${Date.now() - t1}ms`, buf: await page.screenshot({ clip }) }); }
      // a click/tap: short tug
      await page.waitForTimeout(500);
      const t2 = Date.now();
      if (sz.mobile) { await touch('touchStart', cy); await touch('touchEnd'); } else { await page.mouse.click(cx, cy); }
      for (const w of [20, 40, 60, 80]) { await page.waitForTimeout(w); frames.push({ label: `tap +${Date.now() - t2}ms`, buf: await page.screenshot({ clip }) }); }
      await strip(frames, `tassel__${scheme}__${sz.id}.png`, 7);
      await context.close();
    }
    if (only.includes('swatch') && (key === '1440' || key === '390')) {
      const { context, page } = await open(browser, scheme, sz);
      const cdp = await context.newCDPSession(page);
      await go(page, 'services/');
      const off = page.locator('.offering').first();
      await off.scrollIntoViewIfNeeded();
      const ob = await off.boundingBox();
      const clip = { x: 0, y: Math.max(0, ob.y - 10), width: sz.w, height: Math.min(sz.h, ob.height + 40) };
      const frames = [{ label: 'rest', buf: await page.screenshot({ clip }) }];
      const sb = await page.locator('.swatch-hang').first().boundingBox();
      const x = sb.x + sb.width / 2, y = sb.y + sb.height / 2;
      if (sz.mobile) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] }); }
      else await page.mouse.move(x, y);
      await page.waitForTimeout(450);
      frames.push({ label: sz.mobile ? 'pressed' : 'hover', buf: await page.screenshot({ clip }) });
      if (sz.mobile) await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); else await page.mouse.move(2, 2);
      await page.waitForTimeout(450);
      frames.push({ label: 'released', buf: await page.screenshot({ clip }) });
      await strip(frames, `swatch__${scheme}__${sz.id}.png`, sz.mobile ? 3 : 1);
      // second offering (toile), lifted
      const off2 = page.locator('.offering').nth(1);
      await off2.scrollIntoViewIfNeeded();
      const o2 = await off2.boundingBox();
      const c2 = { x: 0, y: Math.max(0, o2.y - 10), width: sz.w, height: Math.min(sz.h, o2.height + 40) };
      const s2 = await page.locator('.swatch-hang').nth(1).boundingBox();
      if (sz.mobile) await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: s2.x + s2.width / 2, y: s2.y + s2.height / 2, id: 1 }] });
      else await page.mouse.move(s2.x + s2.width / 2, s2.y + s2.height / 2);
      await page.waitForTimeout(450);
      await strip([{ label: 'No. 2 lifted', buf: await page.screenshot({ clip: c2 }) }], `swatch2__${scheme}__${sz.id}.png`, 1);
      await context.close();
    }
    if (only.includes('btn') && key === '1440') {
      const { context, page } = await open(browser, scheme, sz);
      await go(page, 'services/');
      const btn = page.locator('.gm-btn').first();
      await btn.scrollIntoViewIfNeeded();
      const b = await btn.boundingBox();
      const clip = { x: b.x - 30, y: b.y - 20, width: b.width + 60, height: b.height + 50 };
      const frames = [{ label: 'rest', buf: await page.screenshot({ clip }) }];
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.waitForTimeout(250);
      frames.push({ label: 'hover', buf: await page.screenshot({ clip }) });
      await page.mouse.down(); await page.waitForTimeout(120);
      frames.push({ label: 'pressed', buf: await page.screenshot({ clip }) });
      console.log('btn pressed transform', await btn.evaluate((e) => getComputedStyle(e).transform + ' | ' + getComputedStyle(e).boxShadow));
      await page.mouse.up(); await page.waitForTimeout(250);
      frames.push({ label: 'released', buf: await page.screenshot({ clip }) });
      await strip(frames, `btn__${scheme}__${sz.id}.png`, 4);
      // more-link nudge
      await go(page, '');
      const more = page.locator('.gm-more').first();
      await more.scrollIntoViewIfNeeded();
      const m = await more.boundingBox();
      const mc = { x: m.x - 20, y: m.y - 10, width: m.width + 60, height: m.height + 20 };
      const mf = [{ label: 'rest', buf: await page.screenshot({ clip: mc }) }];
      await page.mouse.move(m.x + 10, m.y + m.height / 2); await page.waitForTimeout(350);
      mf.push({ label: 'hover', buf: await page.screenshot({ clip: mc }) });
      console.log('curl translate hover', await more.locator('.curl').evaluate((e) => getComputedStyle(e).translate));
      await strip(mf, `more__${scheme}__${sz.id}.png`, 2);
      await context.close();
    }
    if (only.includes('focus') && key === '1440') {
      const { context, page } = await open(browser, scheme, sz);
      await go(page, 'about/');
      const before = await page.locator('.wordmark').boundingBox();
      for (let i = 0; i < 4; i++) { await page.keyboard.press('Tab'); if (await page.evaluate(() => document.activeElement?.classList.contains('wordmark'))) break; }
      await page.waitForTimeout(300);
      const after = await page.locator('.wordmark').boundingBox();
      console.log('wordmark shift', JSON.stringify(before) === JSON.stringify(after) ? 'none' : [before, after]);
      const clip = { x: 400, y: 50, width: 640, height: 200 };
      const f = [{ label: 'focus-visible', buf: await page.screenshot({ clip }) }];
      await page.keyboard.press('Tab'); await page.mouse.move(720, 160); await page.waitForTimeout(300);
      f.push({ label: 'hover (no focus)', buf: await page.screenshot({ clip }) });
      await strip(f, `focus__${scheme}__${sz.id}.png`, 2);
      await context.close();
    }
    if (only.includes('swap') && (key === '1440')) {
      const { context, page } = await open(browser, scheme, sz);
      await go(page, 'services/');
      const clip = { x: 0, y: 0, width: sz.w, height: 260 };
      const frames = [];
      const t0 = Date.now();
      const click = page.locator('header nav a[href="/t/grandmillennial/contact/"]').first().click();
      for (let i = 0; i < 9; i++) { frames.push({ label: `swap +${Date.now() - t0}ms`, buf: await page.screenshot({ clip }) }); await page.waitForTimeout(60); }
      await click;
      await page.waitForTimeout(700);
      frames.push({ label: 'settled', buf: await page.screenshot({ clip }) });
      console.log('tassel after swap', await page.locator('.bell-pull').count());
      await strip(frames.map((f) => ({ ...f, buf: f.buf })), `swap__${scheme}__${sz.id}.png`, 2);
      await context.close();
    }
  }
}
await browser.close();
