/**
 * Stage 6 wave 1, task 4: the width dial's behaviour probe. Per width (360,
 * 390, 640, 820, 1024, 1280, 1440) it drags the word with a mouse (and with
 * touch from 820 down), checks the page never scrolls sideways, the h1's
 * height never changes, the ink never reaches the lede (desktop), the value
 * range, the snap-back (time to rest after release), a vertical swipe still
 * scrolling the page, the keyboard, and Esc and blur.
 *
 *   BASE=http://127.0.0.1:4470 node scripts/themes/stage6/w1-t4-dial.mjs
 *   node scripts/themes/snap.mjs --name s6-w1-t4 --reuse --port 4470 -- node scripts/themes/stage6/w1-t4-dial.mjs
 *
 * Results: scripts/themes/.out/stage6/w1/t4/<LABEL>.json. GPU Chromium
 * (--use-angle=d3d11), the portal prompt suppressed, the first-visit hint
 * switched off by marking it seen (the hint has its own film), and
 * prefers-reduced-transparency forced to no-preference.
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', '.out', 'stage6', 'w1', 't4');
mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE || process.env.SNAP_BASE || 'http://127.0.0.1:4470';
const LABEL = process.env.LABEL || 'dial';
const WIDTHS = (process.env.WIDTHS || '360,390,640,820,1024,1280,1440').split(',').map(Number);
const heights = { 360: 740, 390: 844, 640: 960, 820: 1180, 1024: 768, 1280: 800, 1440: 900 };

const browser = await chromium.launch({ args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const results = {};

/** The word's state, read in the page. */
const readState = (page) => page.evaluate(() => {
  const dial = document.querySelector('[data-sw-dial]');
  const h1 = document.querySelector('.billboard');
  const word = h1.querySelectorAll('.ln')[1];
  const range = document.createRange(); range.selectNodeContents(word);
  const rr = range.getBoundingClientRect();
  const lede = document.querySelector('.lede').getBoundingClientRect();
  const m = document.querySelector('.dial-mark').getBoundingClientRect();
  const b = dial.getBoundingClientRect();
  return {
    now: Number(dial.getAttribute('aria-valuenow')), min: Number(dial.getAttribute('aria-valuemin')), max: Number(dial.getAttribute('aria-valuemax')),
    text: dial.getAttribute('aria-valuetext'), active: dial.hasAttribute('data-active'), hidden: dial.hidden,
    sd: word.style.getPropertyValue('--sw-d'),
    wordL: rr.left, wordR: rr.right, h1h: h1.getBoundingClientRect().height, scrollW: document.documentElement.scrollWidth, vw: innerWidth, scrollY,
    ledeL: lede.left, ledeT: lede.top,
    bar: { l: m.left, r: m.right, t: m.top, b: m.bottom }, box: { l: b.left, r: b.right, t: b.top, b: b.bottom },
  };
});

/** From release to the word back at rest: ms until --sw-d is cleared, and the samples. */
const timeToRest = (pg) => pg.evaluate(() => new Promise((resolve) => {
  const dial = document.querySelector('[data-sw-dial]');
  const word = document.querySelectorAll('.billboard .ln')[1];
  const t0 = performance.now();
  const samples = [];
  const tick = () => {
    const now = performance.now() - t0;
    const sd = word.style.getPropertyValue('--sw-d');
    samples.push({ t: Math.round(now), sd: sd === '' ? null : Number(sd) });
    if (sd === '' && !dial.hasAttribute('data-active')) { resolve({ ms: Math.round(now), samples }); return; }
    if (now > 2500) { resolve({ ms: Math.round(now), timedOut: true, samples }); return; }
    requestAnimationFrame(tick);
  };
  tick();
}));

