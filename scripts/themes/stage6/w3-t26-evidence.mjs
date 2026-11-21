/**
 * Stage 6 wave 3, task 26: evidence (sheets and timestamped film strips) for grandmillennial's swinging plates.
 * Output: scripts/themes/.out/stage6/w3/t26/.
 *
 *   node scripts/themes/snap.mjs --name s6-w3-t26 --reuse --port 4470 -- node scripts/themes/stage6/w3-t26-evidence.mjs
 *   ONLY=sheets,films,rapid,swap SIZES=1440,1101,820,390 SCHEMES=light node ...
 *
 * sheets  Home whole-page at 1440, 1101, 820 and 390 in both schemes, plates at rest.
 * films   per size and scheme: mouse sizes (1440, 1101) brush L to R, R to L and a click-in ("tap"); touch sizes
 *         (820, 390) a tap left of centre and a tap right of centre. A strip over 700 ms from the first move of the plate,
 *         cropped to the plate group and the frame beside it.
 * rapid   twenty brushes in about a second across one plate: the largest angle any plate reaches (printed, and a strip).
 * swap    a swing started, then Home swapped to About through the real header nav and back: the plates are at rest on
 *         return and one brush starts one swing (not two), so the toy was torn down and mounted once.
 */
import { join } from 'node:path';
import { launch, open, startFilm, pickAt, strip, OUT } from './w3-t26-lib.mjs';

const ONLY = (process.env.ONLY || 'sheets,films,rapid,swap').split(',');
const SCHEMES = (process.env.SCHEMES || 'light,dark').split(',');
const SIZES = (process.env.SIZES || '1440,1101,820,390').split(',').map(Number);
const HOME = '/t/grandmillennial/';
const { browser } = await launch();

/** Count every Element.animate call from here on (epoch ms of the first, and how many). */
const spyAnimate = () => {
  window.__anim = { n: 0, first: 0, peak: 0 };
  if (window.__spied) return;
  window.__spied = true;
  const orig = Element.prototype.animate;
  Element.prototype.animate = function (kf, o) {
    if (this.classList?.contains('gm-plate') && !(kf.length === 2 && String(kf[0].transform).includes('0.01deg'))) {
      if (!window.__anim.n) window.__anim.first = performance.timeOrigin + performance.now();
      window.__anim.n++;
    }
    return orig.call(this, kf, o);
  };
};

/** The plate to work on (the biggest shown, the first the page lays out), the group it hangs in and the frame beside it. */
const subject = (page) => page.evaluate(() => {
  const shown = [...document.querySelectorAll('.hero .gm-plate')].filter((p) => p.getClientRects().length);
  const big = shown.reduce((m, p) => (p.getBoundingClientRect().width > m.getBoundingClientRect().width ? p : m), shown[0]);
  const r = big.getBoundingClientRect();
  const grp = big.parentElement.getBoundingClientRect();
  const gilt = document.querySelector('.hero .gilt').getBoundingClientRect();
  const l = Math.max(0, Math.min(grp.left, gilt.left) - 20), t = Math.max(0, Math.min(grp.top, gilt.top) - 30);
  const rr = Math.min(innerWidth, Math.max(grp.right, gilt.right) + 20), bb = Math.min(innerHeight, Math.max(grp.bottom, gilt.bottom) + 30);
  return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, w: r.width, cls: big.getAttribute('class'), box: { x: l, y: t, w: rr - l, h: bb - t } };
});

const OFFSETS = [-1, 0, 60, 120, 180, 240, 300, 380, 460, 540, 620, 700];

