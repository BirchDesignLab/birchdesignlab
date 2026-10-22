/**
 * Framings for the screen captures: how a phone-shaped recording becomes a
 * 1080x1920 Reel without its switcher bar landing under Instagram's controls.
 *
 * The problem, in numbers. Instagram draws its own UI over a Reel: the top
 * ~14% (account row, audio) and the bottom ~35% (caption, buttons). In a
 * 1080x1920 frame that leaves y 269..1248 clear. The portal's switcher bar is
 * fixed to the bottom of the viewport, so a full-bleed phone recording puts it
 * at y ~1800, directly under the caption.
 *
 * Two answers, both rendered so the founder can choose:
 *
 *   PHONE   a real phone-sized viewport, drawn as a device on the charcoal
 *           field and scaled until its bottom edge (and the bar with it) clears
 *           y 1248. Faithful to what a visitor holds; costs size, so the UI is
 *           ~1.4x rather than ~2.8x.
 *
 *   RAISED  a full-bleed 9:16 viewport with CSS safe-area-inset-bottom set to
 *           35% of the height. The switcher positions itself at
 *           max(12px, env(safe-area-inset-bottom)), so the SITE lifts its own
 *           bar, the way it does above a phone's home indicator. Text stays at
 *           ~2.8x. The page continues underneath the bar, where Instagram's
 *           caption sits.
 *
 * Nothing here touches src/. RAISED uses an emulation override that a phone
 * with a larger bottom inset would supply by itself.
 */

export const OUTPUT = { width: 1080, height: 1920 };

/** Instagram's overlays, as fractions of the frame height (calendar rules.reels_safe_zone). */
export const SAFE = { topPct: 14, bottomPct: 35, sidesPct: 6 };
export const SAFE_Y = {
  top: Math.round((OUTPUT.height * SAFE.topPct) / 100), //  269
  bottom: Math.round(OUTPUT.height * (1 - SAFE.bottomPct / 100)), // 1248
};

/** House charcoal: the switcher's own --bg, so the field and the bar agree. */
export const FIELD = '0x1c1a17';
const BEZEL = '0x37332c';
const BEZEL_PX = 8;

const DPR = 3;

/** Distance from the bar's bottom edge to the viewport's bottom edge (switcher.ts: bottom: max(12px, ...)). */
const BAR_GAP_CSS = 12;

function roundedMask(w, h, r, label) {
  // A white rounded rectangle on black, as the alpha for an overlay.
  return (
    `color=c=white:s=${w}x${h},format=gray,` +
    `geq=lum='255*lt(hypot(max(abs(X-W/2)-(W/2-${r}),0),max(abs(Y-H/2)-(H/2-${r}),0)),${r})'[${label}]`
  );
}

/**
 * PHONE: choose the largest screen whose bar still clears the bottom zone.
 * The screen's top sits just under the top zone so the page header is visible.
 */
function phone() {
  const css = { width: 390, height: 700 };
  const top = SAFE_Y.top + 12;
  // bar bottom = screen bottom - BAR_GAP_CSS*k  <=  SAFE_Y.bottom
  // screen bottom = top + css.height*k
  const k = (SAFE_Y.bottom - top) / (css.height - BAR_GAP_CSS);
  const sw = Math.round(css.width * k) & ~1;
  const sh = Math.round(css.height * k) & ~1;
  const x = Math.round((OUTPUT.width - sw) / 2);
  const bw = sw + 2 * BEZEL_PX;
  const bh = sh + 2 * BEZEL_PX;
  const radius = Math.round(34 * k);
  const filterComplex =
    `[0:v]scale=${sw}:${sh}:flags=lanczos,format=rgba[scr];` +
    `${roundedMask(sw, sh, radius, 'smask')};` +
    `${roundedMask(bw, bh, radius + BEZEL_PX, 'bmask')};` +
    `[scr][smask]alphamerge[screen];` +
    `color=c=${BEZEL}:s=${bw}x${bh},format=rgba[bz];[bz][bmask]alphamerge[bezel];` +
    `color=c=${FIELD}:s=${OUTPUT.width}x${OUTPUT.height},format=rgba[bg];` +
    `[bg][bezel]overlay=${x - BEZEL_PX}:${top - BEZEL_PX}:shortest=1[a];` +
    `[a][screen]overlay=${x}:${top}:shortest=1,format=rgb24[out]`;
  return {
    id: 'PHONE',
    title: 'Phone on the charcoal field',
    css,
    dpr: DPR,
    scale: +k.toFixed(3),
    barBottom: Math.round(top + (css.height - BAR_GAP_CSS) * k),
    screen: { x, y: top, width: sw, height: sh },
    filterComplex,
    safeAreaInsetBottomPx: 0,
  };
}

/** RAISED: a 9:16 viewport, 390 wide, with the site's own bottom inset lifting the bar. */
function raised() {
  const css = { width: 390, height: 693 };
  const k = OUTPUT.width / css.width; // 2.769
  // Put the bar's bottom edge on the line: inset = distance from viewport bottom to the line.
  const inset = Math.floor((OUTPUT.height - SAFE_Y.bottom) / k);
  const filterComplex = `[0:v]scale=${OUTPUT.width}:${OUTPUT.height}:flags=lanczos,format=rgb24[out]`;
  return {
    id: 'RAISED',
    title: 'Full-bleed, bar raised by a bottom inset',
    css,
    dpr: DPR,
    scale: +k.toFixed(3),
    barBottom: Math.round(OUTPUT.height - Math.max(BAR_GAP_CSS, inset) * k),
    screen: { x: 0, y: 0, width: OUTPUT.width, height: OUTPUT.height },
    filterComplex,
    safeAreaInsetBottomPx: inset,
  };
}

export const FRAMINGS = { PHONE: phone(), RAISED: raised() };
