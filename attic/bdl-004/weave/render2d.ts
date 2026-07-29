/** Pure cloth drawing on the bark module's Ctx2DLike contract.
 *  Layer logic: at every crossing the lifted thread draws on top. Threads are
 *  rounded rects with a soft highlight stripe for sheen, a dark seat where a
 *  lifted thread crosses, and a seeded jitter so fiber reads as fiber instead
 *  of pixels. */
import type { Ctx2DLike } from '../bark/draw2d';
import { mulberry32 } from '../bark/pattern';
import { lcm, type Draft } from './draft';
import { seqLength, yarnAt, type Stripe } from './stripes';

/* Feel knobs: founder fiddle round adjusts these. */
export const THREAD_PX = 9;       // on-screen thread thickness
export const SHEEN_ALPHA = 0.16;  // highlight stripe strength
export const SHADOW_ALPHA = 0.22; // dark seat under a lifted thread at a crossing
export const JITTER_PX = 0.7;     // per-thread wobble

export interface ClothPick {
  treadle: number;   // which treadle was pressed
  weftYarn: string;  // yarn id resolved when the pick was thrown
}

export interface ClothView {
  draft: Draft;
  warp: Stripe[];
  picks: ClothPick[];           // oldest first
  yarnHex: (id: string) => string;
  seed: number;
}

/** Smallest repeat that tiles seamlessly, in threads. */
export function tileDims(draft: Draft, warp: Stripe[], weft: Stripe[]): { ends: number; picks: number } {
  return {
    ends: lcm(draft.threading.length, seqLength(warp)),
    picks: lcm(draft.treadling.length, seqLength(weft)),
  };
}

/** One thread segment: rounded rect plus a sheen stripe. */
function segment(ctx: Ctx2DLike, x: number, y: number, w: number, h: number, hex: string, jx: number): void {
  ctx.save();
  ctx.translate(x + jx, y);
  ctx.globalAlpha = 1;
  ctx.fillStyle = hex;
  ctx.beginPath();
  ctx.roundRect(0, 0, w, h, Math.min(w, h) / 2.5);
  ctx.fill();
  ctx.globalAlpha = SHEEN_ALPHA;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  if (w >= h) ctx.roundRect(0, h * 0.18, w, h * 0.22, h * 0.11); // horizontal weft highlight
  else ctx.roundRect(w * 0.18, 0, w * 0.22, h, w * 0.11);        // vertical warp highlight
  ctx.fill();
  ctx.restore();
}

/** Dark seat where a lifted thread crosses the one beneath: reads as depth. */
function shadow(ctx: Ctx2DLike, x: number, y: number, w: number, h: number): void {
  ctx.save();
  ctx.globalAlpha = SHADOW_ALPHA;
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, w / 3);
  ctx.fill();
  ctx.restore();
}

/**
 * Draw the loom scene: unwoven warp from the top down to the fell line,
 * woven cloth from the fell line down. Newest pick sits at the fell; older
 * picks scroll toward the bottom edge and out.
 */
export function drawCloth(ctx: Ctx2DLike, view: ClothView, W: number, H: number, fellFrac = 0.38): void {
  const { draft, warp, picks, yarnHex, seed } = view;
  const t = THREAD_PX;
  const ends = Math.max(1, Math.floor(W / t));
  const fellY = H * fellFrac;
  const rnd = mulberry32(seed);
  const jitter = Array.from({ length: ends }, () => (rnd() - 0.5) * 2 * JITTER_PX);

  // Unwoven warp above the fell line.
  for (let e = 0; e < ends; e++) {
    segment(ctx, e * t + t * 0.12, 0, t * 0.76, fellY, yarnHex(yarnAt(warp, e)), jitter[e]);
  }

  // Woven cloth below: pick p sits at fellY + rowIndex * t, newest first.
  const visible = Math.min(picks.length, Math.ceil((H - fellY) / t));
  for (let row = 0; row < visible; row++) {
    const pickIndex = picks.length - 1 - row;
    const pick = picks[pickIndex];
    const y = fellY + row * t;
    // Weft ground first, then the lifted warp ends on top.
    segment(ctx, 0, y + t * 0.12, W, t * 0.76, yarnHex(pick.weftYarn), 0);
    for (let e = 0; e < ends; e++) {
      if (!draft.tieUp[pick.treadle][draft.threading[e % draft.threading.length]]) continue;
      shadow(ctx, e * t, y, t, t);
      segment(ctx, e * t + t * 0.12, y, t * 0.76, t, yarnHex(yarnAt(warp, e)), jitter[e]);
    }
  }
}
