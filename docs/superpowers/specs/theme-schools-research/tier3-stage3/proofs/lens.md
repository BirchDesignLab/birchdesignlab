# Tier A proof: the lens (glass lensing)

Written 09-25-26 for Tier 3 stage 3 (pair B), Tier A proofs, seat "lens".
Branch `feat/theme-schools-tier3-stage3` at `ef346f9`. Binding context:
`stage3-decisions.md` item 1 and the founder's answer (route (c): SVG
displacement in `backdrop-filter` on every pane, plus one draggable WebGL
lens; the lens handles as rigid glass, not rubber). Brief sections read:
`glassmorphism.md` section 1, E1, E4, E8, E10; dossier sources [3] [4] [5].

Everything here was measured in headless Chromium 153 on the real GPU
(ANGLE on D3D11, NVIDIA GeForce RTX 3070 Laptop GPU; WEBGL_debug_renderer_info logged
on every page and checked, never SwiftShader). WebKit is not installed, so
nothing below is a Safari measurement; Safari and Firefox behaviour comes
from the research section and from what Chromium shows of the frosted
fallback they would get.

## Verdict for Tier B

Route (c) holds, with three amendments that the measurements force:

1. **The lens is WebGL everywhere, Chromium included.** The SVG lens bends
   DOM text (nice), but it cannot do the look the founder liked: backdrop
   pixels stop at the element's box (Chromium mirrors the inside past the
   edge, measured), so its edge band cannot pull in what lies outside the
   rim; its 8-bit map stair-steps crisp orb edges; and it would make the lens
   look different per browser. WebGL draws the backdrop from one model, so
   the rim really does show the surroundings, identically in every engine.
2. **The orbs move from the lens's own requestAnimationFrame, not from a CSS
   scroll timeline, on any page that shows the lens.** With the orbs on the
   same clock the lens stays within 1 px of the page while scrolling
   (median 0.16 px, desktop); with a CSS scroll-driven animation the lens
   lags by 7 to 21 px (median 13.5 px). E4's `animation-timeline` stays fine
   for pages without the lens.
