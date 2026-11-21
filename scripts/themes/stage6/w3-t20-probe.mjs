/**
 * Stage 6 wave 3, task 20: behaviour probes for the four bauhaus toys.
 *
 *   node scripts/themes/snap.mjs --name s6-w3-t20 --reuse --port 4470 -- node scripts/themes/stage6/w3-t20-probe.mjs
 *   ONLY=seesaw,letterb WIDTHS=1440,390 SCHEMES=light node ...
 *
 * Sections: seesaw, letterb, corner, numerals, touch (swipe scrolls, tap
 * works), swap (in-school swap mid-motion). Prints one JSON line per check
 * and a final PASS or FAIL list; writes the log to .out/stage6/w3/t20/probe.json.
 */
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { launch, open, reach, centre, startSampler, stopSampler, OUT } from './w3-t20-lib.mjs';

const ONLY = (process.env.ONLY || 'seesaw,letterb,corner,numerals,touch,swap').split(',');
const WIDTHS = (process.env.WIDTHS || '1440,820,390').split(',').map(Number);
const SCHEMES = (process.env.SCHEMES || 'light,dark').split(',');
const { browser, renderer } = await launch();
const log = { renderer, checks: [] };
const fails = [];
function check(name, ok, detail) {
  log.checks.push({ name, ok, detail });
  if (!ok) fails.push(`${name} ${JSON.stringify(detail)}`);
  console.log(ok ? 'ok  ' : 'FAIL', name, detail === undefined ? '' : JSON.stringify(detail));
}
const num = (s) => parseFloat(s) || 0;

/** A real tap: mouse click on desktop, a touchscreen tap on a phone. */
async function tap(page, mobile, x, y) {
  if (mobile) await page.touchscreen.tap(x, y);
  else await page.mouse.click(x, y);
}

