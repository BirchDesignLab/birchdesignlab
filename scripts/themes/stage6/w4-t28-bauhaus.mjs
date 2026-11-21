/**
 * Stage 6 wave 4, task 28 (critique A1): the bauhaus signifiers, filmed and
 * measured. Sections (ONLY=cursor,beats,conditions,keys):
 *
 *   cursor      1440, mouse: every toy's cursor over it and off it, and its
 *               hover response (computed lift and ink block), with a strip of
 *               the mouse arriving and leaving. Writes cursor.json.
 *   beats       390, touch: every toy's beat, once, from the stillness timer to
 *               the end of the beat (a strip), with the beat's start measured
 *               from the last scroll (it must be at least 400 ms) and counted
 *               (exactly one per toy, none again after scrolling away and
 *               back). Writes beats.json.
 *   conditions  390: no beat at 40% visible, none while the page keeps
 *               scrolling, none while a form field has focus (then one soon
 *               after blur), none for a mouse (1440).
 *   keys        1440: Enter or Space after a click on the right end tips the
 *               right end again, then the keys alternate.
 *
 *   node scripts/themes/snap.mjs --name s6-w4-t28 --reuse --port 4470 -- node scripts/themes/stage6/w4-t28-bauhaus.mjs
 *   SCHEMES=light ONLY=beats node ... for a subset.
 * Output: .out/stage6/w4/t28/bauhaus/
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { launch, open, startFilm, strip, boxOf, OUT } from './w4-t28-lib.mjs';

const ONLY = (process.env.ONLY || 'cursor,beats,conditions,keys').split(',');
const SCHEMES = (process.env.SCHEMES || 'light,dark').split(',');
const D = join(OUT, 'bauhaus');
await mkdir(D, { recursive: true });
const { browser, renderer } = await launch();
const R = { renderer, cursor: {}, beats: {}, conditions: {}, keys: {} };
const fails = [];
const check = (name, ok, detail) => {
  if (!ok) fails.push(`${name} ${JSON.stringify(detail)}`);
  console.log(ok ? 'ok  ' : 'FAIL', name, detail === undefined ? '' : JSON.stringify(detail));
};

/** Installed before the page runs: logs, with epoch times, when each toy's beat starts and ends. */
function installLog() {
  window.__beats = [];
  window.__lastScroll = performance.now();
  addEventListener('scroll', () => { window.__lastScroll = performance.now(); }, { passive: true });
  const epoch = () => performance.timeOrigin + performance.now();
  const open = {};
  const seen = new WeakMap();
  const det = {
    // A script animation (element.animate) on the shape: the build is a CSSAnimation, so this is the beat only.
    pickme: () => { const e = document.querySelector('[data-pick-me]'); return !!e && e.getAnimations().some((a) => a.constructor.name === 'Animation' && a.playState === 'running'); },
    seesaw: () => { const e = document.querySelector('button.seesaw .beam'); return !!e && e.getAnimations().some((a) => a.constructor.name === 'Animation' && a.playState === 'running'); },
    letterb: () => !!document.querySelector('button.letter-b svg.is-apart'),
    corner: () => { const e = document.querySelector('footer [data-spin]'); return !!e && e.getAnimations().some((a) => typeof CSSTransition !== 'undefined' && a instanceof CSSTransition && a.transitionProperty === 'rotate' && a.playState === 'running'); },
    // A numeral's beat is a REPLAY: an animation that had finished goes back to running.
    numerals: () => {
      let replay = false;
      for (const n of document.querySelectorAll('.num')) {
        for (const a of n.getAnimations({ subtree: true })) {
          if (typeof CSSAnimation === 'undefined' || !(a instanceof CSSAnimation)) continue;
          const was = seen.get(a);
          if (was === 'finished' && a.playState === 'running') replay = true;
          seen.set(a, a.playState);
          if (open.numerals && a.playState === 'running') replay = true;
        }
      }
      return replay;
    },
  };
  const tick = () => {
    for (const k of Object.keys(det)) {
      let on = false;
      try { on = det[k](); } catch { /* page not ready */ }
      if (on && !open[k]) { open[k] = true; window.__beats.push({ kind: k, start: epoch(), sinceScroll: performance.now() - window.__lastScroll }); }
      if (!on && open[k]) { open[k] = false; const b = [...window.__beats].reverse().find((x) => x.kind === k && x.end === undefined); if (b) b.end = epoch(); }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/** The beat events of one kind, with events less than 350 ms apart merged (the corner's step out and back are two transitions). */
const beatsOf = async (page, kind) => {
  const all = await page.evaluate((kind) => window.__beats.filter((b) => b.kind === kind), kind);
  const out = [];
  for (const b of all) {
    const prev = out[out.length - 1];
    if (prev && prev.end !== undefined && b.start - prev.end < 350) { prev.end = b.end; continue; }
    out.push({ ...b });
  }
  return out;
};

/** Frames of the film inside [from, to] epoch ms, `n` of them, evenly. */
function slice(frames, t0, from, to, n) {
  const inside = frames.filter((f) => f.at * 1000 >= from && f.at * 1000 <= to);
  if (inside.length === 0) return [];
  const before = frames.filter((f) => f.at * 1000 < from).slice(-1);
  const pick = [];
  const m = before.length ? n - 1 : n;
  for (let i = 0; i < m; i++) pick.push(inside[Math.min(inside.length - 1, Math.round((i * (inside.length - 1)) / Math.max(1, m - 1)))]);
  return [...before, ...pick].map((f) => ({ ...f, ms: Math.round(f.at * 1000 - from) }));
}

/** One beat: where to go, which toy, how to reach it. */
const BEATS = [
  { id: 'pickme-home', path: '/t/bauhaus/', kind: 'pickme', sel: 'svg.poster', how: 'load' },
  { id: 'pickme-sent', path: '/t/bauhaus/contact/sent/', kind: 'pickme', sel: 'svg.landed', how: 'load' },
  { id: 'seesaw', path: '/t/bauhaus/', kind: 'seesaw', sel: 'button.seesaw', how: 'scroll' },
  { id: 'numerals-home', path: '/t/bauhaus/', kind: 'numerals', sel: '.door .num', how: 'scroll' },
  { id: 'numerals-services', path: '/t/bauhaus/services/', kind: 'numerals', sel: '.offering-head .num', how: 'scroll' },
  { id: 'letter-b', path: '/t/bauhaus/about/', kind: 'letterb', sel: 'button.letter-b', how: 'scroll' },
  { id: 'corner', path: '/t/bauhaus/services/', kind: 'corner', sel: 'footer svg.corner', how: 'bottom' },
];

/* ------------------------------------------------------------------ cursor */
if (ONLY.includes('cursor')) {
  const TOYS = [
    { id: 'hero-shape', path: '/t/bauhaus/', sel: 'svg.poster [data-pick-me]', lift: (e) => getComputedStyle(e).translate },
    { id: 'seesaw', path: '/t/bauhaus/', sel: 'button.seesaw', lift: (e) => `${getComputedStyle(e.querySelector('svg')).translate} | ${getComputedStyle(e.querySelector('svg')).filter}` },
    { id: 'door-numeral', path: '/t/bauhaus/', sel: '.door .num', lift: (e) => `${getComputedStyle(e.querySelector('.nm')).translate} | ${getComputedStyle(e.querySelector('.nm')).filter}` },
    { id: 'letter-b', path: '/t/bauhaus/about/', sel: 'button.letter-b', lift: (e) => `${getComputedStyle(e.querySelector('svg')).translate} | ${getComputedStyle(e.querySelector('svg')).filter}` },
    { id: 'process-numeral', path: '/t/bauhaus/services/', sel: '.process .num, .offering-head .num', lift: (e) => `${getComputedStyle(e.querySelector('.nm')).translate} | ${getComputedStyle(e.querySelector('.nm')).filter}` },
    { id: 'sent-shape', path: '/t/bauhaus/contact/sent/', sel: 'svg.landed [data-pick-me]', frac: [0.08, 0.5], /* the blue circle sits over the red square's middle */ lift: (e) => getComputedStyle(e).translate },
    { id: 'corner-square', path: '/t/bauhaus/', sel: 'footer svg.corner', corner: true, lift: () => { const e = document.querySelector('footer [data-spin]'); return `${getComputedStyle(e).translate} | ${getComputedStyle(e).filter}`; } },
  ];
  for (const scheme of SCHEMES) {
    for (const toy of TOYS) {
      const { ctx, page } = await open(browser, { path: toy.path, width: 1440, scheme });
      await page.evaluate((sel) => document.querySelector(sel).scrollIntoView({ block: 'center', behavior: 'instant' }), toy.sel);
      await page.waitForTimeout(2600);
      const g = await page.evaluate(({ sel, corner, frac }) => {
        const el = document.querySelector(sel);
        const r = el.getBoundingClientRect();
        // The corner square is x 30..140 of 240, y 0..110 of 150, drawn at width r.width.
        const k = corner ? r.width / 240 : 1;
        const on = corner ? [r.left + 85 * k, r.top + 55 * k] : frac ? [r.left + r.width * frac[0], r.top + r.height * frac[1]] : [r.left + r.width / 2, r.top + r.height / 2];
        const off = corner ? [r.left + 200 * k, r.top + 140 * k] : [Math.max(2, r.left - 30), r.top + r.height / 2];
        return { on, off, w: r.width, h: r.height, l: r.left, t: r.top };
      }, { sel: toy.sel, corner: toy.corner, frac: toy.frac });
      const cursorAt = (x, y) => page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? getComputedStyle(e).cursor : null; }, [x, y]);
      await page.mouse.move(2, 2);
      await page.waitForTimeout(300);
      const restLift = await page.evaluate(`(${toy.lift.toString()})(document.querySelector(${JSON.stringify(toy.sel)}))`);
      const film = await startFilm(page);
      await page.mouse.move(g.on[0] - 60, g.on[1], { steps: 1 });
      await page.waitForTimeout(150);
      await page.mouse.move(g.on[0], g.on[1], { steps: 4 });
      await page.waitForTimeout(450);
      const cursorOn = await cursorAt(...g.on);
      const hoverLift = await page.evaluate(`(${toy.lift.toString()})(document.querySelector(${JSON.stringify(toy.sel)}))`);
      await page.mouse.move(g.off[0], g.off[1], { steps: 3 });
      await page.waitForTimeout(450);
      const cursorOff = await cursorAt(...g.off);
      const leftLift = await page.evaluate(`(${toy.lift.toString()})(document.querySelector(${JSON.stringify(toy.sel)}))`);
      const frames = await film.stop();
      const box = { x: Math.max(0, g.l - 70), y: Math.max(0, g.t - 70), w: Math.min(1440 - Math.max(0, g.l - 70), g.w + 140), h: Math.min(900 - Math.max(0, g.t - 70), g.h + 140) };
      const pick = frames.length > 8 ? Array.from({ length: 8 }, (_, i) => frames[Math.round((i * (frames.length - 1)) / 7)]) : frames;
      await strip(pick, join(D, `cursor__${toy.id}__${scheme}__1440.png`), `${toy.id} ${scheme} 1440: the mouse arrives, rests on it, leaves (cursor on: ${cursorOn}, off: ${cursorOff})`, { cols: 4, cellW: 300, box, vpWidth: 1440 });
      R.cursor[`${toy.id}__${scheme}`] = { cursorOn, cursorOff, restLift, hoverLift, leftLift };
      const wantOn = toy.id.includes('shape') ? 'grab' : 'pointer';
      check(`cursor ${toy.id} ${scheme}: ${wantOn} over it`, cursorOn === wantOn, cursorOn);
      check(`cursor ${toy.id} ${scheme}: not a pointer off it`, cursorOff !== 'pointer' && cursorOff !== 'grab', cursorOff);
      check(`cursor ${toy.id} ${scheme}: hover lifts it, leaving puts it back`, hoverLift !== restLift && leftLift === restLift, { restLift, hoverLift, leftLift });
      await ctx.close();
    }
  }
}

/* ------------------------------------------------------------------- beats */
if (ONLY.includes('beats')) {
  for (const scheme of SCHEMES) {
    for (const b of BEATS.filter((x) => !process.env.BEAT_IDS || process.env.BEAT_IDS.split(',').includes(x.id))) {
      const { ctx, page, errors } = await open(browser, { path: b.path, width: 390, scheme, init: installLog, settle: b.how === 'load' ? 0 : 1200 });
      const film = await startFilm(page);
      let box = null;
      let scrolledAt = null;
      if (b.how === 'scroll' || b.how === 'bottom') {
        await page.waitForTimeout(400);
        scrolledAt = await page.evaluate(({ sel, how }) => {
          if (how === 'bottom') scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' });
          else document.querySelector(sel).scrollIntoView({ block: 'center', behavior: 'instant' });
          return performance.timeOrigin + performance.now();
        }, { sel: b.sel, how: b.how });
      }
      await page.waitForTimeout(b.how === 'load' ? 5200 : 4200);
      const log = await beatsOf(page, b.kind);
      const frames = await film.stop();
      box = await boxOf(page, b.sel, 50);
      // Scroll away for two seconds and come back: the beat must not play again.
      await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
      await page.waitForTimeout(900);
      await page.evaluate(({ sel, how }) => { if (how === 'bottom') scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }); else document.querySelector(sel).scrollIntoView({ block: 'center', behavior: 'instant' }); }, { sel: b.sel, how: b.how });
      await page.waitForTimeout(2200);
      const after = await beatsOf(page, b.kind);
      const first = log[0];
      const tag = `${b.id}__${scheme}__390`;
      R.beats[tag] = { count: log.length, countAfterReturn: after.length, first, errors };
      check(`beat ${tag}: plays exactly once`, log.length === 1 && after.length === 1, { n: log.length, nAfter: after.length });
      if (first) {
        // A toy already in view at load (the letter B at 390) beats before the explicit scroll; then the page's own last scroll (the load) is the clock.
        const afterMyScroll = scrolledAt && first.start > scrolledAt;
        const sinceScroll = afterMyScroll ? first.start - scrolledAt : first.sinceScroll;
        check(`beat ${tag}: starts at least 400 ms after the last scroll (or the load)`, sinceScroll >= 395, { sinceScrollMs: Math.round(sinceScroll), durationMs: first.end ? Math.round(first.end - first.start) : null });
        const from = first.start - 250, to = (first.end ?? first.start + 600) + 250;
        const picked = slice(frames, 0, from, to, 12);
        if (picked.length) await strip(picked.map((f, i) => ({ ...f, ms: f.ms - 250 })), join(D, `beat__${tag}.png`), `${b.id} ${scheme} 390 touch: the beat (0 = its start, ${afterMyScroll ? Math.round(first.start - scrolledAt) + ' ms after the scroll stopped' : Math.round(first.sinceScroll) + ' ms after the load'})`, { cols: 6, cellW: 200, box, vpWidth: 390 });
      }
      if (errors.length) check(`beat ${tag}: no page errors`, false, errors);
      await ctx.close();
    }
  }
}

