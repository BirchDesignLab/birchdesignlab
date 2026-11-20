/** Stage 6 w1 t6: a scratch probe of the lab band's two cuts (line rects, clear zone, sideways scroll).
 *   BASE=http://127.0.0.1:4470 node scripts/themes/stage6/w1-t6-cutprobe.mjs */
import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu'] });
for (const w of [1440, 1024, 820, 430, 412, 390, 375, 360]) {
  const p = await (await b.newContext({ viewport: { width: w, height: 900 } })).newPage();
  await p.goto(`${process.env.BASE || 'http://127.0.0.1:4470'}/t/swiss/`, { waitUntil: 'networkidle' });
  const r = await p.evaluate(() => {
    const out = { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth };
    for (const sel of ['.lab-kicker .cut', '.pull .cut']) {
      const el = document.querySelector(sel);
      const pr = el.parentElement.getBoundingClientRect();
      const rects = [...el.getClientRects()].map((r) => [Math.round(r.left), Math.round(r.right)]);
      const range = document.createRange(); range.selectNodeContents(el);
      const tr = [...range.getClientRects()].map((r) => [Math.round(r.left), Math.round(r.right)]);
      out[sel] = { parent: [Math.round(pr.left), Math.round(pr.right)], boxes: rects };
    }
    return out;
  });
  console.log(w, JSON.stringify(r));
}
await b.close();
