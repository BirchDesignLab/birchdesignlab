/**
 * Stage 6 wave 3, task 19 (w2 task 15 C1): the chintz frame's real outer box.
 *
 * w2-t15-measure.mjs read `.border`, which does not exist in Framed.astro, so
 * its `outer` was always null and the item 8 skip had no measurement behind
 * it. The chintz frame's visible outer edge is its `.strip` (the four vine
 * runs and the four corner rosettes, inset -(1.6rem + 3px) from the card)
 * plus the strip's own rings: box-shadow 0 0 0 1px rule, 0 0 0 5px field, 0 0 0
 * 6px rule, so the painted outer edge is 6px beyond the strip's box. The
 * plain gilt frame's outer edge is its border box plus the outline (1px wide,
 * offset 6px: 7px). This reads both, on the pages that carry each, at the
 * phone widths and a few more, and prints the chintz frame's outer width, the
 * gilt frame's, and their difference. It also reports the tile's inline bytes
 * (the #gm-chintz pattern in each page's HTML; raw and gzip) for the commit
 * body (w2 task 15 item 12).
 *
 *   BASE=http://127.0.0.1:4470 node scripts/themes/stage6/w3-t19-chintz.mjs
 */
import { gzipSync } from 'node:zlib';
import { BASE, launch, open } from './w3-t19-lib.mjs';

const browser = await launch();
const r1 = (n) => Math.round(n * 10) / 10;
for (const width of [360, 390, 430, 820, 1440]) {
  for (const path of ['/t/grandmillennial/contact/', '/t/grandmillennial/about/']) {
    const { ctx, page } = await open(browser, { path, width, scheme: 'light', settle: 150 });
    const o = await page.evaluate(() => {
      const out = [];
      for (const f of document.querySelectorAll('.gm-framed')) {
        const b = f.getBoundingClientRect();
        const strip = f.querySelector(':scope > .strip');
        if (strip) {
          const s = strip.getBoundingClientRect();
          const knots = [...strip.querySelectorAll('.knot')].map((k) => k.getBoundingClientRect());
          const runs = [...strip.querySelectorAll('.run')].map((k) => k.getBoundingClientRect());
          const left = Math.min(...knots.map((k) => k.left), ...runs.map((k) => k.left));
          const right = Math.max(...knots.map((k) => k.right), ...runs.map((k) => k.right));
          out.push({ kind: 'chintz', cls: f.className.replace(/astro-\S+/g, '').replace(/\s+/g, ' ').trim(), card: [b.left, b.width], stripBox: [s.left, s.width], partsSpan: [left, right - left], outerL: s.left - 6, outerR: s.right + 6 });
        } else {
          out.push({ kind: 'gilt', cls: f.className.replace(/astro-\S+/g, '').replace(/\s+/g, ' ').trim(), card: [b.left, b.width], outerL: b.left - 7, outerR: b.right + 7 });
        }
      }
      return out;
    });
    const hscroll = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    for (const f of o) {
      console.log(String(width).padStart(5), path.split('/')[3].padEnd(8), f.kind.padEnd(6), f.cls.slice(0, 40).padEnd(40), 'card', f.card.map(r1).join('+'), '| outer edge', r1(f.outerL), '->', r1(f.outerR), '= width', r1(f.outerR - f.outerL), f.partsSpan ? `| strip runs+knots span ${f.partsSpan.map(r1).join('+')} (strip box ${f.stripBox.map(r1).join('+')})` : '');
    }
    if (hscroll) console.log('      HSCROLL at', width, path);
    await ctx.close();
  }
}
await browser.close();

console.log('\nChintz tile inline bytes (the <pattern id="gm-chintz"> in each page), from', BASE);
for (const p of ['/t/grandmillennial/', '/t/grandmillennial/about/', '/t/grandmillennial/services/', '/t/grandmillennial/contact/']) {
  const html = await (await fetch(`${BASE}${p}`)).text();
  const m = html.match(/<pattern[^>]*id="gm-chintz"[\s\S]*?<\/pattern>/);
  console.log(p.padEnd(32), 'page', html.length, 'B', m ? `| tile ${m[0].length} B raw, ${gzipSync(m[0]).length} B gzip` : '| no inline tile');
}
