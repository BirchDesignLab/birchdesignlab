/* B2 task 5 r2 verifier probe: how long the first phone screen stays under two seeds.
   Dense scan (about every 100 ms, alpha >= 14, blob area >= 150 css px^2, as the film does) of the seed canvas on a
   fresh load, light scheme, 390 wide; reports the share of samples with fewer than 2 and with 0 seeds and the longest run.
   Usage: BDL_GPU=1 node scripts/themes/snap.mjs --name s5-b2-t5-r2 --reuse --port 4462 -- node scripts/themes/cottagecore/b2-t5-r2-floor.mjs
   Env: LOADS (default 4), WATCH seconds (default 30). Writes v-r2/floor.json beside the other r2 numbers. */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const base = (process.env.SNAP_BASE || 'http://127.0.0.1:4462').replace(/\/$/, '');
const OUT = join('scripts', 'themes', '.out', 'stage5', 'b2', 's5-b2-t5', 'v-r2');
await mkdir(OUT, { recursive: true });
const LOADS = Number(process.env.LOADS || 4);
const WATCH = Number(process.env.WATCH || 30);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const out = [];
for (const [name, path] of [['home', ''], ['about', 'about/']]) {
  for (let i = 0; i < LOADS; i++) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: 'light', reducedMotion: 'no-preference' });
    await suppressPrompt(context);
    await context.addInitScript(() => { try { localStorage.setItem('scheme', 'light'); } catch {} });
    await context.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
    const page = await context.newPage();
    await page.goto(`${base}/t/cottagecore/${path}`, { waitUntil: 'domcontentloaded' });
    await page.addStyleTag({ content: 'bdl-switcher{display:none!important}' });
    await page.waitForFunction(() => !!document.querySelector('[data-cc-motes]'));
    const rows = [];
    for (;;) {
      const r = await page.evaluate(() => {
        const t = performance.now() / 1000;
        const cv = document.querySelector('[data-cc-motes]');
        const ctx = cv.getContext('2d');
        const W = cv.width, H = cv.height, k = W / innerWidth, step = 4;
        const d = ctx.getImageData(0, 0, W, H).data;
        const gw = Math.ceil(W / step), gh = Math.ceil(H / step);
        const grid = new Uint8Array(gw * gh);
        for (let y = 0; y < H; y++) { const gy = (y / step) | 0; for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] >= 14) grid[gy * gw + ((x / step) | 0)] = 1; }
        const dil = new Uint8Array(gw * gh);
        for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) if (grid[y * gw + x])
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < gw && ny < gh) dil[ny * gw + nx] = 1; }
        const cell = (step * step) / (k * k);
        const seen = new Uint8Array(gw * gh);
        let blobs = 0;
        for (let s = 0; s < dil.length; s++) {
          if (!dil[s] || seen[s]) continue;
          const st = [s]; seen[s] = 1; let n = 0;
          while (st.length) {
            const j = st.pop(); const x = j % gw, y = (j - x) / gw;
            if (grid[j]) n++;
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue; const q = ny * gw + nx; if (dil[q] && !seen[q]) { seen[q] = 1; st.push(q); } }
          }
          if (n * cell >= 150) blobs++;
        }
        return { t, blobs };
      });
      if (r.t > WATCH) break;
      rows.push(r);
      await sleep(40);
    }
    const win = rows.filter((r) => r.t >= 1);
    const run = (pred) => { let best = 0, start = null, last = null; for (const r of win) { if (pred(r.blobs)) { if (start === null) start = r.t; last = r.t; best = Math.max(best, last - start); } else start = null; } return +best.toFixed(2); };
    const lt2 = win.filter((r) => r.blobs < 2).length;
    const zero = win.filter((r) => r.blobs === 0).length;
    const rec = { page: name, load: i + 1, samples: win.length, share_lt2: +(lt2 / win.length).toFixed(3), share_zero: +(zero / win.length).toFixed(3), longest_lt2_s: run((n) => n < 2), longest_zero_s: run((n) => n === 0), min: Math.min(...win.map((r) => r.blobs)), mean: +(win.reduce((a, r) => a + r.blobs, 0) / win.length).toFixed(2) };
    out.push(rec);
    console.log('floor', JSON.stringify(rec));
    await context.close();
  }
}
await writeFile(join(OUT, 'floor.json'), JSON.stringify(out, null, 2));
await browser.close();
console.log('done floor');
