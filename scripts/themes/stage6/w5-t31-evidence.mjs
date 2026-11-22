/**
 * Stage 6 wave 5, task 31 (stop 5 verdicts): measured evidence against a built
 * snapshot, GPU Chromium, reduced transparency forced to no-preference.
 * Sections (ONLY=stop,birch,elevator,numeral,floppy,bauhaus,plates):
 *   stop      swiss Sent: hover the full stop with a mouse at 1440 and 390 (fine
 *             pointer): the ::before outline box measured against the dot's ink,
 *             the outline's left edge against the "t" foot; crop sheets.
 *   birch     swiss About at 1440: the spine's cursor over it (default) and the
 *             hover ink block's background.
 *   elevator  vaporwave Home at 1440, 820, 390: press B1 and 1F from the top of
 *             the page; scrollY before and after (moved when the window is off
 *             screen, unchanged when it is in view), in-view repeat.
 *   numeral   swiss Services at 390: a 100 ms tap during the weight's return
 *             and during the touch beat; the weight sampled each frame, the
 *             largest one-frame jump reported (no snap).
 *   floppy    vaporwave Sent, My Computer open, dark, 1440 and 390: the floppy
 *             body's computed fill and its contrast against the window; a crop.
 *   bauhaus   bauhaus Home with `animation: none` forced on the numerals: the
 *             retry timer's setTimeout(300) count over 5 s after the page is
 *             still (it must stop at one or two, not run on).
 *   plates    grandmillennial Contact at 390: the beat's start against the
 *             warm-up (the first swing never before the 900 ms warm-up).
 *
 *   node scripts/themes/snap.mjs --name s6-w5-t31 --port 4470 -- node scripts/themes/stage6/w5-t31-evidence.mjs
 * Output: scripts/themes/.out/stage6/w5/t31/ (gitignored scratch).
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, open, pixelReader } from './w4-t29-lib.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', '.out', 'stage6', 'w5', 't31');
await mkdir(OUT, { recursive: true });
const ONLY = (process.env.ONLY || 'stop,birch,elevator,numeral,floppy,bauhaus,plates').split(',');
const { browser, renderer } = await launch();
const R = { renderer };
const fails = [];
const check = (name, ok, detail) => {
  if (!ok) fails.push(name);
  console.log(ok ? 'ok  ' : 'FAIL', name, detail === undefined ? '' : JSON.stringify(detail));
};

/* ------------------------------------------------------------------ stop */
if (ONLY.includes('stop')) {
  R.stop = {};
  for (const width of [1440, 390]) {
    const { ctx, page } = await open(browser, { path: '/t/swiss/contact/sent/', width, scheme: 'light', touch: false });
    await page.evaluate(() => document.querySelector('.sent .stop').scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(300);
    const before = await page.evaluate(() => {
      const r = document.querySelector('.sent .stop').getBoundingClientRect();
      return { x: r.left, y: r.top, w: r.width, h: r.height };
    });
    const cx = before.x + before.w / 2, cy = before.y + before.h * 0.66;
    await page.mouse.move(cx, cy);
    await page.waitForTimeout(250);
    const m = await page.evaluate(() => {
      const s = document.querySelector('.sent .stop');
      const b = getComputedStyle(s, '::before');
      const a = getComputedStyle(s, '::after');
      const r = s.getBoundingClientRect();
      return {
        outline: b.outlineStyle + ' ' + b.outlineWidth + ' ' + b.outlineOffset, afterOutline: a.outlineStyle,
        left: r.left + parseFloat(b.left), top: r.top + parseFloat(b.top), w: parseFloat(b.width), h: parseFloat(b.height), cursor: getComputedStyle(s).cursor,
      };
    });
    const png = await page.screenshot({ type: 'png' });
    const dpr = 1; // open() with touch:false is a 1x desktop-style context at every width
    const px = await pixelReader(png);
    // the dot's red ink inside the box, and the outline ring 8px outside it
    const isRed = (c) => c[0] > 180 && c[1] < 90 && c[2] < 90;
    let minX = 1e9, maxX = -1, minY = 1e9, maxY = -1;
    for (let y = Math.floor((m.top - 6) * dpr); y < Math.ceil((m.top + m.h + 6) * dpr); y++) for (let x = Math.floor((m.left - 6) * dpr); x < Math.ceil((m.left + m.w + 6) * dpr); x++) if (isRed(px.at(x, y))) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
    const ink = { left: minX / dpr, right: (maxX + 1) / dpr, top: minY / dpr, bottom: (maxY + 1) / dpr };
    const ring = { left: m.left - 8 - 1, right: m.left + m.w + 8, top: m.top - 8 - 1, bottom: m.top + m.h + 8 };
    const dk = (c) => c[0] < 60 && c[1] < 60 && c[2] < 60;
    // ring pixels: a dark vertical line at the ring's left edge over the box's middle rows
    const midY = (m.top + m.h / 2) * dpr;
    let ringLeftDark = false;
    for (let x = Math.floor((ring.left - 1) * dpr); x <= Math.ceil((ring.left + 2) * dpr); x++) if (dk(px.at(x, midY))) ringLeftDark = true;
    // the "t": right-most dark ink left of the ring on the stop's text rows
    let tRight = -1;
    for (let x = Math.floor((ring.left - 2) * dpr); x > Math.floor((ring.left - 120) * dpr) && tRight < 0; x--) {
      for (let y = Math.floor((m.top - m.h * 1.5) * dpr); y < Math.ceil((m.top + m.h * 0.4) * dpr); y++) if (dk(px.at(x, y))) { tRight = (x + 1) / dpr; break; }
    }
    R.stop[width] = { m, ink, ring, ringLeftDark, tRight, clearOfT: ring.left - tRight };
    check(`stop ${width}: outline on ::before, none on ::after, box equals the ink`, m.outline.startsWith('solid') && m.afterOutline === 'none' && Math.abs(ink.left - m.left) <= 1.5 && Math.abs(ink.right - (m.left + m.w)) <= 1.5 && Math.abs(ink.top - m.top) <= 1.5, { outline: m.outline, ink, box: [m.left, m.top, m.w, m.h] });
    check(`stop ${width}: the ring is drawn`, ringLeftDark, { ringLeft: ring.left });
    check(`stop ${width}: ring clears the t's foot`, tRight < 0 || ring.left - tRight > 4, { tRight, gap: ring.left - tRight });
    const clip = { x: Math.max(0, m.left - 140), y: Math.max(0, m.top - 160), width: Math.min(width, 300), height: 300 };
    await page.screenshot({ path: join(OUT, `stop-hover-${width}.png`), clip });
    await ctx.close();
  }
}

/* ------------------------------------------------------------------ birch */
if (ONLY.includes('birch')) {
  const { ctx, page } = await open(browser, { path: '/t/swiss/about/', width: 1440, scheme: 'light', touch: false });
  await page.evaluate(() => scrollTo(0, 400));
  await page.waitForTimeout(500);
  const info = await page.evaluate(() => {
    const b = document.querySelector('.sw-birch');
    const r = b.getBoundingClientRect();
    return { live: 'live' in b.dataset, rect: { x: r.left, y: r.top, w: r.width, h: r.height }, cursor: getComputedStyle(b).cursor, pe: getComputedStyle(b).pointerEvents };
  });
  let cursor = null, bg = null;
  if (info.live) {
    await page.mouse.move(info.rect.x + info.rect.w / 2, info.rect.y + info.rect.h / 2);
    await page.waitForTimeout(250);
    ({ cursor, bg } = await page.evaluate(() => { const b = document.querySelector('.sw-birch'); return { cursor: getComputedStyle(b).cursor, bg: getComputedStyle(b).backgroundColor }; }));
    await page.screenshot({ path: join(OUT, 'birch-hover-1440.png') });
  }
  R.birch = { info, cursor, bg };
  check('birch: live at 1440, cursor default, ink block on hover', info.live && cursor === 'default' && bg !== 'rgba(0, 0, 0, 0)', R.birch);
  await ctx.close();
}

/* ------------------------------------------------------------------ elevator */
if (ONLY.includes('elevator')) {
  R.elevator = {};
  for (const width of [1440, 820, 390]) {
    R.elevator[width] = {};
    for (const floor of [0, 1]) {
      const { ctx, page } = await open(browser, { path: '/t/vaporwave/', width, scheme: 'light' });
      const y0 = await page.evaluate(() => scrollY);
      const plaque = await page.evaluate(() => { const b = document.querySelector('[data-floor="0"]'); return b ? b.getBoundingClientRect().top + scrollY : null; });
      // bring the plaque into view first (the buttons are below the fold at the top of the page)
      await page.evaluate(() => document.querySelector('[data-floor="0"]').scrollIntoView({ block: 'center' }));
      await page.waitForTimeout(400);
      const y1 = await page.evaluate(() => scrollY);
      const doorOff = await page.evaluate((f) => { const r = document.querySelector('.door-' + f).getBoundingClientRect(); return r.bottom <= 0 || r.top >= innerHeight; }, floor);
      await page.click(`[data-floor="${floor}"]`);
      const samples = [];
      for (let i = 0; i < 24; i++) { await page.waitForTimeout(150); samples.push(await page.evaluate(() => Math.round(scrollY))); }
      const doorAfter = await page.evaluate((f) => { const r = document.querySelector('.door-' + f).getBoundingClientRect(); return { top: r.top, bottom: r.bottom, vh: innerHeight, mid: (r.top + r.bottom) / 2 }; }, floor);
      const moved = samples[samples.length - 1] !== y1;
      const inView = doorAfter.bottom > 0 && doorAfter.top < doorAfter.vh;
      R.elevator[width][floor] = { y0, plaque, y1, doorOffBefore: doorOff, samples, doorAfter, moved, inView };
      check(`elevator ${width} floor ${floor}: ${doorOff ? 'off screen scrolls into view' : 'in view stays put'}`, doorOff ? moved && inView : !moved, { y1, final: samples[samples.length - 1], doorOffBefore: doorOff, mid: doorAfter.mid });
      if (floor === 0) await page.screenshot({ path: join(OUT, `elevator-b1-${width}.png`) });
      // press again with the window already in view: nothing moves
      const yIn = await page.evaluate(() => Math.round(scrollY));
      await page.evaluate(() => document.querySelector('[data-floor="2"]').click());
      await page.waitForTimeout(100);
      await page.evaluate((f) => document.querySelector(`[data-floor="${f}"]`).click(), floor);
      await page.waitForTimeout(3500);
      R.elevator[width][floor].again = { yIn, final: await page.evaluate(() => Math.round(scrollY)) };
      await ctx.close();
    }
  }
}

/* ------------------------------------------------------------------ numeral */
if (ONLY.includes('numeral')) {
  R.numeral = {};
  const GLYPH = () => { const n = document.querySelector('.steps .num'); const rg = document.createRange(); rg.selectNodeContents(n); const r = rg.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
  const startSampler = (page) => page.evaluate(() => { window.__w = []; const n = document.querySelector('.steps .num'); const t0 = performance.now(); const f = () => { window.__w.push([Math.round(performance.now() - t0), parseFloat(getComputedStyle(n).fontWeight)]); if (performance.now() - t0 < 4000) requestAnimationFrame(f); }; f(); });
  // the largest weight change per ms between frames, and the largest single-frame change
  const speeds = (w) => { let per = 0, jump = 0; for (let i = 1; i < w.length; i++) { const d = Math.abs(w[i][1] - w[i - 1][1]); jump = Math.max(jump, d); per = Math.max(per, d / Math.max(1, w[i][0] - w[i - 1][0])); } return { maxPerMs: +per.toFixed(2), maxJump: jump }; };
  const down = (cdp, g) => cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: g.x, y: g.y, id: 1 }] });
  const up = (cdp) => cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  {
    // A: a held press to near the hairline, released; a 100 ms tap during the return
    const { ctx, page, cdp } = await open(browser, { path: '/t/swiss/services/', width: 390, scheme: 'light' });
    await page.evaluate(() => document.querySelector('.steps .num').scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(250);
    const g = await page.evaluate(GLYPH);
    await startSampler(page);
    await down(cdp, g);
    await page.waitForTimeout(700);
    await up(cdp);
    // the return starts after the 100 ms hold; tap 200 ms after release, mid-return
    await page.waitForTimeout(200);
    const wBefore = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.steps .num')).fontWeight));
    await down(cdp, g);
    await page.waitForTimeout(100);
    await up(cdp);
    await page.waitForTimeout(2500);
    const w = await page.evaluate(() => window.__w);
    R.numeral.duringReturn = { weightAtTap: wBefore, ...speeds(w), trace: w.filter((x, i) => i % 3 === 0) };
    check('numeral: a 100 ms tap during the return neither snaps nor jumps (weight at the tap is off rest)', wBefore !== 700 && R.numeral.duringReturn.maxPerMs <= 3.5, { wBefore, ...speeds(w) });
    await ctx.close();
  }
  {
    // B: a tap during the touch beat (the page left still after load, nothing touched)
    const { ctx, page, cdp } = await open(browser, { path: '/t/swiss/services/', width: 390, scheme: 'light', settle: 100 });
    await page.evaluate(() => document.querySelector('.steps .num').scrollIntoView({ block: 'center' }));
    await startSampler(page);
    let beatAt = -1;
    for (let i = 0; i < 400 && beatAt < 0; i++) {
      await page.waitForTimeout(20);
      const cur = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.steps .num')).fontWeight));
      if (cur < 690) beatAt = i;
    }
    const g = await page.evaluate(GLYPH);
    const wBefore = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.steps .num')).fontWeight));
    await down(cdp, g);
    await page.waitForTimeout(100);
    await up(cdp);
    await page.waitForTimeout(2500);
    const w = await page.evaluate(() => window.__w);
    R.numeral.duringBeat = { beatAt, weightAtTap: wBefore, ...speeds(w), trace: w.filter((x, i) => i % 3 === 0) };
    check('numeral: a 100 ms tap during the touch beat neither snaps nor jumps', beatAt >= 0 && wBefore !== 700 && R.numeral.duringBeat.maxPerMs <= 3.5, { beatAt, wBefore, ...speeds(w) });
    await ctx.close();
  }
}