for (const scheme of SCHEMES) {
  for (const width of WIDTHS) {
    const tag = `${scheme}/${width}`;
    /* ---------------------------------------------------------- seesaw */
    if (ONLY.includes('seesaw')) {
      const { ctx, page, mobile, errors } = await open(browser, { path: '/t/bauhaus/', width, scheme });
      await reach(page, 'button.seesaw');
      const meta = await page.evaluate(() => {
        const b = document.querySelector('button.seesaw');
        return { tag: b.tagName, label: b.getAttribute('aria-label'), type: b.type, tab: b.tabIndex, svgHidden: document.querySelector('button.seesaw svg').getAttribute('aria-hidden') };
      });
      check(`${tag} seesaw: a real button with the plain label`, meta.tag === 'BUTTON' && meta.label === 'See-saw, tip it' && meta.tab === 0, meta);
      const [cx, cy, l, t, w, h] = await centre(page, 'button.seesaw');
      const sample = () => ({
        rot: parseFloat(getComputedStyle(document.querySelector('button.seesaw .beam')).rotate) || 0,
        sq: parseFloat(getComputedStyle(document.querySelector('[data-seat="right"]')).translate) || 0,
        ci: parseFloat(getComputedStyle(document.querySelector('[data-seat="left"]')).translate) || 0,
      });
      // Tap the left end.
      await startSampler(page, sample);
      await tap(page, mobile, l + w * 0.15, t + h * 0.5);
      await page.waitForTimeout(1250);
      let s = await stopSampler(page);
      const minRot = Math.min(...s.map((x) => x.rot)), maxRot = Math.max(...s.map((x) => x.rot));
      const minSq = Math.min(...s.map((x) => x.sq));
      const end = s[s.length - 1];
      check(`${tag} seesaw: tap on the left end tips toward it about 8 degrees and levels`, Math.abs(minRot + 8) < 0.5 && maxRot < 0.01 && Math.abs(end.rot) < 0.01, { minRot, maxRot, end });
      check(`${tag} seesaw: the square slides to the low end, the circle stays, both return`, minSq < -150 && Math.abs(end.sq) < 0.01 && s.every((x) => x.ci === 0), { minSq, end });
      // Monotone tip: no overshoot past 8 degrees.
      check(`${tag} seesaw: no overshoot`, minRot >= -8.0001, { minRot });
      // Tap the right end.
      await startSampler(page, sample);
      await tap(page, mobile, l + w * 0.85, t + h * 0.5);
      await page.waitForTimeout(1250);
      s = await stopSampler(page);
      check(`${tag} seesaw: tap on the right end tips the other way`, Math.max(...s.map((x) => x.rot)) > 7.5 && Math.max(...s.map((x) => x.ci)) > 150 && Math.abs(s[s.length - 1].rot) < 0.01, { max: Math.max(...s.map((x) => x.rot)), ci: Math.max(...s.map((x) => x.ci)) });
      // A second tap mid-motion (the other end, 300 ms in): re-aims from the current pose, no jump.
      await startSampler(page, sample);
      await tap(page, mobile, l + w * 0.15, t + h * 0.5);
      await page.waitForTimeout(300);
      await tap(page, mobile, l + w * 0.85, t + h * 0.5);
      await page.waitForTimeout(1300);
      s = await stopSampler(page);
      let maxJump = 0;
      for (let i = 1; i < s.length; i++) maxJump = Math.max(maxJump, Math.abs(s[i].rot - s[i - 1].rot), Math.abs(s[i].sq - s[i - 1].sq) / 20, Math.abs(s[i].ci - s[i - 1].ci) / 20);
      const minGap = Math.min(...s.map((x) => 286 + x.sq - (128 + x.ci)));
      check(`${tag} seesaw: the two shapes never pass through each other on a re-aim`, minGap > -0.5, { minGap });
      check(`${tag} seesaw: a second tap mid-motion re-aims without a jump and ends level`, maxJump < 8 && Math.abs(s[s.length - 1].rot) < 0.01 && Math.abs(s[s.length - 1].sq) < 0.01 && Math.abs(s[s.length - 1].ci) < 0.01, { maxJump, end: s[s.length - 1] });
      if (!mobile) {
        // Keyboard: Enter, then Space, alternate ends.
        await page.focus('button.seesaw');
        await startSampler(page, sample);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1250);
        let k1 = await stopSampler(page);
        await startSampler(page, sample);
        await page.keyboard.press('Space');
        await page.waitForTimeout(1250);
        let k2 = await stopSampler(page);
        const a = Math.min(...k1.map((x) => x.rot)), b = Math.max(...k2.map((x) => x.rot));
        check(`${tag} seesaw: Enter tips left, Space tips right (alternating)`, a < -7.5 && b > 7.5, { a, b });
        // Focus ring visible on keyboard focus.
        const ring = await page.evaluate(() => { const cs = getComputedStyle(document.querySelector('button.seesaw')); return { style: cs.outlineStyle, width: cs.outlineWidth }; });
        check(`${tag} seesaw: focus ring shows`, ring.style !== 'none' && parseFloat(ring.width) >= 3, ring);
      }
      // Layout does not move: the button box is the same after the motion.
      const after = await centre(page, 'button.seesaw');
      check(`${tag} seesaw: the box did not shift`, Math.abs(after[2] - l) < 0.5 && Math.abs(after[3] - t) < 0.5, { before: [l, t], after: [after[2], after[3]] });
      check(`${tag} seesaw: no page errors`, errors.length === 0, errors);
      await ctx.close();
    }

    /* ---------------------------------------------------------- letter B */
    if (ONLY.includes('letterb')) {
      const { ctx, page, mobile, errors } = await open(browser, { path: '/t/bauhaus/about/', width, scheme });
      await reach(page, 'button.letter-b');
      const meta = await page.evaluate(() => { const b = document.querySelector('button.letter-b'); return { tag: b.tagName, label: b.getAttribute('aria-label'), tab: b.tabIndex }; });
      check(`${tag} letter B: a real button with the plain label`, meta.tag === 'BUTTON' && meta.label === 'Letter B, take apart' && meta.tab === 0, meta);
      const [cx, cy, l, t, w, h] = await centre(page, 'button.letter-b');
      const sample = () => {
        const ps = [...document.querySelectorAll('button.letter-b .asm')].map((e) => getComputedStyle(e).translate);
        const xy = ps.map((s) => (s === 'none' ? [0, 0] : s.split(' ').map(parseFloat)));
        return { d: Math.round(Math.max(...xy.map(([x, y]) => Math.hypot(x, y || 0)))), p: xy.map(([x, y]) => [Math.round(x), Math.round(y || 0)]), apart: document.querySelector('button.letter-b svg').classList.contains('is-apart') };
      };
      await startSampler(page, sample);
      await tap(page, mobile, cx, cy);
      await page.waitForTimeout(2600);
      let s = await stopSampler(page);
      const peak = Math.max(...s.map((x) => x.d));
      const first = s.find((x) => x.d > 40);
      check(`${tag} letter B: the pieces fly apart, hold, and rebuild to rest`, peak > 50 && s[s.length - 1].d === 0 && !s[s.length - 1].apart, { peak, end: s[s.length - 1] });
      // Stepped rebuild: pieces reach zero at different times, in order.
      const zeroAt = [0, 1, 2, 3].map((i) => { const idx = s.findIndex((x, j) => j > s.findIndex((y) => y.d > 40) && x.p[i][0] === 0 && x.p[i][1] === 0); return s[idx]?.t; });
      check(`${tag} letter B: re-assembles in the stepped order (stem, bowl, bowl, accent)`, zeroAt.every((v, i) => i === 0 || v > zeroAt[i - 1]), { zeroAt });
      // Second tap while apart rebuilds at once.
      await startSampler(page, sample);
      await tap(page, mobile, cx, cy);
      await page.waitForTimeout(700); // held
      const t1 = await page.evaluate(() => performance.now());
      await tap(page, mobile, cx, cy);
      await page.waitForTimeout(1100);
      s = await stopSampler(page);
      const tapAt = s.find((x) => x.t >= 690)?.t ?? 700;
      const done = s.find((x) => x.t > tapAt && x.d === 0)?.t;
      check(`${tag} letter B: a second tap while apart rebuilds at once (not after the hold)`, done !== undefined && done - tapAt < 900, { tapAt, done });
      if (!mobile) {
        await page.focus('button.letter-b');
        await startSampler(page, sample);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(600);
        let k = await stopSampler(page);
        const ent = Math.max(...k.map((x) => x.d));
        await page.keyboard.press('Space'); // rebuild at once
        await page.waitForTimeout(1200);
        const rest = await page.evaluate(() => [...document.querySelectorAll('button.letter-b .asm')].every((e) => !e.style.translate || e.style.translate === ''));
        check(`${tag} letter B: Enter takes it apart, Space rebuilds it`, ent > 50 && rest, { ent, rest });
      }
      check(`${tag} letter B: no page errors`, errors.length === 0, errors);
      await ctx.close();
    }

    /* ---------------------------------------------------------- corner */
    if (ONLY.includes('corner')) {
      const { ctx, page, mobile, errors } = await open(browser, { path: '/t/bauhaus/services/', width, scheme });
      await reach(page, 'svg.corner');
      const geom = await page.evaluate(() => { const r = document.querySelector('svg.corner').getBoundingClientRect(); return { l: r.left, t: r.top, w: r.width, k: r.width / 240 }; });
      const sq = { x: geom.l + 85 * geom.k, y: geom.t + 55 * geom.k };
      const rot = () => page.evaluate(() => document.querySelector('[data-spin]').style.rotate || '0');
      const meta = await page.evaluate(() => { const s = document.querySelector('svg.corner'); return { hidden: s.getAttribute('aria-hidden'), focusable: s.getAttribute('focusable'), kids: s.querySelectorAll('a,button,[tabindex]').length }; });
      check(`${tag} corner: inert (aria-hidden, nothing focusable)`, meta.hidden === 'true' && meta.kids === 0, meta);
      // Scroll so the corner is at the viewport top (footer is at the bottom of the page).
      await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(300);
      const g2 = await page.evaluate(() => { const r = document.querySelector('svg.corner').getBoundingClientRect(); return { l: r.left, t: r.top, w: r.width, k: r.width / 240, vis: r.top >= 0 && r.top < innerHeight }; });
      const q = { x: g2.l + 85 * g2.k, y: g2.t + 55 * g2.k };
      await startSampler(page, () => ({ r: parseFloat(getComputedStyle(document.querySelector('[data-spin]')).rotate) || 0 }));
      await tap(page, mobile, q.x, q.y);
      await page.waitForTimeout(600);
      let s = await stopSampler(page);
      check(`${tag} corner: a tap turns the square 90 degrees on a hard curve`, s[s.length - 1].r === 90 && s.some((x) => x.r > 5 && x.r < 85) && s.every((x) => x.r <= 90.001), { end: s[s.length - 1].r });
      await tap(page, mobile, q.x, q.y);
      await page.waitForTimeout(100);
      await tap(page, mobile, q.x, q.y);
      await page.waitForTimeout(700);
      check(`${tag} corner: repeated taps keep turning`, (await rot()) === '270deg', await rot());
      // A tap outside the square does nothing: on the triangle half and on the left.
      await tap(page, mobile, g2.l + 200 * g2.k, g2.t + 30 * g2.k);
      await tap(page, mobile, 20, g2.t + 30);
      await page.waitForTimeout(500);
      check(`${tag} corner: a tap off the square does nothing`, (await rot()) === '270deg', await rot());
      // The footer's links still take their own taps (hit test excludes a/button).
      const navHit = await page.evaluate(() => { const a = document.querySelector('footer.site-footer nav a'); const r = a.getBoundingClientRect(); return { x: r.left + 4, y: r.top + r.height / 2 }; });
      const before = await rot();
      await page.evaluate(() => { document.addEventListener('click', (e) => { if (e.target.closest('footer nav a')) e.preventDefault(); }, true); });
      await tap(page, mobile, navHit.x, navHit.y);
      await page.waitForTimeout(400);
      check(`${tag} corner: a footer link tap does not spin it`, (await rot()) === before, { before, after: await rot() });
      check(`${tag} corner: no page errors`, errors.length === 0, errors);
      await ctx.close();
    }

    /* ---------------------------------------------------------- numerals */
    if (ONLY.includes('numerals')) {
      for (const [path, sel] of [['/t/bauhaus/services/', '.step-0 .num'], ['/t/bauhaus/services/', '.step-3 .num'], ['/t/bauhaus/services/', '.offering-head .num'], ['/t/bauhaus/', '.door .num']]) {
        const { ctx, page, mobile, errors } = await open(browser, { path, width, scheme });
        await reach(page, sel);
        const [cx, cy] = await centre(page, sel);
        const meta = await page.evaluate((sel) => { const n = document.querySelector(sel); return { hidden: n.getAttribute('aria-hidden'), focusable: n.querySelectorAll('a,button,[tabindex]').length, parts: n.querySelectorAll('.asm').length }; }, sel);
        check(`${tag} numerals ${path}${sel}: inert, aria-hidden`, meta.hidden === 'true' && meta.focusable === 0, meta);
        // Sample opacity of the tapped numeral's parts.
        await page.evaluate((sel) => {
          const n = document.querySelector(sel);
          const parts = [...n.querySelectorAll('.asm')];
          window.__samples = [];
          window.__samplerOn = true;
          const t0 = performance.now();
          const tick = () => { if (!window.__samplerOn) return; window.__samples.push({ t: Math.round(performance.now() - t0), o: parts.map((p) => +parseFloat(getComputedStyle(p).opacity).toFixed(2)) }); requestAnimationFrame(tick); };
          requestAnimationFrame(tick);
        }, sel);
        await tap(page, mobile, cx, cy);
        await page.waitForTimeout(2000);
        const s = await stopSampler(page);
        const first = s.find((x) => x.o.some((v) => v < 0.5));
        // Knocked out: on the first frame after the tap, all but the part that starts at once are at their first frame.
        const allOut = !!first && first.o.filter((v) => v < 0.5).length >= first.o.length - 1;
        const end = s[s.length - 1].o;
        // Stepped: each part's first reach of opacity 1 is later than the previous part's (or equal within a frame).
        const full = meta.parts > 0 ? [...Array(meta.parts).keys()].map((i) => s.find((x) => x.t > 0 && x.o[i] > 0.99 && s.slice(0, s.indexOf(x)).some((y) => y.o[i] < 0.5))?.t) : [];
        check(`${tag} numerals ${path}${sel}: a tap knocks every part out, then rebuilds in order to fully drawn`, !!first && allOut && end.every((v) => v === 1) && full.every((v, i) => i === 0 || v >= full[i - 1]), { first: first?.t, allOut, end, full });
        check(`${tag} numerals ${path}${sel}: no page errors`, errors.length === 0, errors);
        await ctx.close();
      }
    }
  }
}

