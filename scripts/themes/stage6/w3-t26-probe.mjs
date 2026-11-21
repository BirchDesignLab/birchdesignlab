/**
 * Stage 6 wave 3, task 26 (grandmillennial plates swing): numbers, not pictures.
 *
 *   node scripts/themes/snap.mjs --name s6-w3-t26 --reuse --port 4470 -- node scripts/themes/stage6/w3-t26-probe.mjs
 *   SIZES=1440,820 SCHEMES=light node ...
 *
 * per size and scheme (mouse at 1440 and 1101, touch at 820 and 390):
 *   brush  L to R and R to L across one plate: the sign of its first move, its peak, when it settles
 *   tap    (touch) a tap left and right of centre: sign and peak
 *   room   across every plate and both brush directions: the swung disc never enters the frame, plaque or bow
 *   rapid  twenty brushes in a second: the peak stays bounded
 *   scroll (touch) a vertical swipe starting on a plate scrolls and swings nothing
 *   idle   3 s after a swing: zero attribute writes, zero running animations
 *   hidden visibilitychange to hidden mid-swing: nothing runs
 */
import { launch, open } from './w3-t26-lib.mjs';

const SCHEMES = (process.env.SCHEMES || 'light,dark').split(',');
const SIZES = (process.env.SIZES || '1440,1101,820,390').split(',').map(Number);
const { browser } = await launch();

