/** Renders the square logo mark: three lenticel dashes on the dark face.
 *  Geometry is a direct port of public/favicon.svg (viewBox 0 0 32 32) so the
 *  favicon and the structured-data logo cannot drift apart.
 *
 *  Placeholder: there is no real logo yet. When one exists it replaces the
 *  generated file and nothing else changes. */
import { createCanvas } from '@napi-rs/canvas';

export const LOGO_SIZE = 512;

const BG = '#1c1a17';
const MARK = '#f4f0e6';

/** x, y, width, height, in the favicon's 32-unit coordinate space. */
const DASHES = [
  [6, 9, 14, 2],
  [12, 15, 14, 2],
  [6, 21, 10, 2],
] as const;

export function renderLogo(): Buffer {
  const canvas = createCanvas(LOGO_SIZE, LOGO_SIZE);
  const ctx = canvas.getContext('2d');
  const scale = LOGO_SIZE / 32;

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, LOGO_SIZE, LOGO_SIZE);

  ctx.fillStyle = MARK;
  for (const [x, y, w, h] of DASHES) {
    const radius = (h * scale) / 2;
    ctx.beginPath();
    ctx.roundRect(x * scale, y * scale, w * scale, h * scale, radius);
    ctx.fill();
  }

  return canvas.toBuffer('image/png');
}
