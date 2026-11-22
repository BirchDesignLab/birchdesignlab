/**
 * Stage 6 wave 3, task 25: the elevator's clearance from the kiosk props.
 * Measures every elevator button, the readout box and the label text against
 * the props' VISIBLE figures (the same bboxes as w3-t19-kiosk.mjs: Venus
 * x 31.8-68.0% y 15.6-89.1% of its image, the ball x 29.5-70.3% y 29.5-74.2%).
 *   node scripts/themes/snap.mjs --name t25 --reuse --port 4470 -- node scripts/themes/stage6/w3-t25-kiosk.mjs
 *   WIDTHS=360,390 ...
 */
import { launch, open } from './w3-t25-lib.mjs';

const widths = (process.env.WIDTHS || '360,390,430,600,761,820,900,901,1024,1440').split(',').map(Number);
const FIG = { venus: { x0: 0.318, x1: 0.68, y0: 0.156, y1: 0.891 }, sphere: { x0: 0.295, x1: 0.703, y0: 0.295, y1: 0.742 } };
const { browser } = await launch();
for (const scheme of (process.env.SCHEMES || 'dark').split(',')) {
  for (const width of widths) {
    const { ctx, page } = await open(browser, { path: '/t/vaporwave/', width, scheme, settle: 300 });
    await page.locator('.kiosk-stand').scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const r = await page.evaluate(({ FIG, devW }) => {
      const R = (el) => { const b = el.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom }; };
      const fig = (img, f) => { const b = img.getBoundingClientRect(); return { l: b.left + f.x0 * b.width, r: b.left + f.x1 * b.width, t: b.top + f.y0 * b.height, b: b.top + f.y1 * b.height }; };
      const hidden = (el) => !el || getComputedStyle(el.closest('picture')).display === 'none';
      const v = document.querySelector('.kiosk-prop-venus img');
      const s = document.querySelector('.kiosk-prop:not(.kiosk-prop-venus) img');
      const text = (el) => { const g = document.createRange(); g.selectNodeContents(el); return R(g); };
      const items = [
        ['readout', R(document.querySelector('[data-floor-box]'))],
        ...Array.from(document.querySelectorAll('.floor')).map((b) => [`key ${b.dataset.floor}`, R(b)]),
        ...Array.from(document.querySelectorAll('.floor span')).map((b, i) => [`text ${i}`, text(b)]),
        ['readout text', text(document.querySelector('[data-floor-readout]'))],
        ['plaque', R(document.querySelector('.stand-plaque'))],
      ];
      return {
        venus: hidden(v) ? null : fig(v, FIG.venus), sphere: hidden(s) ? null : fig(s, FIG.sphere), items,
        foot: R(document.querySelector('.stand-foot')), stand: R(document.querySelector('.kiosk-stand')),
        hscroll: document.documentElement.scrollWidth > devW || innerWidth > devW,
      };
    }, { FIG, devW: width });
    const f1 = (n) => +n.toFixed(1);
    const ov = (a, b) => { if (!a) return null; const x = Math.min(a.r, b.r) - Math.max(a.l, b.l); const y = Math.min(a.b, b.b) - Math.max(a.t, b.t); return x > 0 && y > 0 ? { x: f1(x), y: f1(y) } : null; };
    const worst = { venus: null, sphere: null };
    const hits = [];
    for (const [name, box] of r.items) {
      if (name === 'plaque') continue;
      for (const k of ['venus', 'sphere']) { const o = ov(r[k], box); if (o) hits.push(`${k} x ${name} ${o.x}x${o.y}`); }
    }
    const plaque = r.items.find((i) => i[0] === 'plaque')[1];
    console.log(width, scheme, hits.length ? `OVERLAP ${hits.join('; ')}` : 'elevator clear of both figures',
      '| plaque box overlap venus', JSON.stringify(ov(r.venus, plaque)), 'sphere', JSON.stringify(ov(r.sphere, plaque)),
      '| venus top-to-lowest-element', r.venus && f1(Math.min(...r.items.filter((i) => i[0] !== 'plaque').map((i) => r.venus.t - i[1].b).filter((n) => true).map((n) => n)) ),
      '| hscroll', r.hscroll);
    await ctx.close();
  }
}
await browser.close();
