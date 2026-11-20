/**
 * Stage 6 wave 2, task 13 (V11): the home hero's sun, cropped and enlarged so
 * the slit gaps can be counted by eye, plus the gap count from the pixels.
 *
 *   LABEL=after node scripts/themes/stage6/w2-t13-sunstripes.mjs [width] [scheme]   (BASE env picks the server)
 *
 * The horizon sits at 0.3 (portrait) or 0.32 of the canvas height from the
 * bottom (fx.ts), so the sun's column is sampled from the horizon upward; a
 * gap is a run of rows whose colour differs from the rows each side of it by
 * more than a small step in the blue channel (the sun's yellow, pink and
 * purple stripes against the sky's glow). Output under
 * scripts/themes/.out/stage6/w2/t13/shots (gitignored).
 */
import { chromium } from 'playwright';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const width = Number(process.argv[2] || 390);
const scheme = process.argv[3] || 'dark';
const BASE = process.env.BASE || process.env.SNAP_BASE || 'http://127.0.0.1:4470';
const LABEL = process.env.LABEL || 'after';
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', '.out', 'stage6', 'w2', 't13', 'shots');
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--enable-gpu-rasterization', '--ignore-gpu-blocklist'] });
const mobile = width < 900;
const ctx = await browser.newContext({ viewport: { width, height: width < 700 ? 844 : 1180 }, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile, colorScheme: scheme, reducedMotion: 'no-preference' });
await suppressPrompt(ctx);
await ctx.addInitScript((s) => { try { localStorage.setItem('scheme', s); } catch {} }, scheme);
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
await page.goto(`${BASE}/t/vaporwave/`, { waitUntil: 'networkidle' });
await page.addStyleTag({ content: 'bdl-switcher{display:none!important}' });
// Hide the palms and the scanlines so only the sky, the sun and the floor are measured.
await page.addStyleTag({ content: '.hero .palm, .hero .vw-scan, .hero::after, .hero-title, .osd { display: none !important; }' });
await page.waitForTimeout(1500);
const box = await page.locator('.hero').boundingBox();
const shot = await page.screenshot({ clip: { x: 0, y: box.y, width: box.width, height: box.height } });
const img = await loadImage(shot);
const c = createCanvas(img.width, img.height);
const g = c.getContext('2d');
g.drawImage(img, 0, 0);
const x = Math.round(img.width / 2);
const H = img.height;
const horizon = Math.round(H * (1 - (box.width / box.height < 1 ? 0.3 : 0.32)));
const col = [];
for (let y = 0; y < H; y++) { const d = g.getImageData(x, y, 1, 1).data; col.push([d[0], d[1], d[2]]); }
// Sun rows: from the top of the yellow (R and G both over 200 and B under 200) down to the horizon.
let top = -1;
for (let y = 0; y < horizon; y++) if (col[y][0] > 200 && col[y][1] > 190 && col[y][2] < 200) { top = y; break; }
// Gaps: a row that differs from the row 3 above it AND the row 3 below it in the same direction by more than 14 in G.
let gaps = 0, inGap = false;
for (let y = top + 3; y < horizon - 3; y++) {
  const dip = col[y - 3][1] - col[y][1] > 14 && col[y + 3][1] - col[y][1] > 14;
  if (dip && !inGap) { gaps++; inGap = true; } else if (!dip) inGap = false;
}
console.log(`sunstripes ${LABEL} ${scheme} ${width}: horizon row ${horizon}, sun top ${top}, sun height ${horizon - top}px, gap runs (dip in G) ${gaps}`);
// The enlarged crop of the sun's column band.
const cropX = Math.max(0, x - 140), cropW = Math.min(280, img.width - cropX), cropY = Math.max(0, top - 10), cropH = horizon - cropY + 30;
const out = createCanvas(cropW * 3, cropH * 3);
const og = out.getContext('2d'); og.imageSmoothingEnabled = false;
og.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW * 3, cropH * 3);
await writeFile(join(OUT, `sunstripes-${LABEL}-${scheme}-${width}.png`), await out.encode('png'));
await browser.close();
