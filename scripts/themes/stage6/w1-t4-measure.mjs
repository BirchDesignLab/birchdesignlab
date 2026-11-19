/**
 * Stage 6 wave 1, task 4 (swiss: poster scale, optical flush-left, width dial):
 * geometry probe. Measures, per viewport, Home's billboard (each word's ink
 * extent from pixels, the h1 box, the lede, where the doors section starts)
 * and Services' numerals (box left, ink left from pixels, the title's left).
 * Optional CSS can be injected to try numbers before they are committed.
 *
 *   BASE=http://127.0.0.1:4470 node scripts/themes/stage6/w1-t4-measure.mjs
 *   BASE=... CSS="..." node ...      try a rule without editing the theme
 *   BASE=... OUT=name node ...       write scripts/themes/.out/stage6/w1/t4/<name>.json
 *
 * Ink is found by scanning a screenshot of the element for the first and last
 * column holding a pixel that differs from the paper by more than half the
 * ink-to-paper range, so it is what a visitor sees, not a font metric.
 * prefers-reduced-transparency is forced to no-preference (CDP) as capture.mjs
 * does; the portal switcher is hidden so it cannot cover the fold.
 */
import { chromium } from 'playwright';
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUTDIR = join(HERE, '..', '.out', 'stage6', 'w1', 't4');
mkdirSync(OUTDIR, { recursive: true });
const BASE = process.env.BASE || process.env.SNAP_BASE || 'http://127.0.0.1:4470';
const EXTRA = process.env.CSS || '';
const VPS = [
  { name: '1920', width: 1920, height: 1080 },
  { name: '1440', width: 1440, height: 900 },
  { name: '1280', width: 1280, height: 800 },
  { name: '1024', width: 1024, height: 768 },
  { name: '820', width: 820, height: 1180, mobile: true },
  { name: '640', width: 640, height: 960, mobile: true },
  { name: '390', width: 390, height: 844, mobile: true },
  { name: '360', width: 360, height: 740, mobile: true },
];

/** First and last inked column (and top and bottom row) of a PNG buffer. */
async function inkBox(buf, scale) {
  const { data, info } = await sharp(buf).greyscale().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  let min = 255, max = 0, sum = 0;
  for (let i = 0; i < data.length; i++) { if (data[i] < min) min = data[i]; if (data[i] > max) max = data[i]; sum += data[i]; }
  const cut = (min + max) / 2;
  // Ink is the minority tone: dark on paper, or light on a black or red field.
  const lightInk = sum / data.length < cut;
  let l = w, r = -1, t = h, b = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (lightInk ? data[y * w + x] > cut : data[y * w + x] < cut) { if (x < l) l = x; if (x > r) r = x; if (y < t) t = y; if (y > b) b = y; }
  }
  return r < 0 ? null : { l: l / scale, r: (r + 1) / scale, t: t / scale, b: (b + 1) / scale };
}

const browser = await chromium.launch({ args: ['--hide-scrollbars', '--font-render-hinting=none', '--disable-lcd-text', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const results = {};
for (const vp of VPS) {
  const dpr = 2;
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: dpr, isMobile: !!vp.mobile, hasTouch: !!vp.mobile, colorScheme: 'light', reducedMotion: 'no-preference' });
  await suppressPrompt(ctx);
  await ctx.addInitScript(() => { try { localStorage.setItem('scheme', 'light'); sessionStorage.setItem('bdl-swiss-dial-hint', '1'); } catch {} });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
  await page.goto(`${BASE}/t/swiss/`, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: `bdl-switcher{display:none!important}${EXTRA}` });
  await page.evaluate(() => document.fonts.ready);
  const geo = await page.evaluate(() => {
    const h1 = document.querySelector('.billboard');
    const hero = h1.closest('.hero');
    const rect = (el) => { const b = el.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top + scrollY, b: b.bottom + scrollY, w: b.width, h: b.height }; };
    return {
      vw: innerWidth, scrollW: document.documentElement.scrollWidth, fontSize: parseFloat(getComputedStyle(h1).fontSize),
      stretch: getComputedStyle(h1.querySelector('.ln:nth-child(1)')).fontStretch,
      frame: rect(hero), h1: rect(h1), lede: rect(hero.querySelector('.lead')), subline: rect(hero.querySelector('.subline')),
      hero: rect(hero), doors: rect(document.querySelector('.doors')),
      lines: [...h1.querySelectorAll('.ln')].map((l) => ({ word: l.textContent, ...rect(l) })),
    };
  });
  // Ink per word, from pixels (the lede and the dial hidden so only the billboard is counted).
  await page.addStyleTag({ content: '.lede,.lead,.subline,.dial{visibility:hidden!important}' });
  const words = [];
  for (let i = 0; i < geo.lines.length; i++) {
    const ln = geo.lines[i];
    await page.evaluate(() => scrollTo(0, 0));
    const buf = await page.screenshot({ clip: { x: 0, y: ln.t, width: vp.width, height: ln.h }, fullPage: true });
    words.push({ word: ln.word, ink: await inkBox(buf, dpr) });
  }
  geo.ink = words;
  geo.flush = words.map((w) => ({ word: w.word, offsetFromFrame: w.ink ? +(w.ink.l - geo.frame.l).toFixed(2) : null }));
  results[`home-${vp.name}`] = geo;
  await ctx.close();
}