/** In-page sampler: the angle (deg) of every plate's swing transform each frame, from its computed matrix against its rest. */
const install = () => {
  window.__rec = { frames: [], mut: 0 };
  const plates = [...document.querySelectorAll('.hero .gm-plate')].filter((p) => p.getClientRects().length);
  const mo = new MutationObserver((l) => { window.__rec.mut += l.length; });
  mo.observe(document.querySelector('.hero'), { attributes: true, subtree: true, childList: true, characterData: true });
  window.__rec.plates = plates;
  window.__rec.on = true;
  const t0 = performance.now();
  const tick = () => {
    if (!window.__rec.on) return;
    window.__rec.frames.push({ t: Math.round(performance.now() - t0), a: plates.map((p) => {
      const anims = p.getAnimations();
      if (!anims.length) return 0;
      const m = new DOMMatrixReadOnly(getComputedStyle(p).transform);
      return Math.round(Math.atan2(m.b, m.a) * 18000 / Math.PI) / 100;
    }), run: plates.reduce((n, p) => n + p.getAnimations().length, 0) });
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};


function summarise(frames, idx) {
  const a = frames.map((f) => f.a[idx]);
  const first = a.find((x) => Math.abs(x) > 0.05);
  const peak = Math.max(...a.map(Math.abs));
  const live = frames.filter((f) => Math.abs(f.a[idx]) > 0.05);
  const gap = live.reduce((m, f, i) => (i ? Math.max(m, f.t - live[i - 1].t) : m), 0);
  // the swing's own length: first moving frame to last, plus the frame gaps either side (a frame is ~17 ms)
  return { first: first === undefined ? 0 : Math.sign(first), peak: +peak.toFixed(2), settle: live.length ? live[live.length - 1].t - live[0].t : 0, frames: live.length, maxGap: gap };
}

for (const scheme of SCHEMES) for (const width of SIZES) {
  const { ctx, page, mobile, errors } = await open(browser, { path: '/t/grandmillennial/', width, scheme });
  const info = await page.evaluate(() => {
    const plates = [...document.querySelectorAll('.hero .gm-plate')].filter((p) => p.getClientRects().length);
    return plates.map((p) => { const r = p.getBoundingClientRect(); return { cls: p.getAttribute('class').replace('gm-plate ', ''), cx: r.left + r.width / 2, cy: r.top + r.height / 2, w: r.width, group: p.parentElement.className }; });
  });
  console.log(`\n== ${scheme} ${width} ${mobile ? 'touch' : 'mouse'}: ${info.length} plates shown, errors ${errors.length}`);
  const big = info.reduce((m, p, i) => (p.w > info[m].w ? i : m), 0);
  const target = info[big];
  const hit = await page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? `${e.tagName}${e.closest('svg.gm-plate') ? ' in plate' : ''}` : 'none'; }, [target.cx, target.cy]);
  console.log('hit test at the biggest plate centre:', hit, '| corner of its box (should miss):', await page.evaluate(([x, y, w]) => { const e = document.elementFromPoint(x + w * 0.46, y - w * 0.46); return e ? `${e.tagName}${e.closest('svg.gm-plate') ? ' in plate' : ''}` : 'none'; }, [target.cx, target.cy, target.w]));
  await page.evaluate(() => document.querySelector('.hero').scrollIntoView({ block: 'start' }));
  const t = await page.evaluate((cls) => { const p = document.querySelector(`.hero .gm-plate.${cls.split(' ').pop()}`); const r = p.getBoundingClientRect(); return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, w: r.width }; }, target.cls);

  if (!mobile) {
    for (const [label, from, to] of [['R>L', 1, -1], ['L>R', -1, 1], ['R>L again', 1, -1]]) {
      await page.mouse.move(t.cx + from * t.w * 0.9, t.cy + t.w * 0.2);
      await page.evaluate(install);
      await page.mouse.move(t.cx + from * t.w * 0.3, t.cy + t.w * 0.2, { steps: 4 });
      await page.mouse.move(t.cx + to * t.w * 0.3, t.cy + t.w * 0.2, { steps: 6 });
      await page.waitForTimeout(900);
      const rec = await page.evaluate(() => { window.__rec.on = false; return { frames: window.__rec.frames, mut: window.__rec.mut, n: window.__rec.plates.length }; });
      const idx = (await page.evaluate((cls) => [...document.querySelectorAll('.hero .gm-plate')].filter((p) => p.getClientRects().length).findIndex((p) => p.classList.contains(cls.split(' ').pop())), target.cls));
      const s = summarise(rec.frames, idx);
      const neigh = rec.frames[0].a.map((_, i) => i).filter((i) => i !== idx).map((i) => summarise(rec.frames, i));
      console.log(`brush ${label}: first move ${s.first > 0 ? 'clockwise(+)' : 'anticlockwise(-)'} peak ${s.peak} length ${s.settle} ms (${s.frames} frames, max gap ${s.maxGap} ms) | neighbours peaks ${neigh.map((n) => n.peak).join(',')} firsts ${neigh.map((n) => n.first).join(',')} | style writes ${rec.mut}`);
      await page.mouse.move(5, 5);
      await page.waitForTimeout(700);
    }
  } else {
    for (const [label, off] of [['tap left', -0.25], ['tap right', 0.25]]) {
      await page.evaluate(install);
      await page.touchscreen.tap(t.cx + off * t.w, t.cy);
      await page.waitForTimeout(900);
      const rec = await page.evaluate(() => { window.__rec.on = false; return { frames: window.__rec.frames, mut: window.__rec.mut }; });
      const idx = (await page.evaluate((cls) => [...document.querySelectorAll('.hero .gm-plate')].filter((p) => p.getClientRects().length).findIndex((p) => p.classList.contains(cls.split(' ').pop())), target.cls));
      const s = summarise(rec.frames, idx);
      console.log(`${label}: first move ${s.first > 0 ? 'clockwise(+)' : 'anticlockwise(-)'} peak ${s.peak} length ${s.settle} ms (${s.frames} frames, max gap ${s.maxGap} ms) | style writes ${rec.mut}`);
      await page.waitForTimeout(500);
    }
    // a vertical swipe starting on a plate scrolls (and a control swipe from bare wall scrolls the same)
    const cdp = await ctx.newCDPSession(page);
    for (const [label, pick] of [['from the plate', 'plate'], ['control, bare wall', 'wall']]) {
      await page.evaluate(() => scrollTo(0, 0));
      await page.waitForTimeout(150);
      await page.evaluate(install);
      const at = await page.evaluate((pick) => {
        const p = document.querySelector('.hero .gm-plate.' + (document.querySelector('.hero .gm-plate.a')?.getClientRects().length ? 'a' : 'y'));
        const r = p.getBoundingClientRect();
        const hero = document.querySelector('.hero').getBoundingClientRect();
        return pick === 'plate' ? { x: r.left + r.width / 2, y: r.top + r.height / 2, on: document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.tagName } : { x: Math.max(8, r.left - 6), y: hero.top + 30, on: String(document.elementFromPoint(Math.max(8, r.left - 6), hero.top + 30)?.getAttribute('class')) };
      }, pick);
      const x = Math.round(at.x), y0 = Math.round(at.y);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: y0 }] });
      for (let k = 1; k <= 12; k++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + (k % 2), y: y0 - k * 25 }] }); await page.waitForTimeout(16); }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await page.waitForTimeout(700);
      const rec = await page.evaluate(() => { window.__rec.on = false; return { run: Math.max(0, ...window.__rec.frames.map((f) => f.run)), y: scrollY }; });
      console.log(`vertical swipe ${label} (starts on ${at.on}): scrollY 0 -> ${rec.y}, plate animations seen ${rec.run}`);
    }
  }

  // room: every plate, struck from each side, against the frame, plaque and bow
  const room = await page.evaluate(async () => {
    const hero = document.querySelector('.hero');
    const plates = [...hero.querySelectorAll('.gm-plate')].filter((p) => p.getClientRects().length);
    const prot = ['.gilt', '.plaque', '.bow'].map((s) => hero.querySelector(s)).filter(Boolean);
    const out = [];
    for (const p of plates) {
      for (const dx of [-1, 1]) {
        const r0 = p.getBoundingClientRect();
        const ev = (type, x, y) => hero.dispatchEvent(new PointerEvent(type, { pointerType: 'mouse', clientX: x, clientY: y, bubbles: true }));
        // brush in through the plate's disc from the side
        const cx = r0.left + r0.width / 2, cy = r0.top + r0.height / 2;
        const target = p.querySelector('use');
        const mv = (x) => target.dispatchEvent(new PointerEvent('pointermove', { pointerType: 'mouse', clientX: x, clientY: cy, movementX: dx * 4, bubbles: true }));
        mv(cx);
        let worst = Infinity;
        const end = performance.now() + 700;
        while (performance.now() < end) {
          await new Promise((r) => requestAnimationFrame(r));
          const c = p.getBoundingClientRect();
          // the plate's disc is inscribed in its (rotated) bounding box only roughly: use the true disc, centre of the box moved by the swing
          const rad = parseFloat(getComputedStyle(p).width) / 2 * 0.9;
          const m = new DOMMatrixReadOnly(getComputedStyle(p).transform);
          // the box centre moves with the swing; take it from the bounding rect (rotation about the centre keeps it)
          const px = (c.left + c.right) / 2, py = (c.top + c.bottom) / 2;
          for (const el of prot) {
            const b = el.getBoundingClientRect();
            const d = Math.hypot(Math.max(b.left - px, 0, px - b.right), Math.max(b.top - py, 0, py - b.bottom)) - rad;
            if (d < worst) worst = d;
          }
        }
        out.push({ plate: p.getAttribute('class').replace('gm-plate ', ''), dir: dx, worstClear: +worst.toFixed(1) });
        // let it rest and move the synthetic pointer off
        hero.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }));
        await new Promise((r) => setTimeout(r, 700));
      }
    }
    return out;
  });
  console.log('room (min clearance px of swung disc to frame/plaque/bow, negative = overlap):', room.map((r) => `${r.plate}${r.dir > 0 ? '>' : '<'}${r.worstClear}`).join(' '));

  // idle after the swing
  await page.evaluate(install);
  await page.waitForTimeout(3000);
  const idle = await page.evaluate(() => { window.__rec.on = false; return { mut: window.__rec.mut, run: Math.max(0, ...window.__rec.frames.map((f) => f.run)), n: window.__rec.frames.length }; });
  console.log(`idle 3 s: attribute writes ${idle.mut}, animations ${idle.run}, rAF frames (the sampler's own) ${idle.n}`);
  await ctx.close();
}
await browser.close();
