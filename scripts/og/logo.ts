/** Renders the square logo mark: three lenticel dashes on the dark face.
 *  Geometry (background rect + dash positions) is a direct port of
 *  public/favicon.svg (viewBox 0 0 32 32) so the favicon and the
 *  structured-data logo cannot drift apart. Palette is the shared dark
 *  face used across generated OG assets (see render.ts), not the
 *  favicon's own hex values.
 *
 *  Placeholder: there is no real logo yet. When one exists it replaces the
 *  generated file and nothing else changes. */
import { createCanvas, type Canvas, type SKRSContext2D } from '@napi-rs/canvas';

export const LOGO_SIZE = 512;

const BG = '#1c1a17';
const MARK = '#f4f0e6';

/** x, y, width, height, rx=4, in the favicon's 32-unit coordinate space. */
const BACKGROUND = [0, 0, 32, 32, 4] as const;

/** x, y, width, height, in the favicon's 32-unit coordinate space. */
const DASHES = [
  [6, 9, 14, 2],
  [12, 15, 14, 2],
  [6, 21, 10, 2],
] as const;

/** Draws the logo mark onto an already-sized canvas context. Split out from
 *  renderLogo() so tests can inspect pixels via getImageData rather than
 *  only the encoded PNG buffer. */
function drawLogo(ctx: SKRSContext2D): void {
  const scale = LOGO_SIZE / 32;

  const [bx, by, bw, bh, brx] = BACKGROUND;
  ctx.fillStyle = BG;
  ctx.beginPath();
  ctx.roundRect(bx * scale, by * scale, bw * scale, bh * scale, brx * scale);
  ctx.fill();

  ctx.fillStyle = MARK;
  for (const [x, y, w, h] of DASHES) {
    const radius = (h * scale) / 2;
    ctx.beginPath();
    ctx.roundRect(x * scale, y * scale, w * scale, h * scale, radius);
    ctx.fill();
  }
}

export function renderLogo(): Buffer {
  const canvas = createCanvas(LOGO_SIZE, LOGO_SIZE);
  drawLogo(canvas.getContext('2d'));
  return canvas.toBuffer('image/png');
}

/** Test-only export: renders to an in-memory canvas so specs can read back
 *  pixels with getImageData instead of only checking buffer equality. */
export function renderLogoCanvas(): Canvas {
  const canvas = createCanvas(LOGO_SIZE, LOGO_SIZE);
  drawLogo(canvas.getContext('2d'));
  return canvas;
}

export { BG, MARK, DASHES };