/* ------------------------------------------------------------------ floppy */
if (ONLY.includes('floppy')) {
  R.floppy = {};
  for (const width of [1440, 390]) {
    const { ctx, page } = await open(browser, { path: '/t/vaporwave/contact/sent/', width, scheme: 'dark' });
    await page.evaluate(() => { const w = document.querySelector('[data-desk-win="computer"]'); w.hidden = false; w.removeAttribute('aria-hidden'); w.scrollIntoView({ block: 'center' }); });
    await page.evaluate(() => { const i = document.querySelector('[data-desk-icon="computer"]') || document.querySelector('[data-desk-open="computer"]'); i?.click?.(); });
    await page.waitForTimeout(600);
    const m = await page.evaluate(() => {
      const w = document.querySelector('[data-desk-win="computer"]');
      const rect = w.querySelector('.drives rect');
      const cs = getComputedStyle(rect);
      const win = getComputedStyle(w.querySelector('.drives'));
      const lum = (c) => { const [r, g, b] = c.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
      const raised = getComputedStyle(w).getPropertyValue('--field-raised').trim();
      const probe = document.createElement('div'); probe.style.color = getComputedStyle(w).getPropertyValue('--field-raised'); w.append(probe);
      const bgc = getComputedStyle(probe).color; probe.remove();
      const a = lum(cs.fill), b = lum(bgc);
      return { fill: cs.fill, raised: bgc, ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) };
    });
    R.floppy[width] = m;
    check(`floppy ${width} dark: body reads against the window`, m.ratio >= 3, m);
    const r = await page.evaluate(() => { const w = document.querySelector('[data-desk-win="computer"] .drives').getBoundingClientRect(); return { x: w.left, y: w.top, w: w.width, h: w.height }; });
    await page.screenshot({ path: join(OUT, `floppy-dark-${width}.png`), clip: { x: Math.max(0, r.x - 20), y: Math.max(0, r.y - 20), width: Math.min(width, r.w + 40), height: r.h + 40 } });
    await ctx.close();
  }
}