for (const w of WIDTHS) {
  const h = heights[w];
  const touch = w < 1024;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: touch, hasTouch: touch, colorScheme: 'light', reducedMotion: 'no-preference' });
  await suppressPrompt(ctx);
  await ctx.addInitScript(() => { try { localStorage.setItem('scheme', 'light'); sessionStorage.setItem('bdl-swiss-dial-hint', '1'); } catch {} });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
  await page.goto(`${BASE}/t/swiss/`, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: 'bdl-switcher{display:none!important}' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  const r = { width: w, touch };
  r.rest = await readState(page);
  const box = r.rest.box;
  const y = (box.t + box.b) / 2;
  const startX = Math.min(w - 20, box.l + 60);

  // Widening starts at the word's left and goes right; condensing starts at
  // its right (or the viewport's) and goes left, so neither runs out of screen.
  const rightX = Math.max(startX, Math.min(w - 20, r.rest.wordR - 40));
  const sweep = async (label, dxs, fromX) => {
    const out = { label, steps: [] };
    await page.mouse.move(fromX, y);
    await page.mouse.down();
    for (const dx of dxs) {
      await page.mouse.move(Math.max(1, Math.min(w - 1, fromX + dx)), y, { steps: 4 });
      await page.waitForTimeout(60);
      const st = await readState(page);
      out.steps.push({ dx, now: st.now, wordR: Math.round(st.wordR), h1h: Math.round(st.h1h), scrollW: st.scrollW, vw: st.vw, active: st.active, ledeT: Math.round(st.ledeT), ledeL: Math.round(st.ledeL), bar: st.bar });
    }
    await page.mouse.up();
    out.released = await timeToRest(page);
    return out;
  };
  r.mouse = [];
  r.mouse.push(await sweep('mouse widen', [60, 140, 300, w], startX));
  await page.waitForTimeout(200);
  r.mouse.push(await sweep('mouse condense', [-60, -140, -300, -w], rightX));
  await page.waitForTimeout(200);
  await page.mouse.move(startX, y); await page.mouse.down(); await page.mouse.move(startX + 4, y, { steps: 2 });
  const nud = await readState(page); await page.mouse.up();
  r.nudge4px = { now: nud.now, active: nud.active };

  if (touch) {
    const touchDrag = async (dx, steps = 8, fromX = startX) => {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: fromX, y }] });
      for (let i = 1; i <= steps; i++) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: fromX + (dx * i) / steps, y }] });
        await page.waitForTimeout(16);
      }
      await page.waitForTimeout(80);
      const st = await readState(page);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      return st;
    };
    const tw = await touchDrag(Math.max(60, w - startX - 2), 10);
    r.touchWiden = { now: tw.now, scrollW: tw.scrollW, vw: tw.vw, h1h: Math.round(tw.h1h), active: tw.active };
    r.touchWidenReturn = (await timeToRest(page)).ms;
    await page.waitForTimeout(150);
    const tn = await touchDrag(-(rightX - 2), 10, rightX);
    r.touchCondense = { now: tn.now, scrollW: tn.scrollW, active: tn.active };
    r.touchCondenseReturn = (await timeToRest(page)).ms;
    await page.waitForTimeout(150);
    // A vertical swipe that starts on the word scrolls the page and leaves the word alone.
    const swipe = async (x, y0, dy) => {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: y0 }] });
      for (let i = 1; i <= 12; i++) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 2, y: y0 + (dy * i) / 12 }] });
        await page.waitForTimeout(16);
      }
      const mid = await readState(page);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await page.waitForTimeout(250);
      return { mid, end: await readState(page) };
    };
    const on = await swipe(startX, y, -260);
    r.verticalSwipe = { scrollYAfter: on.end.scrollY, nowMid: on.mid.now, activeMid: on.mid.active, nowEnd: on.end.now };
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForTimeout(100);
    const off = await swipe(5, 40, -260);
    r.verticalSwipe.controlOffWord = off.end.scrollY;
    await page.evaluate(() => scrollTo(0, 0));
  }

  // Keyboard.
  await page.focus('[data-sw-dial]');
  const key = async (k) => { await page.keyboard.press(k); return (await readState(page)).now; };
  r.keys = {
    start: (await readState(page)).now,
    left: await key('ArrowLeft'), left2: await key('ArrowLeft'), right: await key('ArrowRight'),
    shiftLeft: await key('Shift+ArrowLeft'), pageUp: await key('PageUp'), pageDown: await key('PageDown'),
    home: await key('Home'), end: await key('End'),
  };
  r.keys.activeWhileFocused = (await readState(page)).active;
  await page.keyboard.press('Home'); await page.waitForTimeout(500);
  r.keys.heldAfter500ms = (await readState(page)).now;
  await page.keyboard.press('Escape'); await page.waitForTimeout(100);
  const esc = await readState(page);
  r.keys.afterEsc = { now: esc.now, sd: esc.sd, active: esc.active };
  await page.keyboard.press('Home');
  await page.evaluate(() => document.activeElement.blur()); await page.waitForTimeout(100);
  const bl = await readState(page);
  r.keys.afterBlur = { now: bl.now, sd: bl.sd, active: bl.active };
  await page.focus('[data-sw-dial]');
  await page.keyboard.down('g');
  r.gWhileDialFocused = await page.evaluate(() => !document.querySelector('[data-sw-guides]').hidden);
  await page.keyboard.up('g');
  results[w] = r;
  const steps = r.mouse.flatMap((m) => m.steps);
  console.log(w, JSON.stringify({
    rest: { now: r.rest.now, max: r.rest.max, wordR: Math.round(r.rest.wordR), scrollW: r.rest.scrollW, h1h: Math.round(r.rest.h1h) },
    widen: r.mouse[0].steps.map((s) => `${s.dx}:${s.now}`).join(' '), widenReturnMs: r.mouse[0].released.ms,
    condense: r.mouse[1].steps.map((s) => `${s.dx}:${s.now}`).join(' '), condenseReturnMs: r.mouse[1].released.ms,
    maxScrollW: Math.max(...steps.map((s) => s.scrollW)), vw: w,
    h1h: [...new Set(steps.map((s) => s.h1h))].join(','),
    nudge4px: r.nudge4px, touch: touch ? { widen: r.touchWiden, wr: r.touchWidenReturn, cond: r.touchCondense, cr: r.touchCondenseReturn, vs: r.verticalSwipe } : null,
    keys: r.keys, g: r.gWhileDialFocused,
  }));
  await ctx.close();
}
await browser.close();
writeFileSync(join(OUT, `${LABEL}.json`), JSON.stringify(results, null, 2));
