/**
 * Stage 6 swiss critic: width-dial geometry probe (read-only).
 * Serves via snap.mjs (SNAP_BASE). For each viewport, measures the Home
 * billboard's "Design" line at font-stretch 62/75/85/100/112.5/125, the frame,
 * the viewport, the lede box (desktop collision check), scroll width (sideways
 * scroll check), h1 height (reflow check), and the optical offset of the
 * billboard's "B" and the Services "1" ink from their column line.
 * Shots of the hero at the extremes go to .out/stage6-critic-swiss/.
 *
 *   node scripts/themes/snap.mjs --name stage6-base --reuse --port 4464 -- node scripts/themes/stage6/critic-swiss-dial.mjs
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', '.out', 'stage6-critic-swiss');
mkdirSync(OUT, { recursive: true });
const BASE = process.env.SNAP_BASE || 'http://127.0.0.1:4464';
const VPS = {
  'desktop-1920': { width: 1920, height: 1080 },
  'desktop-1440': { width: 1440, height: 900 },
  'desktop-1024': { width: 1024, height: 768 },
  'tablet-820': { width: 820, height: 1180, mobile: true },
  'tablet-640': { width: 640, height: 960, mobile: true },
  'mobile-390': { width: 390, height: 844, mobile: true },
  'mobile-360': { width: 360, height: 740, mobile: true },
};
const STRETCH = [62, 75, 85, 100, 112.5, 125];

const browser = await chromium.launch({
  args: ['--hide-scrollbars', '--font-render-hinting=none', '--disable-lcd-text',
    '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'],
});
const results = {};
for (const [name, vp] of Object.entries(VPS)) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.mobile ? 2 : 1,
    isMobile: !!vp.mobile, hasTouch: !!vp.mobile, colorScheme: 'light', reducedMotion: 'reduce',
  });
  await ctx.addInitScript(() => { try { localStorage.setItem('scheme', 'light'); } catch {} });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/t/swiss/`, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: 'bdl-switcher{display:none!important}' });
  await page.evaluate(() => document.fonts.ready);
  const r = await page.evaluate((STRETCH) => {
    const h1 = document.querySelector('.billboard');
    const lns = [...h1.querySelectorAll('.ln')];
    const design = lns.find((l) => l.textContent === 'Design');
    const hero = h1.closest('.hero');
    const lede = hero.querySelector('.lede') || hero.querySelector('.lead');
    const cs = getComputedStyle(h1);
    const range = document.createRange();
    const ink = (el) => { range.selectNodeContents(el); const b = range.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom, w: b.width }; };
    const rowBox = hero.getBoundingClientRect();
    const out = {
      vw: innerWidth, fontSize: parseFloat(cs.fontSize), restStretch: getComputedStyle(design).fontStretch,
      frame: { l: rowBox.left, r: rowBox.right, w: rowBox.width },
      h1: (() => { const b = h1.getBoundingClientRect(); return { t: b.top + scrollY, h: b.height }; })(),
      lines: lns.map((l) => ({ word: l.textContent, ...ink(l) })),
      lede: lede ? (() => { const b = (hero.querySelector('.lead') || lede).getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom }; })() : null,
      perStretch: [],
    };
    for (const s of STRETCH) {
      design.style.fontStretch = `${s}%`;
      const d = ink(design);
      out.perStretch.push({ s, w: Math.round(d.w * 10) / 10, right: Math.round(d.r), pastFrame: Math.round(d.r - rowBox.right), pastViewport: Math.round(d.r - innerWidth), h1h: h1.getBoundingClientRect().height, scrollW: document.documentElement.scrollWidth });
    }
    design.style.fontStretch = '';
    return out;
  }, STRETCH);
  // Optical offset: first inked column of the "B" vs the frame's left edge, from pixels.
  const hb = await page.locator('.billboard').boundingBox();
  for (const s of [62, 100, 125]) {
    await page.evaluate((s) => { const d = [...document.querySelectorAll('.billboard .ln')].find((l) => l.textContent === 'Design'); d.style.fontStretch = `${s}%`; }, s);
    await page.screenshot({ path: join(OUT, `dial-${name}-${s}.png`), clip: { x: 0, y: Math.max(0, hb.y - 40), width: vp.width, height: Math.min(hb.height + 260, 1400) } });
  }
  await page.evaluate(() => { const d = [...document.querySelectorAll('.billboard .ln')].find((l) => l.textContent === 'Design'); d.style.fontStretch = ''; });
  const inkLeft = await page.evaluate(async () => {
    // Render the B and the services numeral 1 offsets via canvas measureText.
    const h1 = document.querySelector('.billboard');
    const cs = getComputedStyle(h1);
    const c = document.createElement('canvas').getContext('2d');
    c.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const m = c.measureText('B');
    const D = c.measureText('D'); const L = c.measureText('L');
    return { B_lsb_px: -m.actualBoundingBoxLeft, D_lsb_px: -D.actualBoundingBoxLeft, L_lsb_px: -L.actualBoundingBoxLeft, fontSize: parseFloat(cs.fontSize) };
  });
  r.inkLeft = inkLeft;
  results[name] = r;
  await ctx.close();
}
// Services numeral 1 offset at desktop.
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light', reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/t/swiss/services/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  results.servicesNum = await page.evaluate(() => {
    const nums = [...document.querySelectorAll('.num')];
    const c = document.createElement('canvas').getContext('2d');
    return nums.map((n) => {
      const cs = getComputedStyle(n); c.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const m = c.measureText(n.textContent); const b = n.getBoundingClientRect();
      const title = n.parentElement.querySelector('.step-title').getBoundingClientRect();
      return { n: n.textContent, fontSize: cs.fontSize, boxLeft: Math.round(b.left), inkLeft: Math.round(b.left - m.actualBoundingBoxLeft), titleLeft: Math.round(title.left) };
    });
  });
  await ctx.close();
}
await browser.close();
writeFileSync(join(OUT, 'dial-geometry.json'), JSON.stringify(results, null, 2));
for (const [k, v] of Object.entries(results)) {
  if (k === 'servicesNum') { console.log('servicesNum', JSON.stringify(v)); continue; }
  console.log(`\n${k}: vw ${v.vw} fs ${v.fontSize} rest ${v.restStretch} frame ${Math.round(v.frame.l)}-${Math.round(v.frame.r)} h1 ${Math.round(v.h1.h)} lede ${v.lede ? `${Math.round(v.lede.l)},${Math.round(v.lede.t)}` : '-'} B lsb ${v.inkLeft.B_lsb_px.toFixed(1)} D ${v.inkLeft.D_lsb_px.toFixed(1)} L ${v.inkLeft.L_lsb_px.toFixed(1)}`);
  console.log('  lines', v.lines.map((l) => `${l.word} ${Math.round(l.l)}-${Math.round(l.r)} y${Math.round(l.t)}-${Math.round(l.b)}`).join(' | '));
  for (const p of v.perStretch) console.log(`  s${p.s}: w ${p.w} right ${p.right} pastFrame ${p.pastFrame} pastVp ${p.pastViewport} h1h ${Math.round(p.h1h)} scrollW ${p.scrollW}`);
}