/* ------------------------------------------------------------------ bauhaus */
if (ONLY.includes('bauhaus')) {
  const { ctx, page } = await open(browser, {
    path: '/t/bauhaus/services/', width: 390, scheme: 'light', settle: 100,
    init: () => { window.__t = []; const st = window.setTimeout; window.setTimeout = function (f, ms, ...a) { if (ms === 300) window.__t.push(Math.round(performance.now())); return st.call(this, f, ms, ...a); }; },
  });
  await page.addStyleTag({ content: '.num, .num * { animation: none !important; }' });
  await page.evaluate(() => document.querySelector('.num')?.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(6000);
  const n = await page.evaluate(() => window.__t.length);
  await page.waitForTimeout(3000);
  const n2 = await page.evaluate(() => window.__t.length);
  R.bauhaus = { n, n2, nums: await page.evaluate(() => document.querySelectorAll('.num').length) };
  check('bauhaus: with animation none the retry timer stops re-arming', n2 === n && n2 <= 2, R.bauhaus);
  await ctx.close();
}

/* ------------------------------------------------------------------ plates */
if (ONLY.includes('plates')) {
  const { ctx, page } = await open(browser, {
    path: '/t/grandmillennial/', width: 390, scheme: 'light', settle: 100,
    init: () => { window.__a = []; const an = Element.prototype.animate; Element.prototype.animate = function (k, o) { window.__a.push([Math.round(performance.now()), o && o.duration]); return an.call(this, k, o); }; },
  });
  await page.waitForTimeout(5000);
  const a = await page.evaluate(() => window.__a);
  R.plates = a;
  const warm = a.find((x) => x[1] === 80);
  const first = a.find((x) => x[1] !== 80);
  check('plates: the warm-up (80 ms) is before any swing', !!warm && (!first || first[0] >= warm[0]), a.slice(0, 8));
  await ctx.close();
}

await writeFile(join(OUT, 'evidence.json'), JSON.stringify(R, null, 1));
await browser.close();
console.log(fails.length ? `FAILS: ${fails.join('; ')}` : 'all ok');
