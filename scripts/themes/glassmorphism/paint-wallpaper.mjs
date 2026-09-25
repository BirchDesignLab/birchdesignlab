/**
 * Paint the glassmorphism wallpaper offline, once, to image files.
 *
 * Written 09-25-26 for Tier 3 stage 3, wave B1 (seat glass-1). Tier B's
 * architecture call (tier-b-plan.md, item 1; proofs/lens.md "For Tier B: one
 * wallpaper source"): the wallpaper is painted once, from one module, to a
 * bitmap, instead of the runtime CSS radial-gradient mesh the Tier A palette
 * proof used. That bitmap is what src/themes/glassmorphism/theme.css's
 * main::before references (image-set, AVIF with a WebP fallback, both
 * imported through Vite's CSS url() pipeline so they land hashed under
 * /_astro/), and it is the one source B2's lens will sample as its texture
 * too, so the lens rim can never disagree with the page (the failure route
 * the lens proof flags for a CSS-only wallpaper).
 *
 * Palette: warm Big Sur (orange, coral, deep blue), the founder's pick
 * (stage3-decisions.md). The composition mirrors
 * scripts/themes/proofs/stage3-palette/warm.css's radial-gradient mesh
 * (five body-hue blobs plus a vignette), including its coral bridge shape
 * between the orange and blue forms (palette.md's fix for warm light's
 * greyish-mauve overlap: alpha-composited orange and blue collapse toward
 * grey in sRGB, so a third warm hue is painted at the overlap on purpose).
 * Dark stays deep blue with ember and coral light; no violet, no indigo.
 *
 * Six files: {light, dark} x {dawn, day, dusk}. The page uses "day" by
 * default in each scheme (wired in theme.css); dawn and dusk are painted now
 * and wait for B2's time-of-day control. Each is painted at 2560x1600 (covers
 * a 2560px-wide viewport under background-size: cover with no visible seam),
 * with a dither pass before encoding so the smooth gradient does not band at
 * a small file size, then encoded through sharp as AVIF (primary) and WebP
 * (fallback), target a few KB to about 40 KB each.
 *
 * Usage: node scripts/themes/glassmorphism/paint-wallpaper.mjs
 * Output: src/themes/glassmorphism/wallpaper/<scheme>-<tod>.{avif,webp}
 */
import { createCanvas } from '@napi-rs/canvas';
import sharp from 'sharp';
import { mkdir, writeFile, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const OUT = join(REPO, 'src', 'themes', 'glassmorphism', 'wallpaper');

const W = 2560;
const H = 1600;

/** Each scheme x time-of-day palette. Positions mirror warm.css's mesh:
    blue top-right, orange upper-left, coral lower-middle-right, amber
    lower-left, deep corner bottom-right, and the coral bridge at the
    orange/blue overlap (42%, 40%), so the fix warm.css already found stays
    in the painted source too. */
const PALETTES = {
  'light-dawn': {
    baseA: '#ffd9a8', baseB: '#6f8fe8',
    blue: '#5878d6', orange: '#ffab6e', coral: '#ff8a7a', amber: '#ffd08a', deep: '#4560c2',
    edge: 'rgba(40,42,100,0.32)', sun: true, sunAlpha: 0.5,
  },
  'light-day': {
    baseA: '#ffa56a', baseB: '#4a74e6',
    blue: '#3a64dc', orange: '#ff8a3a', coral: '#ff5e55', amber: '#ffb84e', deep: '#2748b4',
    edge: 'rgba(28,34,96,0.42)', sun: true, sunAlpha: 0.4,
  },
  'light-dusk': {
    baseA: '#ff8a52', baseB: '#33509c',
    blue: '#2c4a94', orange: '#f2661e', coral: '#e8453c', amber: '#f0983a', deep: '#1c3480',
    edge: 'rgba(20,22,70,0.5)', sun: true, sunAlpha: 0.3,
  },
  'dark-dawn': {
    baseA: '#14245c', baseB: '#0a1640',
    blue: '#24509c', orange: '#c04a1a', coral: '#c14a44', amber: '#c8781f', deep: '#16307a',
    edge: 'rgba(4,8,26,0.7)', sun: false,
  },
  'dark-day': {
    baseA: '#0d1b4a', baseB: '#081233',
    blue: '#1f45b0', orange: '#d9541d', coral: '#d9564e', amber: '#e0852f', deep: '#10297e',
    edge: 'rgba(3,7,22,0.78)', sun: false,
  },
  'dark-dusk': {
    baseA: '#0a1640', baseB: '#050d28',
    blue: '#183a8c', orange: '#e85f22', coral: '#e85f52', amber: '#ea9438', deep: '#0c2166',
    edge: 'rgba(2,5,16,0.85)', sun: false,
  },
};

function hexRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** A soft radial blob, painted source-over so later blobs sit visually in
    front of earlier ones without a hard edge. */
function blob(ctx, cxPct, cyPct, rPct, hex, stopAt = 0.7) {
  const [r, g, b] = hexRgb(hex);
  const cx = W * cxPct;
  const cy = H * cyPct;
  const rad = Math.max(W, H) * rPct;
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
  grad.addColorStop(0, `rgba(${r},${g},${b},1)`);
  grad.addColorStop(stopAt, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
}

function paint(p) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  const base = ctx.createLinearGradient(0, 0, W * 0.65, H);
  base.addColorStop(0, p.baseA);
  base.addColorStop(1, p.baseB);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);

  blob(ctx, 0.84, 0.18, 0.5, p.blue);
  blob(ctx, 0.14, 0.28, 0.48, p.orange);
  blob(ctx, 0.62, 0.78, 0.46, p.coral);
  blob(ctx, 0.12, 0.9, 0.38, p.amber, 0.66);
  blob(ctx, 0.98, 0.98, 0.48, p.deep);
  // The coral bridge: painted where the orange and blue forms overlap, so
  // that seam reads as a third warm hue instead of the grey an RGB blend of
  // orange and blue collapses toward (palette.md).
  blob(ctx, 0.42, 0.4, 0.4, p.coral, 0.7);

  if (p.sun) {
    const sun = ctx.createRadialGradient(W * 0.78, H * 0.16, 0, W * 0.78, H * 0.16, W * 0.35);
    sun.addColorStop(0, `rgba(255,240,200,${p.sunAlpha})`);
    sun.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, W, H);
  }

  const vig = ctx.createRadialGradient(W * 0.5, H * 0.45, Math.min(W, H) * 0.3, W * 0.5, H * 0.45, Math.max(W, H) * 0.75);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, p.edge);
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

  // Dither: a few levels of random noise per channel, so the smooth
  // gradient mesh does not band once re-encoded at a small file size.
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = Math.round((Math.random() - 0.5) * 6);
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
    const avif = await sharp(png).avif({ quality: 45, effort: 4 }).toBuffer();
    const webp = await sharp(png).webp({ quality: 60 }).toBuffer();
    await writeFile(avifPath, avif);
    await writeFile(webpPath, webp);
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
