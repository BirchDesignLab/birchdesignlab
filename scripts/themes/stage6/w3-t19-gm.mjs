/**
 * Stage 6 wave 3, task 19 (grandmillennial): two measurements.
 *
 *   home   the Home frame's width at each width (24rem = 384px from about 873
 *          up, never shrinking as the window grows) and the clearance between
 *          the rotated plates and the frame (each plate's rotated box against
 *          the gilt frame's box; negative means the plate overlaps the frame).
 *   tape   Contact's ribbon tape at phone widths: each trust part must sit on
 *          one line (one client rect), the break must fall at the fleuron, and
 *          the part must not run past the tape's padding.
 *
 *   node scripts/themes/stage6/w3-t19-gm.mjs [home|tape|both] [scheme]
 */
import { launch, open } from './w3-t19-lib.mjs';

const what = process.argv[2] || 'both';
const scheme = process.argv[3] || 'light';
const browser = await launch();

if (what === 'home' || what === 'both') {
  console.log('HOME frame and plates, scheme', scheme);
  let prev = 0;
  for (const width of [761, 800, 860, 873, 880, 900, 1000, 1100, 1101, 1180, 1257, 1440, 1920]) {
    const { ctx, page } = await open(browser, { path: '/t/grandmillennial/', width, scheme, touch: false, settle: 200 });
    const r = await page.evaluate(() => {
      const R = (el) => { const b = el.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom }; };
      const frame = R(document.querySelector('.hero .gilt'));
      const plates = (sel) => [...document.querySelectorAll(`.hero ${sel} .pl`)].map(R);
      const left = plates('.plates.left');
      const right = plates('.plates.right');
      const ribbon = document.querySelector('.hero .portrait').getBoundingClientRect().width;
      return { frame, portrait: ribbon, leftMaxRight: Math.max(...left.map((p) => p.r)), rightMinLeft: Math.min(...right.map((p) => p.l)), hscroll: document.documentElement.scrollWidth > innerWidth, heroW: document.querySelector('.hero').clientWidth };
    });
    const gapL = +(r.frame.l - r.leftMaxRight).toFixed(1);
    const gapR = +(r.rightMinLeft - r.frame.r).toFixed(1);
    const grew = r.portrait >= prev - 0.5 ? 'ok' : 'SHRANK';
    prev = r.portrait;
    console.log(width, 'portrait', +r.portrait.toFixed(1), grew, '| plates clear of frame: left', gapL, 'right', gapR, gapL < 0 || gapR < 0 ? 'OVERLAP' : '', '| hscroll', r.hscroll);
    await ctx.close();
  }
}

if (what === 'tape' || what === 'both') {
  console.log('TAPE (Contact trust line), scheme', scheme);
  for (const width of [320, 340, 360, 375, 390, 430, 600, 761, 1024]) {
    const { ctx, page } = await open(browser, { path: '/t/grandmillennial/contact/', width, scheme, settle: 200 });
    const r = await page.evaluate(() => {
      const t = document.querySelector('.trust');
      const parts = [...t.querySelectorAll('.tp')];
      const tb = t.getBoundingClientRect();
      const cs = getComputedStyle(t);
      const innerL = tb.left + parseFloat(cs.paddingLeft);
      const innerR = tb.right - parseFloat(cs.paddingRight);
      const rows = new Set();
      const info = parts.map((p) => {
        const rects = [...p.getClientRects()];
        rects.forEach((q) => rows.add(Math.round(q.top)));
        const b = p.getBoundingClientRect();
        return { text: p.textContent.slice(0, 12), lines: rects.length, l: b.left - innerL, r: innerR - b.right };
      });
      return { info, lines: rows.size, tapeW: tb.width, hscroll: document.documentElement.scrollWidth > innerWidth };
    });
    const ok = r.info.every((p) => p.lines === 1);
    console.log(width, 'tape', Math.round(r.tapeW), 'lines', r.lines, ok ? 'parts whole' : 'PART SPLIT', r.info.map((p) => `${p.text}:${p.lines}l(${p.l.toFixed(0)}/${p.r.toFixed(0)})`).join(' '), 'hscroll', r.hscroll);
    await ctx.close();
  }
}
await browser.close();
