/**
 * Stage 6 wave 3, task 19 (vaporwave C3): the taskbar's nav labels at phone
 * widths. For each width, the free space each side of every label's text
 * inside its button (inner box, past the 2px bevel and the padding), so
 * SERVICES' margin can be held at 5px or more at 360 and 375.
 *
 *   node scripts/themes/stage6/w3-t19-header.mjs [paths... default /t/vaporwave/]
 */
import { BASE, launch, open } from './w3-t19-lib.mjs';

const widths = [320, 340, 360, 375, 380, 390, 414, 430];
const browser = await launch();
const rows = [];
for (const width of widths) {
  const { ctx, page } = await open(browser, { path: '/t/vaporwave/', width, scheme: 'dark', settle: 300 });
  const r = await page.evaluate(() => {
    const out = [];
    for (const a of document.querySelectorAll('.taskbar nav .task')) {
      const range = document.createRange();
      range.selectNodeContents(a);
      const t = range.getBoundingClientRect();
      const b = a.getBoundingClientRect();
      out.push({ label: a.textContent.trim(), button: +b.width.toFixed(1), text: +t.width.toFixed(1), left: +(t.left - b.left).toFixed(1), right: +(b.right - t.right).toFixed(1), overflowX: a.scrollWidth > a.clientWidth });
    }
    const bar = document.querySelector('.taskbar .bar').getBoundingClientRect();
    return { out, barRows: new Set([...document.querySelectorAll('.taskbar .bar > *')].map((e) => Math.round(e.getBoundingClientRect().top))).size, hscroll: document.documentElement.scrollWidth > innerWidth };
  });
  const s = r.out.find((o) => o.label === 'Services' || /services/i.test(o.label));
  rows.push({ width, services: s, barRows: r.barRows, hscroll: r.hscroll, minEdge: Math.min(...r.out.map((o) => Math.min(o.left, o.right))), all: r.out.map((o) => `${o.label}:${o.left}/${o.right}`).join(' ') });
  await ctx.close();
}
for (const r of rows) console.log(r.width, 'services', JSON.stringify(r.services), 'rows', r.barRows, 'hscroll', r.hscroll, 'minEdge', r.minEdge, '|', r.all);
await browser.close();
console.log('base', BASE);