/** Run `go` under a film and cut a strip at OFFSETS from the first plate animation. */
async function film(page, width, scheme, name, title, go, box) {
  await page.evaluate(spyAnimate);
  const f = await startFilm(page);
  await page.waitForTimeout(250);
  await go();
  await page.waitForTimeout(1000);
  const frames = await f.stop();
  const first = await page.evaluate(() => window.__anim.first);
  const trig = Math.round((first / 1000 - f.t0) * 1000);
  const picked = pickAt(frames, OFFSETS.map((o, i) => (i === 0 ? -1 : trig + o)));
  const labelled = picked.map((p, i) => ({ ...p, ms: OFFSETS[i] }));
  await strip(labelled, join(OUT, `film-${name}-${scheme}-${width}.png`), `${title} ${scheme} ${width} (ms from the plate's first move)`, { cols: 4, cellW: width < 700 ? 300 : 340, box, vpWidth: width });
  return trig;
}

if (ONLY.includes('sheets')) {
  for (const scheme of SCHEMES) for (const width of SIZES) {
    const { ctx, page, errors } = await open(browser, { path: HOME, width, scheme });
    await page.screenshot({ path: join(OUT, `sheet-home-${scheme}-${width}.png`), fullPage: true });
    if (errors.length) console.log('errors', scheme, width, errors);
    await ctx.close();
  }
}

if (ONLY.includes('films')) {
  for (const scheme of SCHEMES) for (const width of SIZES) {
    const { ctx, page, mobile } = await open(browser, { path: HOME, width, scheme });
    await page.waitForTimeout(1200); // past the warm-up
    const s = await subject(page);
    const trigs = [];
    if (!mobile) {
      for (const [name, from, to] of [['brush-lr', -1, 1], ['brush-rl', 1, -1]]) {
        await page.mouse.move(s.cx + from * s.w * 0.9, s.cy + s.w * 0.2);
        await page.waitForTimeout(150);
        trigs.push(await film(page, width, scheme, name, `brush ${from < 0 ? 'left to right' : 'right to left'}`, async () => {
          await page.mouse.move(s.cx + from * s.w * 0.3, s.cy + s.w * 0.2, { steps: 4 });
          await page.mouse.move(s.cx + to * s.w * 0.3, s.cy + s.w * 0.2, { steps: 6 });
        }, s.box));
        await page.mouse.move(5, 5);
        await page.waitForTimeout(800);
      }
      // a click-in: the pointer arrives from below and clicks on the right of the plate
      await page.mouse.move(s.cx + s.w * 0.25, s.cy + s.w * 1.2);
      await page.waitForTimeout(150);
      trigs.push(await film(page, width, scheme, 'tap', 'click in on the right of the plate', async () => {
        await page.mouse.move(s.cx + s.w * 0.25, s.cy, { steps: 5 });
        await page.mouse.down(); await page.mouse.up();
      }, s.box));
    } else {
      for (const [name, off] of [['tap-left', -0.25], ['tap-right', 0.25]]) {
        trigs.push(await film(page, width, scheme, name, `tap ${off < 0 ? 'left' : 'right'} of centre`, async () => {
          await page.touchscreen.tap(s.cx + off * s.w, s.cy);
        }, s.box));
        await page.waitForTimeout(800);
      }
    }
    console.log(`films ${scheme} ${width}: plate ${s.cls}, trigger offsets in the film (ms) ${trigs.join(', ')}`);
    await ctx.close();
  }
}

