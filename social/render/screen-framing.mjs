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
 *   SHORT   a short window, 390x416, scaled 2.4x so the bar sits on the line
 *           and the text stays large. The site is unchanged and the bar is where
 *           the site puts it: the bottom of the window. Costs a cramped school
 *           list (two rows show, the rest scroll) and the page cropped to its top.
 *
 * Tried and dropped: RAISED, a full-bleed 9:16 window with CSS
 * safe-area-inset-bottom set to 35%, so the site would lift its own bar. The
 * bar did lift, but the school list sits `inset + 72px` above the bottom edge,
 * so it was pushed up and off the top of the window: its title and first rows
 * (quiet among them) were unreachable. Found by scripts/probe-raised-dialog.mjs.
 *
 * Nothing here touches src/.
 */

export const OUTPUT = { width: 1080, height: 1920 };

/** Instagram's overlays, as fractions of the frame height (calendar rules.reels_safe_zone). */
export const SAFE = { topPct: 14, bottomPct: 35, sidesPct: 6 };
export const SAFE_Y = {
  top: Math.round((OUTPUT.height * SAFE.topPct) / 100), //  269
  bottom: Math.round(OUTPUT.height * (1 - SAFE.bottomPct / 100)), // 1248
};

/**
 * Every generated source below is pinned to r=30. `color` defaults to 25fps and
 * an overlay takes its rate from its first input, so the unpinned field cut a
 * 3.2s clip to 81 frames instead of 96 (scripts/selftest-framings.mjs).
 */

/** House charcoal: the switcher's own --bg, so the field and the bar agree. */
export const FIELD = '0x1c1a17';
const BEZEL = '0x37332c';
const BEZEL_PX = 8;

const DPR = 3;

/**
 * Where the bar's bottom edge is aimed: 8px above Instagram's line, not on it.
 * The first renders landed 1 to 2px clear, so any drift would cross it.
 */
const BAR_LINE = SAFE_Y.bottom - 8;

/** Distance from the bar's bottom edge to the viewport's bottom edge (switcher.ts: bottom: max(12px, ...)). */
const BAR_GAP_CSS = 12;

function roundedMask(w, h, r, label) {
  // A white rounded rectangle on black, as the alpha for an overlay.
  return (
    `color=c=white:s=${w}x${h}:r=30,format=gray,` +
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
  const k = (BAR_LINE - top) / (css.height - BAR_GAP_CSS);
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
    `color=c=${BEZEL}:s=${bw}x${bh}:r=30,format=rgba[bz];[bz][bmask]alphamerge[bezel];` +
    `color=c=${FIELD}:s=${OUTPUT.width}x${OUTPUT.height}:r=30,format=rgba[bg];` +
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

/**
 * SHORT: a 390x416 window drawn 2.4x on the field, placed so the bar's bottom
 * edge lands on BAR_LINE. At 2.4x the window is 936px wide, so the sides are
 * 72px (6.7%), clear of the 6% the calendar asks for, and its top edge lands on
 * y 270, just under Instagram's top zone: the header and the grid key are in
 * the clear band.
 */
function short() {
  const css = { width: 390, height: 416 };
  const k = 2.4;
  const sw = css.width * k; //  975
  const sh = css.height * k; // 1050
  const x = Math.round((OUTPUT.width - sw) / 2);
  const y = Math.round(BAR_LINE - (css.height - BAR_GAP_CSS) * k);
  const filterComplex =
    `[0:v]scale=${sw}:${sh}:flags=lanczos,format=rgba[scr];` +
    `color=c=${FIELD}:s=${OUTPUT.width}x${OUTPUT.height}:r=30,format=rgba[bg];` +
    `[bg][scr]overlay=${x}:${y}:shortest=1,` +
    `drawbox=x=${x - 1}:y=${y - 1}:w=${sw + 2}:h=${sh + 2}:color=${BEZEL}:t=1,format=rgb24[out]`;
  return {
    id: 'SHORT',
    title: 'Short window on the charcoal field',
    css,
    dpr: DPR,
    scale: k,
    barBottom: Math.round(y + (css.height - BAR_GAP_CSS) * k),
    screen: { x, y, width: sw, height: sh },
    filterComplex,
    safeAreaInsetBottomPx: 0,
  };
}

export const FRAMINGS = { PHONE: phone(), SHORT: short() };
