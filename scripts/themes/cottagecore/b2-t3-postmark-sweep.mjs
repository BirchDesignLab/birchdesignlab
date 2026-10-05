/* Postmark vs invite heading gap across the tablet band (b2 task 3 fix round 2).
   Usage: BDL_GPU=1 node scripts/themes/snap.mjs --name b2t3pm --port 4460 -- node scripts/themes/cottagecore/b2-t3-postmark-sweep.mjs
   Gap = ring circle top edge minus the heading's last text line bottom, in px. Reference: 1440 reads -7 and is clear by eye, so the
   rotated ring box overstates; the failing band read about -12 to -17 by the film check and now reads 17 or more. */
import { chromium } from 'playwright';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const base = process.env.BDL_BASE || `http://localhost:${process.env.PORT || 4460}`;
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu'] });
for (const scheme of ['light', 'dark']) {
  for (const w of [1440, 1280, 1100, 1024, 1000, 980, 960, 940, 900, 880, 861, 860, 820]) {
    const context = await browser.newContext({ viewport: { width: w, height: 900 }, colorScheme: scheme, reducedMotion: 'no-preference' });
    const page = await context.newPage();
    try { await suppressPrompt(page); } catch {}
    await page.goto(`${base}/t/cottagecore/contact`, { waitUntil: 'networkidle' });
    const gap = await page.evaluate(() => {
      const h = document.querySelector('.invite');
      const r = document.createRange(); r.selectNodeContents(h);
      const rects = [...r.getClientRects()];
      const textBottom = Math.max(...rects.map((x) => x.bottom));
      const ring = document.querySelector('.postmark circle').getBoundingClientRect();
      return Math.round((ring.top - textBottom) * 10) / 10;
    });
    console.log(scheme, w, gap);
    await context.close();
  }
}
await browser.close();
