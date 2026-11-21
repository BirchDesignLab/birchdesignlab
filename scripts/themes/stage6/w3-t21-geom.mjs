/**
 * Stage 6 wave 3, task 21: geometry probes (numbers, no pictures).
 *
 *   node scripts/themes/snap.mjs --name s6-w3-t21 --reuse --port 4470 -- node scripts/themes/stage6/w3-t21-geom.mjs
 *   LABEL=base ... (run against snap-stage6-base to take the "before" positions)
 *
 * numerals  every step numeral at weight 100, 700 and 900: the glyph's right
 *           edge against the title's left edge (the clear space it may use).
 * sent      the full stop's box and the heading's, the page's scroll height
 *           and any sideways scroll, for a before and after comparison.
 * about     the spine's box and the text's left edge at each size.
 * Output: scripts/themes/.out/stage6/w3/t21/geom-<LABEL>.json
 */
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { launch, open, OUT } from './w3-t21-lib.mjs';

const LABEL = process.env.LABEL || 'after';
const WIDTHS = (process.env.WIDTHS || '1440,1280,1024,820,640,390').split(',').map(Number);
const { browser } = await launch();
const out = { label: LABEL, numerals: [], sent: [], about: [] };

for (const width of WIDTHS) {
  {
    const { ctx, page } = await open(browser, { path: '/t/swiss/services/', width });
    out.numerals.push(...(await page.evaluate((width) => {
      const res = [];
      const steps = [...document.querySelectorAll('.steps .step')];
      for (const [i, step] of steps.entries()) {
        const num = step.querySelector('.num');
        const title = step.querySelector('.step-title');
        const rg = document.createRange();
        rg.selectNodeContents(num);
        const row = { width, n: i + 1, titleLeft: Math.round(title.getBoundingClientRect().left) };
        for (const w of [100, 700, 900]) {
          num.style.fontWeight = String(w);
          const r = rg.getBoundingClientRect();
          row[`w${w}`] = { left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), h: Math.round(r.height) };
        }
        num.style.removeProperty('font-weight');
        row.clear900 = row.titleLeft - row.w900.right;
        res.push(row);
      }
      return res;
    }, width)));
    await ctx.close();
  }
  {
    const { ctx, page } = await open(browser, { path: '/t/swiss/contact/sent/', width });
    out.sent.push(await page.evaluate((width) => {
      const r = (el) => { const b = el.getBoundingClientRect(); return [Math.round(b.left * 10) / 10, Math.round(b.top * 10) / 10, Math.round(b.width * 10) / 10, Math.round(b.height * 10) / 10]; };
      const h1 = document.querySelector('.sent .title');
      const stop = document.querySelector('.sent .stop');
      const rg = document.createRange();
      rg.selectNodeContents(h1);
      return {
        width,
        h1: r(h1), stop: r(stop), text: [...h1.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent),
        range: r({ getBoundingClientRect: () => rg.getBoundingClientRect() }),
        body: r(document.querySelector('.sent .body')), back: r(document.querySelector('.sent .back')),
        scrollH: document.documentElement.scrollHeight, scrollW: document.documentElement.scrollWidth, innerW: innerWidth,
      };
    }, width));
    await ctx.close();
  }
  {
    const { ctx, page } = await open(browser, { path: '/t/swiss/about/', width });
    out.about.push(await page.evaluate((width) => {
      const r = (el) => { const b = el.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top + scrollY), Math.round(b.width), Math.round(b.height)]; };
      const birch = document.querySelector('.sw-birch');
      const lead = document.querySelector('.founder-lead');
      const sec = document.querySelector('.founder');
      const cs = getComputedStyle(birch);
      return {
        width, display: cs.display, birch: cs.display === 'none' ? null : r(birch), sec: r(sec), lead: r(lead),
        bwdth: cs.getPropertyValue('--sw-bwdth').trim(), fs: cs.fontSize,
        lines: [...document.querySelectorAll('.title .ln')].map((l) => r(l)),
      };
    }, width));
    await ctx.close();
  }
}
await writeFile(join(OUT, `geom-${LABEL}.json`), JSON.stringify(out, null, 1));
for (const n of out.numerals) console.log(`num ${n.width} #${n.n}: titleLeft ${n.titleLeft}; right edge @100 ${n.w100.right} @700 ${n.w700.right} @900 ${n.w900.right}; clear at 900: ${n.clear900}`);
for (const s of out.sent) console.log(`sent ${s.width}: h1 ${s.h1} stop ${s.stop} range ${s.range} scrollH ${s.scrollH} scrollW ${s.scrollW}/${s.innerW}`);
for (const a of out.about) console.log(`about ${a.width}: ${a.display} birch ${a.birch} lead ${a.lead}`);
await browser.close();