/* ---------------------------------------------------------- touch scroll */
if (ONLY.includes('touch')) {
  for (const scheme of SCHEMES) {
    for (const width of WIDTHS.filter((w) => w < 900)) {
      const tag = `${scheme}/${width}`;
      for (const [path, sel, probe] of [
        ['/t/bauhaus/', 'button.seesaw', () => document.querySelector('button.seesaw .beam').getAnimations().filter((a) => !(a instanceof CSSAnimation)).length],
        ['/t/bauhaus/about/', 'button.letter-b', () => document.querySelector('button.letter-b svg').classList.contains('is-apart') ? 1 : 0],
        ['/t/bauhaus/services/', '.step-0 .num', () => [...document.querySelectorAll('.step-0 .num .asm')].reduce((n, e) => n + e.getAnimations().filter((a) => a.currentTime < 150 && a.currentTime > 0).length, 0)],
      ]) {
        const { ctx, page, cdp } = await open(browser, { path, width, scheme });
        await reach(page, sel);
        const [cx, cy] = await centre(page, sel);
        const y0 = await page.evaluate(() => scrollY);
        // A vertical swipe starting on the toy, 60px up, 12 steps over 240 ms.
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx, y: cy }] });
        for (let i = 1; i <= 12; i++) {
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cx, y: cy - i * 8 }] });
          await page.waitForTimeout(20);
        }
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await page.waitForTimeout(700);
        const y1 = await page.evaluate(() => scrollY);
        const fired = await page.evaluate(probe);
        check(`${tag} touch ${path} ${sel}: a vertical swipe starting on the toy scrolls and does not fire it`, y1 > y0 + 20 && !fired, { y0, y1, fired });
        await ctx.close();
      }
    }
  }
}

