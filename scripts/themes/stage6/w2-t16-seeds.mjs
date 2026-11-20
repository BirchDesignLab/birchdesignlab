/**
 * Stage 6 wave 2, task 16 (CC3): the light seeds after a page change, at 1440 and 390.
 * Home, then the in-school nav to About (and Contact at 390): a timestamped strip of whole-viewport
 * frames after the swap (+0.4, 1, 2, 3.5, 5 s) and the seeds' blob positions at each, with how many sit
 * in the 70px under the header, within 24px of a side edge, or cut by an edge.
 *   BASE=http://127.0.0.1:4470 node scripts/themes/stage6/w2-t16-seeds.mjs <outDir> <tag>
 */
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const BASE = (process.env.BASE || 'http://127.0.0.1:4470').replace(/\/$/, '');
const [OUT, TAG = 'run'] = process.argv.slice(2);
if (!OUT) throw new Error('usage: w2-t16-seeds.mjs <outDir> <tag>');
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const BLOBS = () => {
  const cv = document.querySelector('[data-cc-motes]');
  const g = cv.getContext('2d');
  const W = cv.width, H = cv.height, k = W / innerWidth;
  const d = g.getImageData(0, 0, W, H).data;
  const C = 6, cw = Math.ceil(W / C), ch = Math.ceil(H / C);
  const cell = new Uint16Array(cw * ch);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 70) cell[((y / C) | 0) * cw + ((x / C) | 0)]++;
  const seen = new Uint8Array(cw * ch), out = [];
  for (let i = 0; i < cell.length; i++) {
    if (!cell[i] || seen[i]) continue;
    const st = [i]; seen[i] = 1; let n = 0, mnx = 1e9, mxx = -1, mny = 1e9, mxy = -1, px = 0;
    while (st.length) {
      const j = st.pop(), x = j % cw, y = (j / cw) | 0; n++; px += cell[j];
      mnx = Math.min(mnx, x); mxx = Math.max(mxx, x); mny = Math.min(mny, y); mxy = Math.max(mxy, y);
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= cw || yy >= ch) continue;
        const q = yy * cw + xx; if (cell[q] && !seen[q]) { seen[q] = 1; st.push(q); }
      }
    }
    if (px < 12) continue;
    out.push({ l: Math.round(mnx * C / k), r: Math.round((mxx + 1) * C / k), t: Math.round(mny * C / k), b: Math.round((mxy + 1) * C / k) });
  }
  return out;
};
const R = [];
for (const w of [1440, 390]) {
  const mobile = w < 700;
  const ctx = await browser.newContext({ viewport: { width: w, height: mobile ? 844 : 900 }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile, colorScheme: 'light', reducedMotion: 'no-preference' });
  await suppressPrompt(ctx);
  await ctx.addInitScript(() => { try { localStorage.setItem('scheme', 'light'); } catch {} });
  await ctx.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
  await page.goto(`${BASE}/t/cottagecore/`, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: 'bdl-switcher{display:none!important}' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(2500);
  for (const dest of mobile ? ['about', 'contact'] : ['about', 'services']) {
    const link = page.locator(`.cc-chrome nav a[href*="/${dest}"]`).first();
    await link.click();
    const t0 = Date.now();
    const frames = [];
    for (const at of [400, 1000, 2000, 3500, 5000]) {
      await page.waitForTimeout(Math.max(0, at - (Date.now() - t0)));
      const blobs = await page.evaluate(BLOBS);
      frames.push({ ms: Date.now() - t0, blobs, buf: await page.screenshot() });
    }
    const sc = mobile ? 0.5 : 0.28;
    const iw = Math.round(w * (mobile ? 2 : 1) * sc), ih = Math.round((mobile ? 844 * 2 : 900) * sc);
    const c = createCanvas(frames.length * (iw + 8), ih + 22);
    const g = c.getContext('2d');
    g.fillStyle = '#444'; g.fillRect(0, 0, c.width, c.height);
    for (const [k, f] of frames.entries()) {
      g.drawImage(await loadImage(f.buf), k * (iw + 8), 22, iw, ih);
      g.fillStyle = '#fff'; g.font = '14px sans-serif'; g.fillText(`+${f.ms} ms (${f.blobs.length} seeds)`, k * (iw + 8) + 4, 15);
    }
    await writeFile(join(OUT, `${TAG}-seeds-${dest}-${w}.png`), c.toBuffer('image/png'));
    const sum = frames.map((f) => ({
      ms: f.ms, seeds: f.blobs.length,
      strip: f.blobs.filter((b) => b.t < 70 && b.b < 130).length,
      sideEdge: f.blobs.filter((b) => b.l < 24 || b.r > w - 24).length,
      cutByEdge: f.blobs.filter((b) => b.l <= 1 || b.r >= w - 1 || b.t <= 1 || b.b >= (mobile ? 844 : 900) - 1).length,
    }));
    R.push({ w, dest, sum });
    console.log(w, dest, JSON.stringify(sum.map((s) => [s.ms, s.seeds, s.strip, s.sideEdge, s.cutByEdge])));
    await page.goBack({ waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForTimeout(2000);
  }
  await ctx.close();
}
await writeFile(join(OUT, `${TAG}-seeds.json`), JSON.stringify(R, null, 2));
await browser.close();
