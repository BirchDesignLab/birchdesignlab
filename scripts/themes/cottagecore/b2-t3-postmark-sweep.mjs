/* The Contact postcard's ring against its heading and its stamp, every width from 820 to 1440
   (b2 task 3, rewritten in task 6 to run against any frozen build and any port).

   Usage:
     BDL_GPU=1 node scripts/themes/snap.mjs --name <build> --reuse --port 4460 -- node scripts/themes/cottagecore/b2-t3-postmark-sweep.mjs [step]

   Reads the base from SNAP_BASE (snap.mjs sets it from --port), then BDL_BASE, then PORT.
   For each scheme and width (step px apart, default 5; the report lists every width whose
   numbers jump, so run step 1 over a band to find a seam):
     lines   how many lines the invite heading sets in
     gap     the ring circle's top minus the heading's last text line bottom, px (must stay >= 4)
     cross   the share of the cancel's waves' box that lies over the stamp's box, 0..1
             (the cancel crosses the stamp's lower-left corner when this is above 0)
   and prints the widths where the gap changes by more than 8 px from the width before (a jump,
   other than the one-line-pitch step when the heading gains a line, which moves the ring too:
   a jump is reported only if the gap itself changes). */
import { chromium } from 'playwright';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const base = (process.env.SNAP_BASE || process.env.BDL_BASE || `http://127.0.0.1:${process.env.PORT || 4460}`).replace(/\/$/, '');
const step = Number(process.argv[2] || 5);
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu'] });
let worst = Infinity;
let jumps = 0;
for (const scheme of ['light', 'dark']) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: scheme, reducedMotion: 'no-preference' });
  await suppressPrompt(context);
  const page = await context.newPage();
  await page.goto(`${base}/t/cottagecore/contact/`, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: 'bdl-switcher{display:none!important}' });
  await page.evaluate(async () => { await document.fonts.ready; });
  let prev = null;
  for (let w = 1440; w >= 820; w -= step) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.waitForTimeout(60);
    const m = await page.evaluate(() => {
      const h = document.querySelector('.invite');
      const r = document.createRange();
      r.selectNodeContents(h);
      const rects = [...r.getClientRects()];
      const textBottom = Math.max(...rects.map((x) => x.bottom));
      const lines = new Set(rects.map((x) => Math.round(x.top))).size;
      const ring = document.querySelector('.postmark circle').getBoundingClientRect();
      const waves = document.querySelector('.postmark .pm-waves').getBoundingClientRect();
      const stamp = document.querySelector('.postcard .stamp').getBoundingClientRect();
      const ix = Math.max(0, Math.min(waves.right, stamp.right) - Math.max(waves.left, stamp.left));
      const iy = Math.max(0, Math.min(waves.bottom, stamp.bottom) - Math.max(waves.top, stamp.top));
      return { lines, gap: Math.round((ring.top - textBottom) * 10) / 10, cross: Math.round((ix * iy) / (waves.width * waves.height) * 100) / 100 };
    });
    worst = Math.min(worst, m.gap);
    if (prev && Math.abs(m.gap - prev.gap) > 8) { jumps++; console.log(`  JUMP ${scheme} ${w}: gap ${prev.gap} -> ${m.gap}`); }
    if (w % 100 === 40 || w % 100 === 0 || step === 1) console.log(scheme, w, JSON.stringify(m));
    prev = m;
  }
  await context.close();
}
console.log(`worst gap ${worst} px, jumps ${jumps}`);
await browser.close();
process.exit(worst >= 4 && jumps === 0 ? 0 : 1);