3. **The lens lives on the wallpaper plane, position: fixed, under the
   content**, in a region of the page with no text over it by default (the
   Home hero's empty half). Over the content it hides the text beneath it
   (WebGL cannot draw DOM text); under the content, text passes over it
   crisp and readable. Being fixed to the viewport, it never moves relative
   to the fixed wallpaper, which is the core of the iOS momentum mitigation.

The panes take the SVG displacement recipe as decided, gated by an engine
check (below), with the frosted recipe as the base declaration every engine
reads first.

## What was built

A proof, not production code:

- `scripts/themes/proofs/stage3-lens/` (static, served on 127.0.0.1:4465, no
  network): `index.html` (a slice of the glass room), `room.js` (wallpaper,
  orbs, backdrop model, pane filters, adaptive tint, support gate),
  `lens.js` (WebGL lens, rigid-glass handling, the SVG lens it is weighed
  against), `main.js` (boot and the one frame loop), `404.html`.
- `scripts/themes/harness/stage3-lens-proof.mjs`: serves the folder with
  `lib/serve-dist.mjs`, launches GPU Chromium, runs the stages detect,
  stills, films, stats, throttled, align, trace (plus a diagnostic probe
  stage), writes `scripts/themes/.out/stage3-proofs/lens/` and
  `results.json`. Run: `BDL_GPU=1 node
  scripts/themes/harness/stage3-lens-proof.mjs` (about 12 minutes; `--only`
  picks stages).

The room: a warm Big Sur wallpaper painted once on a canvas at load (sky,
five coral to deep-blue wave bands, a sun glow) and handed to both the CSS
background (as a blob: URL, `background-size: cover`, fixed) and the lens (as
a texture), so the two can never disagree; six flat, crisp orbs on a fixed
layer, each moving at 0.3 to 0.6 of the scroll (E4); DOM text; three glass
panes (a thick fixed header bar with the Clear/Tinted switch, a thin
showpiece hero, a regular reading pane, per E1); and the lens.

The pane recipe: base `backdrop-filter: blur() saturate(1.7) brightness(1.06)`
(E8's luminosity step), declared both prefixed and unprefixed with literal
values; a 1.25 px specular rim ring (bright top-left, a fainter
bottom-right kick) drawn with a masked gradient, so it works in every engine;
a fill that leans 30% toward the colour behind the pane, sampled from the
backdrop model every third frame (the adaptive tint, [5]), with the ink
flipping to light over dark backdrops; and, only where the gate says url()
applies, `url(#pane-<id>)` in front of the list. Each pane's filter is an
`feImage` bevel refraction map generated at runtime for the pane's own size
and corner radius (a band 10 to 40 px wide along the rounded edge; the
sample shifts by up to 36 px, growing as the 1.6 power of the depth into the
band), into `feDisplacementMap`, rebuilt by a ResizeObserver.

The lens: a canvas the lens's size follows the lens. Its fragment shader
draws the backdrop itself from the model read from the DOM and CSS every
frame (the wallpaper's cover rect from `getBoundingClientRect`, then every
orb as an anti-aliased disc) and bends it: the middle magnified 1.25x, an
edge band reaching 30% of a radius past the rim, a colour fringe in that band
(red, green and blue sampled 3% apart), a bright top-left rim with a fainter
bottom-right kick, a slight darkening inside the bottom-right edge. Tinted
adds a frost (17 texture taps on two rings) under a warm veil that is the
backdrop's own mean colour lifted toward white. A CSS shadow (two layers
cross-faded, so the lift costs no repaint) sits under it.

## Findings in GPU Chromium

### 1. The panes bend (Chromium only), and the gate is right

- `compare__pane-bend-vs-frosted__desktop.png`: where the orange orb's edge
  crosses the hero pane's bottom edge, the inward bevel hooks the edge
  toward the rim; the outward variant (`bevel=out`) hooks it the other way
  and shows a mirrored sliver, which reads like the internal reflection of a
  thick glass edge. The third panel is what Safari and Firefox get: frosted,
  rim and tint, no bend. It is good frosted glass; the bend is a Chromium
  bonus, as the founder accepted.
- Pixel check (`results.json` detect.bendPixelCheck): bend against frosted
  differs by a mean of about 2 levels per channel in the bevel band against
  about 1 in the middle (the middle differs only because the thin pane's blur
  is 4 px bent against 14 px frosted). The bend is visible where crisp edges
  cross the rim and nearly invisible over the soft wallpaper, which is why
  D7's crisp orbs matter.
- One unresolvable url() in the list (`url(#does-not-exist) blur(10px)`):
  Chromium keeps the blur (the box matches plain `blur(10px)`), see
  `detect__bad-url-list.png`. Firefox does not behave this way (research
  below), so the url() version must never be the only declaration.

### 2. Backdrop pixels stop at the element's box

`detect__outside-pixels.png`: a uniform 40 px displacement over stripes
that run past a box's right edge, with solid blue just outside it. The box's
right 40 px show stripes, not blue: 0% blue. Chromium clips the backdrop to
the border box and mirrors it past the edge. Consequences: no pane and no
SVG lens can show what lies just outside their rim; outward displacement
shows the inside mirrored. The WebGL lens is not limited this way because
it draws the backdrop itself, beyond its own rim.

### 3. The lens: WebGL, and what happens to text

- `lens__desktop__clear.png`, `lens__desktop__tinted.png`,
  `lens__phone__*.png`, `still__*`: the WebGL lens across the gold orb's edge
  shows the centre magnified, the orb edge swept into the edge band, the rim
  light, the fringe (faint, as intended) and the shadow. Tinted reads as
  frosted, warmer and more opaque.
- `compare__lens-webgl-vs-svg__desktop.png`: the same spot, WebGL against SVG,
  Clear and Tinted. The SVG lens stair-steps the orb edge (8-bit map, one
  sample per map pixel) and its edge band shows a mirrored ring, not the
  surroundings.
- `compare__lens-over-text__desktop.png`: the lens over the hero headline, three
  routes. WebGL over the content hides the text under it (an opaque-looking
  disc of wallpaper: it does not bend it, it cannot draw it). WebGL under the
  content: the text passes over the lens crisp; the pane frosts the lens
  where it overlaps. SVG: the text really bends, including a mirrored "LENS"
  at the rim. Text bending is the one thing only the SVG route can do, and
  only in Chromium.

### 4. The handling: rigid glass

Physics in `lens.js` (constants in `FEEL`): 1:1 follow while held (no lag);
release velocity from a least-squares fit over the last 80 ms of pointer
samples (coalesced events, zero if the pointer had paused 50 ms), capped at
3600 px/s; glide with exponential decay, time constant 0.20 s (no spring);
the component into a wall is dropped, never reflected; stretch along the
motion of at most 4% (and narrowing across by at most 2%), driven by speed
(63% of the maximum at 1400 px/s) through two cascaded first-order lags of
45 ms each, whose impulse response is never negative, so the stretch can
never overshoot its input or oscillate; lift while held: 1.2% larger and the
deeper shadow, eased the same way (60 ms).

Measured frame by frame (`trace__handling__desktop.png`, results.trace):

| Case | Release speed | Glide | Peak stretch | Velocity reversals | Backtrack |
|---|---|---|---|---|---|
| fling | 1157 px/s | 1067 ms, 240 px | 1.96% | 0 | 0 px |
| hard fling (hits the left wall) | 2328 px/s | stops at the wall | 3.09% | 0 | 0 px |
| fling into the right wall | 1932 px/s | stops at the wall | 2.87% | 0 | 0 px |
| zigzag drag | (held) | | 2.76% | | |

At the wall: speed just before contact 992 px/s, speed after 0, and
the lens never leaves the wall afterwards (0 px). The stretch rises and falls
once per stroke (one turning point after release), never rings. Films:
`film__drag-fling__desktop`, `film__wall-stop__desktop` (Tinted),
`film__lift__desktop`, `film__drag-fling__phone`, each as a timestamped PNG
strip and an MP4.

### 5. Frame time

rAF deltas and the frame loop's own main-thread work, recorded in the page
(results.stats, results.throttled). Desktop 1440 at 1x and 2x, phone 390 at
2x, with the lens and the panes visible:

| Viewport | Case | Frames | p50 ms | p99 ms | Max ms | Over 25 ms | Loop work mean / p95 ms |
|---|---|---|---|---|---|---|---|
| desktop 1x | idle | 120 | 16.7 | 16.8 | 16.8 | 0 | 0.12 / 0.2 |
| desktop 1x | drag, WebGL lens Clear | 201 | 16.7 | 16.8 | 16.8 | 0 | 0.18 / 0.3 |
| desktop 1x | drag, WebGL lens Tinted | 200 | 16.7 | 16.8 | 16.8 | 0 | 0.18 / 0.4 |
| desktop 1x | scroll, panes bend + lens | 276 | 16.7 | 16.8 | 16.8 | 0 | 0.27 / 0.6 |
| desktop 1x | scroll, panes frosted only + lens | 277 | 16.7 | 16.8 | 16.8 | 0 | 0.24 / 0.5 |
| desktop 1x | scroll, lens hidden | 274 | 16.7 | 16.8 | 16.8 | 0 | 0.20 / 0.5 |
| desktop 1x | scroll, CSS scroll-driven orbs | 281 | 16.7 | 16.8 | 16.8 | 0 | 0.23 / 0.5 |
| desktop 1x | drag, SVG lens | 200 | 16.7 | 16.8 | 16.8 | 0 | 0.15 / 0.3 |
| desktop 2x | drag, WebGL lens Clear | 200 | 16.7 | 16.8 | 16.8 | 0 | 0.18 / 0.4 |
| desktop 2x | drag, WebGL lens Tinted | 202 | 16.7 | 16.8 | 16.8 | 0 | 0.18 / 0.3 |
| desktop 2x | scroll, panes bend + lens | 278 | 16.7 | 16.8 | 16.8 | 0 | 0.25 / 0.5 |
| desktop 2x | scroll, panes frosted only + lens | 276 | 16.7 | 16.8 | 16.8 | 0 | 0.24 / 0.5 |
| desktop 2x | drag, SVG lens | 201 | 16.7 | 16.8 | 16.8 | 0 | 0.15 / 0.3 |
| phone 2x | drag, WebGL lens Clear | 204 | 16.7 | 16.8 | 16.8 | 0 | 0.18 / 0.4 |
| phone 2x | drag, WebGL lens Tinted | 205 | 16.7 | 16.8 | 16.8 | 0 | 0.17 / 0.3 |
| phone 2x | scroll, panes bend + lens | 243 | 16.7 | 16.8 | 16.8 | 0 | 0.16 / 0.4 |
| phone 2x | scroll, panes frosted only + lens | 245 | 16.7 | 16.8 | 16.8 | 0 | 0.16 / 0.4 |
| phone 2x | scroll, lens hidden | 242 | 16.7 | 16.8 | 16.8 | 0 | 0.11 / 0.4 |
| phone 2x | drag, SVG lens | 201 | 16.7 | 16.8 | 16.8 | 0 | 0.12 / 0.3 |
| phone 2x, CPU 6x slower | drag, WebGL lens Clear | | | 16.8 | 16.8 | 0 | 1.26 / 2.2 |
| phone 2x, CPU 6x slower | drag, WebGL lens Tinted | | | 16.8 | 16.8 | 0 | 1.32 / 2.4 |
| phone 2x, CPU 6x slower | scroll, panes bend + lens | | | 16.8 | 33.3 | 1 | 1.39 / 3.6 |
| phone 2x, CPU 6x slower | scroll, lens hidden | | | 16.8 | 16.8 | 0 | 1.20 / 2.9 |

(Phone scroll is a finger drag; see section 7. Every row is in
`results.json` with more columns.)

Every run holds 60 Hz (p99 16.8 ms) with no frame over 25 ms, except one
33 ms frame in the CPU-slowed phone scroll. In the development runs single
33 ms frames turned up just as often in the frosted-only and lens-hidden
runs, so they are not the lens's. The loop's own work (orbs, model read,
lens physics, uniforms, draw call, pane tints) is 0.1 to 0.3 ms a frame;
with the CPU slowed 6x it is 1.2 to 1.4 ms mean and 2.2 to 3.6 ms at p95
(worst single frame 6.5 ms), still well inside a 16.7 ms frame. On this GPU these runs
cannot rank the variants by GPU cost: all of them finish inside the vsync.
An attempt to measure headroom with vsync and the frame-rate limit off was
dropped as invalid (rAF then fires thousands of times a second without a
frame being produced). Pixel load, for scale: the lens canvas is 200x200 CSS
px (40,000 pixels at 1x, 160,000 at 2x desktop; 141x141 CSS px, 79,500
pixels on a phone at 2x), at 3 texture taps plus 18 disc tests a pixel in
Clear and 17 taps in Tinted. That is small next to what the panes' blurred
backdrop filters already cost the compositor, which is the heavier GPU item
on an iPhone and is the same for Safari's frosted recipe.

### 6. Rim alignment (the lens's backdrop against the true one)

- At rest (identity probe: the lens draws the model unbent, compared with
  the page with the lens hidden, inside the disc): max difference 1 level,
  mean 0 to 0.01, 0% of pixels over 8, desktop and phone, JS and CSS orb
  drivers (results.align.rest). The model matches the page exactly.
- While scrolling (seam probe: left of the lens's centre line is the model,
  right is the page; the orb edge's y is found on two columns each side,
  extrapolated to the seam, so a slanted edge does not read as an offset;
  content and bar hidden so only the backdrop is compared):

  | Viewport | Orb driver | Frames with a measurable edge | Median offset | p90 | Max | Frames over 2 px |
  |---|---|---|---|---|---|---|
  | desktop | JS, same rAF as the lens | 31 | 0.16 px | 0.54 px | 1.01 px | 0 |
  | desktop | CSS scroll timeline | 26 | 13.46 px | 15.61 px | 21.26 px | 26 (all) |
  | phone | JS, same rAF as the lens | 15 | 0.30 px | 0.30 px | 0.30 px | 0 |
  | phone | CSS scroll timeline | 15 | 0.21 px | 7.54 px | 8.70 px | 3 |

  Desktop scrolled 1100 px at 1400 px/s (mouse wheel gesture); the phone
  was two slow finger drags (about 420 px/s), so fewer frames had an edge on
  the seam while moving; its medians are dominated by the settled frames
  after the scroll (0.30 px and 0.21 px: the at-rest control).

  The JS driver keeps the lens on the page because the orbs and the lens are
  moved in the same rAF and commit in the same frame. The CSS driver lets
  the compositor move the orbs while the lens reads their boxes on the main
  thread a frame or more late (`align__seam-scroll__*.png` show the kink).

### 7. The iOS momentum-scroll risk, plainly

Chromium here cannot fling a touch scroll from CDP (measured: a 400 px flick
scrolls about 380 px and stops), so momentum was not filmed; phone
scrolling was a finger drag. On iOS, scrolling runs in the UI process. The
page's scroll position, rAF and the WebGL canvas are updated on the web
content's main thread and reach the screen later than the scroll the user
sees, most of all during a fast momentum fling, and rAF may run at 60 Hz
while the scroll runs at 120 Hz (ProMotion) or at 30 Hz in Low Power Mode.
Anything the lens draws that moves with the scroll would then trail the
real page by one to a few frames: at a 3000 px/s fling and an orb rate of
0.5, one frame at 60 Hz is 25 px of orb travel, which is a visible tear at
the rim. That is the risk.

The mitigation, in order of strength:

1. The lens is `position: fixed` on the wallpaper plane and the wallpaper is
   fixed, so the largest thing it draws never moves relative to it, whatever
   the scroll does. Keep the wallpaper at a stable size (100lvh, so the
   collapsing toolbar does not rescale the cover rect mid-scroll).
2. The orbs are moved by script in the lens's own rAF (the JS driver). Then
   the orbs on the page and the orbs in the lens are the same numbers from
   the same frame and commit together: they trail the finger together
   instead of tearing apart at the rim (Chromium: at most 1 px while
   scrolling against 21 px for a CSS timeline). What remains on iOS is the
   orbs' parallax trailing the content a little during a fling, which reads
   as depth, not as a fault.
3. Strongest: the lens rests in a calm region where the orbs near it do not
   parallax (for example the hero band, orbs with rate 0 while the lens is
   over them), so nothing it draws moves on scroll at all.
4. Cheap guard: while the page is scrolling fast (scroll events arriving
   and a speed over a threshold), ease the edge band's reach toward zero, so
   any residual mismatch is not magnified at the rim; restore it when the
   scroll settles.

A real iPhone run must confirm 2 and decide whether 3 or 4 is needed.

## Detecting url() in backdrop-filter

`CSS.supports()` cannot answer, and the proof shows it: in Chromium,
`CSS.supports('backdrop-filter', 'url(#does-not-exist) blur(2px)')` is true;
Firefox also says yes and then paints nothing for the url (bug 1995195,
closed as a duplicate of 1961378 [F2][F3]), and WebKit parses it and then
drops it (bug 245510, [W1]). Script cannot read the composited backdrop, so
a pixel test from inside the page is impossible. What is left is the engine.

The gate used (`room.js` `bendSupport()`): Blink is identified by
`navigator.userAgentData` with a brand containing "Chromium", plus the
grammar check as a guard. `userAgentData` exists only in Chromium browsers
(Chrome, Edge, Opera, Samsung Internet, Android WebView) and only in secure
contexts (https and localhost). Chrome on iOS is WebKit and has no
`userAgentData`, so it correctly gets the frosted glass. Headless Chromium
reports the brands "HeadlessChrome 153", "Not_A Brand 8", "Chromium 153" and
passes.

The CSS must be written so a wrong answer is harmless: the frosted list is
declared first, prefixed and unprefixed, with literal values (no custom
properties: Safari ignores them inside `-webkit-backdrop-filter` [B2]); the
url() version is applied by script only when the gate passes, and only to
the unprefixed property. When WebKit ships url() support (the pull requests
below), the gate keeps Safari on frosted glass until someone widens it on
purpose; that is the safe direction.

## Browser support research (09-25-26)

- **Chrome, Edge (Blink):** `backdrop-filter` since Chrome 76 [B1], and
  url() SVG filters apply in it (measured here in Chromium 153, and the
  basis of every "liquid glass" CSS demo). No prefix needed. Chromium does
  not recognise `-webkit-backdrop-filter` at all (CSS.supports false).
- **Safari desktop and iOS, 18 and 26:** BCD lists unprefixed
  `backdrop-filter` from Safari 18 and the `-webkit-` prefix from 9 [B1];
  an open BCD issue reports that Safari 18.3 still needs the prefix and
  ignores custom properties inside it [B2]; caniuse lists support in 18.0 to
  26.6 [C1]. url() in `backdrop-filter` does **not** work: WebKit bug 245510
  (feDisplacementMap and feColorMatrix via `backdrop-filter: url()`) is NEW,
  unresolved as of 09-25-26 [W1]. A fix is in review, not merged: WebKit PR
  68614 renders url() backdrop filters in software (capture the backdrop,
  run the SVG filter, clip to the rounded box), last updated 09-20-26, open,
  with known limits (no subframe content, a backdrop moved by an
  accelerated animation only updates when the element repaints) and a
  separate note that the software feDisplacementMap truncates negative
  displacements [W2]; PRs 68613 (a GPU process crash) and 69566 (WPT edge
  cases) go with it [W3][W4]. So Safari 26.x on macOS and iOS 26 give
  frosted glass only; nothing in the Safari 26.0 release notes changes that
  [W5]. Safari 26 does ship scroll-driven animations [W5], which is why the
  JS-versus-CSS orb driver question matters there too.
- **Firefox:** `backdrop-filter` since 103 (before 123 not on systems with an
  unknown GPU vendor) [B1]. url() does not apply: bug 1961378 ("backdrop-
  filter gets ignored if it would fall back to a blob image (such like with
  some SVG url filters)") is NEW, unassigned [F3]; bug 1995195 notes that
  `@supports` says yes anyway [F2]. An older regression that made the element
  vanish entirely was fixed in 106 (invalid filters now paint the
  unfiltered frame) [F1]. The safe reading: in Firefox a list containing a
  url() may lose its blur too, so never serve it one (the gate does not).
  Caveat: the two trackers do not agree on Firefox's own history here. The
  2022 text of WebKit bug 245510 said that same url()-in-backdrop-filter case
  worked in Firefox at the time; Mozilla bug 1961378, opened later, reports
  it as broken. Whether that is a Firefox regression between the two dates
  or a difference in exactly which case each report tested was not run down
  here [F3][W1].
- **Spec:** the grammar allows `<url>` in the filter list [M1]; an SVG WG
  issue asks for interoperable backdrop displacement for this exact "liquid
  glass" use [S1]. BCD has no url() sub-feature for `backdrop-filter`; an
  issue asking for one was closed as not planned [B3].
- **Also relevant:** `PointerEvent.getCoalescedEvents()` is in Safari from
  18.2 [B4]; `lens.js` falls back to the plain event without it.

## What a WebKit run would need to check

WebKit is not installed here (and was not installed). A real Safari run,
macOS Safari 26 and an iPhone on iOS 26 (and 18 if still in scope), needs:

1. The support gate: `bendSupport()` returns `bend: false` (no
   `userAgentData`), so no url() is applied; log `CSS.supports` for the
   three probe strings for the record.
2. Frosted fallback look: blur, saturate and brightness applied from the
   literal `-webkit-backdrop-filter` and the unprefixed declaration; the rim
   ring (the `-webkit-mask-composite: xor` border) draws; the adaptive tint
   and ink flip work.
3. A deliberate url() test, for the record: a box with
   `backdrop-filter: url(#f) blur(10px)` and one with the prefixed form, over
   stripes. Does Safari apply the blur, nothing, or hide the box? (The
   harness's detect stage is the pattern.)
4. The WebGL lens: context created, renderer string, `highp` in the fragment
   shader, correct colours (no premultiplied-alpha fringe at the rim), the
   wallpaper texture matching the CSS cover rect exactly (identity probe:
   `?probe=identity`, max difference should stay near 1 level).
5. Rim alignment while scrolling with real momentum, `?probe=seam`, JS and
   CSS orb drivers (`&orbs=css`): screen-record at 60 and 120 Hz and measure
   the seam offset per frame, as the align stage does. This is the iOS risk
   in number form.
6. rAF cadence during a momentum fling on ProMotion and in Low Power Mode;
   whether scroll events and rAF keep running through the fling.
7. Touch handling: dragging the lens does not scroll the page
   (`touch-action: none` on the hit disc), the fling velocity is sensible
   with and without `getCoalescedEvents`, the lens stops against the edges
   (including the safe areas and the floating Safari 26 toolbar).
8. Toolbar collapse and expansion: the wallpaper's cover rect and the lens's
   model stay together (use 100lvh in Tier B).
9. Frame time while dragging and scrolling with three panes and the lens on
   an older iPhone (the panes' blurs are the likely cost), and memory and
   WebGL context loss after backgrounding the tab.
10. `prefers-reduced-transparency` and increased contrast (E10): what Safari
    exposes, and that the lens has an off state too (a plain frosted disc).

## For Tier B: one wallpaper source, not two

This proof's wallpaper and the palette proof's `warm.css` do not paint the
same way, and that gap matters once the lens and the panes have to agree on
what the backdrop looks like. This proof paints the wallpaper once, to a
canvas, at load (sky, five coral-to-deep-blue wave bands, a sun glow) and
hands that same bitmap to both the CSS background and the lens's texture, so
the two can never disagree; its orbs are flat, single-colour discs. The
palette proof's `warm.css` paints the wallpaper with CSS radial gradients
declared straight in the stylesheet, and its orbs are two-stop gradients, not
flat discs. A WebGL lens reading the DOM and CSS to reconstruct a scene it
must also draw itself needs one description of that scene, not two: if Tier
B ships this lens over the palette proof's wallpaper, either the lens has to
parse CSS gradients accurately enough to reproduce a two-stop orb (fragile,
and it will drift the next time someone tunes a gradient stop), or the
palette work moves to the same one-canvas-source pattern this proof uses, and
both the CSS layer and the lens read from it. Tier B should pick the second:
paint the chosen wallpaper and orb style once, from one module, and hand it
to the CSS side as a background image and to the lens as a texture, the same
way this proof does. Otherwise the rim is a seam between two different
pictures of the same wallpaper, which is the exact failure route 2 above
exists to prevent for scroll position; it applies just as much to the
picture's own content.

## Recommendation for Tier B

- **Architecture.** Panes: frosted base list for every engine; url()
  bevel map added by script behind the Blink gate; rim ring and adaptive tint
  in CSS and a little script. Default the bevel to inward (it keeps the
  pane's own colour at the rim); offer outward to the founder as the
  "thick edge" variant, since it is a taste call. Lens: WebGL in every
  engine, one canvas the lens's size, drawn from the backdrop model; draw
  only when something changed (the lens moved, the scroll moved, the tint
  eased), pause when hidden or off-screen (the house rule for WebGL fields),
  handle context loss, and show a CSS frosted disc as its poster so the
  portal's drawn-ahead copy and a failed context both still show a lens.
  Orbs: moved by the lens's rAF on pages with the lens; CSS scroll timelines
  elsewhere are fine.
- **Placement.** `position: fixed`, on the wallpaper plane under the
  content, starting in the Home hero's empty half across an orb edge, bounded
  to the viewport minus a small inset (and, in Tier B, below the header bar
  and above any bottom chrome).
- **Per browser.** Chromium (desktop and Android): panes bend, lens refracts.
  Safari (macOS and iOS 18 to 26) and Firefox: panes frosted with rim and
  tint, lens refracts identically. Chrome on iOS: as Safari.
- **Handling.** Keep the `FEEL` constants as proven (4% stretch cap, 0.20 s
  glide, stop at edges, 60 ms lift). The founder should feel it on a phone;
  the glide time is the one number most likely to want a nudge. At that same
  phone-feel check, also offer a one-constant option on the wall stop: today
  the stretch eases back out over about 240 ms after the lens stops dead at
  an edge (measured in the trace stage's wall-stop cases), which reads as
  settled but unhurried; a faster release (shortening that ease-out) would
  read snappier at the cost of feeling less like give in the glass. Not
  changed here, offered as a taste call alongside the glide time.
- **Cost.** About 0.1 ms of main-thread work a frame on this desktop and
  about 1 ms at 6x CPU slowdown; 40,000 to 160,000 shaded pixels a frame
  while the lens moves, nothing when it rests (once draw-on-change is in).
  The panes' blurs, not the lens, are the GPU item to watch on phones.
- **Risks.** (1) iOS momentum tearing at the rim: mitigated by the fixed
  lens and the shared-rAF orbs, unproven until a device run. (2) Text under
  the lens: under-content placement keeps it readable; if Tier B moves the
  lens over content, text under it disappears. (3) Chromium-only bend means
  the founder's iPhone never shows bent panes; the lens is where refraction
  shows everywhere. (4) When WebKit lands url() backdrop filters (PR 68614)
  with its software path, re-test before widening the gate: a software
  backdrop filter on three panes may cost more than it gives.

## Outputs

All in `scripts/themes/.out/stage3-proofs/lens/` (gitignored):
`still__{desktop,phone}__{clear,tinted}.png`,
`still__{desktop,phone}__clear__frosted-fallback.png`,
`lens__{desktop,phone}__{clear,tinted}.png`,
`pane-hero__*.png`, `compare__pane-bend-vs-frosted__desktop.png`,
`compare__lens-over-text__desktop.png`, `compare__lens-webgl-vs-svg__desktop.png`,
`detect__bad-url-list.png`, `detect__outside-pixels.png`,
`film__{drag-fling,wall-stop,lift,scroll}__desktop.{png,mp4}`,
`film__{drag-fling,scroll}__phone.{png,mp4}`,
`align__seam-scroll__{desktop,phone}__orbs-{js,css}.png`,
`trace__handling__desktop.png`, `results.json`, `run.log`.

## Limits of this proof

- Chromium only; Safari and Firefox are research plus the Chromium
  rendering of their fallback.
- No touch momentum (CDP touch flicks do not fling in this Chromium), so
  the phone scroll numbers are finger-driven.
- The RTX 3070 finishes every variant inside the vsync, so frame times
  prove "no jank on a strong desktop GPU and a slowed CPU", not iPhone GPU
  headroom.
- The Tinted look is a first pass (frost plus warm veil); the founder saw
  and liked a mock of it, and Tier B should put this version in front of
  them.

## Sources

- [B1] MDN browser-compat-data, `css/properties/backdrop-filter.json`,
  https://github.com/mdn/browser-compat-data/blob/main/css/properties/backdrop-filter.json
- [B2] BCD issue 25914, "There is no full support in Safari 18. We still need
  `-webkit-` prefix, and we can't use CSS variables",
  https://github.com/mdn/browser-compat-data/issues/25914
- [B3] BCD issue 24110, "SVG filters not supported in Firefox or Safari",
  https://github.com/mdn/browser-compat-data/issues/24110
- [B4] BCD `api/PointerEvent.json` (getCoalescedEvents),
  https://github.com/mdn/browser-compat-data/blob/main/api/PointerEvent.json
- [C1] caniuse, CSS backdrop-filter, https://caniuse.com/css-backdrop-filter
- [M1] MDN, backdrop-filter,
  https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/backdrop-filter
- [W1] WebKit bug 245510, https://bugs.webkit.org/show_bug.cgi?id=245510
- [W2] WebKit PR 68614, https://github.com/WebKit/WebKit/pull/68614
- [W3] WebKit PR 68613, https://github.com/WebKit/WebKit/pull/68613
- [W4] WebKit PR 69566, https://github.com/WebKit/WebKit/pull/69566
- [W5] WebKit, "WebKit Features in Safari 26.0",
  https://webkit.org/blog/17333/webkit-features-in-safari-26-0/
- [F1] Mozilla bug 1787623, https://bugzilla.mozilla.org/show_bug.cgi?id=1787623
- [F2] Mozilla bug 1995195, https://bugzilla.mozilla.org/show_bug.cgi?id=1995195
- [F3] Mozilla bug 1961378, https://bugzilla.mozilla.org/show_bug.cgi?id=1961378
- [S1] w3c/svgwg issue 1142, https://github.com/w3c/svgwg/issues/1142
- Dossier [3] [4] [5] (Apple HIG Materials; "Meet Liquid Glass"; Apple
  Newsroom 06-09-25) for the look: lensing, specular edge, adaptive tint,
  Clear and Tinted.
