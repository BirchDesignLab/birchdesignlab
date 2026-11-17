/* B2 task 5 fix round 2: how much of the first screen can hold a dandelion seed?
   Rebuilds the fx.ts geometry in the page (text line boxes, cover boxes, the
   five drawn points, seedHitsText) and counts grid positions that pass, by
   seed scale, for the shown test the keep loop uses.
   Usage: SNAP_BASE=http://127.0.0.1:4460 node scripts/themes/cottagecore/b2-t5-feasible.mjs <path> <w> <h> */
import { chromium } from 'playwright';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const [path = 'about/', w = '390', h = '844'] = process.argv.slice(2);
const base = (process.env.SNAP_BASE || 'http://127.0.0.1:4460').replace(/\/$/, '');
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const mobile = Number(w) < 700;
const context = await browser.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile, colorScheme: 'light', reducedMotion: 'no-preference' });
await suppressPrompt(context);
const page = await context.newPage();
await page.goto(`${base}/t/cottagecore/${path}`, { waitUntil: 'networkidle' });
await page.evaluate(async () => { await document.fonts.ready; });
await page.waitForTimeout(500);
const PADS = (process.env.PADS || '12').split(',').map(Number);
for (const P of PADS) {
await page.evaluate((p) => { window.__PAD = p; }, P);
const out = await page.evaluate(() => {
  const SK = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'CANVAS']);
  const text = [], cover = [], range = document.createRange();
  const push = (o, r) => { if (r.width >= 1 && r.height >= 1) o.push({ l: r.left, t: r.top, r: r.right, b: r.bottom }); };
  document.querySelectorAll('header, main, footer').forEach((reg) => {
    const wk = document.createTreeWalker(reg, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.nodeValue.trim() && !SK.has(n.parentElement.tagName) ? 1 : 2) });
    for (let n = wk.nextNode(); n; n = wk.nextNode()) { range.selectNodeContents(n); for (const r of range.getClientRects()) push(text, r); }
    reg.querySelectorAll('input, textarea, select, button').forEach((e) => push(text, e.getBoundingClientRect()));
  });
  document.querySelectorAll('.cc-paper, .cc-torn, .cc-gingham').forEach((e) => push(cover, e.getBoundingClientRect()));
  const W = innerWidth, H = innerHeight, PAD = window.__PAD;
  const inb = (x, y, bs) => bs.some((q) => x >= q.l && x <= q.r && y >= q.t && y <= q.b);
  const hits = (x, y, k) => { const l = x - 40 * k - PAD, r = x + 40 * k + PAD, t = y - 42 * k - PAD, b = y + 70 * k + PAD; return text.some((q) => l < q.r && r > q.l && t < q.b && b > q.t); };
  /* The drawn shape: a fan of radius 45k over the anchor (down to 3k below it)
     and a thin stalk and body down to 70k; each with PAD of clear air. */
  const hitsShape = (x, y, k) => {
    const R = 45 * k + PAD, lowY = y + 3 * k + PAD, sw = 4 * k + PAD, sb = y + 70 * k + PAD;
    return text.some((q) => {
      if (q.t < lowY) {
        const cx = Math.min(Math.max(x, q.l), q.r), cy = Math.min(Math.max(y, q.t), Math.min(q.b, lowY));
        if (Math.hypot(cx - x, cy - y) < R) return true;
      }
      return x - sw < q.r && x + sw > q.l && y < q.b && sb > q.t;
    });
  };
  const pts = (x, y, k) => [[x, y], [x - 40 * k, y - 10 * k], [x + 40 * k, y - 10 * k], [x, y - 42 * k], [x, y + 35 * k]];
  const shown = (x, y, k) => pts(x, y, k).filter(([a, b]) => a >= 0 && a <= W && b >= 0 && b <= H && !inb(a, b, cover)).length;
  /* The fan on show: the crown and both tips inside the viewport and off every cover. */
  const fanShown = (x, y, k) => [[x - 40 * k, y - 10 * k], [x + 40 * k, y - 10 * k], [x, y - 42 * k]].every(([a, b]) => a >= 0 && a <= W && b >= 0 && b <= H && !inb(a, b, cover));
  const res = {};
  for (const k of [0.74, 0.93, 1.16]) {
    let n5 = 0, n4 = 0, n3 = 0, tot = 0, m5 = 0, m4 = 0, m3 = 0, f = 0, fAhead = 0;
    for (let y = 24; y <= H - 24; y += 4) for (let x = 24; x <= W - 24; x += 4) {
      tot++;
      const s = shown(x, y, k);
      if (!(hits(x, y, k) || hits(x + 15, y - 8, k))) { if (s >= 5) n5++; if (s >= 4) n4++; if (s >= 3) n3++; }
      if (!(hitsShape(x, y, k) || hitsShape(x + 15, y - 8, k)) && fanShown(x, y, k) && fanShown(x + 15, y - 8, k)) f++;
      if (!(hitsShape(x, y, k) || hitsShape(x + 15, y - 8, k))) { if (s >= 5) m5++; if (s >= 4) m4++; if (s >= 3) m3++; }
    }
    res[k] = { tot, box: { n5, n4, n3 }, shape: { m5, m4, m3 }, fan: f };
  }
  /* Greedy packing: how many seeds of random sizes fit at once (fan on show, shape clear
     of text now and ahead), for a minimum spacing of 90 and of 70. */
  const pack = {};
  for (const sep of [90, 70]) {
    let sum = 0, mn = 99; const N = 120;
    for (let trial = 0; trial < N; trial++) {
      const placed = [];
      for (let i = 0; i < 5; i++) {
        const k = 0.93 * (0.8 + Math.random() * 0.45);
        let ok = false;
        for (let tries = 0; tries < 400 && !ok; tries++) {
          const x = 24 + Math.random() * (W - 48), y = 24 + Math.random() * (H - 48);
          if (hitsShape(x, y, k) || hitsShape(x + 15, y - 8, k) || !fanShown(x, y, k) || !fanShown(x + 15, y - 8, k)) continue;
          if (placed.some((o) => Math.hypot(o.x - x, o.y - y) < sep)) continue;
          placed.push({ x, y }); ok = true;
        }
      }
      sum += placed.length; mn = Math.min(mn, placed.length);
    }
    pack[sep] = { mean: +(sum / N).toFixed(2), min: mn };
  }
  res.pack = pack;
  return { W, H, text: text.length, cover: cover.map((c) => [c.l, c.t, c.r, c.b].map(Math.round)), res };
});
console.log('PAD', P, JSON.stringify(out.res));
}
await browser.close();
