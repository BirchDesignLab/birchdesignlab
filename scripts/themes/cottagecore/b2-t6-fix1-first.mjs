/* B2 task 6 fix round 1: seed ink on text in the first frames after a load, with the time of each hit.
   b2-t5-probe.mjs `first` says whether a load ever showed ink on text; this says WHEN (ms from
   navigation start), how strong, and what the page was doing, so the cause can be found.

     BDL_GPU=1 node scripts/themes/cottagecore/b2-t6-fix1-first.mjs [--loads 40] [--size 1440] [--base http://127.0.0.1:4460]

   Every rAF from the first frame the canvas exists: seed-ink pixels (alpha >= 14) and how many of
   them fall inside a line of text as laid out at that moment. */
import { chromium } from 'playwright';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i < 0 ? d : process.argv[i + 1]; };
const base = arg('base', process.env.SNAP_BASE || 'http://127.0.0.1:4460').replace(/\/$/, '');
const loads = +arg('loads', 40);
const SIZES = { 1440: { w: 1440, h: 900, dpr: 1 }, 390: { w: 390, h: 844, dpr: 2, mobile: true } };
const sz = SIZES[arg('size', '1440')];
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
let bad = 0;
for (let n = 0; n < loads; n++) {
  const context = await browser.newContext({ viewport: { width: sz.w, height: sz.h }, deviceScaleFactor: sz.dpr, isMobile: !!sz.mobile, hasTouch: !!sz.mobile, colorScheme: 'light', reducedMotion: 'no-preference' });
  await suppressPrompt(context);
  await context.addInitScript(() => { try { localStorage.setItem('scheme', 'light'); localStorage.setItem('theme', 'light'); } catch {} });
  await context.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
  const page = await context.newPage();
  await page.addInitScript(() => {
    window.__first = [];
    const lines = () => {
      const out = [];
      const range = document.createRange();
      document.querySelectorAll('header, main, footer').forEach((region) => {
        const w = document.createTreeWalker(region, NodeFilter.SHOW_TEXT);
        for (let n = w.nextNode(); n; n = w.nextNode()) {
          if (!n.nodeValue.trim()) continue;
          range.selectNodeContents(n);
          for (const r of range.getClientRects()) if (r.width > 1 && r.height > 1) out.push([r.left, r.top, r.right, r.bottom]);
        }
      });
      return out;
    };
    const poll = () => {
      const c = document.querySelector('[data-cc-motes]');
      if (c) {
        try {
          const ctx = c.getContext('2d');
          const k = c.width / innerWidth;
          const d = ctx.getImageData(0, 0, c.width, c.height).data;
          const L = lines();
          let ink = 0, onText = 0, peak = 0;
          for (let y = 0; y < c.height; y += 2) for (let x = 0; x < c.width; x += 2) {
            const a = d[(y * c.width + x) * 4 + 3];
            if (a >= 14) {
              ink++;
              const cx = x / k, cy = y / k;
              for (const r of L) if (cx >= r[0] && cx <= r[2] && cy >= r[1] && cy <= r[3]) { onText++; if (a > peak) peak = a; break; }
            }
          }
          window.__first.push({ t: Math.round(performance.now()), ink, onText, peak, lines: L.length, sig: Math.round(L.reduce((a, r) => a + r[0] + 3 * r[1] + 5 * r[2] + 7 * r[3], 0)), fonts: document.fonts.status, sy: scrollY });
        } catch {}
      }
      if (window.__first.length < 240) requestAnimationFrame(poll);
    };
    requestAnimationFrame(poll);
  });
  await page.goto(`${base}/t/cottagecore/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3200);
  const first = await page.evaluate(() => window.__first || []);
  const hits = first.filter((f) => f.onText > 0);
  if (hits.length) {
    bad++;
    console.log(`load ${n}: ${hits.length} frames with ink on text of ${first.length}; first frame t=${first[0]?.t}`);
    console.log('  ' + JSON.stringify(hits.slice(0, 6)));
    const i = first.indexOf(hits[0]);
    console.log('  around: ' + JSON.stringify(first.slice(Math.max(0, i - 2), i + 3)));
  }
  await context.close();
}
console.log(`${sz.w}: ${bad} of ${loads} loads showed seed ink on text`);
await browser.close();