/* -------------------------------------------------------------- conditions */
if (ONLY.includes('conditions')) {
  const scheme = SCHEMES[0];
  // 1. 40% visible: nothing in 2.4 s.
  {
    const { ctx, page } = await open(browser, { path: '/t/bauhaus/', width: 390, scheme, init: installLog, settle: 1200 });
    await page.evaluate(() => {
      const r = document.querySelector('button.seesaw').getBoundingClientRect();
      // Put the see-saw's top 40% at the bottom of the viewport.
      scrollBy({ top: r.top - (innerHeight - r.height * 0.4), behavior: 'instant' });
    });
    await page.waitForTimeout(2600);
    const vis = await page.evaluate(() => { const r = document.querySelector('button.seesaw').getBoundingClientRect(); return +((Math.min(innerHeight, r.bottom) - Math.max(0, r.top)) / r.height).toFixed(2); });
    const n = (await beatsOf(page, 'seesaw')).length;
    R.conditions.partlyVisible = { visible: vis, beats: n };
    check('condition: a see-saw 40% in view has no beat in 2.6 s', n === 0 && vis < 0.55, { vis, n });
    // ...and the moment it is scrolled to 100%, it comes.
    await page.evaluate(() => document.querySelector('button.seesaw').scrollIntoView({ block: 'center', behavior: 'instant' }));
    await page.waitForTimeout(1500);
    check('condition: scrolled fully in, the beat plays', (await beatsOf(page, 'seesaw')).length === 1);
    await ctx.close();
  }
  // 2. keeps scrolling: a scroll every 200 ms keeps it from firing; it comes 400+ ms after the last.
  {
    const { ctx, page } = await open(browser, { path: '/t/bauhaus/', width: 390, scheme, init: installLog, settle: 1200 });
    await page.evaluate(() => document.querySelector('button.seesaw').scrollIntoView({ block: 'center', behavior: 'instant' }));
    let last = 0;
    for (let i = 0; i < 12; i++) {
      await page.waitForTimeout(200);
      last = await page.evaluate((i) => { scrollBy({ top: i % 2 ? 1 : -1, behavior: 'instant' }); return performance.timeOrigin + performance.now(); }, i);
    }
    const during = (await beatsOf(page, 'seesaw')).length;
    await page.waitForTimeout(1500);
    const log = await beatsOf(page, 'seesaw');
    R.conditions.scrolling = { during, after: log.length, lastScrollToBeatMs: log[0] ? Math.round(log[0].start - last) : null };
    check('condition: no beat while the page keeps scrolling', during === 0, { during });
    check('condition: the beat comes 400 ms or more after the last scroll', log.length === 1 && log[0].start - last >= 395, R.conditions.scrolling);
    await ctx.close();
  }
  // 3. a form field has focus: no beat until it blurs.
  {
    const { ctx, page } = await open(browser, { path: '/t/bauhaus/contact/', width: 390, scheme, init: installLog, settle: 1200 });
    await page.focus('#cf-name');
    await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
    await page.waitForTimeout(2800);
    const held = (await beatsOf(page, 'corner')).length;
    const focusKept = await page.evaluate(() => document.activeElement?.id);
    await page.evaluate(() => document.activeElement.blur());
    const blurAt = await page.evaluate(() => performance.timeOrigin + performance.now());
    await page.waitForTimeout(1500);
    const log = await beatsOf(page, 'corner');
    R.conditions.focus = { held, focusKept, afterBlur: log.length, blurToBeatMs: log[0] ? Math.round(log[0].start - blurAt) : null };
    check('condition: no beat while a form field has focus', held === 0 && focusKept === 'cf-name', R.conditions.focus);
    check('condition: after blur the beat plays once', log.length === 1, R.conditions.focus);
    await ctx.close();
  }
  // 4. a mouse never gets the new beats (it has the cursor and the hover).
  {
    const { ctx, page } = await open(browser, { path: '/t/bauhaus/', width: 1440, scheme, init: installLog, settle: 1200 });
    for (const sel of ['button.seesaw', '.door .num']) {
      await page.evaluate((sel) => document.querySelector(sel).scrollIntoView({ block: 'center', behavior: 'instant' }), sel);
      await page.waitForTimeout(2200);
    }
    await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
    await page.waitForTimeout(2200);
    const n = (await page.evaluate(() => window.__beats.filter((b) => b.kind !== 'pickme')));
    R.conditions.mouse = { beats: n };
    check('condition: a mouse gets no see-saw, numeral or corner beat', n.length === 0, { n });
    await ctx.close();
  }
}