/* ---------------------------------------------------------- swap */
if (ONLY.includes('swap')) {
  for (const scheme of SCHEMES) {
    const tag = `${scheme}/1440`;
    // Home: tip the see-saw, then swap in-school to Services mid-motion; back to Home: one instance.
    const { ctx, page, errors } = await open(browser, { path: '/t/bauhaus/', width: 1440, scheme });
    await reach(page, 'button.seesaw');
    const [cx, cy, l, t, w, h] = await centre(page, 'button.seesaw');
    await page.mouse.click(l + w * 0.15, t + h * 0.5);
    await page.waitForTimeout(250);
    // Real in-school navigation through the header link.
    await page.evaluate(() => scrollTo(0, 0));
    await page.click('header a[href$="/services/"]');
    await page.waitForURL('**/t/bauhaus/services/');
    await page.waitForTimeout(1200);
    const onServices = await page.evaluate(() => ({ seesaw: !!document.querySelector('button.seesaw'), anims: document.getAnimations().filter((a) => !(a instanceof CSSAnimation) && !(a instanceof CSSTransition)).length }));
    check(`${tag} swap: torn down mid-motion, nothing left behind`, !onServices.seesaw && onServices.anims === 0, onServices);
    await page.evaluate(() => scrollTo(0, 0));
    await page.click('header a[href$="/t/bauhaus/"], header a[href$="/bauhaus/"]').catch(async () => { await page.goBack(); });
    await page.waitForTimeout(1500);
    await reach(page, 'button.seesaw');
    const c2 = await centre(page, 'button.seesaw');
    await startSampler(page, () => ({ n: document.getAnimations().filter((a) => !(a instanceof CSSAnimation) && !(a instanceof CSSTransition)).length, rot: parseFloat(getComputedStyle(document.querySelector('button.seesaw .beam')).rotate) || 0 }));
    await page.mouse.click(c2[2] + c2[4] * 0.15, c2[3] + c2[5] * 0.5);
    await page.waitForTimeout(1250);
    const s = await stopSampler(page);
    const maxAnims = Math.max(...s.map((x) => x.n));
    const minRot = Math.min(...s.map((x) => x.rot));
    check(`${tag} swap: one instance on return (one tip, three script animations)`, maxAnims === 3 && Math.abs(minRot + 8) < 0.5, { maxAnims, minRot });
    check(`${tag} swap: no page errors`, errors.length === 0, errors);
    await ctx.close();
  }

  /* One numeral instance per visit: after Home <-> Services swaps a tap must call
     play() once per part, as on a direct load. */
  const PLAYS = () => {
    window.__plays = 0;
    const o = Animation.prototype.play;
    Animation.prototype.play = function () {
      if (this instanceof CSSAnimation && this.effect?.target?.closest?.('.num')) window.__plays++;
      return o.call(this);
    };
  };
  async function tapNumeral(page, sel) {
    await reach(page, sel);
    const [cx, cy] = await centre(page, sel);
    await page.evaluate(PLAYS);
    await page.mouse.click(cx, cy);
    await page.waitForTimeout(60);
    return page.evaluate((s) => ({ parts: document.querySelector(s).getAnimations({ subtree: true }).filter((a) => a instanceof CSSAnimation).length, plays: window.__plays }), sel);
  }
  for (const scheme of SCHEMES) {
    const tag = `${scheme}/1440`;
    for (const [from, to, sel, back, fromSel] of [
      ['/t/bauhaus/', '/t/bauhaus/services/', '.step-1 .num', '/t/bauhaus/', '.doors .num'],
      ['/t/bauhaus/services/', '/t/bauhaus/', '.doors .num', '/t/bauhaus/services/', '.step-1 .num'],
    ]) {
      // Direct load of the page we will come back to, for the baseline.
      const d = await open(browser, { path: back, width: 1440, scheme });
      const direct = await tapNumeral(d.page, fromSel);
      await d.ctx.close();
      const { ctx, page, errors } = await open(browser, { path: from, width: 1440, scheme });
      await page.evaluate(() => scrollTo(0, 0));
      await page.click(`header a[href$="${to}"]`).catch(() => page.goBack());
      await page.waitForURL(`**${to}`);
      await page.waitForTimeout(1200);
      await page.evaluate(() => scrollTo(0, 0));
      await page.click(`header a[href$="${back}"]`).catch(() => page.goBack());
      await page.waitForURL(`**${back}`);
      await page.waitForTimeout(1500);
      const swapped = await tapNumeral(page, fromSel);
      check(`${tag} swap ${from} -> ${to} -> ${back}: numerals mounted once (one play() per part, as on a direct load)`, swapped.parts > 0 && swapped.plays === direct.plays && swapped.plays === direct.parts && swapped.parts === direct.parts, { swapped, direct });
      await ctx.close();
    }
  }
}

log.fails = fails;
await writeFile(join(OUT, 'probe.json'), JSON.stringify(log, null, 1));
await browser.close();
console.log(fails.length ? `\nFAIL (${fails.length})\n${fails.join('\n')}` : '\nPASS');
process.exit(fails.length ? 1 : 0);