if (ONLY.includes('rapid')) {
  for (const scheme of SCHEMES) for (const width of [1440, 820]) {
    const { ctx, page, mobile } = await open(browser, { path: HOME, width, scheme });
    await page.waitForTimeout(1200);
    const s = await subject(page);
    await page.evaluate(() => {
      window.__peak = 0; window.__on = true;
      const plates = [...document.querySelectorAll('.hero .gm-plate')].filter((p) => p.getClientRects().length);
      const tick = () => {
        if (!window.__on) return;
        for (const p of plates) { if (!p.getAnimations().length) continue; const m = new DOMMatrixReadOnly(getComputedStyle(p).transform); window.__peak = Math.max(window.__peak, Math.abs(Math.atan2(m.b, m.a) * 180 / Math.PI)); }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    const f = await startFilm(page);
    const t0 = Date.now();
    // twenty brushes: in and out of the plate, alternating sides, about 55 ms apart
    for (let i = 0; i < 20; i++) {
      const side = i % 2 ? 1 : -1;
      if (mobile) await page.touchscreen.tap(s.cx + side * s.w * 0.3, s.cy);
      else { await page.mouse.move(s.cx - side * s.w * 0.7, s.cy); await page.mouse.move(s.cx + side * s.w * 0.1, s.cy, { steps: 2 }); }
      await page.waitForTimeout(25);
    }
    const spent = Date.now() - t0;
    await page.waitForTimeout(900);
    const frames = await f.stop();
    const peak = await page.evaluate(() => { window.__on = false; return window.__peak; });
    const picked = pickAt(frames, [-1, 150, 300, 450, 600, 750, 900, 1100]);
    await strip(picked, join(OUT, `film-rapid-${scheme}-${width}.png`), `rapid: 20 ${mobile ? 'taps' : 'brushes'} in ${spent} ms, ${scheme} ${width}; peak angle seen ${peak.toFixed(2)} deg`, { cols: 4, cellW: 340, box: s.box, vpWidth: width });
    console.log(`rapid ${scheme} ${width}: 20 ${mobile ? 'taps' : 'brushes'} in ${spent} ms, largest angle any plate reached ${peak.toFixed(2)} deg (single-swing peak is 9)`);
    await ctx.close();
  }
}

if (ONLY.includes('swap')) {
  for (const scheme of SCHEMES) for (const width of [1440, 390]) {
    const { ctx, page, mobile } = await open(browser, { path: HOME, width, scheme });
    await page.waitForTimeout(1200);
    const s = await subject(page);
    await page.evaluate(spyAnimate);
    if (mobile) await page.touchscreen.tap(s.cx - 0.25 * s.w, s.cy);
    else { await page.mouse.move(s.cx + s.w * 0.9, s.cy); await page.mouse.move(s.cx, s.cy, { steps: 5 }); }
    await page.waitForTimeout(170);
    const mid = await page.evaluate(() => [...document.querySelectorAll('.hero .gm-plate')].reduce((n, p) => n + p.getAnimations().length, 0));
    // swap to About through the real header nav, mid-swing
    await page.evaluate(() => { [...document.querySelectorAll('header nav a')].find((l) => /\/about/.test(l.getAttribute('href')))?.click(); });
    await page.waitForTimeout(1800);
    const onAbout = await page.evaluate(() => location.pathname);
    await page.evaluate(() => document.querySelector('header a.wordmark')?.click());
    await page.waitForTimeout(1800);
    const back = await page.evaluate(() => ({ path: location.pathname, running: [...document.querySelectorAll('.hero .gm-plate')].reduce((n, p) => n + p.getAnimations().length, 0), inline: [...document.querySelectorAll('.hero .gm-plate')].filter((p) => p.hasAttribute('style')).length }));
    await page.screenshot({ path: join(OUT, `swap-return-${scheme}-${width}.png`) });
    // one brush on the return = one swing group (3 plates for the big group at desktop, 3 for the row at phone), not two
    await page.evaluate(spyAnimate);
    const s2 = await subject(page);
    if (mobile) await page.touchscreen.tap(s2.cx - 0.25 * s2.w, s2.cy);
    else { await page.mouse.move(s2.cx + s2.w * 0.9, s2.cy + 40); await page.mouse.move(s2.cx, s2.cy + 40, { steps: 5 }); }
    await page.waitForTimeout(150);
    const n = await page.evaluate(() => window.__anim.n);
    console.log(`swap ${scheme} ${width}: animations running mid-swing ${mid}; went to ${onAbout}; back on ${back.path}, running on return ${back.running}, inline styles ${back.inline}; one brush on the return made ${n} plate animations (group of ${await page.evaluate(() => [...document.querySelectorAll('.hero .gm-plate')].filter((p) => p.getClientRects().length && p.parentElement === document.querySelector('.hero .gm-plate.' + (document.querySelector('.hero .gm-plate.a')?.getClientRects().length ? 'a' : 'y')).parentElement).length)})`);
    await ctx.close();
  }
}
await browser.close();
