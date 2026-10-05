/* B2 task 5: how much of the first screen is free for a firefly, by method.
   (a) the old way: element boxes of main's h1-h3, p, li, a, pad 8;
   (b) the proof: header/main/footer text elements' boxes, pad 12;
   (c) this lift: text line boxes, pad = a mote's halo PEAK radius (r 1.3 to 2.4,
       so 18 to 34 px; reported at r 1.85 = 26 px).
   Scroll 0 and a mid-page scroll, 1440 and 390. Sheets are not subtracted.
   Usage: node scripts/themes/snap.mjs --name s5-b2-t5-r0 --reuse --port 4460 -- node scripts/themes/cottagecore/b2-t5-free.mjs */
import { chromium } from 'playwright';

const base = (process.env.SNAP_BASE || 'http://127.0.0.1:4460').replace(/\/$/, '');
const browser = await chromium.launch();
for (const [w, h] of [[1440, 900], [390, 844]]) {
  for (const path of ['', 'about/']) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    await page.goto(`${base}/t/cottagecore/${path}`, { waitUntil: 'networkidle' });
    await page.evaluate(async () => { await document.fonts.ready; });
    const res = await page.evaluate(() => {
      const boxes = (sel, root) => [...document.querySelectorAll(sel)].map((e) => e.getBoundingClientRect()).filter((r) => r.width > 1 && r.height > 1).map((r) => [r.left, r.top, r.right, r.bottom]);
      const a = boxes('main :is(h1, h2, h3, p, li, a)');
      const b = boxes('header :is(h1,h2,h3,h4,p,li,a,label,blockquote,figcaption,button,input,textarea), main :is(h1,h2,h3,h4,p,li,a,label,blockquote,figcaption,button,input,textarea), footer :is(h1,h2,h3,h4,p,li,a,label,blockquote,figcaption,button,input,textarea)');
      const c = [];
      const range = document.createRange();
      document.querySelectorAll('header, main, footer').forEach((region) => {
        const wk = document.createTreeWalker(region, NodeFilter.SHOW_TEXT);
        for (let n = wk.nextNode(); n; n = wk.nextNode()) {
          if (!n.nodeValue.trim()) continue;
          range.selectNodeContents(n);
          for (const r of range.getClientRects()) if (r.width > 1 && r.height > 1) c.push([r.left, r.top, r.right, r.bottom]);
        }
      });
      const free = (rects, pad) => {
        let n = 0, t = 0;
        for (let y = 0; y < innerHeight; y += 6) for (let x = 0; x < innerWidth; x += 6) {
          t++;
          if (!rects.some((r) => x >= r[0] - pad && x <= r[2] + pad && y >= r[1] - pad && y <= r[3] + pad)) n++;
        }
        return +(n / t).toFixed(3);
      };
      return { old8: free(a, 8), proof12: free(b, 12), lift26: free(c, 26), lift34: free(c, 34), lift12: free(c, 12) };
    });
    console.log(`${w} ${path || 'home'}`, JSON.stringify(res));
    await page.close();
  }
}
await browser.close();
