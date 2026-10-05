/* B2 task 5 r2 verifier probe: when and where a seed's ink lands on a line of text.
   For each fresh load, scans the seed canvas every ~70 ms from first paint, and for every sample with lit blocks
   (alpha >= 60, clearly visible) whose centre is inside an unpadded line box, records the time since navigation, the
   region and text of the line, and the lit area. Light scheme only (seeds are by day).
   Usage: BDL_GPU=1 node scripts/themes/snap.mjs --name s5-b2-t5-r2 --reuse --port 4462 -- node scripts/themes/cottagecore/b2-t5-r2-ontext.mjs
   Env: LOADS (default 12), WATCH seconds (default 12). Writes scripts/themes/.out/stage5/b2/s5-b2-t5/v-r2/ontext.json. */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const base = (process.env.SNAP_BASE || 'http://127.0.0.1:4462').replace(/\/$/, '');
const OUT = join('scripts', 'themes', '.out', 'stage5', 'b2', 's5-b2-t5', 'v-r2');
await mkdir(OUT, { recursive: true });
const LOADS = Number(process.env.LOADS || 12);
const WATCH = Number(process.env.WATCH || 12);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ALL = [
  { name: 'home', path: '', w: 1440, h: 900, dpr: 1 },
  { name: 'about', path: 'about/', w: 1440, h: 900, dpr: 1 },
  { name: 'home', path: '', w: 390, h: 844, dpr: 2, mobile: true },
  { name: 'about', path: 'about/', w: 390, h: 844, dpr: 2, mobile: true },
];
const only = (process.env.CASES || '').split(',').filter(Boolean);
const cases = ALL.filter((c) => !only.length || only.includes(c.name + '/' + c.w));
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const result = [];
for (const c of cases) {
  const rows = [];
  for (let i = 0; i < LOADS; i++) {
    const context = await browser.newContext({
      viewport: { width: c.w, height: c.h }, deviceScaleFactor: c.dpr, isMobile: !!c.mobile, hasTouch: !!c.mobile,
      colorScheme: 'light', reducedMotion: 'no-preference',
    });
    await suppressPrompt(context);
    await context.addInitScript(() => { try { localStorage.setItem('scheme', 'light'); } catch {} });
    await context.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
    const page = await context.newPage();
    await page.goto(`${base}/t/cottagecore/${c.path}`, { waitUntil: 'domcontentloaded' });
    await page.addStyleTag({ content: 'bdl-switcher{display:none!important}' });
    await page.waitForFunction(() => !!document.querySelector('[data-cc-motes]'));
    const hits = [];
    let maxShown = 0;
    for (;;) {
      const r = await page.evaluate(() => {
        const t = performance.now() / 1000;
        const cv = document.querySelector('[data-cc-motes]');
        const ctx = cv.getContext('2d');
        const W = cv.width, H = cv.height, k = W / innerWidth, step = 4;
        const d = ctx.getImageData(0, 0, W, H).data;
        const gw = Math.ceil(W / step), gh = Math.ceil(H / step);
        const peak = new Uint8Array(gw * gh);
        for (let y = 0; y < H; y++) { const gy = (y / step) | 0; for (let x = 0; x < W; x++) { const a = d[(y * W + x) * 4 + 3]; if (a) { const g = gy * gw + ((x / step) | 0); if (a > peak[g]) peak[g] = a; } } }
        const lines = [];
        const range = document.createRange();
        for (const region of document.querySelectorAll('header, main, footer')) {
          const w = document.createTreeWalker(region, NodeFilter.SHOW_TEXT);
          for (let n = w.nextNode(); n; n = w.nextNode()) {
            if (!n.nodeValue.trim()) continue;
            range.selectNodeContents(n);
            for (const q of range.getClientRects()) if (q.width > 1 && q.height > 1) lines.push({ r: [q.left, q.top, q.right, q.bottom], region: region.tagName, tag: n.parentElement.tagName, text: n.nodeValue.trim().slice(0, 40) });
          }
        }
        const cell = (step * step) / (k * k);
        const found = new Map();
        let strongArea = 0;
        for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
          const p = peak[y * gw + x];
          if (p < 60) continue;
          const cx = ((x + 0.5) * step) / k, cy = ((y + 0.5) * step) / k;
          for (const L of lines) if (cx >= L.r[0] && cx <= L.r[2] && cy >= L.r[1] && cy <= L.r[3]) {
            const key = `${L.region}/${L.tag}/${L.text}`;
            const o = found.get(key) || { key, area: 0, at: [Math.round(cx), Math.round(cy)], peak: 0 };
            o.area += cell; if (p > o.peak) o.peak = p; found.set(key, o); strongArea += cell; break;
          }
        }
        return { t, strongArea: Math.round(strongArea), found: [...found.values()].map((o) => ({ ...o, area: Math.round(o.area) })), scrollY: scrollY };
      });
      if (r.t > WATCH) break;
      if (r.strongArea > 0) {
        hits.push({ t: +r.t.toFixed(2), area: r.strongArea, found: r.found });
        if (hits.length === 1) {
          const at = r.found[0].at;
          const clip = { x: Math.max(0, Math.min(c.w - 300, at[0] - 150)), y: Math.max(0, at[1] - 90), width: 300, height: 180 };
          await page.screenshot({ path: join(OUT, 'ontext-' + c.name + '-' + c.w + '-load' + (i + 1) + '.png'), clip, scale: 'css' });
        }
      }
      await sleep(60);
    }
    rows.push({ load: i + 1, samplesWithStrongText: hits.length, firstT: hits[0]?.t ?? null, lastT: hits.at(-1)?.t ?? null, maxArea: Math.max(0, ...hits.map((h) => h.area)), hits: hits.slice(0, 6) });
    await context.close();
  }
  result.push({ case: `${c.name}/${c.w}`, rows });
  console.log('ontext', c.name, c.w, JSON.stringify(rows.map((r) => [r.load, r.samplesWithStrongText, r.firstT, r.lastT, r.maxArea])));
}
await writeFile(join(OUT, 'ontext.json'), JSON.stringify(result, null, 2));
await browser.close();
console.log('done ontext');
