/**
 * B2 glass re-critic round 1 (09-26-26): are Home's real .orb elements still
 * visible after the fix round moved `.orbs[data-js-driven]` to z-index -2
 * (under main::before's wallpaper at -1)? Screenshots Home at 1440x900 and
 * 390x844, light and dark, three ways: as built; the lens canvas hidden; and
 * the lens hidden with the orbs forced back to z-index 0 (B1's value). Reports
 * the fraction of pixels that change when the orbs are restored, and what
 * elementsFromPoint returns at each orb centre. Also About (not js-driven) as
 * a control. GPU Chromium, reduced transparency forced off, prompt suppressed.
 * Usage: node scripts/themes/glassmorphism/b2r3-glass-critic1-orbs.mjs --base http://127.0.0.1:4477
 */
import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
// PROBE_OUT (added by glass-fix-r3): rerun into another seat's folder.
const OUT = process.env.PROBE_OUT || join(HERE, '..', '.out', 'stage3-b2', 'glass-recritic-r1');
const base = process.argv[process.argv.indexOf('--base') + 1] || 'http://127.0.0.1:4477';
const browser = await chromium.launch({ args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const R = {};
async function px(buf) { const im = await loadImage(buf); const c = createCanvas(im.width, im.height); const g = c.getContext('2d'); g.drawImage(im, 0, 0); return g.getImageData(0, 0, im.width, im.height).data; }
{
  const p = await browser.newPage();
  R.renderer = await p.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl'); return gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL); });
  await p.close();
  if (/swiftshader|llvmpipe/i.test(R.renderer)) throw new Error('software renderer');
}
const cells = [];
for (const [w, h, phone] of [[1440, 900, false], [390, 844, true]]) for (const scheme of ['light', 'dark']) {
  const context = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: phone, isMobile: phone, colorScheme: scheme });
  await suppressPrompt(context);
  await context.addInitScript((s) => { try { localStorage.setItem('bdl-scheme', s); } catch {} }, scheme);
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }, { name: 'prefers-color-scheme', value: scheme }] });
  for (const path of ['', 'about/']) {
    await page.goto(`${base}/t/glassmorphism/${path}`, { waitUntil: 'networkidle' });
    if ((await page.evaluate(() => document.documentElement.dataset.scheme)) !== scheme) await page.evaluate((s) => { document.documentElement.dataset.scheme = s; }, scheme);
    await page.waitForTimeout(1500);
    const asBuilt = await page.screenshot();
    await page.evaluate(() => { const c = document.querySelector('.lens-canvas'); if (c) c.style.visibility = 'hidden'; const s = document.querySelectorAll('.lens-shadow-rest, .lens-shadow-held'); s.forEach((e) => { e.style.visibility = 'hidden'; }); });
    await page.waitForTimeout(150);
    const noLens = await page.screenshot();
    const info = await page.evaluate(() => [...document.querySelectorAll('.orbs')].slice(0, 2).map((g) => ({ z: getComputedStyle(g).zIndex, js: g.hasAttribute('data-js-driven'), orbs: [...g.querySelectorAll('.orb')].map((o) => { const q = o.getBoundingClientRect(); const cx = q.left + q.width / 2, cy = q.top + q.height / 2; const inView = cx > 0 && cx < innerWidth && cy > 0 && cy < innerHeight; return { cls: o.className, r: Math.round(q.width / 2), c: [Math.round(cx), Math.round(cy)], inView, topAtCentre: inView ? document.elementsFromPoint(cx, cy).slice(0, 3).map((e) => e.tagName.toLowerCase() + '.' + [...e.classList].join('.')) : null }; }) })));
    await page.addStyleTag({ content: '[data-theme="glassmorphism"] .orbs { z-index: 0 !important; }' });
    await page.waitForTimeout(300);
    const restored = await page.screenshot();
    const a = await px(noLens), b = await px(restored);
    let changed = 0; for (let i = 0; i < a.length; i += 4) if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 30) changed++;
    const tag = `${path ? 'about' : 'home'}__${w}__${scheme}`;
    R[tag] = { groups: info, pctPixelsChangedWhenOrbsRestoredToZ0: +(changed / (a.length / 4) * 100).toFixed(2) };
    await writeFile(join(OUT, `orbs__${tag}__as-built.png`), asBuilt);
    await writeFile(join(OUT, `orbs__${tag}__z0-restored.png`), restored);
    if (!path) cells.push([`${w} ${scheme} as built`, asBuilt], [`${w} ${scheme} orbs z0 (B1 value)`, restored]);
  }
  await context.close();
}
await browser.close();
// sheet: desktop pair per row
const pairs = []; for (let i = 0; i < cells.length; i += 2) pairs.push([cells[i], cells[i + 1]]);
for (const [name, rows, scale] of [['sheet__orbs-hidden-desktop.jpg', pairs.slice(0, 2), 0.45], ['sheet__orbs-hidden-phone.jpg', [pairs[2].concat(pairs[3])], 0.6]]) {
  const imgs = await Promise.all(rows.map((r) => Promise.all(r.map(async ([l, b]) => [l, await loadImage(b)]))));
  const cw = Math.max(...imgs.flat().map(([, i]) => i.width)) * scale, ch = Math.max(...imgs.flat().map(([, i]) => i.height)) * scale;
  const cols = Math.max(...imgs.map((r) => r.length));
  const c = createCanvas(Math.round(10 + cols * (cw + 10)), Math.round(50 + imgs.length * (ch + 42)));
  const g = c.getContext('2d'); g.fillStyle = '#1c1c1c'; g.fillRect(0, 0, c.width, c.height); g.fillStyle = '#fff';
  g.font = 'bold 24px sans-serif'; g.fillText('Home: as built (fix round) vs the orbs put back at z-index 0', 10, 30); g.font = '22px sans-serif';
  imgs.forEach((r, ri) => r.forEach(([l, im], ci) => { const x = 10 + ci * (cw + 10), y = 50 + ri * (ch + 42); g.fillText(l, x, y + 24); g.drawImage(im, x, y + 32, im.width * scale, im.height * scale); }));
  await writeFile(join(OUT, name), c.toBuffer('image/jpeg', 92));
}
await writeFile(join(OUT, 'orbs-results.json'), JSON.stringify(R, null, 2));
console.log(JSON.stringify(R, null, 1));
