/** Renderer-agnostic 2D dash drawing, shared by the browser fallback and the OG build script. */
import type { Dash } from './pattern';

export interface Ctx2DLike {
  globalAlpha: number;
  fillStyle: string | object;
  save(): void;
  restore(): void;
  translate(x: number, y: number): void;
  rotate(r: number): void;
  beginPath(): void;
  roundRect(x: number, y: number, w: number, h: number, r: number): void;
  fill(): void;
}

/** Parse '#rgb', '#rrggbb', or 'rgb(a,b,c)' to [0..1] floats. */
export function parseColor(css: string): [number, number, number] {
  const s = css.trim();
  if (s.startsWith('#')) {
    const hex = s.length === 4 ? s.slice(1).split('').map((c) => c + c).join('') : s.slice(1);
    const n = parseInt(hex, 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }
  const m = s.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const [r, g, b] = m[1].split(',').map((v) => parseFloat(v));
    return [r / 255, g / 255, b / 255];
  }
  return [1, 1, 1];
}

export function drawBarkDashes(
  ctx: Ctx2DLike,
  dashes: Dash[],
  mark: string,
  W: number,
  H: number,
  alphaLo = 0.05,
  alphaHi = 0.22,
  /** Measure dash width against H instead of W, so shape survives a non-square canvas. */
  lockAspect = false,
): void {
  const [mr, mg, mb] = parseColor(mark);
  const widthRef = lockAspect ? H : W;
  const fill = `rgb(${Math.round(mr * 255)} ${Math.round(mg * 255)} ${Math.round(mb * 255)})`;
  for (const d of dashes) {
    ctx.save();
    ctx.translate(d.x * W, d.y * H);
    ctx.rotate(d.rot);
    ctx.globalAlpha = alphaLo + d.shade * (alphaHi - alphaLo);
    ctx.fillStyle = fill;
    const w = d.w * widthRef, h = Math.max(1.5, d.h * H);
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, h / 2);
    ctx.fill();
    ctx.restore();
  }
}
