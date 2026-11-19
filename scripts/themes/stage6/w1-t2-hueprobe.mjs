/**
 * Stage 6 wave 1, task 2, fix round 1 (film finding palette-hue-light):
 * a fast probe of the light pane-vs-behind hue gap, the same statistic
 * w1-t2-evidence.mjs records (chroma-weighted circular mean hue of each
 * pane's inner box, shown vs hidden), for one page at the scroll offsets
 * given, with optional CSS injected so variants can be compared without a
 * rebuild. Also splits each box into a pixel histogram of hue bands so a
 * mean that sits between blue and warm can be told apart from real mauve.
 *
 *   node scripts/themes/snap.mjs --name s6-w1-t2-fix1 --reuse --port 4470 -- \
 *     node scripts/themes/stage6/w1-t2-hueprobe.mjs about/ 900,1800
 *   CSS='...' node ...   (injected after load)
 */
import { chromium } from 'playwright';
import sharp from 'sharp';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const base = process.env.SNAP_BASE || 'http://127.0.0.1:4470';
const path = process.argv[2] ?? 'about/';
const scrolls = (process.argv[3] ?? '0,900,1800').split(',').map(Number);
const CSS = process.env.CSS || '';
/* The evidence script's own text hide, plus (TEXT=transparent) the text
   that is a pane's own text node (About's .manifesto is the pane itself). */
const HIDE_TEXT = `[data-theme='glassmorphism'] :is(.glass, .glass-strong) > * { visibility: hidden !important; }` +
  (process.env.TEXT === 'transparent' ? `[data-theme='glassmorphism'] :is(.glass, .glass-strong) { color: transparent !important; }` : '');

const browser = await chromium.launch({ headless: true, args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--enable-gpu-rasterization', '--ignore-gpu-blocklist'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light', reducedMotion: 'reduce' });
await context.addInitScript(() => { try { localStorage.setItem('scheme', 'light'); } catch {} });
await suppressPrompt(context);
await context.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
const page = await context.newPage();
const cdp = await context.newCDPSession(page);
await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
const renderer = await page.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl'); return gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL); });
if (/swiftshader|llvmpipe|software/i.test(renderer)) throw new Error('software renderer');
console.log('renderer:', renderer);
await page.goto(`${base}/t/glassmorphism/${path}`, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.addStyleTag({ content: HIDE_TEXT });
if (CSS) await page.addStyleTag({ content: CSS });
await page.waitForTimeout(1200);

async function grab(r) {
  const buf = await page.screenshot({ clip: { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.w), height: Math.round(r.h) } });
  return sharp(buf).removeAlpha().raw().toBuffer({ resolveWithObject: true });
}
function stats({ data }) {
  let sx = 0, sy = 0, sc = 0, n = 0;
  const bands = { blue: 0, mauve: 0, warm: 0, grey: 0 };
  for (let i = 0; i < data.length; i += 3) {
    const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), c = mx - mn;
    n++;
    if (c < 0.06) { bands.grey++; if (c < 1e-6) continue; }
    let h;
    if (mx === r) h = ((g - b) / c) % 6; else if (mx === g) h = (b - r) / c + 2; else h = (r - g) / c + 4;
    h *= 60; if (h < 0) h += 360;
    if (c >= 0.06) { if (h >= 255 && h < 345) bands.mauve++; else if (h >= 180 && h < 255) bands.blue++; else bands.warm++; }
    sx += c * Math.cos((h * Math.PI) / 180); sy += c * Math.sin((h * Math.PI) / 180); sc += c;
  }
  let deg = (Math.atan2(sy, sx) * 180) / Math.PI; if (deg < 0) deg += 360;
  const pct = (k) => Math.round((bands[k] / n) * 100);
  return { hue: +deg.toFixed(1), chroma: +(sc / n).toFixed(3), R: +(Math.hypot(sx, sy) / (sc || 1)).toFixed(2), bands: `b${pct('blue')} m${pct('mauve')} w${pct('warm')} g${pct('grey')}` };
}

for (const y of scrolls) {
  await page.evaluate((y) => scrollTo(0, y), y);
  await page.waitForTimeout(400);
  const n = await page.evaluate(() => document.querySelectorAll('main .glass, main .surface-solid.settings-pane').length);
  for (let i = 0; i < n; i++) {
    const info = await page.evaluate((i) => {
      const el = document.querySelectorAll('main .glass, main .surface-solid.settings-pane')[i];
      el.dataset.t2probe = String(i);
      const r = el.getBoundingClientRect();
      const x = Math.max(0, r.left + 24), yy = Math.max(0, r.top + 24);
      const w = Math.min(innerWidth, r.right - 24) - x, h = Math.min(innerHeight, r.bottom - 24) - yy;
      return { cls: el.className.replace(/astro-\w+/g, '').trim(), box: w > 40 && h > 40 ? { x, y: yy, w, h } : null };
    }, i);
    if (!info.box) continue;
    const s = stats(await grab(info.box));
    await page.evaluate((i) => { document.querySelector(`[data-t2probe="${i}"]`).style.visibility = 'hidden'; }, i);
    await page.waitForTimeout(200);
    const o = stats(await grab(info.box));
    await page.evaluate((i) => { document.querySelector(`[data-t2probe="${i}"]`).style.visibility = ''; }, i);
    let gap = Math.abs(s.hue - o.hue); if (gap > 180) gap = 360 - gap;
    console.log(`${y}\t${info.cls.split(' ')[0]}\tpane ${s.hue}/${s.chroma} R${s.R} [${s.bands}]\tbehind ${o.hue}/${o.chroma} R${o.R} [${o.bands}]\tgap ${gap.toFixed(1)}`);
  }
}
await browser.close();
