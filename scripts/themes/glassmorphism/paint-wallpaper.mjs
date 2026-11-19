/**
 * Paint the glassmorphism wallpaper offline, once, to image files.
 *
 * Written 09-25-26 for Tier 3 stage 3, wave B1 (seat glass-1). Tier B's
 * architecture call (tier-b-plan.md, item 1; proofs/lens.md "For Tier B: one
 * wallpaper source"): the wallpaper is painted once, from one module, to a
 * bitmap. That bitmap is what src/themes/glassmorphism/theme.css's
 * main::before references (image-set, AVIF with a WebP fallback, both
 * imported through Vite's CSS url() pipeline so they land hashed under
 * /_astro/), and it is the one source the lens samples as its texture too
 * (lens/wallpaper-images.ts imports the same six files), so the lens can
 * never disagree with the page.
 *
 * Stage 6 wave 1, task 2 (glass R1 part 1, a1-critic-glassmorphism.md G2 and
 * G13): repainted. The B1 painting was a soft radial mesh, already a blur, so
 * a frosted pane had nothing to frost (pane and gutter measured the same
 * high-frequency detail) and coral alpha-blended into blue made mauve and
 * lavender midtones that belong to vaporwave. Now it is Big Sur's layered
 * waves: hard-edged bands, each a single hue family with its own light-to-
 * shadow gradient, a thin light line on every crest and a shadow band cast
 * on the layer behind it. Bands never blend across families, so there is no
 * mauve: coral meets blue only through a cream (light) or amber (dark) light
 * band or a crest line. Light is amber, coral and deep blue; dark keeps its
 * orange and blue.
 *
 * Six files: {light, dark} x {dawn, day, dusk}, the set the Control
 * Centre's time-of-day control and lens/wallpaper-images.ts already use.
 * Each is painted at 2560x1600 (covers a 2560px-wide viewport under
 * background-size: cover), with a light dither pass so the in-band
 * gradients do not band once encoded, then encoded through sharp as AVIF
 * (primary) and WebP (fallback).
 *
 * Usage: node scripts/themes/glassmorphism/paint-wallpaper.mjs
 * Output: src/themes/glassmorphism/wallpaper/<scheme>-<tod>.{avif,webp}
 */
import { createCanvas } from '@napi-rs/canvas';
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const OUT = join(REPO, 'src', 'themes', 'glassmorphism', 'wallpaper');

const W = 2560;
const H = 1600;

/** One wave layer: its top edge runs from y0 (fraction of H at the left
    edge) to y1 (at the right edge), so the bands sweep up to the right the
    way Big Sur's do, with two summed sines on top (amp a fraction of H, f
    cycles across the width, ph a phase). hi is the colour at the crest, lo
    the colour deeper in the band: both from one hue family. */
const wave = (y0, y1, amp, f, ph, hi, lo) => ({ y0, y1, amp, f, ph, hi, lo });

/** Layer stacks, back to front. Each palette names its sky (top, bottom),
    its crest line (the thin light on every edge), the shadow strength cast
    on the layer behind, and a gentle edge vignette. */
const GEOM = [
  [0.3, 0.1, 0.05, 1.1, 0.0],
  [0.42, 0.21, 0.045, 1.0, 0.8],
  [0.49, 0.3, 0.05, 0.9, 1.4],
  [0.62, 0.45, 0.05, 1.2, 2.1],
  [0.74, 0.6, 0.045, 1.0, 2.9],
  [0.85, 0.69, 0.04, 1.1, 3.6],
  [0.91, 0.75, 0.045, 0.9, 4.2],
];
function stack(colours) {
  return GEOM.map(([y0, y1, amp, f, ph], i) => wave(y0, y1, amp, f, ph, colours[i][0], colours[i][1]));
}

const PALETTES = {
  // Light: deep blue sky and back wave, a cream light band, coral, amber,
  // orange, a second cream band, then the deep-blue corner. Every hue is
  // blue (about 220-228) or warm (about 10-40); nothing between.
  'light-dawn': {
    sky: ['#5b7fe0', '#9ab4f4'],
    layers: stack([
      ['#7092ea', '#4f73d6'], ['#fff8ec', '#ffe8cc'], ['#ffa270', '#f77f52'],
      ['#ffd27a', '#fbb24c'], ['#ff9a5c', '#f07a3a'], ['#fff6e8', '#ffe4c4'], ['#5a7edc', '#3a5cc0'],
    ]),
    crest: 'rgba(255,250,240,0.85)', shadow: 0.42, vignette: 'rgba(30,50,120,0.14)',
  },
  'light-day': {
    sky: ['#2f54c8', '#6f93ec'],
    layers: stack([
      ['#4a72e0', '#2b4cb8'], ['#fff3e0', '#ffdfb8'], ['#ff835a', '#ef5638'],
      ['#ffc052', '#f5982a'], ['#ff7d38', '#de5820'], ['#fff0d8', '#ffd6aa'], ['#3a5fd0', '#1d3a9c'],
    ]),
    crest: 'rgba(255,248,235,0.85)', shadow: 0.5, vignette: 'rgba(20,32,96,0.16)',
  },
  'light-dusk': {
    sky: ['#1f3c9a', '#4f6fc8'],
    layers: stack([
      ['#3456b8', '#1f3a90'], ['#ffe6c4', '#ffcc94'], ['#f86a3e', '#d9462a'],
      ['#f8a63c', '#e5841c'], ['#ec6224', '#c84816'], ['#ffe2bc', '#ffc488'], ['#28469e', '#142c74'],
    ]),
    crest: 'rgba(255,236,210,0.8)', shadow: 0.55, vignette: 'rgba(14,22,70,0.2)',
  },
  // Dark: deep navy sky and blue bands with ember orange and coral, the
  // light bands amber instead of cream.
  'dark-dawn': {
    sky: ['#0e1d4e', '#1a3170'],
    layers: stack([
      ['#2a50a8', '#173482'], ['#e89a52', '#c87430'], ['#cf5a3a', '#a63e24'],
      ['#d88a3a', '#b0661e'], ['#24489c', '#142e74'], ['#e0904c', '#bc6c2a'], ['#163278', '#0b1d52'],
    ]),
    crest: 'rgba(255,214,170,0.5)', shadow: 0.6, vignette: 'rgba(4,8,26,0.4)',
  },
  'dark-day': {
    sky: ['#081233', '#132a66'],
    layers: stack([
      ['#2149b4', '#13318a'], ['#f09a48', '#cc6e24'], ['#e05c36', '#b23e1e'],
      ['#e8862e', '#bc6418'], ['#1d3fa4', '#0f2878'], ['#ec9444', '#c66a22'], ['#10297e', '#081850'],
    ]),
    crest: 'rgba(255,210,160,0.5)', shadow: 0.62, vignette: 'rgba(3,7,22,0.45)',
  },
  'dark-dusk': {
    sky: ['#050d28', '#0f2258'],
    layers: stack([
      ['#1a3c96', '#0f2870'], ['#f4a24e', '#d47426'], ['#ea6236', '#c0441c'],
      ['#f09636', '#c87018'], ['#163690', '#0b2268'], ['#f29c46', '#cc7020'], ['#0c2166', '#051440'],
    ]),
    crest: 'rgba(255,214,160,0.55)', shadow: 0.65, vignette: 'rgba(2,5,16,0.5)',
  },
};

function hexRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function edgeY(l, x) {
  const t = x / W;
  return H * (l.y0 + (l.y1 - l.y0) * t
    + l.amp * Math.sin(2 * Math.PI * l.f * t + l.ph)
    + 0.35 * l.amp * Math.sin(2 * Math.PI * l.f * 2.3 * t + l.ph * 1.7));
}

function edgePath(ctx, l, close) {
  ctx.beginPath();
  for (let x = -40; x <= W + 40; x += 8) {
    const y = edgeY(l, x);
    if (x === -40) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  if (close) {
    ctx.lineTo(W + 40, H + 40);
    ctx.lineTo(-40, H + 40);
    ctx.closePath();
  }
}

function paint(p) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  const sky = ctx.createLinearGradient(0, 0, 0, H * 0.6);
  sky.addColorStop(0, p.sky[0]);
  sky.addColorStop(1, p.sky[1]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  let behind = p.sky[0];
  for (const l of p.layers) {
    // The shadow band: this layer's edge casts a soft shadow up onto the
    // layer behind it, in that layer's own deeper shade (same hue family,
    // so a shadow never greys a coral into mauve).
    const [br, bg, bb] = hexRgb(behind).map((c) => Math.round(c * 0.55));
    ctx.save();
    ctx.shadowColor = `rgba(${br},${bg},${bb},${p.shadow})`;
    ctx.shadowBlur = 70;
    ctx.shadowOffsetY = -14;
    edgePath(ctx, l, true);
    ctx.fillStyle = l.lo;
    ctx.fill();
    ctx.restore();

    // The band itself: hard top edge, light at the crest, deeper below.
    const top = H * Math.min(l.y0, l.y1) - H * l.amp * 1.4;
    const g = ctx.createLinearGradient(0, top, 0, top + H * 0.32);
    g.addColorStop(0, l.hi);
    g.addColorStop(1, l.lo);
    edgePath(ctx, l, true);
    ctx.fillStyle = g;
    ctx.fill();

    // The crest line: a thin light edge on every band.
    edgePath(ctx, l, false);
    ctx.strokeStyle = p.crest;
    ctx.lineWidth = 3.5;
    ctx.stroke();

    behind = l.lo;
  }

  const vig = ctx.createRadialGradient(W * 0.5, H * 0.45, Math.min(W, H) * 0.35, W * 0.5, H * 0.45, Math.max(W, H) * 0.78);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, p.vignette);
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

  // A light dither so the in-band gradients do not band once encoded.
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = Math.round((Math.random() - 0.5) * 4);
    d[i] = Math.min(255, Math.max(0, d[i] + n));
    d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + n));
    d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + n));
  }
  ctx.putImageData(img, 0, 0);

  return canvas.toBuffer('image/png');
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const report = [];
  for (const [name, palette] of Object.entries(PALETTES)) {
    const png = paint(palette);
    const avifPath = join(OUT, `${name}.avif`);
    const webpPath = join(OUT, `${name}.webp`);
    const avif = await sharp(png).avif({ quality: 50, effort: 4 }).toBuffer();
    const webp = await sharp(png).webp({ quality: 70 }).toBuffer();
    await writeFile(avifPath, avif);
    await writeFile(webpPath, webp);
    if (process.env.PNG_DIR) await writeFile(join(process.env.PNG_DIR, `${name}.png`), png);
    report.push({ name, avif: avif.length, webp: webp.length });
  }
  console.log('Wallpaper painted:');
  for (const r of report) {
    console.log(`  ${r.name.padEnd(11)} avif ${(r.avif / 1024).toFixed(1).padStart(6)} KB   webp ${(r.webp / 1024).toFixed(1).padStart(6)} KB`);
  }
  const total = report.reduce((a, r) => a + r.avif + r.webp, 0);
  console.log(`  total ${(total / 1024).toFixed(1)} KB across ${report.length * 2} files`);
}

main();
