/**
 * Stage 6 wave 2, task 16 (CC3, fix 1): the light seeds after a page change, sampled for 12 s every 220 ms at
 * 1440 and 390 (About, Services, Contact): per page the mean seed count, the share of seeds in the strip under
 * the header, cut by the right edge or by a sheet, and the share of frames with none.
 *   BASE=http://127.0.0.1:4470 OUT=<dir> node scripts/themes/stage6/w2-t16-seedsmeasure.mjs <tag>
 */
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
const BASE = (process.env.BASE || 'http://127.0.0.1:4470').replace(/\/$/, '');
const OUT = process.env.OUT; const TAG = process.argv[2];
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--enable-gpu-rasterization', '--ignore-gpu-blocklist'] });
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
    const st = [i]; seen[i] = 1; let px = 0, mnx = 1e9, mxx = -1, mny = 1e9, mxy = -1;
    while (st.length) {
      const j = st.pop(), x = j % cw, y = (j / cw) | 0; px += cell[j];
      mnx = Math.min(mnx, x); mxx = Math.max(mxx, x); mny = Math.min(mny, y); mxy = Math.max(mxy, y);
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= cw || yy >= ch) continue;
        const q = yy * cw + xx; if (cell[q] && !seen[q]) { seen[q] = 1; st.push(q); }
      }
    }
    if (px < 12) continue;
    out.push({ l: Math.round(mnx * C / k), r: Math.round((mxx + 1) * C / k), t: Math.round(mny * C / k), b: Math.round((mxy + 1) * C / k) });
  }
  const hdr = document.querySelector('header').getBoundingClientRect();
  const sheets = [...document.querySelectorAll('.cc-paper, .cc-torn, .cc-gingham')].map((e) => e.getBoundingClientRect()).filter((r) => r.bottom > 0 && r.top >= hdr.bottom - 5 && r.top < innerHeight && r.width > 120);
  const topSheet = sheets.length ? Math.min(...sheets.map((r) => r.top)) : innerHeight;
  return { blobs: out, hdrBottom: hdr.bottom, topSheet, W: innerWidth, H: innerHeight };
};
const R = [];
for (const [w, dests] of [[1440, ['about', 'services', 'contact']], [390, ['about', 'contact', 'services']]]) {
  const mobile = w < 700;
  const ctx = await browser.newContext({ viewport: { width: w, height: mobile ? 844 : 900 }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile, colorScheme: 'light', reducedMotion: 'no-preference' });
  await ctx.addInitScript(() => { try { sessionStorage.setItem('bdl-portal-prompt', 'dismissed'); localStorage.setItem('scheme', 'light'); } catch {} });
  await ctx.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
  await page.goto(`${BASE}/t/cottagecore/`, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: 'bdl-switcher{display:none!important}' });
  await page.waitForTimeout(2500);
  for (const dest of dests) {
    await page.locator(`.cc-chrome nav a[href*="/${dest}"]`).first().click();
    await page.waitForLoadState('load');
    const t0 = Date.now();
    const frames = [];
    while (Date.now() - t0 < 12000) {
      await page.waitForTimeout(220);
      const r = await page.evaluate(BLOBS);
      frames.push({ ms: Date.now() - t0, ...r });
    }
    const stat = { w, dest, frames: frames.length, seedsMean: 0, inBandPct: 0, cutRightPct: 0, cutSheetPct: 0, anyStripFrames: 0, anyCutRightFrames: 0, zeroSeedFrames: 0 };
    let tot = 0, band = 0, cutR = 0, cutS = 0;
    for (const f of frames) {
      let b = 0, cr = 0;
      for (const s of f.blobs) {
        tot++;
        // in the band: whole seed above the first sheet and below/at the header's bottom edge region (not over the header row)
        const inBand = s.t >= f.hdrBottom - 20 && s.b <= f.topSheet + 4 && (f.topSheet - f.hdrBottom) < 140;
        if (inBand) { band++; b++; }
        if (s.r >= f.W - 2 && s.l < f.W - 2) { cutR++; cr++; }
        if (s.t < f.topSheet && s.b > f.topSheet + 6 && s.l > 0) cutS++;
      }
      if (b) stat.anyStripFrames++;
      if (cr) stat.anyCutRightFrames++;
      if (!f.blobs.length) stat.zeroSeedFrames++;
    }
    stat.seedsMean = +(tot / frames.length).toFixed(2);
    stat.inBandPct = +(100 * band / Math.max(1, tot)).toFixed(0);
    stat.cutRightPct = +(100 * cutR / Math.max(1, tot)).toFixed(0);
    stat.stripFramesPct = +(100 * stat.anyStripFrames / frames.length).toFixed(0);
    stat.cutRightFramesPct = +(100 * stat.anyCutRightFrames / frames.length).toFixed(0);
    stat.zeroSeedFramesPct = +(100 * stat.zeroSeedFrames / frames.length).toFixed(0);
    stat.band = [Math.round(frames[0].hdrBottom), Math.round(frames[frames.length - 1].topSheet)];
    R.push(stat);
    console.log(JSON.stringify(stat));
    await page.goBack({ waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForTimeout(2000);
  }
  await ctx.close();
}
await writeFile(join(OUT, `seedsmeasure-${TAG}.json`), JSON.stringify(R, null, 1));
await browser.close();
