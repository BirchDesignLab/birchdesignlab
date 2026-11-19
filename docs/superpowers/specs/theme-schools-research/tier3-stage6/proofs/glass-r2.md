# Proof: glass R2, a lens that bends the real page

Stage 6 wave 1, task 7 (11-19-26). Source: `../a1-critic-glassmorphism.md`
G5 and R2; stop 1 call 2 (an R2 Home-only proof shown at stop 2; if taken, R2
becomes its own stage). A proof: nothing under `src/` changed.

## What it is

`scripts/themes/proofs/stage6-glass-r2/` holds `proof.js`, `proof.css` and
`serve.mjs`. `serve.mjs` serves a frozen build (snap `s6-w1-t7`, HEAD
`910268e`, so R1 from tasks 1 to 3 is in) and injects the two proof files into
glass Home only, so the markup, styles, fx.ts panes, orbs and switcher are the
real ones. To look at it live in Chrome or Edge:

```
node scripts/themes/snap.mjs --name s6-w1-t7
node scripts/themes/proofs/stage6-glass-r2/serve.mjs --snap s6-w1-t7 --port 4470
open http://127.0.0.1:4470/t/glassmorphism/        (?r2=off: the page as built)
```

It adds three things over the page:

1. **The lens.** A 248px disc (148px under 720px wide) in the top layer (a
   manual popover, so it sits above the header, panes, switcher and any
   dialog). Its `backdrop-filter` is `url(#r2-lens-f)`: one feImage
   displacement map into feDisplacementMap, no blur. The map magnifies the
   face about 1.45x and pulls a ring of the backdrop into the rim (a thick
   bent edge, 18px of extra pull easing out over 30px). A sheen and an inset
   hairline draw the glass; there is no fill. The face ignores the pointer.
   Only a 16px ring along the rim (a real `<button>`, clipped to the ring
   with an even-odd `clip-path`, which hit testing honours) grabs it. Arrow
   keys move it 12px (Shift: 48px) while the button has focus. Today's WebGL
   lens is hidden while the proof runs.
2. **The header as a clear rod.** The bar's fx.ts frost and rim layers, its
   CSS frost and R1's scroll-edge fade step aside; the fill drops to 0.10
   (light) and 0.16 (dark); one unblurred displacement layer under the bar's
   content stretches what scrolls beneath about 1.5x tall across the middle
   and squeezes it into the top and bottom rims.
3. **One toy: a glass ruler.** A 340 x 70 pill (230 x 56 on phones), the same
   machinery, magnifying lines 1.7x tall and 1.12x wide, dragged by its rim
   along a paragraph.

## What the films show

All on GPU Chromium (ANGLE D3D11, RTX 3070), reduced transparency forced to
no-preference, the portal prompt suppressed. Output:
`scripts/themes/.out/stage6/w1/t7/` (scratch, not committed), made by
`scripts/themes/stage6/w1-t7-proof.mjs`.

- `sheet-1440-light.png`, `sheet-1440-dark.png`: the lens on "Birch",
  "Design", "Lab", the paragraph and the Control Centre, and the ruler on
  the paragraph.
- `sheet-header-light.png`, `sheet-header-dark.png`: the bar over the
  headline's second line, the paragraph and the Control Centre labels.
- `sheet-390.png`: one 390 frame per scheme (lens on the headline, ruler on
  the paragraph).
- Strips (timestamped): `strips/lens-drag__{light,dark}__1440.png` (rim drag
  across "Birch Design Lab" and on over the paragraph),
  `strips/header-scroll__{light,dark}__1440.png` (cropped to the bar),
  `strips/pill__{light,dark}__1440.png`, `strips/lens-drag__{light,dark}__390.png`,
  `strips/arrival__light__{1440,390}.png` (from quiet through the real
  switcher: the proof mounts after the ClientRouter swap, lens and bar both
  up by the first frame of the new view).

