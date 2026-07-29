/** Cut the cloth: draw one seamless tile for the wallpaper download.
 *  Sequence-driven (isWarpOver), unlike the live cloth which honors the
 *  treadles actually pressed. No jitter (it would break the seam), but the
 *  sheen stays: it is per-thread and deterministic, so the tile still butts
 *  against itself invisibly and the wallpaper keeps the live cloth's depth. */
import type { Ctx2DLike } from '../bark/draw2d';
import { isWarpOver, type Draft } from './draft';
import { yarnAt, type Stripe } from './stripes';
import { tileDims, SHEEN_ALPHA } from './render2d';

export function tileSizePx(
  draft: Draft,
  warp: Stripe[],
  weft: Stripe[],
  threadPx: number,
): { w: number; h: number } {
  const { ends, picks } = tileDims(draft, warp, weft);
  return { w: ends * threadPx, h: picks * threadPx };
}

export function renderTile(
  ctx: Ctx2DLike,
  draft: Draft,
  warp: Stripe[],
  weft: Stripe[],
  yarnHex: (id: string) => string,
  threadPx: number,
): { w: number; h: number } {
  const { ends, picks } = tileDims(draft, warp, weft);
  const t = threadPx;

  for (let p = 0; p < picks; p++) {
    // Weft ground row plus its horizontal sheen stripe.
    ctx.globalAlpha = 1;
    ctx.fillStyle = yarnHex(yarnAt(weft, p));
    ctx.beginPath();
    ctx.roundRect(0, p * t, ends * t, t, 0);
    ctx.fill();
    ctx.globalAlpha = SHEEN_ALPHA;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(0, p * t + t * 0.18, ends * t, t * 0.22, 0);
    ctx.fill();
    // Lifted warp on top, each cell with a vertical sheen.
    for (let e = 0; e < ends; e++) {
      if (!isWarpOver(draft, e, p)) continue;
      ctx.globalAlpha = 1;
      ctx.fillStyle = yarnHex(yarnAt(warp, e));
      ctx.beginPath();
      ctx.roundRect(e * t, p * t, t, t, 0);
      ctx.fill();
      ctx.globalAlpha = SHEEN_ALPHA;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(e * t + t * 0.18, p * t, t * 0.22, t, 0);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  return { w: ends * t, h: picks * t };
}
