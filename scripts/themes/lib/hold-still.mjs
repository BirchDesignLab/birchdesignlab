/**
 * Did the portal's switcher hold still through a page swap? A pure pixel
 * check behind motion.mjs's `--crop switcher` strips.
 *
 * Written 09-23-26 for Tier 3 stage 1 (portal.md P1). The switcher gets its
 * own view-transition name and no animation, so across any swap it should
 * show exactly one of two pictures: itself before the trigger (old label, old
 * place) or itself after the swap has settled (new label, new place, which on
 * phones moves because the bar is centred and its width follows the label).
 * Anything else on screen in its place (scaled, tilted, blurred, ghosted,
 * clipped by a wipe, or gone) is the switcher riding a school's transition.
 *
 * What is compared: the bar's buttons, each one inset a little. That leaves
 * out the bar's 1px translucent border and the 1px translucent seams between
 * buttons, which show the page moving underneath, and the anti-aliased edges
 * where JPEG blocks straddle the bar and the changing page. What is left is
 * opaque button, text and icon, which should match its reference to within
 * JPEG noise.
 *
 * Images are ImageData-like `{ width, height, data }` (RGBA, 4 bytes a
 * pixel). Boxes are `{ x, y, w, h }` in the image's own pixels; `toPixels`
 * maps CSS-px boxes onto a frame whose width need not match the viewport.
 * The self-test (`node scripts/themes/lib/hold-still.selftest.mjs`) proves
 * the thresholds on synthetic frames.
 */

export const HOLD_STILL = {
  /** CSS px trimmed off each button's edges (seams, anti-aliasing, JPEG bleed). */
  inset: 2,
  /** A pixel differs when any channel moves by more than this (0 to 255).
      In the self-test, JPEG noise inside a button seldom passes 16 and never
      24; the ink faded to 85% moves about 32. */
  pixel: 24,
  /** A button differs when more than this share of its pixels does. Text and
      icons are a few percent of a button, so a missing glyph fails it. */
  cell: 0.01,
  /** Frame pixels of slack each way, for a snapshot placed a subpixel off. */
  shift: 1,
};

/** CSS-px boxes onto frame pixels (`k` = frame width / viewport width), inset. */
export function toPixels(boxes, k, inset = HOLD_STILL.inset) {
  return boxes
    .map((b) => {
      const x = Math.ceil((b.x + inset) * k);
      const y = Math.ceil((b.y + inset) * k);
      return { x, y, w: Math.floor((b.x + b.w - inset) * k) - x, h: Math.floor((b.y + b.h - inset) * k) - y };
    })
    .filter((b) => b.w > 0 && b.h > 0);
}

/** Share of `box`'s pixels in `ref` that differ in `img` read `dx`,`dy` away.
    Pixels shifted off the image count as different. */
export function boxMismatch(img, ref, box, dx = 0, dy = 0, pixel = HOLD_STILL.pixel) {
  let off = 0;
  for (let y = box.y; y < box.y + box.h; y++) {
    for (let x = box.x; x < box.x + box.w; x++) {
      const ix = x + dx;
      const iy = y + dy;
      if (ix < 0 || iy < 0 || ix >= img.width || iy >= img.height || x >= ref.width || y >= ref.height) {
        off++;
        continue;
      }
      const a = (iy * img.width + ix) * 4;
      const b = (y * ref.width + x) * 4;
      if (
        Math.abs(img.data[a] - ref.data[b]) > pixel ||
        Math.abs(img.data[a + 1] - ref.data[b + 1]) > pixel ||
        Math.abs(img.data[a + 2] - ref.data[b + 2]) > pixel
      ) {
        off++;
      }
    }
  }
  return off / (box.w * box.h);
}

/** How far `img` is from showing the bar exactly as `ref` does: the worst
    button's mismatch, at the best whole-bar shift within the slack. */
export function barMismatch(img, ref, boxes, opts = {}) {
  const { shift, pixel } = { ...HOLD_STILL, ...opts };
  let best = Infinity;
  for (let dy = -shift; dy <= shift; dy++) {
    for (let dx = -shift; dx <= shift; dx++) {
      let worst = 0;
      for (const box of boxes) {
        worst = Math.max(worst, boxMismatch(img, ref, box, dx, dy, pixel));
        if (worst >= best) break;
      }
      best = Math.min(best, worst);
      if (best === 0) return 0;
    }
  }
  return best;
}

/**
 * Judge a filmed strip. `frames` are `{ ms, img }`; `refs` are the pictures
 * the bar may show, `{ img, boxes }` (before the trigger and after the
 * settle). A frame's score is its mismatch against the closer reference; the
 * strip is stable when every score is at most `opts.cell`.
 */
export function judgeHoldStill(frames, refs, opts = {}) {
  const { cell } = { ...HOLD_STILL, ...opts };
  let worst = { ms: null, score: 0 };
  for (const f of frames) {
    const score = Math.min(...refs.map((r) => barMismatch(f.img, r.img, r.boxes, opts)));
    if (score > worst.score) worst = { ms: f.ms, score };
  }
  return { stable: worst.score <= cell, worst: { ms: worst.ms, score: Math.round(worst.score * 1000) / 1000 } };
}