/* -------------------------------------------------------------------- keys */
if (ONLY.includes('keys')) {
  const { ctx, page } = await open(browser, { path: '/t/bauhaus/', width: 1440, scheme: SCHEMES[0], settle: 1200 });
  await page.evaluate(() => document.querySelector('button.seesaw').scrollIntoView({ block: 'center', behavior: 'instant' }));
  await page.waitForTimeout(2800);
  const rot = () => page.evaluate(() => { const e = document.querySelector('button.seesaw .beam'); return parseFloat(getComputedStyle(e).rotate) || 0; });
  const peak = async (ms) => { let lo = 0, hi = 0; const t0 = Date.now(); while (Date.now() - t0 < ms) { const r = await rot(); lo = Math.min(lo, r); hi = Math.max(hi, r); await page.waitForTimeout(20); } return Math.abs(lo) > hi ? 'left' : hi > 0.5 ? 'right' : 'none'; };
  const b = await page.evaluate(() => { const r = document.querySelector('button.seesaw').getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; });
  // Click the RIGHT end, then Enter, Space, Enter.
  const seq = [];
  await page.mouse.click(b[0] + b[2] * 0.85, b[1] + b[3] * 0.5);
  seq.push(['click right end', await peak(1300)]);
  await page.keyboard.press('Enter');
  seq.push(['Enter (same end as the click)', await peak(1300)]);
  await page.keyboard.press('Space');
  seq.push(['Space (alternates)', await peak(1300)]);
  await page.keyboard.press('Enter');
  seq.push(['Enter (alternates)', await peak(1300)]);
  R.keys.afterRightClick = seq;
  check('keys: after a click on the right end, Enter tips the right end again, then the keys alternate', seq.map((s) => s[1]).join() === 'right,right,left,right', seq);
  await ctx.close();
  // And the other way: a click on the LEFT end, then a key.
  const c2 = await open(browser, { path: '/t/bauhaus/', width: 1440, scheme: SCHEMES[0], settle: 1200 });
  await c2.page.evaluate(() => document.querySelector('button.seesaw').scrollIntoView({ block: 'center', behavior: 'instant' }));
  await c2.page.waitForTimeout(2800);
  const bb = await c2.page.evaluate(() => { const r = document.querySelector('button.seesaw').getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; });
  const rot2 = () => c2.page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('button.seesaw .beam')).rotate) || 0);
  const peak2 = async (ms) => { let lo = 0, hi = 0; const t0 = Date.now(); while (Date.now() - t0 < ms) { const r = await rot2(); lo = Math.min(lo, r); hi = Math.max(hi, r); await c2.page.waitForTimeout(20); } return Math.abs(lo) > hi ? 'left' : hi > 0.5 ? 'right' : 'none'; };
  const seq2 = [];
  await c2.page.mouse.click(bb[0] + bb[2] * 0.15, bb[1] + bb[3] * 0.5);
  seq2.push(['click left end', await peak2(1300)]);
  await c2.page.keyboard.press('Enter');
  seq2.push(['Enter (same end as the click)', await peak2(1300)]);
  await c2.page.keyboard.press('Enter');
  seq2.push(['Enter (alternates)', await peak2(1300)]);
  R.keys.afterLeftClick = seq2;
  check('keys: after a click on the left end, Enter tips the left end again, then alternates', seq2.map((s) => s[1]).join() === 'left,left,right', seq2);
  await c2.ctx.close();
  // A fresh page with only keys: the first press tips left, then alternate (unchanged).
  const c3 = await open(browser, { path: '/t/bauhaus/', width: 1440, scheme: SCHEMES[0], settle: 1200 });
  await c3.page.evaluate(() => document.querySelector('button.seesaw').scrollIntoView({ block: 'center', behavior: 'instant' }));
  await c3.page.waitForTimeout(2800);
  await c3.page.focus('button.seesaw');
  const rot3 = () => c3.page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('button.seesaw .beam')).rotate) || 0);
  const peak3 = async (ms) => { let lo = 0, hi = 0; const t0 = Date.now(); while (Date.now() - t0 < ms) { const r = await rot3(); lo = Math.min(lo, r); hi = Math.max(hi, r); await c3.page.waitForTimeout(20); } return Math.abs(lo) > hi ? 'left' : hi > 0.5 ? 'right' : 'none'; };
  const seq3 = [];
  await c3.page.keyboard.press('Enter');
  seq3.push(['Enter (first key)', await peak3(1300)]);
  await c3.page.keyboard.press('Space');
  seq3.push(['Space', await peak3(1300)]);
  R.keys.keysOnly = seq3;
  check('keys: with no pointer first, the first key tips left, then alternates', seq3.map((s) => s[1]).join() === 'left,right', seq3);
  await c3.ctx.close();
}

await writeFile(join(D, 'bauhaus.json'), JSON.stringify(R, null, 1));
console.log(fails.length ? `\nFAIL (${fails.length})\n${fails.join('\n')}` : '\nPASS');
await browser.close();