What reads: the headline letters swell under the face and curl into the rim,
body text grows to about headline-lede size, the Control Centre's tiles and
switch bend with the frost behind them (glass on glass works: the lens bends
the panes' own frost, plates and text). Under the bar, big type turns into
tall, rim-squeezed letterforms that clearly move as the page scrolls.

Visible flaws, all inherent to the recipe as built:

- **Stepped edges.** Chromium's feDisplacementMap samples nearest-pixel, and
  the 8-bit map steps every 0.44px of displacement at 1440 (scale 112px), so
  magnified letter edges show 2 to 3px stairs at DPR 1 (crisper at DPR 2).
  A sub-pixel blur after the displacement (0.3 to 0.4px) would hide it at
  the cost of a hair of softness; not tried, the brief says no blur.
- **The bar fights its own content.** With the frost gone, the wordmark and
  nav sit straight on top of bent page text (sheet-header). Readable at the
  sizes filmed, but busy; it would need a quiet plate under the nav pill and
  wordmark, or a little frost kept behind them only.
- **No chromatic edge, no lighting on the bend.** The rim is geometry only;
  a real Liquid Glass rim also tints and brightens. Cheap to add as CSS.

## Frame cost

A scripted 3 s circular rim drag (lens runs) and a 60-tick wheel scroll (bar
runs), Chrome trace per run (`traces/*.json`). "Per frame" is busy time on a
thread over the trace window divided by presented frames. The WebGL rows are
the page as built (`?r2=off`), dragging today's lens.

| run | size | presented/s | rAF p95 | renderer main | compositor | viz | GPU main |
|---|---|---|---|---|---|---|---|
| R2 lens drag | 1440 | 59.5 | 16.8 ms | 1.45 ms | 5.86 ms | 3.14 ms | 1.45 ms |
| WebGL lens drag | 1440 | 59.7 | 16.7 ms | 2.82 ms | 5.64 ms | 3.17 ms | 1.72 ms |
| R2 bar, scroll | 1440 | (see note) | 33.4 ms | 1.65 ms | 4.68 ms | 2.63 ms | 2.72 ms |
| as built, scroll | 1440 | (see note) | 33.4 ms | 2.35 ms | 4.72 ms | 2.61 ms | 2.63 ms |
| R2 lens drag | 390 | 39.6 | 16.7 ms | 1.38 ms | 3.34 ms | 2.16 ms | 0.75 ms |
| WebGL lens drag | 390 | 59.7 | 16.8 ms | 2.48 ms | 2.51 ms | 1.31 ms | 0.98 ms |
| R2 bar, scroll | 390 | (see note) | 33.4 ms | 1.64 ms | 4.19 ms | 2.52 ms | 2.91 ms |
| as built, scroll | 390 | (see note) | 33.4 ms | 1.91 ms | 3.26 ms | 2.03 ms | 2.84 ms |

Reading it:

- **Drag: R2 is no dearer than today's lens, and halves the main-thread
  work.** No dropped frames in any drag run, rAF steady at 16.7 ms. The
  WebGL lens redraws its canvas from script every frame; the R2 lens only
  moves a transform and lets the compositor re-filter. The 390 R2 run
  presented 40/s with 61 "no update desired" frames: the mouse moves landed
  slower than vsync in that context, not missed frames (rAF p95 16.7 ms).
- **Scroll: parity.** The bar's displacement layer costs about 0.1 ms of GPU
  time per frame over the frosted bar it replaces. The p95 of 33 ms is the
  same in both and is headless wheel delivery, not the page. Presented/s in
  scroll runs counts two frame sources (main and compositor) and reads over
  60; ignore it, compare the busy columns.
- **Caveat.** This laptop GPU is far stronger than a phone's. The R2 cost
  is per covered pixel per frame (a backdrop read plus one displacement
  pass under the lens, the ruler and the bar), so a real phone trace on
  Android Chrome belongs in the build stage. iPhone never runs it (below).

## Hit testing over links

Measured by `--hits` with the lens parked on "Visit the lab" (`/lab/`), a
point every 4px over the disc:

| | 1440 | 390 |
|---|---|---|
| face points that hit the rim button | 0 of 2188 | 0 of 609 |
| ring points that hit the rim button | 100% (660) | 100% (376) |
| face points over a control where what you click is not what you see | 48% (470 of 973) | 28% (138 of 485) |
| largest gap between pointer and the point seen | 36px | 18px |
| click at the face centre | lands on the link, `/lab/` | same |
| rim drag 60,30px | lens moved 60,30 | same |
| keys (Right, Right, Shift+Down) | moved 24,48 | same |

So pass-through works exactly as built: the face never steals a click, the
rim always grabs, and the keyboard moves it. The catch is the magnifier
itself: what the eye sees at a point on the face came from up to 36px
nearer the centre, so near the face's edge a visible link is not the thing
under the pointer (every mismatch was "link seen, something else hit"; none
the other way round). Clicking dead centre is always right. Options for the
build: (a) accept it (a lens is for looking; the centre is honest), (b) make
the face a click target that re-dispatches to the element under the sampled
point (`elementFromPoint` of pointer plus displacement; the map is already
in script), so you click what you see, or (c) drop magnification and keep
only the rim bend, so the face is 1:1. Recommend (b) if R2 is built: about
40 lines, and it keeps hover, focus and the cursor honest if it also
forwards `pointermove` for hover styles.

## Chromium only

- **Chrome and Edge (desktop and Android):** everything above. The gate is
  fx.ts's `bendSupported()` (Blink brand plus the grammar check), copied.
- **Safari, all iPhones (every iOS browser is WebKit), and Firefox:** url()
  in backdrop-filter does nothing (WebKit's patch is unmerged; Firefox drops
  the whole filter list). The proof does nothing there, by design; in a
  build they keep today's WebGL lens, and the header keeps R1's frosted bar.
  Not wired in the proof. That means the iPhone, likely the most common
  phone in the audience, never sees R2's main effect.
- **Top layer:** the lens and ruler are manual popovers, so they sit above
  the switcher and any dialog. In a build they must close (hidePopover) when
  the portal's switcher or another school takes the top layer, and must not
  carry a `view-transition-name` (they would fly in arrivals).
- **The bar's backdrop root:** the bar layer only sees the page because the
  bar is not a backdrop root (no filter, opacity or mask on `.bar`). R1
  already relies on this; any later filter on the header breaks both.
- **Map precision:** 8-bit maps cap smooth bends; a stronger lens means
  coarser steps. Not a problem at these strengths.

## What building it for real would take

Its own stage, as stop 1 recommended. Roughly six tasks:

1. **The Chromium lens path in `lens/`.** A new `lens/glass-r2.ts` that
   mounts the popover lens on Home where `bendSupported()`, and the WebGL
   lens otherwise. Reuses physics.ts for drag, throw, rest and the existing
   `lens-hit` keyboard contract (the rim button replaces the full-disc hit;
   task 1's rest rules about panes stop mattering, since the lens is now on
   top of them). Session hold, idle-after-arrival and the one-lens-per-visit
   rule carry over. Risk: the view-transition lifecycle (arrival, in-school
   swap, drawing ahead) must film clean; the lens must not appear in the old
   or new snapshot mid-transition.
2. **Click what you see** (hit-testing option b), with hover forwarding and
   a test that a link at the face edge receives the click.
3. **The clear header and footer bars.** fx.ts grows a "rod" map mode beside
   the rim band; the scroll-edge fade is retired for Chromium only; a quiet
   plate under the nav pill and wordmark; meta.ts contrast pairs for the
   wordmark and nav over the worst bent content (the bar no longer frosts,
   so the worst-orb method needs a plate, a D2-style founder call).
4. **Toys** (two or three): the ruler over the Services steps, slider thumbs
   that magnify their track (the Frost slider), maybe a pill lens on About.
   Each a real control with an aria-label starting with a visible word.
5. **Polish:** sub-pixel antialias after displacement if the stairs bother
   the founder; a light chromatic rim and a moving specular on the bend.
6. **Evidence:** films at every review size, both schemes; an Android Chrome
   trace on a real mid-range phone; Safari and Firefox fallback films.

Risks to weigh before committing: iPhone never sees it; glass on glass over
the panes is a canon bend (the panes keep frost, the lens is clear, so the
two materials differ); the bar losing its frost puts the nav on busy
content; and the stepped-edge look is a Chromium filter limit, not tunable
away without the small blur.

## Founder calls for stop 2

1. R2 as its own stage, yes or no.
2. If yes: click what you see (b), accept the mismatch (a), or bend only (c).
3. The bar: fully clear rod as shown, or keep a little frost behind the
   wordmark and nav.
4. The stepped edges: accept, or allow a 0.3px antialias blur.
