/**
 * Stage 6 wave 3, task 19 (cottagecore tablet Home, 641 to 820): the sheet floats right, the copy wraps beside
 * it. For each width: the subline's lines (words per line, from a range rect per word), flagging any line of a
 * single word (the brief: none at 641); the gap between the widest text line and the sheet where they share
 * vertical range (the sheet's rotated box, so the tilt and the tape count); the empty band under the copy
 * (hero bottom minus the lower of the copy and the sheet, which should be just the hero's own padding); and
 * horizontal scroll.
 *
 *   node scripts/themes/stage6/w3-t19-cc-tablet.mjs [scheme] [widths comma list]
 */
import { launch, open } from './w3-t19-lib.mjs';

const scheme = process.argv[2] || 'light';
const widths = (process.argv[3] || '641,660,700,740,760,800,820').split(',').map(Number);
const browser = await launch();
for (const width of widths) {
  const { ctx, page } = await open(browser, { path: '/t/cottagecore/', width, scheme, touch: false, settle: 200 });
  const r = await page.evaluate(() => {
    const words = (el) => {
      const out = [];
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const re = /\S+/g;
        let m;
        while ((m = re.exec(n.data))) {
          const g = document.createRange();
          g.setStart(n, m.index); g.setEnd(n, m.index + m[0].length);
          const b = g.getBoundingClientRect();
          out.push({ w: m[0], t: Math.round(b.top), l: b.left, r: b.right, b: b.bottom });
        }
      }
      return out;
    };
    const lines = (el) => {
      const ws = words(el);
      const map = new Map();
      for (const w of ws) { if (!map.has(w.t)) map.set(w.t, []); map.get(w.t).push(w); }
      return [...map.values()].map((l) => ({ n: l.length, text: l.map((x) => x.w).join(' '), r: Math.max(...l.map((x) => x.r)), t: l[0].t, b: Math.max(...l.map((x) => x.b)) }));
    };
    const R = (el) => { const b = el.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom }; };
    const sheet = R(document.querySelector('.hero .sheet'));
    const hero = document.querySelector('.hero');
    const heroR = R(hero);
    const cs = getComputedStyle(hero);
    const sub = lines(document.querySelector('.subline'));
    const lead = lines(document.querySelector('.lead'));
    const name = lines(document.querySelector('.billboard'));
    const all = [...name, ...lead, ...sub];
    let minGap = 1e9;
    for (const l of all) if (l.b > sheet.t && l.t < sheet.b) minGap = Math.min(minGap, sheet.l - l.r);
    const copyBottom = Math.max(...all.map((l) => l.b));
    return {
      sub: sub.map((l) => `${l.n}:${l.text}`),
      single: sub.filter((l) => l.n === 1).map((l) => l.text),
      lone: [...name, ...lead].filter((l) => l.n === 1 && false).length,
      minGapToSheet: Math.round(minGap),
      belowCopy: Math.round(heroR.b - parseFloat(cs.paddingBottom) - Math.max(copyBottom, sheet.b)),
      sheetW: Math.round(sheet.r - sheet.l), sheetH: Math.round(sheet.b - sheet.t),
      heroH: Math.round(heroR.b - heroR.t), subLines: sub.length,
      subTopToSheetBottom: Math.round(sub[0].t - sheet.b),
      lastLineFullWidth: Math.round(sub[sub.length - 1].r - heroR.l),
      hscroll: document.documentElement.scrollWidth > innerWidth,
    };
  });
  console.log(width, scheme, 'sheet', r.sheetW + 'x' + r.sheetH, 'hero h', r.heroH, '| subline lines', r.subLines, r.single.length ? 'SINGLE-WORD LINE: ' + r.single.join(' | ') : 'no single-word lines', '| min gap text-sheet', r.minGapToSheet, '| empty below', r.belowCopy, '| hscroll', r.hscroll);
  if (process.env.VERBOSE) console.log('   ', r.sub.join('\n    '));
  await ctx.close();
}
await browser.close();
