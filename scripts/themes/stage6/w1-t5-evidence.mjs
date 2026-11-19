/**
 * Stage 6 wave 1, task 5: behaviour probe for the bauhaus questionnaire card.
 *   node scripts/themes/stage6/w1-t5-evidence.mjs <outDir> [width] [height] [scheme]
 * Serves dist/ on 4470, drives the card by tap, drag, keyboard and (at phone
 * width) touch, asserts the state after each, and saves a timestamped film of
 * the reveal. GPU Chromium; reduced-transparency forced to no-preference.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { serveDist } from '../lib/serve-dist.mjs';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const [out, w = '1440', h = '1200', scheme = 'light'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const PORT = 4470;
const mobile = +w < 900;
const server = await serveDist(PORT);
const browser = await chromium.launch({ args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
let fails = 0;
const ok = (cond, msg) => { console.log(cond ? 'ok  ' : 'FAIL', msg); if (!cond) fails++; };
try {
  const ctx = await browser.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile, colorScheme: scheme, reducedMotion: 'no-preference' });
  await suppressPrompt(ctx);
  await ctx.addInitScript((s) => { try { localStorage.setItem('scheme', s); } catch {} }, scheme);
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
  page.on('pageerror', (e) => { console.log('PAGEERROR', e.message); fails++; });
  await page.goto(`http://127.0.0.1:${PORT}/t/bauhaus/about/`, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: 'bdl-switcher{display:none!important}' });
  await page.evaluate(() => document.fonts.ready);
  await page.locator('[data-quiz]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);
  const fillsOf = () => page.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-shape]')].map((b) => [b.dataset.shape, b.getAttribute('data-fill')])));
  const status = () => page.locator('[data-qstatus]').textContent();
  const pressed = () => page.evaluate(() => [...document.querySelectorAll('[data-shape][aria-pressed="true"], [data-pick][aria-pressed="true"]')].map((b) => b.dataset.shape || b.dataset.pick));
  const frame = async (name) => { await page.evaluate(() => { scrollBy(0, document.querySelector('[data-quiz]').getBoundingClientRect().top); }); await page.screenshot({ path: join(out, `${scheme}-${w}-${name}.png`) }); };
  const tap = async (sel) => { const l = page.locator(sel); if (mobile) await l.tap(); else await l.click(); };
  const again = async () => { await tap('[data-qagain]'); await page.waitForTimeout(400); };
  const box = async (sel) => (await page.locator(sel).boundingBox());
  const centre = (b) => [b.x + b.width / 2, b.y + b.height / 2];

  // 0. fresh load: empty, no fills, key hidden, status empty, labels
  ok(JSON.stringify(await fillsOf()) === '{"triangle":null,"square":null,"circle":null}', 'starts empty');
  ok((await status()) === '', 'role=status is empty at start');
  ok(await page.locator('[data-qkey]').isHidden(), 'key hidden on init');
  ok((await page.getAttribute('[data-shape="triangle"]', 'aria-label')) === 'Triangle, no colour yet', 'shape label: no colour yet');

  // 1. tap: shape then colour (wrong pairing), colour then shape, swap
  await tap('[data-shape="triangle"]');
  ok((await pressed()).join() === 'triangle', 'tap shape selects it (aria-pressed)');
  ok((await status()) === 'Triangle selected. Now pick a colour.', 'status after shape pick');
  await tap('[data-pick="red"]');
  await page.waitForTimeout(350);
  ok((await fillsOf()).triangle === 'red', 'triangle is red (wrong)');
  ok((await status()) === 'Triangle is red.', 'status "Triangle is red."');
  ok((await page.getAttribute('[data-shape="triangle"]', 'aria-label')) === 'Triangle, red', 'shape label: Triangle, red');
  await tap('[data-pick="yellow"]');
  ok((await pressed()).join() === 'yellow', 'colour first selects the colour');
  await tap('[data-shape="square"]');
  await page.waitForTimeout(350);
  ok((await fillsOf()).square === 'yellow', 'colour then shape fills');
  await tap('[data-pick="red"]');
  await tap('[data-shape="square"]');
  await page.waitForTimeout(500);
  const f1 = await fillsOf();
  ok(f1.square === 'red' && f1.triangle === 'yellow', 'reusing red on the square swaps with the triangle: ' + JSON.stringify(f1));
  await frame('1-swap');

  // 2. escape clears a pick
  await tap('[data-shape="circle"]');
  await page.keyboard.press('Escape');
  ok((await pressed()).length === 0, 'Escape clears the pick');

  // 3. show the answer with two shapes: reveal at once, film it
  await tap('[data-qshow]');
  const t0 = Date.now();
  for (const ms of [0, 120, 260, 400, 700, 1200]) {
    const wait = ms - (Date.now() - t0);
    if (wait > 0) await page.waitForTimeout(wait);
    await frame(`2-reveal-${String(ms).padStart(4, '0')}ms`);
  }
  ok((await status()).startsWith("Kandinsky's answer: yellow triangle, red square, blue circle. You agree on 2 of 3."), 'status on reveal: ' + (await status()));
  ok((await page.locator('[data-tally="2"]').isVisible()) && !(await page.locator('[data-tally="3"]').isVisible()), 'tally shows 2 of 3 only');
  ok((await page.locator('[data-key][data-match]').count()) === 2, 'two stamps');
  ok(await page.evaluate(() => document.querySelector('[data-qrows]').inert), 'rows inert after reveal');

  // 4. again resets
  await again();
  ok(JSON.stringify(await fillsOf()) === '{"triangle":null,"square":null,"circle":null}', 'again empties every shape');
  ok(await page.locator('[data-qkey]').isHidden(), 'again hides the key');
  await frame('3-again');

  // 5. all three right by tap: auto reveal 400 ms after the third fill
  for (const [s, c] of [['triangle', 'yellow'], ['square', 'red'], ['circle', 'blue']]) { await tap(`[data-shape="${s}"]`); await tap(`[data-pick="${c}"]`); }
  const tThird = Date.now();
  await page.waitForTimeout(250);
  ok(await page.locator('[data-qkey]').isHidden(), 'key still hidden 250 ms after the third fill');
  await page.waitForTimeout(400);
  ok(await page.locator('[data-qkey]').isVisible(), 'key shown by 650 ms after the third fill');
  await page.waitForTimeout(1500);
  ok(await page.locator('[data-tally="3"]').isVisible(), 'tally 3 of 3');
  await frame('4-three-of-three');
  await again();

  // 6. drag a colour bar (pointer; touch below at phone width)
  const drag = async (fromSel, toSel, drop = true) => {
    const a = centre(await box(fromSel));
    const b = centre(await box(toSel));
    if (mobile) {
      const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
      await touch('touchStart', a[0], a[1]);
      for (let i = 1; i <= 8; i++) await touch('touchMove', a[0] + ((b[0] - a[0]) * i) / 8, a[1] + ((b[1] - a[1]) * i) / 8);
      if (!drop) await page.waitForTimeout(150);
      await touch('touchEnd');
    } else {
      await page.mouse.move(...a);
      await page.mouse.down();
      await page.mouse.move(a[0] + 20, a[1] - 20, { steps: 3 });
      await page.mouse.move(...b, { steps: 8 });
      await page.waitForTimeout(80);
      await page.mouse.up();
    }
    await page.waitForTimeout(450);
  };
  await drag('[data-pick="yellow"]', '[data-shape="triangle"]');
  ok((await fillsOf()).triangle === 'yellow', 'drag yellow bar onto triangle fills it');
  const home = await box('[data-pick="yellow"]');
  const sw = await page.evaluate(() => getComputedStyle(document.querySelector('[data-pick="yellow"]')).translate);
  ok(sw === 'none' || sw === '0px 0px' || sw === '', 'bar is back home after the drop (translate ' + sw + ')');
  ok(!!home, 'bar still laid out');
  // a miss snaps back and fills nothing
  const before = JSON.stringify(await fillsOf());
  await drag('[data-pick="red"]', '[data-qshow]');
  ok(JSON.stringify(await fillsOf()) === before, 'a miss fills nothing');
  ok((await page.evaluate(() => getComputedStyle(document.querySelector('[data-pick="red"]')).translate)).match(/^(none|0px 0px|)$/) !== null, 'a miss snaps back');
  await again();

  // 7. keyboard: arrows within a row, Enter picks, Escape clears, Tab order
  await page.locator('[data-shape="triangle"]').focus();
  await page.keyboard.press('ArrowRight');
  ok((await page.evaluate(() => document.activeElement.dataset.shape)) === 'square', 'ArrowRight moves to the square');
  ok((await page.evaluate(() => [...document.querySelectorAll('[data-shape]')].map((b) => b.tabIndex).join())) === '-1,0,-1', 'roving tabindex follows focus');
  await page.keyboard.press('Enter');
  ok((await pressed()).join() === 'square', 'Enter picks the focused shape');
  await page.keyboard.press('Tab');
  ok((await page.evaluate(() => document.activeElement.dataset.pick)) === 'yellow', 'Tab leaves the shapes for the colours');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Space');
  await page.waitForTimeout(350);
  ok((await fillsOf()).square === 'red', 'keyboard: square is red');
  await page.keyboard.press('Tab');
  ok((await page.evaluate(() => document.activeElement.hasAttribute('data-qshow'))) || (await page.evaluate(() => document.activeElement.hasAttribute('data-qagain'))), 'Tab goes on to the footer buttons');
  await frame('5-keyboard-focus');
  await again();

  if (mobile) {
    // 8. a vertical swipe over the card (not on a bar) scrolls the page
    await page.evaluate(() => scrollTo(0, document.querySelector('[data-quiz]').offsetTop));
    await page.waitForTimeout(200);
    const y0 = await page.evaluate(() => scrollY);
    const r = await box('.qreason');
    const x = r.x + r.width / 2;
    const touch = (type, yy) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y: yy, id: 1 }] });
    await touch('touchStart', r.y + 10);
    for (let i = 1; i <= 8; i++) await touch('touchMove', r.y + 10 - i * 20);
    await touch('touchEnd');
    await page.waitForTimeout(400);
    const y1 = await page.evaluate(() => scrollY);
    ok(y1 > y0 + 40, `vertical swipe over the card scrolls the page (${y0} to ${y1})`);
  }
} finally {
  await browser.close();
  server.close();
}
console.log(fails ? `${fails} FAILED` : 'all ok');
process.exit(fails ? 1 : 0);