// Services numerals at desktop and tablet and phone.
for (const vp of VPS.filter((v) => ['1440', '1024', '820', '390'].includes(v.name))) {
  const dpr = 3;
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: dpr, isMobile: !!vp.mobile, hasTouch: !!vp.mobile, colorScheme: 'light', reducedMotion: 'no-preference' });
  await suppressPrompt(ctx);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/t/swiss/services/`, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: `bdl-switcher{display:none!important}${EXTRA}` });
  await page.evaluate(() => document.fonts.ready);
  const nums = await page.evaluate(() => [...document.querySelectorAll('.num')].map((n) => {
    n.scrollIntoView({ block: 'center' });
    const b = n.getBoundingClientRect();
    const t = n.parentElement.querySelector('.step-title').getBoundingClientRect();
    const step = n.parentElement.getBoundingClientRect();
    return { n: n.textContent, fontSize: getComputedStyle(n).fontSize, boxLeft: b.left, boxTop: b.top + scrollY, boxH: b.height, titleLeft: t.left, stepL: step.left, stepW: step.width };
  }));
  const els = page.locator('.num');
  for (let i = 0; i < nums.length; i++) {
    const n = nums[i];
    // An element shot, so the page's scroll and the phone emulation cannot move the clip.
    const buf = await els.nth(i).screenshot();
    const ink = await inkBox(buf, dpr);
    const box = await page.evaluate((i) => document.querySelectorAll('.num')[i].getBoundingClientRect().left, i);
    n.inkLeft = ink ? +(box + ink.l).toFixed(2) : null;
    n.inkOffsetFromTitle = ink ? +(box + ink.l - n.titleLeft).toFixed(2) : null;
  }
  results[`services-${vp.name}`] = nums;
  await ctx.close();
}
// Every page's giant: where its ink starts against the frame's left edge.
for (const vp of VPS.filter((v) => ['1440', '820', '390'].includes(v.name))) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 3, isMobile: !!vp.mobile, hasTouch: !!vp.mobile, colorScheme: 'light', reducedMotion: 'no-preference' });
  await suppressPrompt(ctx);
  const out = {};
  for (const path of ['about', 'services', 'contact', 'contact/sent']) {
    const page = await ctx.newPage();
    await page.goto(`${BASE}/t/swiss/${path}/`, { waitUntil: 'networkidle' });
    await page.addStyleTag({ content: 'bdl-switcher{display:none!important}' });
    await page.evaluate(() => document.fonts.ready);
    const h1 = page.locator('h1.sw-display').first();
    const g = await page.evaluate(() => { const h = document.querySelector('h1.sw-display'); const hero = h.closest('.sw-row'); return { box: h.getBoundingClientRect().left, frame: hero.getBoundingClientRect().left, fs: parseFloat(getComputedStyle(h).fontSize), text: h.textContent.slice(0, 14) }; });
    const ink = await inkBox(await h1.screenshot(), 3);
    out[path] = { text: g.text, fs: +g.fs.toFixed(1), flush: ink ? +(g.box + ink.l - g.frame).toFixed(2) : null };
    await page.close();
  }
  results[`giants-${vp.name}`] = out;
  await ctx.close();
}
await browser.close();

const name = process.env.OUT || 'measure';
writeFileSync(join(OUTDIR, `${name}.json`), JSON.stringify(results, null, 2));
for (const [k, v] of Object.entries(results)) {
  if (k.startsWith('giants')) { console.log(k, JSON.stringify(v)); continue; }
  if (k.startsWith('services')) { console.log(k, v.map((n) => `${n.n}:${n.fontSize} ink-title ${n.inkOffsetFromTitle}`).join(' | ')); continue; }
  const lines = v.lines.map((l) => l.word).join('/');
  console.log(`${k}: fs ${v.fontSize.toFixed(1)} st ${v.stretch} scrollW ${v.scrollW}/${v.vw} h1 ${Math.round(v.h1.t)}-${Math.round(v.h1.b)} lede@${Math.round(v.lede.l)},${Math.round(v.lede.t)} sub ${Math.round(v.subline.b)} hero-b ${Math.round(v.hero.b)} doors-t ${Math.round(v.doors.t)}`);
  console.log('   ink', v.ink.map((w) => `${w.word} ${w.ink ? `${w.ink.l.toFixed(0)}-${w.ink.r.toFixed(0)}` : '-'}`).join(' | '), 'flush', v.flush.map((f) => f.offsetFromFrame).join(','), 'frame', Math.round(v.frame.l), Math.round(v.frame.r), lines);
}
