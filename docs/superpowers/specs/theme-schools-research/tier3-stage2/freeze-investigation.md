# The first-draw freeze: measurement and attribution

Written 09-23-26 (runs finished 09-24-26), Tier 3 Stage 2 (the Portal,
BDL-010), by the measurement agent (agent M) of the freeze investigation
the founder asked for at the wave B stop (tier3-briefs/stage0-decisions.md,
"At the wave B stop"). Measurement only: nothing under `src/` was changed.
The two reductions, drawing the next page ahead of time (D) and making heavy
schools cheaper to draw the first time (L), belong to the agents after this
one. What each looks likely to save is at the end, with the measured
prototype behind it. The founder's framing binds: stalls are reduced where
possible, never promised away.

## The short answer

- **The freeze is real, and it is mostly the GPU compiling programs.** On a
  first arrival in a fresh browser, the stalling schools hold one frame for
  about 180 to 450 ms. A Chrome trace agrees with the screencast in every
  case (the screencast adds 0 to about 30 ms of its own capture cost, and it
  joins two stalls back to back into one when the frame between them shows
  nothing new).
  - **grandmillennial, cottagecore (desktop), glassmorphism:** 60 to 90% of
    the hold is Skia compiling a GPU program for every new kind of paint the
    page draws for the first time (38, about 25 and 25 to 35 programs, 170
    to 275 ms of compile, most of it the driver linking them through ANGLE).
    It is not the pattern tiling, the path count or image decoding as such:
    the drawing itself takes 10 to 20 ms once the programs exist.
  - **The rest is the main thread's first render of the page** (style,
    layout, text shaping): about 60 ms (glass) to 130 ms (cottagecore) on
    desktop, before the new snapshot can be taken. P4 measured this part.
  - **vaporwave** is different: about 70 ms of the main thread waiting on
    the GPU while its sunset's WebGL program links (the page script checks
    the link status straight away), 65 ms of text shaping, then 95 ms of
    raster programs.
  - **bauhaus and swiss do not freeze.** Bauhaus holds 82 to 86 ms, all main
    thread first render. Swiss's steady 100 ms is its step-timed wipe
    showing nothing new for 100 ms, with the GPU idle: not a stall.
  - **quiet as a destination** (from vaporwave) holds 36 to 50 ms in every
    condition. No freeze.
- **Dark is not the cause.** Dark and light are within 10% of each other for
  every school except glassmorphism, which is worse in light on desktop
  (352 against 230 ms) and better in light on mobile (184 against 293).
- **It is a fresh-browser cost.** A second arrival in the same browser holds
  35 to 75 ms for every school. With the programs already compiled in the
  browser (the same school drawn earlier in that browser, a stand-in for a
  visitor whose Chrome keeps them), the hold is grandmillennial 124 ms (not
  446), cottagecore 157, vaporwave 124, glassmorphism 84: what is left is
  the main-thread first render.
- **The portal's shipped warm-up (switcher-warm) does not touch it**: within
  about 20 ms of cold everywhere. It fetches; the freeze is drawing.
- **The P4 off-screen draw (pf-render) saves only the main-thread part**
  (40 to 110 ms). It draws the destination at opacity 0, and Chrome skips
  rasterising anything at opacity 0, so no GPU program is compiled.
- **Drawing the destination ahead for real removes most of it.** The same
  copy drawn over the page at opacity 0.001 (pf-raster) moves no 8-bit pixel
  (checked, one exception below) and gets every program compiled before the
  click. Longest hold, desktop dark: grandmillennial 446 to 48,
  glassmorphism 230 to 34, cottagecore 378 to 84, vaporwave 284 to 143.
  What is left in vaporwave and cottagecore is mostly their scripts'
  canvases (WebGL, 2D), which a script-less copy cannot warm. The in-school
  swap (Home to About) freezes too, 188 to 300 ms for grandmillennial and
  about 200 to 220 for vaporwave, and the same drawn copy takes it to about
  30.
- **One visible exception:** on desktop, drawing glassmorphism's copy over the
  page changes the page's own antialiased text (the nav and the switcher bar
  lose subpixel antialiasing while the copy is up, up to 132 levels on glyph
  edges). Mobile is clean. D has to solve that before it can ship for glass.

## Method

Everything ran against one frozen build of HEAD (`79476c3`),
`snap.mjs --name freeze-base`, served on :4491. Nothing else was timed or
built while a batch ran; batches ran one after another
(`scripts/themes/harness/freeze-baseline.mjs`).

- **Browser:** Playwright Chromium, `BDL_GPU=1` (ANGLE D3D11 on the RTX 3070
  laptop GPU, confirmed by `WEBGL_debug_renderer_info` in every batch).
  Desktop 1440x900; mobile 390x844 at 2x with touch (the desktop CPU and GPU:
  these are not phone numbers). Reduced motion off.
- **Fresh browser per run** (`trace-arrival.mjs --fresh-browser`, new): every
  cold, switcher-warm, pf-render and pf-raster run launches its own browser
  process on a new temporary profile, so the GPU process starts with no
  compiled programs, as it did for the wave B strips. `warm` is the second
  arrival in the cold run's browser. Earlier trace-arrival runs (P4) used one
  browser for all runs, so only run 1 of each batch paid the compile cost;
  that is why P4's medians sit well under wave B's strips.
- **Trips:** every school arriving from quiet; quiet arriving from vaporwave
  (quiet loaded first, as a visitor enters there); the in-school swap Home to
  About for the four heavy schools (quiet, then the school's Home by a hard
  load, then the swap). Five runs per condition, per viewport, per scheme.
- **The freeze number:** the longest gap between screencast frames from the
  click to `finished` + 100 ms, measured as motion.mjs's `dense.maxGapMs` is.
  The screencast only sends a frame when something on screen changed, so a
  gap is time the visitor saw nothing move. Each run also records the longest
  gap between the page's animation frames (rAF), first visible change,
  `ready` and `finished`.
- **The cross-check:** Chrome traces (`--trace`, three per school on desktop
  dark and light and mobile dark, filmed, plus two per heavy school not
  filmed). The trace gives every frame the display compositor actually drew
  (`Display::DrawAndSwap`), so the longest presented-frame gap can be put next
  to the screencast's, and every thread's work inside that gap is summed by
  category. Skia's and ANGLE's own trace categories were added, so a raster
  flush splits into program compiles and the drawing itself.
- **Stubs** (`--stub`, `scripts/themes/harness/freeze-stubs.mjs`): one layer
  of the destination taken out by paint (visibility hidden, no mask, no
  filter, no shadow, no background image, transparent text, no 2D canvas or
  WebGL context), cold, desktop dark, 5 runs each.
- **Conditions:**
  - `cold`: nothing of the destination fetched or drawn before;
  - `warm`: a second arrival in the same browser;
  - `switcher-warm`: the portal's shipped warm-up (dialog opened, warm-up
    finished, dialog closed, then the switch);
  - `pf-render`: P4's diagnostic, the destination drawn once in a
    script-less `srcdoc` iframe at opacity 0, then removed;
  - `pf-raster` (new): the same copy drawn on top of the page at opacity
    0.001, left 400 ms so its tiles reach the GPU, then removed. The copy
    wears the scheme and the `.js` marker the runtime carries at the swap
    (with no script in it, it would draw the scheme-less light page), and
    not `.reveal-on` (which hides every `[data-reveal]` block until the
    page's script settles it, so the copy would never draw those). Both
    mistakes were made first and measured; the tables use the corrected
    runs (`raster3-*`).

## Baseline

Numbers are ms after the click, median of 5 (min to max).

#### Cold arrival, fresh browser: longest screencast gap (median, min to max), then first visible / ready / finished medians

| destination | desktop-dark | desktop-light | mobile-dark | mobile-light |
|---|---|---|---|---|
| grandmillennial | 446 (428 to 555); 491 / 123 / 776 | 451 (441 to 457); 488 / 122 / 773 | 381 (377 to 390); 417 / 105 / 769 | 348 (343 to 368); 385 / 106 / 761 |
| cottagecore | 378 (374 to 382); 436 / 154 / 808 | 396 (384 to 398); 446 / 167 / 821 | 380 (340 to 400); 457 / 155 / 794 | 353 (353 to 359); 389 / 138 / 803 |
| vaporwave | 284 (279 to 286); 326 / 113 / 839 | 295 (216 to 297); 336 / 121 / 849 | 279 (196 to 314); 325 / 93 / 826 | 264 (184 to 265); 303 / 94 / 825 |
| glassmorphism | 230 (229 to 244); 223 / 95 / 455 | 352 (340 to 365); 398 / 99 / 459 | 293 (266 to 337); 187 / 104 / 478 | 184 (184 to 185); 243 / 93 / 458 |
| bauhaus | 85 (82 to 85); 177 / 75 / 855 | 86 (84 to 89); 199 / 81 / 858 | 82 (80 to 84); 125 / 83 / 859 | 82 (79 to 88); 118 / 74 / 853 |
| swiss | 100 (93 to 100); 105 / 58 / 719 | 100 (99 to 102); 117 / 68 / 727 | 100 (99 to 102); 96 / 62 / 725 | 100 (96 to 102); 89 / 54 / 718 |
| quiet (from vaporwave) | 37 (33 to 60); 127 / 79 / 353 | 36 (35 to 48); 140 / 74 / 343 | 39 (34 to 49); 99 / 49 / 326 | 36 (33 to 40); 96 / 46 / 324 |

#### Longest screencast gap by condition, desktop-dark (median, min to max)

| destination | cold | warm | switcher-warm | pf-render | pf-raster |
|---|---|---|---|---|---|
| grandmillennial | 446 (428 to 555) | 49 (47 to 50) | 433 (425 to 436) | 377 (374 to 393) | 48 (46 to 49) |
| cottagecore | 378 (374 to 382) | 74 (67 to 80) | 361 (336 to 369) | 277 (275 to 286) | 84 (78 to 87) |
| vaporwave | 284 (279 to 286) | 65 (64 to 73) | 276 (269 to 282) | 223 (221 to 225) | 143 (142 to 148) |
| glassmorphism | 230 (229 to 244) | 39 (36 to 41) | 236 (233 to 248) | 236 (228 to 243) | 34 (31 to 38) |
| bauhaus | 85 (82 to 85) | 40 (38 to 42) | 81 (69 to 82) | 51 (51 to 54) | 39 (37 to 40) |
| swiss | 100 (93 to 100) | 100 (99 to 103) | 99 (98 to 101) | 100 (99 to 101) | 100 (99 to 103) |
| quiet (from vaporwave) | 37 (33 to 60) | 40 (34 to 50) | 35 (31 to 52) | 50 (33 to 52) | 38 (35 to 61) |

#### Longest screencast gap by condition, desktop-light (median, min to max)

| destination | cold | warm | switcher-warm | pf-render | pf-raster |
|---|---|---|---|---|---|
| grandmillennial | 451 (441 to 457) | 55 (48 to 72) | 435 (429 to 452) | 382 (376 to 385) | 49 (46 to 50) |
| cottagecore | 396 (384 to 398) | 70 (68 to 73) | 391 (380 to 394) | 271 (260 to 292) | 113 (110 to 115) |
| vaporwave | 295 (216 to 297) | 67 (62 to 68) | 289 (208 to 304) | 228 (215 to 234) | 142 (139 to 144) |
| glassmorphism | 352 (340 to 365) | 47 (46 to 50) | 353 (348 to 360) | 305 (303 to 323) | 39 (37 to 40) |
| bauhaus | 86 (84 to 89) | 41 (39 to 58) | 84 (81 to 87) | 52 (50 to 59) | 41 (40 to 44) |
| swiss | 100 (99 to 102) | 102 (99 to 103) | 101 (99 to 109) | 100 (100 to 102) | 100 (99 to 100) |
| quiet (from vaporwave) | 36 (35 to 48) | 33 (31 to 55) | 47 (31 to 50) | 39 (32 to 49) | 48 (38 to 50) |

#### Longest screencast gap by condition, mobile-dark (median, min to max)

| destination | cold | warm | switcher-warm | pf-render | pf-raster |
|---|---|---|---|---|---|
| grandmillennial | 381 (377 to 390) | 52 (50 to 61) | 378 (373 to 379) | 327 (325 to 330) | 45 (44 to 47) |
| cottagecore | 380 (340 to 400) | 73 (58 to 77) | 336 (280 to 373) | 286 (220 to 299) | 119 (117 to 122) |
| vaporwave | 279 (196 to 314) | 61 (57 to 71) | 268 (192 to 271) | 244 (243 to 255) | 136 (71 to 139) |
| glassmorphism | 293 (266 to 337) | 35 (34 to 40) | 291 (288 to 318) | 294 (290 to 311) | 32 (32 to 34) |
| bauhaus | 82 (80 to 84) | 36 (35 to 38) | 78 (75 to 80) | 50 (48 to 52) | 38 (36 to 40) |
| swiss | 100 (99 to 102) | 100 (94 to 107) | 100 (90 to 101) | 101 (99 to 101) | 101 (94 to 102) |
| quiet (from vaporwave) | 39 (34 to 49) | 35 (32 to 49) | 39 (37 to 61) | 49 (38 to 61) | 41 (32 to 56) |

#### Longest screencast gap by condition, mobile-light (median, min to max)

| destination | cold | warm | switcher-warm | pf-render | pf-raster |
|---|---|---|---|---|---|
| grandmillennial | 348 (343 to 368) | 46 (45 to 54) | 339 (331 to 357) | 295 (294 to 298) | 46 (45 to 49) |
| cottagecore | 353 (353 to 359) | 69 (65 to 70) | 345 (344 to 351) | 243 (239 to 248) | 102 (100 to 106) |
| vaporwave | 264 (184 to 265) | 60 (58 to 62) | 259 (256 to 260) | 235 (219 to 238) | 138 (71 to 144) |
| glassmorphism | 184 (184 to 185) | 33 (32 to 34) | 183 (180 to 185) | 175 (174 to 183) | 33 (32 to 33) |
| bauhaus | 82 (79 to 88) | 37 (35 to 39) | 79 (79 to 81) | 49 (48 to 51) | 39 (38 to 43) |
| swiss | 100 (96 to 102) | 100 (100 to 100) | 100 (99 to 113) | 100 (98 to 104) | 100 (100 to 108) |
| quiet (from vaporwave) | 36 (33 to 40) | 39 (31 to 51) | 39 (33 to 49) | 37 (31 to 49) | 42 (37 to 51) |

#### In-school swap, Home to About (longest screencast gap, median, min to max)

| school | desktop-dark cold | desktop-dark warm | desktop-dark pf-raster | desktop-light cold | desktop-light warm | desktop-light pf-raster | mobile-dark cold | mobile-dark warm | mobile-dark pf-raster | mobile-light cold | mobile-light warm | mobile-light pf-raster |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| grandmillennial | 300 (290 to 303) | 34 (25 to 44) | 28 (27 to 30) | 188 (185 to 191) | 30 (27 to 31) | 27 (21 to 30) | 275 (271 to 276) | 26 (23 to 30) | 30 (29 to 31) | 254 (253 to 256) | 30 (24 to 30) | 32 (22 to 33) |
| cottagecore | 84 (73 to 91) | 44 (34 to 50) | 37 (34 to 43) | 241 (238 to 248) | 26 (25 to 30) | 154 (152 to 213) | 43 (26 to 75) | 43 (38 to 49) | 46 (31 to 79) | 78 (76 to 85) | 31 (30 to 32) | 75 (73 to 78) |
| vaporwave | 221 (126 to 258) | 28 (25 to 38) | 30 (27 to 35) | 222 (214 to 254) | 30 (29 to 39) | 30 (28 to 37) | 202 (178 to 231) | 33 (25 to 38) | 30 (28 to 30) | 205 (183 to 217) | 35 (26 to 39) | 30 (26 to 35) |
| glassmorphism | 31 (29 to 41) | 32 (26 to 38) | 27 (26 to 28) | 27 (26 to 38) | 31 (24 to 42) | 27 (25 to 34) | 26 (23 to 31) | 27 (26 to 27) | 29 (26 to 29) | 25 (24 to 31) | 28 (21 to 29) | 29 (24 to 30) |

## Is the gap a freeze or the camera?

A freeze. Longest presented-frame gap from the trace (the frames the display
compositor drew), against the screencast gap of the same run, desktop dark,
cold, fresh browser:

| school | screencast gap | presented gaps (longest first) | same, not filmed |
|---|---|---|---|
| grandmillennial | 455, 457, 458 | 313 + 111 before it | 288 + 107, 281 + 105 |
| cottagecore | 431, 404, 414 | 260 + 171, 239 + 164, 230 + 175 | 206 + 149, 206 + 150 |
| vaporwave | 296, 317, 219 | 184 + 118, 193 + 132, 113 + 113 | 179 + 115, 180 + 117 |
| glassmorphism | 216, 215, 219 | 224, 220, 227 | 221, 222 |
| bauhaus | 85, 86, 85 | 71, 72, 71 | not run |
| swiss | 100, 101, 102 | 100 (GPU idle, nothing changing) | not run |

- In grandmillennial, cottagecore and vaporwave the screen gets two long
  holds in a row, with one presented frame between them that shows the same
  old snapshot. The screencast sends no frame for it (nothing changed), so
  it reports the two as one hold. That is what a visitor sees too.
- Filming adds 0 to about 30 ms to the GPU-bound hold (grandmillennial 306 to
  314 filmed, 281 to 288 not), because the screencast's readback competes
  with the GPU. It never makes a stall out of nothing: every screencast gap
  over 150 ms has a presented-frame gap under it.
- Swiss's 100 ms is not a stall. The presented gap sits at +520 to +630 ms,
  the GPU does 4 ms of work in it, and the page's frames keep coming (rAF
  33 to 50 ms): its wipe steps (`step-end`) simply change nothing for 100 ms.

## Where the time goes (attribution)

From the traces, cold, fresh browser. "Compile" is Skia's `shader_compile`
(inside it, `driver_link_program` is most of the time, the D3D driver
linking an ANGLE-translated program).

| school | desktop hold | first part (before the new page can be shown) | second part (the new page's first raster) |
|---|---|---|---|
| grandmillennial | about 420 ms | 105 to 120 ms main thread: layout 43, text shaping 30, style 7 | 280 to 315 ms GPU: 38 program compiles (245 to 275 ms), drawing 10 to 20 ms |
| cottagecore | about 400 ms | 145 to 175 ms main thread: layout about 90, shaping about 30 | 200 to 260 ms GPU: 24 to 27 compiles (167 to 208 ms) |
| vaporwave | about 290 ms | 175 to 195 ms main thread: waiting on the GPU 70 (the sunset's WebGL program linking), text shaping 65, layout 13, style 10 | 105 to 130 ms GPU: about 95 ms of raster compiles, the WebGL shader compiling on ANGLE's worker alongside |
| glassmorphism | about 225 to 245 ms | 60 to 85 ms main thread (two short holds) | 220 to 246 ms GPU: 25 compiles dark, 35 light (166 to 212 ms) |
| bauhaus | about 70 ms | 57 ms main thread: layout 29, shaping 11, style 10 | 15 ms GPU, no stall |

On mobile emulation the shape is the same for grandmillennial (35 compiles,
220 ms) and glassmorphism (30 compiles, 185 ms). Cottagecore's longest mobile
hold is the main-thread part instead (148 ms: layout 78, shaping 29), and its
GPU part is split around it.

What the compiles are for (the Skia operation each compile served,
desktop dark): mostly `FillRectOp` and `FillRRectOp` with the page's paint
on them (gradients, image and pattern fills, masks, shadows each need their
own program), then hairlines, path stencils and circles. Almost all are in
the page's raster (`RasterDecoderImpl::DoEndRasterCHROMIUM`), not in drawing
the view-transition snapshots: 1 to 4 per school are the compositor's
(`FinishPaintRenderPass`).

### Stub tests: which layer costs what

One layer taken out of the destination (by paint, layout unchanged), cold,
fresh browser, desktop dark, 5 runs each. The hold with everything is the
baseline. The savings overlap (two layers can need the same program), so
they do not add up.

| school (baseline) | layer out: longest hold (saving) |
|---|---|
| grandmillennial (446) | shadows 288 (-158); inline SVG 338 (-108); background images and gradients 357 (-89); masks 397 (-49); text 403 (-43) |
| cottagecore (378) | inline SVG 287 (-91); filters (the drop shadows) 312 (-66); 2D canvas (fireflies) 348 (-30); background images 351 (-27); shadows 352 (-26) |
| vaporwave (284) | WebGL 217 (-67); background images and gradients 220 (-64); snapshot filters 270 (-14); page filters 274 (-10); text 276 (-8) |
| glassmorphism (230) | filters (the backdrop blur) 151 (-79); snapshot filters 203 (-27); shadows 204 (-26); background images 236 (none) |

- **Grandmillennial's heaviest single contributor is its shadows** (the
  inset-ruled buttons and frames), then the SVG ornament, then the gradients
  and the trellis and scallop masks. The pattern fills do not stand out on
  their own: it is the number of different kinds of paint, each needing its
  own program, not any one layer.
- **Cottagecore's:** the specimen and ornament SVG and the drop-shadow
  filters. The fireflies cost about 30 ms.
- **Vaporwave's:** the sunset's WebGL and the gradients. The CRT snapshot
  filters (brightness, saturate) cost about 14 ms, not the headline.
- **Glassmorphism's:** the backdrop blur, then the snapshot filters and the
  glow shadows.

## What the two reductions can expect

### D: draw the next page ahead of time

Longest hold (ms), the four viewport and scheme combinations, lowest to
highest median (tables above):

| school | cold | pf-render (P4's opacity-0 copy) | pf-raster (drawn at 0.001) | warm (second arrival) |
|---|---|---|---|---|
| grandmillennial | 348 to 451 | 295 to 382 | 45 to 49 | 46 to 55 |
| cottagecore | 353 to 396 | 243 to 286 | 84 to 119 | 69 to 74 |
| vaporwave | 264 to 295 | 223 to 244 | 136 to 143 | 60 to 67 |
| glassmorphism | 184 to 352 | 175 to 305 | 32 to 39 (desktop not pixel-clean) | 33 to 47 |
| bauhaus | 82 to 86 | 49 to 52 | 38 to 41 | 36 to 41 |

With the script-driven canvases also out of the way (stubbed, pf-raster,
dark, 5 runs): vaporwave without WebGL 72 ms (53 to 76) desktop, against its
warm 65; cottagecore without the 2D canvas 44 ms (41 to 44) desktop and 96
(94 to 97) mobile.

First visible change, desktop dark, pf-raster against cold: grandmillennial
84 against 491 ms, glassmorphism 81 against 223, cottagecore 133 against
436, vaporwave 182 against 326.

- **It has to draw, not only lay out.** P4's opacity-0 copy (pf-render)
  saves the main-thread part only: Chrome does not rasterise a layer at
  opacity 0, so no program is compiled (a traced grandmillennial arrival
  after it still compiled 44 programs, 298 ms). The opacity-0.001 copy
  (pf-raster) is drawn and composited, which compiles the programs, and at
  0.001 it cannot move an 8-bit pixel (255 x 0.001 is a quarter of a level).
- **Measured invisible** (`scripts/themes/harness/raster-ahead-invisible.mjs`:
  screenshot, add the copy, screenshot, compare every pixel; 0.01 as the
  control, which must show a change): no pixel changed for grandmillennial,
  cottagecore and vaporwave, drawn over quiet and over swiss, desktop and
  mobile, dark and light; glassmorphism clean on mobile.
- **Glassmorphism on desktop is not clean:** 1,380 pixels over quiet (the
  nav and the switcher bar's text) and about 32,000 over swiss (the page's
  text) change by up to 132 to 192 levels while the copy is up. The glyphs
  lose subpixel (LCD) antialiasing, most likely because the copy's
  backdrop-filter panels make Chrome redraw the page's text layers with
  greyscale antialiasing (not proven; only glassmorphism's copy does it). It is a
  change of text rendering for as long as the copy is up, visible on glyph
  edges, so it fails "invisible" as it stands. It would need a different
  placement for glass (not over the page's text) or a copy without its
  backdrop filters plus a separate small warm-up of the blur, re-measured.
- **What is left after it:**
  - vaporwave about 140 ms: the sunset's WebGL (the copy runs no script).
    With WebGL stubbed out as well the hold is 72 ms, near its warm 65. The
    traces put it at one main-thread hold of about 115 ms: 70 ms waiting on
    the GPU while the WebGL program links, the rest the page's first render
    (shaping 15, layout and style 11).
  - cottagecore 84 to 119 ms: the fireflies' 2D canvas (stubbed out as well:
    44 ms desktop) and, on mobile, the main-thread first render (96 ms with
    the canvas stubbed).
- **The in-school swap** freezes too (grandmillennial Home to About 188 to
  300 ms cold, vaporwave 202 to 222), because the next page draws new kinds
  of paint even after Home. A copy of the next page drawn ahead brings
  grandmillennial, vaporwave and glassmorphism to 27 to 32 ms in every
  combination. That would need a trigger inside the school (a pointer
  resting on a nav link), not the switcher dialog.
- **One case the copy does not reach:** cottagecore's About in light on
  desktop, 241 ms cold and still 154 (152 to 213) with the copy drawn ahead
  (mobile light 78 against 75, no gain either). The trace shows 12
  rounded-rectangle programs (about 220 ms) compiled in the swap that the
  copy did not compile, although the copy looks the same as the page
  (`raster-ahead-fidelity.mjs`: the only difference is the portal's
  switcher bar, which a script-less copy cannot draw). Not explained; D
  should re-measure this cell.
- **Costs and open questions for D** (not measured here):
  - When: the shipped warm-up runs on dialog open; a drawn copy must not
    land while the dialog animates, and
    six copies in a row is 6 x (first render plus compiles) of main-thread
    and GPU work, about 150 to 450 ms each on this machine, several times
    that on a phone.
  - Where: the copy is the same page in another school, drawn full-viewport
    on top at 0.001, then removed. It must never take a pointer event
    (`pointer-events: none`), never be announced (`aria-hidden`, `inert`),
    and never be in the tab order.
  - The console: a sandboxed copy logs "Blocked script execution" once per
    copy (every pf-render and pf-raster run did). Stripping the scripts from
    the HTML before writing it avoids that.
  - It helps the first arrival per school per browser session, which is the
    case that freezes. A visitor whose Chrome keeps compiled programs on disk
    across sessions may not freeze at all on a return visit (not verified:
    Playwright's profiles are always new).

### L: make heavy schools cheaper to draw the first time

- **Any change to a school's paint changes pixels,** so L is only "invisible"
  when it draws the same picture with less first-time work. Candidates from
  the attribution, cheapest to prove first:
  - **vaporwave's WebGL link check** (fx.ts calls `getShaderParameter` and
    `getProgramParameter` straight after compiling, which makes the main
    thread wait about 70 ms for the GPU). Checking later, or through
    `KHR_parallel_shader_compile`, draws the same sunset without blocking the
    swap. The CSS sky underneath carries the first frames (README: the page
    reads the same with the canvas blank). This is the one L item the stub
    data prices directly: removing WebGL took 67 ms off cold and about 70
    off pf-raster.
  - **cottagecore's fireflies canvas:** about 30 ms cold, about 40 after
    drawing ahead. Creating the 2D context later (after `finished`) would
    move the cost out of the transition; the motes start a moment later.
  - **Fewer kinds of paint** in grandmillennial (shadows, SVG, gradients,
    masks: each different combination compiles its own program). Folding
    several into one image, or drawing ornament from one sprite, would cut
    programs, but it changes how the page is drawn, so each would need the
    pixel-diff proof, and none of the stubs points to one dominant layer.
  - **The main-thread first render** (layout and shaping, 60 to 150 ms),
    which pf-render already shows D can hide; L versions (cottagecore's
    337 KB HTML, vaporwave's shaping) were weighed in P4. Cottagecore's 37%
    HTML cut did not move its hold, consistent with the hold being drawing.
- **L on its own cannot reach what D reaches** for grandmillennial and
  glassmorphism: their holds are 60 to 90% compile across many layers, and
  no single stub took more than a third off.

## Recommendation for the next agents

1. **D first, as pf-raster measured it,** for grandmillennial, cottagecore and
   vaporwave on all viewports, and glassmorphism on mobile. It is the one
   change that removes the compile part, and it measured pixel-clean.
2. **Glassmorphism on desktop:** D needs another placement; until then its
   hold is about 230 (dark) to 350 ms (light) on a first visit.
3. **L for vaporwave's WebGL link check and cottagecore's fireflies canvas,**
   the two things a script-less copy cannot warm.
4. Measure every change with the same commands (below), fresh browser, and
   compare against the pf-raster rows here, not the P4 ones.

## Caveats

- One machine: an RTX 3070 laptop GPU and a fast CPU. Mobile is emulation
  on the same hardware.
- Headless Playwright Chromium, ANGLE on D3D11 with Skia's Ganesh backend.
  A real Chrome may use another backend (and program cache) on another
  machine, and keeps compiled programs on disk between sessions; how many of
  these programs a real visitor's Chrome already has is not known.
- The fresh-browser cold figure is the worst case the founder saw in the
  strips: first visit, first school. The warm and seasoned rows are the
  other end.
- pf-raster is a harness prototype, not portal code. Its copy is written by
  the test through `page.evaluate`, with a 400 ms wait for the tiles.

## Rerunning

```
node scripts/themes/snap.mjs --name freeze-base              # build and freeze once
BDL_GPU=1 node scripts/themes/snap.mjs --name freeze-base --reuse --port 4491 -- \
  node scripts/themes/harness/freeze-baseline.mjs --phases baseline,pages,traces
BDL_GPU=1 node scripts/themes/snap.mjs --name freeze-base --reuse --port 4491 -- \
  node scripts/themes/harness/freeze-baseline.mjs --phases stubs,residual,seasoned --viewports desktop --schemes dark
BDL_GPU=1 node scripts/themes/snap.mjs --name freeze-base --reuse --port 4491 -- \
  node scripts/themes/trace-arrival.mjs --viewport desktop --scheme dark --fresh-browser --runs 5 \
  --schools grandmillennial,cottagecore,vaporwave,glassmorphism --conditions pf-raster --label freeze-base --tag raster3-desktop-dark
BDL_GPU=1 node scripts/themes/snap.mjs --name freeze-base --reuse --port 4491 -- \
  node scripts/themes/harness/raster-ahead-invisible.mjs
node scripts/themes/harness/freeze-table.mjs --compact       # the tables above
```

Raw output: `scripts/themes/.out/freeze-base/` (gitignored). Per batch a
`<tag>.runs.json`, `<tag>.summary.json` and `<tag>.summary.md`; traces as
`trace-*.json` with `<tag>.traces.json` summaries; `_run*.log` for the
console of each batch; `invisible-*` pictures for the glassmorphism case;
`fidelity-*` pictures of each copy against its real page.
Superseded pf-raster batches (`raster2-*`, the older `residual-*`, and the
pf-raster columns inside `base-*` and `pages-*`) are kept but not used: the
first drew the copy without the scheme, the second with `.reveal-on`.

## D: drawing ahead, the portal side (agent D)

Written 09-23-26 (runs finished 09-24-26) by the drawing-ahead agent. Same
method as above: one frozen build per variant (`freeze-d0` is HEAD with
nothing changed, the same code as `freeze-base`; `freeze-d1` the first try;
`freeze-d2` and `freeze-d3` what ships), served on :4492, batches one after
another, `BDL_GPU=1`, a fresh browser per run, 5 runs per cell, median (min
to max). Nothing was built while a batch ran.

### The short answer

> **Corrected by the fixer (below, "Fixer: what the review changed").** A
> link in the page is no longer drawn ahead (resting on one held the page
> the visitor was reading for up to about 250 ms, a new stall, not a moved
> one), keyboard focus now waits 500 ms, and "invisible" below holds for
> pixels, not for motion: a copy drawn over the page holds it still while it
> draws. The in-school numbers in this section are what the withdrawn
> trigger gave; they no longer ship.

- **Ships:** `runtime.ts` draws a copy of the page the visitor is *reaching
  for*, not of every page they might pick. A mouse resting 100 ms on a
  school's row in the dialog, on Shuffle, or on a portal link in the page
  (keyboard focus resting the same), or a press on a row or Shuffle, draws
  that one page ahead: the script-less copy pf-raster measured, over the
  page at opacity 0.001, until its first frame is on screen (three
  animation frames and 100 ms), then removed. Nothing is drawn when the
  dialog opens.
- **What it saves** (desktop dark, mouse resting 300 ms before the click,
  longest time the screen showed nothing new, against the same trip on
  `freeze-d0`): grandmillennial 363 to 48, cottagecore 379 to 89,
  vaporwave 272 to 141, glassmorphism 180 to 47, bauhaus 71 to 42. The
  in-school swap Home to About: grandmillennial 265 to 42, vaporwave 136 to
  31, cottagecore 79 to 39. The swap also finishes sooner (grandmillennial
  767 to 720 ms, cottagecore 825 to 721, vaporwave 860 to 787).
- **Invisible by every check made** (below): every copy judged moved no
  pixel, or at most one level on at most two pixels; no request reaches
  the network twice; nothing logs; focus never moves; no copy is ever in
  the old page's capture; the at-rest stills and every Stage 2 gate are
  unchanged.
- **Not shipped: drawing every school when the dialog opens** (the first
  try). It gives the same saving to a visitor who reads the list for about
  2.5 s first, but a visitor who picks sooner lands on a copy of some other
  school being drawn, and waits for it: the dialog stays up 190 to 280 ms
  after the click (40 ms today) and the swap finishes 100 to 200 ms later.
  It also held the start page still for up to 183 ms (desktop) and 267 ms
  (mobile) at a time while the list was open.
- **Glassmorphism's desktop problem is solved** by leaving backdrop filters
  out of the copy: drawn over the page they change its text antialiasing;
  without them the copy is pixel-clean and glassmorphism still drops to
  about 45 ms (the blur's own programs are cheap at the swap).
- **What is left:** vaporwave's WebGL and cottagecore's fireflies (a copy
  runs no script), a phone tap (about 80 ms of lead, which helps cottagecore
  and vaporwave but not grandmillennial or glassmorphism), and cottagecore's
  About in light on desktop, which the copy still does not reach (below).

### Where the copy can go (prototypes, `freeze-d0`, desktop dark)

pf-raster's copy with `--raster-place`: longest screencast hold, and the
start page's longest animation-frame gap while the copy is up (what drawing
it costs the visitor looking at it):

| placement | grandmillennial | glassmorphism | cost while up | pixel check |
|---|---|---|---|---|
| over the page at 0.001 (M's pf-raster) | 48 (46 to 52) | 35 (32 to 39) | 250 to 283 | clean except glass desktop |
| under the page at 0.001 (z-index -1) | 47 (46 to 49) | 33 (29 to 34) | 250 to 283 | fails for every school: the page's own text re-layers (918 px over quiet, 34,370 over swiss, up to 192 levels) |
| just below the viewport, full opacity | 242 (234 to 246) | 100 (94 to 176) | 117 to 167 | off screen |
| the same, left up 1500 ms | 242 (235 to 247) | 102 (100 to 107) | 117 to 167 | off screen |
| below the viewport at a quarter scale | 350 (345 to 378) | 213 (208 to 216) | 100 to 117 | off screen |
| over the page, backdrop filters left out | | 45 (40 to 46) dark, 45 (38 to 47) light | 233 to 250 | clean on desktop, dark and light, bare page and under the dialog |

Off screen, Chrome rasterises only the band nearest the viewport, so only
part of the programs compile. Over the page is the only placement that
compiles everything; with backdrop filters taken out it is clean for every
school (`raster-ahead-invisible.mjs --copy-css`, `--dialog`).

A copy is worth less once others are drawn after it: cottagecore alone 83
(80 to 88), fourth of six 127 (117 to 137), last of the same six 83 (64 to
87) (`--raster-seq`). Something the GPU keeps per program is evicted: one
more reason to draw only the page reached for.

### First try: every school when the dialog opens (`freeze-d1`, not shipped)

`switcher-warm` (dialog opened, every copy let finish, dialog closed, link
followed), longest screencast hold, agent M's switcher-warm row against
`freeze-d1`:

| destination | desktop dark | desktop light | mobile dark | mobile light |
|---|---|---|---|---|
| grandmillennial | 433 to 47 | 435 to 92 | 378 to 75 | 339 to 46 |
| cottagecore | 361 to 106 | 391 to 171 | 336 to 144 | 345 to 121 |
| vaporwave | 276 to 171 | 289 to 176 | 268 to 146 | 259 to 144 |
| glassmorphism | 236 to 43 | 353 to 47 | 291 to 49 | 183 to 48 |
| bauhaus | 81 to 49 | 84 to 49 | 78 to 53 | 79 to 52 |

Six copies take about 2.4 s on this desktop (each 250 to 490 ms), during
which the start page holds for up to 167 to 183 ms at a time (233 to 267 on
mobile emulation). The visitor's own path (`switcher-pick`: the row clicked
some time after the dialog opens), desktop dark, still (the longer of the
first frame after the click and the longest gap) / first visible change /
finished:

| destination | today (`freeze-d0`, 1500 ms) | 700 ms | 1500 ms | 3000 ms |
|---|---|---|---|---|
| grandmillennial | 383 / 39 / 785 | 257 / 190 / 904 | 54 / 41 / 723 | 88 / 17 / 754 |
| cottagecore | 377 / 39 / 821 | 188 / 191 / 889 | 109 / 40 / 760 | 132 / 18 / 767 |
| vaporwave | 276 / 40 / 855 | 183 / 192 / 961 | 169 / 28 / 814 | 171 / 19 / 801 |
| glassmorphism | 184 / 40 / 458 | 183 / 192 / 613 | 161 / 14 / 454 | 44 / 16 / 421 |

On mobile emulation at 700 and 1500 ms the dialog lingers 186 to 284 ms
after the tap and every swap finishes 100 to 240 ms late. A pick made while
another school's copy is drawn waits for that copy; on a real phone, several
times slower, most picks would. That is a new visible delay, so this version
was dropped.

### What ships: drawing on intent (`freeze-d2`, `freeze-d3`)

- **runtime.ts:** `drawAheadOf(path)` and `drawOnIntent(target, pathOf)`.
  One wish at a time (a newer one replaces it until it starts), one copy at
  a time, a page at most once per hard load. Never the page the visitor is
  on, never during an arrival (`data-from-theme`), never in a hidden tab,
  never in dev or for Save-Data and 2G. The copy is taken down at
  `astro:before-preparation`, before the old page is captured. It is a
  sandboxed `srcdoc` iframe with no `allow-scripts`, `aria-hidden`, `inert`,
  `tabindex=-1`, `pointer-events:none`; its HTML loses every script,
  `noscript` and non-stylesheet link, gains a `<base>` of its own URL, the
  scheme and `.js` (not `.reveal-on`), and a style taking backdrop filters
  out. It scrolls to where the swap will put the visitor.
- **Where the HTML comes from.** A dialog row or Shuffle: the warmed HTML
  (warming it first if needed). A link in the page: Astro's router already
  prefetches it on the same hover or focus (ClientRouter turns prefetchAll
  on), so the copy reads that response with `cache: 'force-cache'` and is
  not kept as warmed HTML: the router still fetches the page itself, as
  today. A press on a page link draws nothing (the router prefetches on
  hover and focus only, so it would be a second request).
- **switcher.ts:** `drawOnIntent` on the dialog (its rows) and on Shuffle.
- **Three animation frames and 100 ms** after the copy has loaded are
  enough: pf-raster left up 100 ms instead of 400 gave the same holds
  (cottagecore 83, vaporwave 143).

Still / first visible change / finished, median of 5, desktop dark, the
mouse resting on the row or link 300 ms before the click (`hover`):

| trip | `freeze-d0` | `freeze-d3` |
|---|---|---|
| grandmillennial arrive | 363 / 49 / 767 | 48 / 14 / 720 |
| cottagecore arrive | 379 / 39 / 825 | 89 / 40 / 721 |
| vaporwave arrive | 272 / 41 / 860 | 141 / 37 / 787 |
| glassmorphism arrive | 180 / 37 / 456 | 47 / 41 / 427 |
| bauhaus arrive | 71 / 37 / 854 | 42 / 37 / 838 |
| grandmillennial Home to About | 265 / 306 / 359 | 42 / 78 / 354 |
| cottagecore Home to About | 79 / 135 / 693 | 39 / 83 / 682 |
| vaporwave Home to About | 136 / 267 / 585 | 31 / 95 / 586 |
| glassmorphism Home to About | 37 / 73 / 374 | 27 / 79 / 375 |

The start page's longest animation-frame gap while the dialog is open is now
17 ms (nothing is drawn until a row is reached for). Other cells
(`freeze-d2`, the same code but for the in-page fetch):

- Resting only 150 ms (50 ms of drawing before the click): the heavy
  schools gain the same (grandmillennial 48, cottagecore 88, vaporwave 148,
  glassmorphism 46; in-school 26 to 37), but **bauhaus holds 116 (108 to
  120) against 71**: its hold is main-thread first render, and a click
  landing inside its own copy's layout waits for it. At 300 ms it is 42.
- Desktop light, 300 ms: grandmillennial 46, cottagecore 128, vaporwave
  128, glassmorphism 46, bauhaus 41; in-school 24 to 31, except the next
  point.
- **Cottagecore About, desktop light:** still 269 to 273 (first visible
  290, finished 890 filmed) against 163 (345, 698) with no copy, at 300 or
  800 ms of rest. Traced without filming: longest presented hold 256 ms
  against 218, 15 programs compiled in the swap against 23, `ready` 29
  against 45 ms, finished 667 against 712. The copy leaves the same
  rounded-rectangle programs agent M found and turns the rest of the hold
  into one block at the start. Not explained; roughly a wash, with a longer
  single hold.
- Mobile emulation, a touch going down on the row 80 ms before the click
  (`tap`), dark, today against drawn: grandmillennial 311 to 308,
  cottagecore 338 to 95 (first visible 37 to 129), vaporwave 235 to 138,
  glassmorphism 210 to 207, bauhaus 69 to 48. Light the same shape. A press
  is too late for the two slowest to draw; no cell is worse.

### Is it invisible?

- **Pixels while a copy is up** (`harness/draw-ahead-check.mjs --serve
  freeze-d3`: reduced motion, page transitions off, no init script in the
  page): desktop and mobile, dark and light, starting on quiet, swiss and
  glassmorphism, a copy for every other school's row, for Shuffle and for a
  page link: 84 copies judged, 82 moved no pixel, 2 (mobile) moved 1 to 2
  pixels by 1 level. (Fixer: 12 more copies came down before their shot
  and were not judged, 10 of them over glassmorphism, among them every
  glassmorphism page link and Shuffle cell; re-judged below.) A first run flagged up to 11 levels on a hovered link;
  the control (`draw-ahead-fetch-debug.mjs --shots` on `freeze-d0`, no copy
  at all) shows the same 211 pixels, 10 levels, at the same moment: the
  link's own hover colour still changing, not the copy. Under the dialog
  every copy was clean, glassmorphism's included.
- **Sweeping the pointer across the six rows** at 30 ms a row draws nothing.
- **Requests:** with the live site's caching (`/_astro/` immutable, HTML
  revalidating), no path reaches the server twice in any cell. A first run
  counted every file twice because Playwright turns the HTTP cache off for a
  context with a route (the probe now blocks analytics through CDP), and
  page links were fetched twice until the copy read the router's prefetch
  with `force-cache`.
- **Console:** nothing, in any cell. The "Blocked script execution in
  about:srcdoc" lines in trace-arrival's logs are its own init scripts,
  which Playwright runs in every frame.
- **Focus** never moved; no copy was ever the active element.
- **Navigation:** in every cell a row clicked while its copy was up found no
  copy at `astro:after-preparation`, the swap landed, and nothing was drawn
  during or after the arrival.
- **Stills at rest** (`capture.mjs` as render.mjs runs it, full page, both
  schemes, desktop and mobile, every page of all seven schools, 140
  pictures, `diff-captures.mjs` default tolerance): 130 identical. The 10
  over the line are cottagecore dark, which differ just as much between two
  `freeze-d0` runs (0.08 to 0.76%, its fireflies).
- **Stage 2 gates** (`motion.mjs --draw-ahead`, which rests on the
  destination's row or the About link until its copy has been drawn, then
  films as usual), all six schools, arrive and page, desktop and mobile,
  dark: the wordmark judge passes 24 of 24 (overlap, blank at most 67.7 ms,
  blink, drawn); the switcher holds still in 24 of 24 (worst 0.3%).
- **Films** (`--dense`, full frame, desktop dark, one browser per school):
  longest gap grandmillennial 411 to 48, cottagecore 352 to 115, vaporwave
  285 to 145, glassmorphism 204 to 38 (`.out/freeze-d-films-before/` and
  `-after/`). In grandmillennial's before strip the page holds on quiet from
  +61 to +472 ms and the curtain's opening is skipped; after, the curtain
  opens frame by frame from +92 ms. No white frame and no frame with both
  pages' body text in either.

### Costs and limits

- A copy costs a main-thread first render (about 100 to 170 ms here, more on
  a phone) and the GPU's compiles, once per page per load, only when the
  visitor reaches for that page. While it draws, the page holds for up to
  about 170 to 250 ms here (it is the freeze, moved earlier). A click
  landing inside a copy of the same page waits for the rest of it (bauhaus
  at a 50 ms lead); a click is never behind another page's copy unless the
  visitor rested on one row and then clicked another.
- One copy iframe at a time, removed after its first frame: no lasting
  memory.
- Touch gets little: no hover, and a press is about 80 ms of lead.
- Headless Chromium on ANGLE D3D11 on one desktop; mobile rows are
  emulation. Safari and Firefox run the same code (srcdoc and inert are
  supported); whether a copy pays off there was not measured.
- The README's "Motion and backgrounds" could tell school authors that the
  portal draws a script-less copy of their page when a visitor reaches for
  it, so paint that only a script creates (canvases, classes a script adds)
  is not warmed. Not edited here (outside this slice).

### Rerunning

```
node scripts/themes/snap.mjs --name freeze-d3                 # build and freeze
BDL_GPU=1 node scripts/themes/snap.mjs --name freeze-d3 --reuse --port 4492 -- \
  node scripts/themes/harness/draw-ahead-batch.mjs --phases intent --label freeze-d3
BDL_GPU=1 node scripts/themes/snap.mjs --name freeze-d0 --reuse --port 4492 -- \
  node scripts/themes/harness/draw-ahead-batch.mjs --phases intent --leads 300 --label freeze-d0
node scripts/themes/harness/draw-ahead-table.mjs freeze-d3/hover300-desktop-dark freeze-d0/hover300-desktop-dark
BDL_GPU=1 node scripts/themes/harness/draw-ahead-check.mjs --serve freeze-d3 --label freeze-d3
BDL_GPU=1 node scripts/themes/snap.mjs --name freeze-d3 --reuse --port 4492 -- \
  node scripts/themes/motion.mjs --schools bauhaus,swiss,vaporwave,cottagecore,grandmillennial,glassmorphism \
  --scenarios arrive,page --viewports desktop,mobile --crop wordmark --draw-ahead --label freeze-d3-gates-wm
```

Raw output: `scripts/themes/.out/freeze-d0/` (prototypes `proto-*` and the
baselines), `freeze-d1/` (the first try: `drawn-*`, `pick*-*`), `freeze-d2/`
(`hover*-*`, `tap80-*`, the cottagecore traces), `freeze-d3/` (the final
hover batch, `_drawcheck2.log`), `freeze-d0-stills/` and `freeze-d3-stills/`,
`freeze-d3-gates-wm/`, `freeze-d3-gates-sw/`, and the films. The `drawn-*`
tags and the batch runner's `shipped` phase are named for the first try,
which does not ship.

## L: cheaper first draw, the school side (agent L)

Written 09-23-26 (runs finished 09-24-26) by the cheaper-first-draw agent.
Same method: one frozen build per variant (`freeze-l0` is the tree as agent
D left it, drawing ahead included; `freeze-l1` adds the two school changes
below), served on :4493, batches one after another, `BDL_GPU=1` (ANGLE D3D11
on the RTX 3070, logged in every batch), a fresh browser per run, 5 runs per
cell, median (min to max). Nothing was built while a batch ran.

### The short answer

- **Ships, vaporwave (`src/themes/vaporwave/fx.ts`):** arriving from another
  school, the sunset's WebGL program is compiled and linked without asking
  how it went, and the questions (link status, uniform locations) wait until
  `KHR_parallel_shader_compile` says the link is done, polled once a frame.
  The main thread no longer sits about 70 ms waiting on the GPU, so the
  page's first render goes ahead while the program links. The first sunset
  frame is drawn in the same frame the link is found done. A hard load or a
  swap within the school (where the picture is on screen from the first
  frame) still links before the first frame, as before.
> **Corrected by the fixer (below).** The cottagecore change does not ship:
> it is visible in motion (the motes missing for about 430 ms of a night
> arrival) and the fireflies are on the founder's protect list, so
> `cottagecore/fx.ts` is back to HEAD and the change is a priced founder
> question. Vaporwave's ships, with its slow-GPU trade filmed and stated.

- **Was to ship, cottagecore (`src/themes/cottagecore/fx.ts`):** arriving from
  another school, the fireflies (and their 2D canvas context) wait until the
  arrival has finished (the portal clears `data-from-theme` at the swap's
  `finished`), instead of drawing their first frame, and compiling its GPU
  programs, inside the swap's hold. Within the school and on a hard load
  nothing changes.
- **What they save** (longest screencast hold, `freeze-l0` against
  `freeze-l1`): vaporwave cold 282 to 222 (desktop dark), 275 to 210
  (desktop light), 251 to 184 and 236 to 172 (mobile); after drawing ahead
  (hover 300 ms) 124 to 74 (dark) and 144 to 68 (light); on a tap 138 to 80
  and 136 to 72. Cottagecore dark: cold 385 to 352 (desktop), 355 to 304
  (mobile); hover 93 to 67; tap 80 to 74. Cottagecore light (the fireflies
  never draw in light) moves within noise, both ways.
- **Invisible at rest:** every at-rest picture compared is identical (0 px):
  full-page stills of all four pages of both schools, both schemes, desktop
  and mobile, except cottagecore dark, which differs as much between two
  runs of the same build (random fireflies); and, with `Math.random` seeded,
  the page at rest after arriving by a swap, after an in-school swap and
  after a hard load, both schools, both schemes, both viewports (24 of 24,
  0 px). Every Stage 2 gate passes, with and without drawing ahead.
- **Visible in motion, cottagecore only:** the motes are absent while the
  new sheet is laid (about +390 to +820 ms on a first desktop arrival) and
  appear when it has settled, where today they arrive with the sheet. They
  are a handful of faint pulsing dots, too small to see at the strips'
  scale, but it is a change during the arrival (founder question).
- **Measured and dropped:** `content-visibility: auto` on every block of
  `main` after the first (no gain; cottagecore 116 ms worse). Nothing else
  on the candidate list could draw the same pixels (below).

### vaporwave: the sunset links behind the beam

Why the sunset can come a few frames late on an arrival: the page comes in
as the CRT's beam line (`vw-crt-on`: a 2 to 4 px line for the first 30% of
640 ms, brightness 4 to 5, desaturated), so nothing of the hero can be read
until the picture opens. In the films the sunset is in every frame of the
opened picture (`.out/freeze-l1-films/vaporwave__arrive__dark__desktop.png`:
held +53 to +275, the beam at +358, the full sunset from +374; the same in
light and on mobile). Where the picture is on screen from the first frame
(the tracking error within the school, a hard load), the old synchronous
path is kept, so the CSS sky never shows alone there.

Trace, cold, desktop dark, not filmed, 2 runs each (`trace-desktop-dark` in
`.out/freeze-l0/` and `.out/freeze-l1/`):

| build | presented holds | main thread in the longest hold | of it waiting on the GPU | GPU busy | raster programs |
|---|---|---|---|---|---|
| `freeze-l0` | 180 + 121, 180 + 117 | 167, 171 | 69, 70 (`WaitForGetOffset`) | 83, 85 | 21 (131 to 134 ms) |
| `freeze-l1` | 115 + 116, 113 + 120 | 40, 43 | 39, 42 | 117, 121 | 21 (129 to 131 ms) |

The 65 ms of text shaping left the longest hold (it is in the first one now,
which ends sooner), and the longest hold is now GPU-bound: its GPU time is
the hold. About 40 ms of main-thread waiting is still inside it while the GPU
rasterises the page, which does not add to the hold.

| trip | `freeze-l0` | `freeze-l1` |
|---|---|---|
| cold, desktop dark | 282 (281 to 288) | 222 (221 to 223) |
| cold, desktop light | 275 (271 to 279) | 210 (206 to 213) |
| cold, mobile dark | 251 (246 to 263) | 184 (181 to 188) |
| cold, mobile light | 236 (232 to 239) | 172 (171 to 175) |
| hover 300, desktop dark (drawn ahead) | 124 (76 to 146) | 74 (72 to 75) |
| hover 300, desktop light | 144 (122 to 147) | 68 (62 to 73) |
| tap 80, mobile dark | 138 (71 to 139) | 80 (61 to 84) |
| tap 80, mobile light | 136 (133 to 140) | 72 (61 to 86) |

First visible change, cold desktop dark: 322 to 263 ms. With drawing ahead
the hold is now at vaporwave's warm floor (M: 65), as M's WebGL stub
predicted (72).

Lifecycle kept: one context, created at mount as before; the poll is a
`requestAnimationFrame` loop that stops on context loss, is cancelled by the
teardown and does not run in a hidden tab; a restored context rebuilds
synchronously as before; the release after the swap's `finished` is
unchanged. Without the extension, `settled()` is true at once and the first
question waits, one frame later than before.

### cottagecore: the fireflies wait for the sheet (withdrawn by the fixer)

| trip | `freeze-l0` | `freeze-l1` |
|---|---|---|
| cold, desktop dark | 385 (352 to 405) | 352 (347 to 353) |
| cold, desktop light | 352 (345 to 355) | 343 (335 to 366) |
| cold, mobile dark | 355 (281 to 365) | 304 (226 to 323) |
| cold, mobile light | 310 (256 to 342) | 327 (302 to 329) |
| hover 300, desktop dark | 93 (69 to 96) | 67 (37 to 70) |
| hover 300, desktop light | 97 (96 to 132) | 110 (76 to 113) |
| tap 80, mobile dark | 80 (55 to 102) | 74 (63 to 83) |
| tap 80, mobile light | 96 (89 to 120) | 77 (73 to 100) |
| Home to About, cold, desktop dark | 73 (69 to 85) | 82 (67 to 86) |
| Home to About, cold, mobile dark | 32 (26 to 75) | 70 (34 to 72) |
| Home to About, cold, desktop light | 220 (211 to 232) | 219 (207 to 225) |

- Dark arrivals gain 26 to 51 ms, about what M's 2D-canvas stub priced
  (30 to 44). Light moves both ways within its spread: in light the canvas
  is `display: none` and only the context's creation moved.
- The in-school swap takes the unchanged path (the fireflies' programs are
  already compiled). Its mobile dark cell moved 32 to 70 with overlapping
  spreads (26 to 75 against 34 to 72): read as noise, not re-run.
- Trace, cold, desktop dark, not filmed: longest presented hold 247, 246
  against 214, 217. The same 31 programs compile over the whole trace; the
  canvas's now compile after `finished`, when only the motes move.
- The unexplained cottagecore About, desktop light cell (M, D) is not the
  fireflies, which never draw in light. Still 219.

### Looked at and not changed

- **`content-visibility: auto`** on every block of `main` after the first,
  as a prototype (`freeze-stubs.mjs` `cvauto`, a 600 px placeholder), cold,
  desktop dark, on `freeze-l1`: grandmillennial 419 to 414, glassmorphism
  209 to 213, vaporwave 222 to 209, cottagecore 347 to 463 (worse). Chrome
  rasterises only around the viewport before the first frame, so skipping
  off-screen blocks saves little, and it would change the scroll length
  until each block is drawn (scrolled swaps land by it). Dropped without
  touching `src/`.
- **Grandmillennial's shadows, SVG, gradients and masks** (M's stubs:
  shadows -158, SVG -108): each is a kind of paint that needs its own
  program, and drawing the same picture with fewer kinds means replacing the
  box-shadow rings and ornament with other paint, which cannot be proven to
  draw the same pixels and is the school's look (brief section 2). With
  drawing ahead its hold is already 48 (warm 49). Not attempted.
- **Glassmorphism's backdrop blur and glow:** no cheaper blur draws the same
  pixels; with drawing ahead it is 47 (warm 39). Not attempted.
- **Cottagecore's specimen SVG and drop-shadow filters** (-91, -66): the
  same reason. Drawing ahead already compiles them.

### Is it invisible?

- **At rest:** `capture.mjs` full-page stills (as render.mjs takes them),
  four pages per school, both schemes, desktop and mobile, 32 pictures,
  `freeze-l0` against `freeze-l1`, `diff-captures.mjs` default tolerance: 24
  identical; the 8 over the line are cottagecore dark, which differ as much
  between two `freeze-l0` runs (0.13 to 0.42% against 0.13 to 0.41%, the
  fireflies' random seed). `harness/arrival-rest.mjs` (new) seeds
  `Math.random` and takes the viewport at rest after arriving by a swap,
  after the Home to About swap and after a hard load: 24 of 24 identical,
  0 px, cottagecore dark included, its motes where they were before.
- **Gates** (`motion.mjs`, vaporwave and cottagecore, arrive and page,
  desktop and mobile, dark and light, on `freeze-l1`, with and without
  `--draw-ahead`): the wordmark judge passes 32 of 32 (overlap, blank at
  most 35 ms, blink, drawn); the switcher holds still in 32 of 32 (worst
  0.1%). No problems logged.
- **Films** (`--dense`, full frame, `freeze-l0-films` and `freeze-l1-films`):
  no white frame, no frame with two pages' body text; vaporwave's sunset is
  in every frame of the opened picture. Longest gap on the first film of
  each browser (desktop dark): vaporwave 295 to 222, cottagecore 335 to 312.
- **Unit tests:** `tests/lifecycle.test.ts` and `tests/theme-registry.test.ts`
  pass; `astro check` 0 errors.

### Costs and limits

- Cottagecore's motes appear when the arrival finishes instead of with the
  new sheet, about 430 ms later on a desktop first arrival; their first
  programs then compile while only the motes move.
- Vaporwave on a device whose link outlasts the beam line (about 190 ms):
  the picture would open on the CSS sky and the sunset come in once linked.
  Here it links well inside the beam. On such a device today's code holds
  the whole page still instead.
- Without `KHR_parallel_shader_compile` (not measured) the arrival still
  skips the wait on its first frame and asks one frame later.
- Headless Chromium, ANGLE D3D11, one desktop; mobile is emulation.

### Rerunning

```
node scripts/themes/snap.mjs --name freeze-l1                 # build and freeze
BDL_GPU=1 node scripts/themes/snap.mjs --name freeze-l1 --reuse --port 4493 -- \
  node scripts/themes/harness/lighter-batch.mjs --label freeze-l1
BDL_GPU=1 node scripts/themes/snap.mjs --name freeze-l0 --reuse --port 4493 -- \
  node scripts/themes/harness/lighter-batch.mjs --label freeze-l0
BDL_GPU=1 node scripts/themes/snap.mjs --name freeze-l1 --reuse --port 4493 -- \
  node scripts/themes/harness/arrival-rest.mjs --label freeze-l1-rest --trips arrive,page,load
node scripts/themes/diff-captures.mjs --a freeze-l0-rest --b freeze-l1-rest
BDL_GPU=1 node scripts/themes/snap.mjs --name freeze-l1 --reuse --port 4493 -- \
  node scripts/themes/trace-arrival.mjs --viewport desktop --scheme dark --fresh-browser --runs 5 \
  --schools grandmillennial,cottagecore,glassmorphism,vaporwave --conditions cold --stub cvauto \
  --label freeze-l1 --tag cv-cvauto-desktop-dark
```

Raw output: `scripts/themes/.out/freeze-l0/` and `freeze-l1/` (`cold-*`,
`hover300-*`, `tap80-*`, `trace-desktop-dark*`, `cv-*`, `_run*.log`),
`freeze-l0-stills`, `freeze-l0-stills2`, `freeze-l1-stills`,
`freeze-l0-rest`, `freeze-l0-rest2`, `freeze-l1-rest`, `freeze-l0-load`,
`freeze-l1-load`, `freeze-l0-films`, `freeze-l1-films`, and
`freeze-l1-gates-wm`, `-wm-da`, `-sw`, `-sw-da`. The `-rest` sets were taken
before `--trips load` existed (arrive and page only); `-load` holds the
hard loads.

## Fixer: what the review changed

Written 09-24-26 by the fixer, after the review of D and L. Same method:
one frozen build (`freeze-fix`, the tree below), served on :4495, batches
one after another and nothing built while one ran, `BDL_GPU=1` (ANGLE D3D11
on the RTX 3070, logged in every batch), a fresh browser per timed run,
5 runs per cell, median (min to max).

### What the review found, and what was done

| finding | what was done |
|---|---|
| Resting on a link in the page drew a copy, which holds the page the visitor is reading for up to about 250 ms: a new stall, not a moved one, and visible in motion, which the pixel checks (reduced motion, transitions off, stills) cannot see | **Withdrawn.** `runtime.ts` no longer registers `drawOnIntent` on the page, and the router-prefetch path (`force-cache`, the `prefetched` argument) is gone with it. Only the switcher's rows and Shuffle draw ahead, where the visitor is already changing school. The in-school Home to About gains D reported no longer ship (table below) |
| 12 copies came down before their screenshot and were never judged, 10 over glassmorphism | `draw-ahead-check.mjs` now holds each copy after the runtime lets it go and judges it fully drawn; an unjudged copy is a failure. **96 of 96 judged, 0 px** |
| Cottagecore's fireflies waiting for `finished` is visible in motion (the motes missing for about 430 ms of a night arrival) and they are on the founder's protect list | **Reverted by hand**: `cottagecore/fx.ts` is byte for byte HEAD. The measured saving stays in L's section as a priced founder question |
| The gates were re-run with drawing ahead in dark only | Wordmark judge and switcher hold-still, all six schools, arrive and page, desktop and mobile, **dark and light**: 48 + 48, all pass; dense films in light and on mobile for the four heavy schools |
| Keyboard focus drew a copy after the same 100 ms as a mouse, so tabbing down the rows drew at almost every stop | Focus now waits 500 ms (`FOCUS_DWELL_MS`). Tabbing at 250 ms a stop draws nothing (measured below) |
| Vaporwave's sunset linking behind the beam line is invisible only while the link finishes inside it | Filmed with a slow link forced (`slowlink300`, `slowlink600`): on a slow GPU the picture opens on the CSS sky and the sunset comes in once linked. Stated as a trade below; the change still ships |

### What ships now

- `src/themes/portal/runtime.ts`: drawing ahead on intent, for the
  switcher's rows (not the current one) and Shuffle only: a mouse resting
  100 ms (**400 ms since the wrap-up**, "Wrap-up: a longer mouse rest"
  below), a keyboard focus staying 500 ms, or a press (**dropped in the
  wrap-up**, "Wrap-up: the press trigger" below). Everything else as D
  described (one copy at a time, once per page per hard load, never during
  an arrival, taken down at `astro:before-preparation`, backdrop filters
  left out of the copy).
- `src/themes/portal/switcher.ts`: as D left it; the header comment
  rewrapped.
- `src/themes/vaporwave/fx.ts`: as L left it.
- `src/themes/cottagecore/fx.ts`: unchanged from HEAD.

### What it saves (`freeze-fix`)

Still (the longest time the screen showed nothing new from the click to
`finished` + 100 ms) / first visible change / finished, the mouse resting on
the destination's row 300 ms before the click (`hover300`), against D's
`freeze-d0` (HEAD) runs of the same trip. (Wrap-up correction: under
`hover` the rest was `--hover-lead` plus the film's idle watch, so a
"300 ms" rest was about 700 ms and the copy had about 600 ms before the
click; measured with the copies recorded, a 150 ms lead gave 541 to 575 ms.
The rows below are what a visitor who rests about 0.7 s gets.)

| trip, desktop dark | `freeze-d0` | `freeze-fix` |
|---|---|---|
| grandmillennial arrive | 363 (357 to 386) / 49 / 767 | 49 (44 to 51) / 14 / 720 |
| cottagecore arrive | 379 (355 to 385) / 39 / 825 | 93 (68 to 93) / 38 / 718 |
| vaporwave arrive | 272 (262 to 276) / 41 / 860 | 64 (62 to 88) / 49 / 714 |
| glassmorphism arrive | 180 (176 to 214) / 37 / 456 | 48 (42 to 48) / 37 / 422 |
| bauhaus arrive | 71 (58 to 89) / 37 / 854 | 44 (38 to 49) / 38 / 835 |
| grandmillennial Home to About | 265 (260 to 266) / 306 / 359 | 259 (252 to 266) / 304 / 358 |
| cottagecore Home to About | 79 (69 to 83) / 135 / 693 | 82 (73 to 83) / 138 / 694 |
| vaporwave Home to About | 136 (133 to 194) / 267 / 585 | 115 (111 to 136) / 271 / 583 |
| glassmorphism Home to About | 37 (29 to 40) / 73 / 374 | 28 (26 to 28) / 76 / 377 |

The in-school swap is back where HEAD has it (the link in the page is no
longer drawn ahead): grandmillennial About still holds about 260 ms.

Desktop light, same trips (no `freeze-d0` hover run in light; agent M's cold
arrival for reference): grandmillennial 47 (46 to 48) against cold 451,
cottagecore 127 (93 to 133) against 396, vaporwave 75 (73 to 90) against
295, glassmorphism 48 (47 to 49) against 352, bauhaus 50 (42 to 53) against
86. In school: grandmillennial 172 (166 to 180), cottagecore 160 (154 to
212), vaporwave 187 (125 to 221), glassmorphism 27 (27 to 30), none drawn
ahead.

Mobile emulation, a touch on the row 80 ms before the click (`tap80`):

| arrive | dark, `freeze-d0` | dark, `freeze-fix` | light, `freeze-fix` |
|---|---|---|---|
| grandmillennial | 311 (299 to 317) | 308 (307 to 312) | 311 (301 to 314) |
| cottagecore | 338 (300 to 359) | 102 (78 to 114) | 118 (93 to 121) |
| vaporwave | 235 (229 to 239) | 80 (70 to 84) | 78 (55 to 79) |
| glassmorphism | 210 (204 to 215) | 210 (208 to 220) | 194 (192 to 195) |
| bauhaus | 69 (64 to 83) | 43 (38 to 50) | 41 (38 to 45) |

Cottagecore's first visible change on a tap moves later (37 to 137 ms,
dark): the click lands inside its own copy's first render. Swiss gains
nothing (the re-measure agent: cold 99, hover 100): its 100 ms is its own
step-timed wipe, not a stall.

### What it costs while the visitor browses the dialog

`harness/draw-ahead-browse.mjs` (new): the dialog opened on quiet and its
warm-up let finish, then the rows browsed; copies drawn and the page's
longest animation-frame gap from the first key or move to 1.5 s after the
last. Desktop dark, 250 ms a row, 5 runs, fresh browser each:

| browsing | HEAD (`freeze-d0`) | D's dwell (`freeze-d3`) | `freeze-fix` |
|---|---|---|---|
| Tab down the rows | 0 copies, 17 ms | 5 copies (5 to 6), 217 (167 to 233) | **0 copies, 17 ms** |
| mouse over each row in turn | 0, 17 | 6 (6 to 6), 167 (167 to 183) | 6 (6 to 6), 183 (167 to 183) |
| mouse resting on one row (bauhaus) | 0, 17 | 1, 133 (117 to 133) | 1, 133 (117 to 133) |

So the keyboard case is fixed, and it shows what the mouse case still
costs: a visitor who moves the pointer down the list at a reading pace
draws every school, and the dialog holds up to about 180 ms at a time while
it does. This is the same kind of cost as the withdrawn page-link trigger,
but on the switcher, where the reviewer accepted it; it is put to the
founder below rather than changed here. (The founder chose a longer rest;
the wrap-up below ships 400 ms, and the same browsing draws nothing.)

### Is it invisible? (`freeze-fix`)

- **Pixels while a copy is up** (`draw-ahead-check.mjs --serve freeze-fix`,
  every copy held until judged): desktop and mobile, dark and light,
  starting on quiet, swiss and glassmorphism, every other school's row,
  Shuffle and a focused row: **96 copies judged, 96 moved no pixel**, none
  unjudged. Over glassmorphism that is 24 rows, 4 Shuffle and 4 focused
  rows, all 0 px (`.out/freeze-fix/_drawcheck.log`,
  `_drawcheck-keyboard.log`). The first run's 4 keyboard failures were the
  probe's own: it left the focus on the last stop for 850 ms, which is a
  focus that stays; with the focus taken off the last stop, 12 of 12 cells
  draw nothing while tabbing.
- **A page link** (mouse resting 800 ms, then focused 800 ms): 0 copies in
  all 12 cells.
- **Requests** (production cache headers, the server's own count): no path
  served twice in any cell. **Console:** clean. **Focus:** kept in every
  cell. **Navigation:** no copy at `astro:after-preparation` in 12 of 12
  cells, none drawn after landing.
- **Stills at rest** (`capture.mjs` as render.mjs runs it, 140 pictures
  against `freeze-d0-stills`): 131 identical; the 9 over the line are
  cottagecore dark (0.08 to 0.89%), its random fireflies. With `Math.random`
  seeded (`arrival-rest.mjs`, cottagecore and vaporwave, arrive, page and
  hard load, both schemes, both viewports, `freeze-d0` against
  `freeze-fix`): **24 of 24 identical, 0 px**.
- **Gates** (`motion.mjs --draw-ahead`, all six schools, arrive and page,
  desktop and mobile, dark and light; `--draw-ahead` on page now checks
  that resting on About draws nothing): wordmark judge 48 of 48 (overlap,
  blank at most 67.8 ms, blink, drawn), switcher held still in 48 of 48
  (worst 0.4%). One switcher strip (glassmorphism page, desktop dark) had
  no frame from before the trigger, a capture miss; re-filmed, it holds
  still (0.0%). No run reported a missing copy.
- **Films** (`--dense`, full frame, one browser per film, drawn ahead by a
  resting mouse): longest gap desktop light grandmillennial 45, cottagecore
  134, vaporwave 87, glassmorphism 45; mobile dark 46, 147, 70, 57; mobile
  light 53, 144, 85, 50 (`.out/freeze-fix-films/`). Looked at: no white
  frame and no frame with two pages' body text; grandmillennial's curtain
  opens frame by frame; vaporwave's sunset is in the first opened frame.
- **Unit tests** (`lifecycle`, `theme-registry`, `portal-prompt-key`,
  `fireflies`) pass; `astro check` 0 errors.

### Vaporwave on a slow GPU (a trade, not invisible everywhere)

`motion.mjs --stub slowlink300|slowlink600` (new stubs in
`freeze-stubs.mjs`) answers "still linking" for 300 or 600 ms after
vaporwave's first poll, standing in for a GPU that links slowly (the rest
of the page draws at this machine's speed). Cold, desktop dark:

- 300 ms: the picture opens at about +377 on the CSS sky (the pink horizon,
  no sun, no grid) and the sunset comes in at +461, about 85 ms later
  (`.out/freeze-fix-slowlink300/`).
- 600 ms: the sky alone from about +398 to +764, then the sunset pops in
  at +780 (`.out/freeze-fix-slowlink600/`).

On this machine the link finishes behind the beam, so nothing shows. On a
device that links slowly, the visitor sees the sky first and the sunset
arrive; before this change that same device held the whole page still for
the length of the link. The README allows the blank canvas (the page must
read without it). Invisible on this machine; a sky-first frame on slow
GPUs.

### For the founder

1. **Mouse browsing in the dialog.** Moving the pointer down the list at a
   reading pace (250 ms a row) draws every school, holding the dialog up to
   about 180 ms at a time. A longer mouse rest before drawing (as keyboard
   now has) would stop that, but a visitor who rests less than that before
   clicking would get today's freeze. Keep 100 ms, or lengthen it?
   **Answered 09-24-26: lengthen it** (stage0-decisions.md, "Call 1
   revised"); done in the wrap-up below.
2. **Links in the page** (withdrawn): drawing ahead on a nav link removed
   the in-school freeze (grandmillennial About 265 to 42), at the price of
   up to about 250 ms of held page whenever the pointer rests on a link,
   click or not. Leave it out, or bring it back?
3. **Cottagecore's fireflies after the sheet** (withdrawn): 26 to 51 ms off
   a dark arrival, for motes that come in about half a second late.
4. **Vaporwave on slow GPUs**: a sky-first frame there instead of a longer
   hold (above). Keep?

### Rerunning

```
node scripts/themes/snap.mjs --name freeze-fix                 # build and freeze
BDL_GPU=1 node scripts/themes/harness/draw-ahead-check.mjs --serve freeze-fix --port 4495 --label freeze-fix
BDL_GPU=1 node scripts/themes/snap.mjs --name freeze-fix --reuse --port 4495 -- \
  node scripts/themes/harness/draw-ahead-browse.mjs --modes tab,mouse,rest --label freeze-fix --tag browse-freeze-fix
BDL_GPU=1 node scripts/themes/snap.mjs --name freeze-fix --reuse --port 4495 -- \
  node scripts/themes/harness/draw-ahead-batch.mjs --phases intent --leads 300 --label freeze-fix
node scripts/themes/harness/draw-ahead-table.mjs freeze-fix/hover300-desktop-dark freeze-d0/hover300-desktop-dark
BDL_GPU=1 node scripts/themes/snap.mjs --name freeze-fix --reuse --port 4495 -- \
  node scripts/themes/motion.mjs --schools bauhaus,swiss,vaporwave,cottagecore,grandmillennial,glassmorphism \
  --scenarios arrive,page --viewports desktop,mobile --schemes dark,light --crop wordmark --draw-ahead \
  --label freeze-fix-gates-wordmark
BDL_GPU=1 node scripts/themes/snap.mjs --name freeze-fix --reuse --port 4495 -- \
  node scripts/themes/motion.mjs --schools vaporwave --scenarios arrive --viewports desktop --schemes dark \
  --dense --stub slowlink600 --label freeze-fix-slowlink600
```

Raw output: `scripts/themes/.out/freeze-fix/` (`_drawcheck*.log`,
`browse-*`, `hover300-*`, `tap80-*`, `_gates-*.log`, `_films.log`),
`freeze-fix-gates-wordmark/`, `freeze-fix-gates-switcher/` (and `-rerun/`),
`freeze-fix-films/`, `freeze-fix-slowlink300/`, `freeze-fix-slowlink600/`,
`freeze-fix-stills/`, `freeze-d0-ccrest/`, `freeze-fix-ccrest/` and their
`diff-*` folders.

## Wrap-up: a longer mouse rest

Written 09-24-26 in the stage 2 wrap-up, on the founder's revised call
(stage0-decisions.md, "Call 1 revised"): keep drawing ahead on a resting
mouse, with a rest long enough that browsing the rows at a reading pace
draws nothing; a press still draws. Same method: one frozen build per
candidate rest (`rest-100` to `rest-500`, `DRAW_DWELL_MS` set to each),
served on :4640, one batch at a time, `BDL_GPU=1` (ANGLE D3D11, RTX 3070,
logged in every batch), a fresh browser per run, 5 runs per cell, median
(min to max).

### What ships

- `DRAW_DWELL_MS` **400 ms** (was 100). The focus rest (500 ms), the press,
  and every other guard are unchanged: one copy at a time, once per page per
  hard load, never for Save-Data or 2G, never in a hidden tab, never during
  an arrival, taken down at `astro:before-preparation`.
- **Two fixes the longer rest needed** (both in `drawOnIntent` and
  `stopDrawingAhead`):
  - *A rest still being timed when a navigation begins is dropped.* Before,
    a click shortly before the rest was reached let the timer fire into the
    navigation, which drew a copy of the destination during the swap: at
    rest 400 and a click 400 ms after arriving, a second copy went up 8 ms
    after the click and glassmorphism held 460 ms (dark; 184 with no drawing
    ahead at all). With the fix the same cell holds 175, and no copy goes up
    after a click. At 100 ms this needed a click inside a 100 ms window; at
    400 ms it is every quick click.
  - *Crossing from one part of a row to another is not leaving it.* The row
    is a link holding three spans (name, era, signature), and moving between
    them sent a `pointerout` that restarted the rest. `drift` (the pointer
    wandering over one row every 60 ms): the copy went up 426 ms (404 to
    437) after arriving with a 100 ms rest before the fix, 108 (104 to 122)
    after it, and 416 (414 to 431) at 400 ms.

### Browsing: copies drawn

`harness/draw-ahead-browse.mjs`, desktop dark, from quiet, the dialog open
and warmed, the mouse moved onto each of the seven rows in turn at the pace
given, then off the rows (the mouse mode now leaves the list at the end; it
used to stay on the last row, which is a rest):

| rest | 150 ms a row | 250 | 300 | 350 | 500 |
|---|---|---|---|---|---|
| 100 | 5 (4 to 5) | 6 | 6 | 6 | 6 |
| 200 | 0 | 6 | 6 | 6 | 6 |
| 300 | 0 | 0 | 6 | 6 | 6 |
| **400** | 0 | **0** | **0** | 0 | 6 |
| 500 | 0 | 0 | 0 | 0 | 6 |

A rest draws every row the pointer stays on at least as long (plus a few
ms of the probe's own move), so 300 ms draws all six at 300 ms a row: no
margin over a reading pace. **400 ms is the shortest that draws nothing at
250 and 300 ms a row**, with 350 ms a row as margin. Wherever nothing is
drawn, the page's longest animation-frame gap is 17 ms (one frame);
wherever copies are drawn, 167 to 250 ms per copy. Re-measured on the
shipped build (both fixes in): mouse at 250 and 300 ms a row, 0 copies,
17 ms; Tab at 250 and 300 ms a stop, 0 copies; one row rested on, its copy
417 ms (415 to 419) after arriving.

### Before a click: what the rest costs

`trace-arrival.mjs --conditions hover --rest-before-click <ms>` (new, timed
from the row's own `pointerover` to a press and click on the page's clock;
see its header for why the film now starts after the move), arriving from
quiet, desktop. Still (as the tables above) plus how late the click ran
(the main thread busy with a copy), pooled over the five builds by the
copy's lead (rest-before-click minus the rest; 0 = none before the click,
the press starts one at the click):

| desktop dark | no drawing | lead 0 | 100 | 200 | 300 | 400 | 500 | 600 to 900 |
|---|---|---|---|---|---|---|---|---|
| grandmillennial | 374 | 389 | 368 | 264 | 177 | 63 | 47 | 46 to 49 |
| glassmorphism | 184 | 178 | **349** | **228** | 140 | 56 | 50 | 51 |
| cottagecore | 380 | 389 | 341 | 249 | 144 | 60 | 71 | 68 to 73 |
| vaporwave | 269 | 218 | 216 | 103 | 76 | 66 | 69 | 65 to 71 |
| bauhaus | 66 | 77 | **103** | 50 | 51 | 52 | 111 | 52 to 55 |

| desktop light | no drawing | lead 0 | 100 | 200 | 300 | 400 | 500 | 600 to 900 |
|---|---|---|---|---|---|---|---|---|
| grandmillennial | 366 | 389 | 364 | 270 | 174 | 70 | 47 | 46 to 48 |
| glassmorphism | 303 | 317 | 328 | 210 | 110 | 49 | 48 | 49 to 52 |
| cottagecore | 354 | 362 | 278 | 173 | 97 | 95 | 109 | 100 to 103 |
| vaporwave | 264 | 212 | 205 | 93 | 68 | 74 | 69 | 68 to 71 |
| bauhaus | 65 | 75 | **101** | 49 | 52 | 56 | 101 | 54 to 56 |

"No drawing" is `freeze-d0` (HEAD before drawing ahead) under the same
harness. The gain curve:

- **Below about 150 ms of lead nothing is gained, and a click 100 ms into a
  copy is worse than none:** the click waits for the copy's main-thread
  first render (40 to 100 ms late) and the swap still compiles. Worst:
  glassmorphism dark 349 against 184, bauhaus 103 against 66. A press
  alone (lead 0) is today's hold, 6 ms better to 23 ms worse, except
  vaporwave (about 50 ms better).
- **From 200 to 400 ms it pays more with every 100 ms**, and **by 400 to
  500 ms it has paid in full** (grandmillennial is the slowest: 63 at 400,
  47 at 500). After that, nothing more. For scale, a copy is up about
  300 ms for bauhaus, 400 for vaporwave and 470 to 590 for grandmillennial,
  glassmorphism and cottagecore, its last 100 ms or so a hold after its
  first frame.
- Unexplained: bauhaus at a 500 ms lead holds 116 (dark) and 115 (light)
  on the 100 ms build clicked at 600 ms, and 79 and 71 on the 500 ms build
  clicked at 1000 ms, against about 52 at every other lead past 200. It is
  bauhaus only; its copy is done about 200 ms before the click.

So at the shipped 400 ms rest, by how long the visitor rests on the row
before clicking (the rest-400 rows alone):

| rest before the click, desktop dark | 400 ms | 600 ms | 1000 ms |
|---|---|---|---|
| grandmillennial (374 without) | 389 | 259 | 45 |
| glassmorphism (184) | 175 | 225 | 48 |
| cottagecore (380) | 387 | 243 | 67 |
| vaporwave (269) | 215 | 98 | 67 |
| bauhaus (66) | 72 | 48 | 53 |

Light: grandmillennial 382 / 274 / 46, glassmorphism (303 without) 314 /
210 / 47, cottagecore (354) 359 / 158 / 101, vaporwave (264) 195 / 88 /
64, bauhaus (65) 73 / 46 / 50. A visitor who rests about 0.9 s or more
gets the whole saving; one who clicks within 0.4 s gets today's hold; in
between, part of it, and a click 0.5 to 0.6 s after arriving can land on a
copy still drawing (glassmorphism dark 225 against 184). The 100 ms rest
gave the same savings 300 ms sooner, at the cost of drawing every row
browsed. A longer rest than 400 buys nothing more for browsing (400
already draws nothing at 350 ms a row) and moves the whole curve later.

The 600 ms column was challenged in review and re-measured on a fresh
rebuild (`rest-fix`, byte-identical to `rest-400`, :4642, 5 runs, fresh
browser, `.out/rest-wrapup-fix/`): dark grandmillennial 261 (255 to 266),
glassmorphism 238 (224 to 253), cottagecore 251 (240 to 262), vaporwave 95
(87 to 107), bauhaus 38 (28 to 48); light 295 (274 to 332), 241 (222 to
242), 192 (189 to 238), 94 (73 to 147), 48 (47 to 51). Leads 186 to 217
ms, the copy taken down 4 to 6 ms after the click. So the partial saving
at 600 ms stands. The review read `screencastGap` alone (37, 46 and 86 ms
for the first three in dark), which starts at the first new frame after
the click and so misses this hold: at 600 ms the whole hold comes before
that frame. It is real on the page's own clock, not a capture artifact:
grandmillennial's and glassmorphism's first animation frame after the click
comes 190 to 279 ms late (`rafGap`, starting at the click; cottagecore's
133 to 250 ms gap starts 10 to 25 ms after it), and the view transition's
capture of the old page takes 135 to 271 ms in 29 of those 30 runs (about
8 at a 1000 ms rest),
waiting on the copy's drawing. `trace-arrival.mjs` now prints `still` and `firstFrame` ahead of
`screencastGap` so the summary shows the hold as these tables do.

### Is it still invisible? (`rest-400`)

- **`draw-ahead-check.mjs --serve rest-400 --sweep-paces 30,250,300`**
  (rows, sweeps, Shuffle, page link, keyboard, the new press visit,
  navigate; from quiet, swiss and glassmorphism; desktop and mobile; dark
  and light): **108 copies judged, 108 moved no pixel**; no sweep drew
  anything at 30, 250 or 300 ms a row (36 of 36); the page link drew
  nothing; no path reached the server twice; focus never moved; console
  clean; no copy at `astro:after-preparation`. **A press draws at once**:
  the mouse pressed on a row the moment it arrives puts its copy up 6 ms
  later in all 12 cells, judged clean, and releasing it navigates with no
  copy left.
- Two probe fixes on the way: the navigate visit waited with
  `waitForSelector`, which missed every copy at the longer rest (the page's
  own counter saw it go up), so it now polls every 10 ms and confirms the
  copy is up at the click; and the sweep now measures each row just before
  moving to it (on mobile the list scrolls, and boxes taken all at once
  left the pointer on one row for two paces, which is a rest).
- **Wordmark judge** (`motion.mjs --crop wordmark --draw-ahead`, all six
  schools, arrive, desktop and mobile, dark): 12 of 12 pass, numbers within
  a few ms of `freeze-fix`'s (e.g. grandmillennial blank 44.8 against 44.6,
  bauhaus 67.8 against 67.7). **Switcher hold-still** (`--crop switcher
  --draw-ahead`, grandmillennial and glassmorphism, arrive and page, desktop
  and mobile, dark and light): 16 of 16 held still, worst 0.0%; resting on
  About drew nothing.
- `motion.mjs --draw-ahead` reported "saw no copy drawn ahead" for 8 of 12
  wordmark strips and 7 of 8 switcher arrive strips: its `restForCopy` waits
  with the same `waitForSelector` that missed every copy in the check above
  (motion.mjs is outside this slice, so it is not changed here). It waits
  up to 8 s on the row, so the copy is drawn 400 ms in either way; the
  judges' numbers match `freeze-fix`'s. The one-line fix is the check's:
  poll `document.querySelector` every 10 ms instead.

### Harness notes

- Plain `--conditions hover` rests `--hover-lead` plus at least 400 ms, and
  its click has no press; every earlier "hover300" row is a rest of about
  0.7 s (corrected above).
- Starting the film first and moving the mouse after the idle watch (the
  first version of `--rest-before-click`) delayed the first frames after
  the click by up to about 250 ms, a capture artifact: on `freeze-d0`, with
  nothing drawn ahead, bauhaus 243 to 273 and glassmorphism 407 to 440 at a
  1000 ms rest, against 65 to 88 and 178 to 211 with the mouse moved
  first. Those first `rest-400` click runs are set aside in
  `.out/rest-wrapup/void-harness1/`.

### Rerunning

```
# each candidate: set DRAW_DWELL_MS, then
node scripts/themes/snap.mjs --name rest-400
BDL_GPU=1 node scripts/themes/harness/draw-ahead-rest.mjs --rests 100,200,300,400,500 --phases browse,base,click,table
BDL_GPU=1 node scripts/themes/harness/draw-ahead-check.mjs --serve rest-400 --port 4640 --sweep-paces 30,250,300 --label rest-wrapup
BDL_GPU=1 node scripts/themes/snap.mjs --name rest-400 --reuse --port 4640 -- \
  node scripts/themes/harness/draw-ahead-browse.mjs --modes mouse,tab,drift,rest --paces 250,300 --label rest-wrapup --tag browse-final-rest-400
BDL_GPU=1 node scripts/themes/snap.mjs --name rest-400 --reuse --port 4640 -- \
  node scripts/themes/motion.mjs --schools bauhaus,swiss,vaporwave,cottagecore,grandmillennial,glassmorphism \
  --scenarios arrive --viewports desktop,mobile --schemes dark --crop wordmark --draw-ahead --label rest-wrapup-gates-wm
```

Raw output: `scripts/themes/.out/rest-wrapup/` (`tables.md`, `browse-*`,
`click-*`, `click-base-*`, `probe-*`, `_drawcheck-desktop.log`,
`_drawcheck-mobile.log`, `_gates-*.log`), `rest-wrapup-gates-wm/`,
`rest-wrapup-gates-sw/`. The browsing batch ran on builds with the row fix
but before the navigation fix, which only acts once a navigation begins;
the shipped build's browsing was re-measured (`browse-final-rest-400-*`).

## Wrap-up: the press trigger (dropped)

Written 09-24-26, the wrap-up's first question. Since the first version of
the founder's call 1, a press on a row or Shuffle drew its page at once, so a
visitor who clicks before the 400 ms rest still got a copy. The lead-100
column above was a copy started by the rest, not a press, and the older
`tap80` rows (`freeze-fix`, "Mobile emulation") had the film's 400 ms idle
watch between the touch and the click, so their real lead is unknown. So the
press was filmed directly before the founder was asked.

`trace-arrival.mjs --press-lead <ms>` (new) puts the pointerdown that many ms
before the click on the page's clock, after the mouse has been on the row
350 ms (under the rest, so only the press can draw); on the mobile viewport
it says pointerType touch. `harness/draw-ahead-press.mjs` (new) runs no press
against presses 60, 100 and 140 ms before the release on one build of what
is live (`wrapup-main`, :4650), the four heavy schools and bauhaus from
quiet through the warmed dialog, desktop and mobile, dark and light, a fresh
browser per run, 5 runs per cell: 400 runs. The presses measured 57 to 60,
95 to 100 and 135 to 140 ms ahead.

### What a press did

A copy parses and lays out its page in one block of about 125 to 210 ms
(glassmorphism shortest, cottagecore longest), so
the click itself queues behind it: 75 to 150 ms late at 60 ms, 35 to 105 at
100, 2 to 72 at 140. Nothing on screen moves meanwhile (the copy is at
opacity 0.001), so what the visitor sees from letting go of the button is
**late + still**; the tables above read still alone, which hides this.

Wait from the release, ms, median of 5 (min to max): no press / press 60 /
100 / 140 ms before it.

| desktop dark | none | 60 | 100 | 140 |
|---|---|---|---|---|
| grandmillennial | 409 (385 to 422) | 419 | 389 | 340 |
| glassmorphism | 193 (188 to 196) | **400** | **361** | **319** |
| cottagecore | 399 (355 to 419) | 398 | 358 | 322 |
| vaporwave | 230 (209 to 239) | 263 | 224 | 189 |
| bauhaus | 65 (64 to 95) | **141** | **104** | 72 |

| desktop light | none | 60 | 100 | 140 |
|---|---|---|---|---|
| grandmillennial | 384 (378 to 405) | 422 | 358 | 323 |
| glassmorphism | 331 (305 to 336) | 375 | 318 | 286 |
| cottagecore | 363 (358 to 375) | 334 | 275 | 238 |
| vaporwave | 197 (192 to 203) | 251 | 201 | 162 |
| bauhaus | 66 (64 to 82) | **139** | **96** | 56 |

| mobile dark | none | 60 | 100 | 140 |
|---|---|---|---|---|
| grandmillennial | 315 (311 to 321) | 321 | 297 | 265 |
| glassmorphism | 216 (209 to 220) | **344** | **328** | **288** |
| cottagecore | 336 (223 to 350) | **441** | **445** | 365 |
| vaporwave | 182 (180 to 182) | 204 | 184 | 105 |
| bauhaus | 74 (64 to 78) | 118 | 81 | 39 |

| mobile light | none | 60 | 100 | 140 |
|---|---|---|---|---|
| grandmillennial | 340 (336 to 358) | 335 | 292 | 256 |
| glassmorphism | 226 (205 to 242) | **343** | **298** | **280** |
| cottagecore | 371 (332 to 392) | **443** | **407** | 363 |
| vaporwave | 177 (156 to 179) | 200 | 160 | 140 |
| bauhaus | 78 (72 to 79) | 113 | 81 | 44 |

- **A quick press (60 ms) is worse or even in 19 of 20 cells,** by up to
  207 ms (glassmorphism, dark desktop).
- **A typical press (100 ms) is mixed:** glassmorphism loses up to 168 ms,
  cottagecore on the phone 109 (its best desktop gain turned into its worst
  loss), bauhaus up to 39; the gains elsewhere are 6 to 88 ms.
- **Only a slow press (140 ms) mostly pays,** and glassmorphism still loses
  in 3 of 4 cells.
- Touch alone is no better, so keeping the press for phones only was not
  supported either. The mobile rows are emulation on this desktop's CPU and
  GPU; a phone's slower main thread would make the queued click later still.

**The founder's call (09-24-26): drop the press trigger**
(stage0-decisions.md, "The press trigger"). `drawOnIntent` no longer
listens for `pointerdown`; drawing ahead is the 400 ms mouse rest and the
500 ms keyboard focus only, and phones (no hover) never draw ahead.

### The re-check (`press-drop`)

- **`draw-ahead-check.mjs --serve press-drop --sweep-paces 30,250,300`**,
  its press visit inverted (a press held 200 ms, twice a real one, still
  inside the rest; the mouse on desktop, a touch on the phone; then released
  on the row): **12 of 12 presses drew nothing** and navigated with no copy
  at `astro:after-preparation` and none after; **96 copies judged, 96 moved
  no pixel**; 36 of 36 sweeps drew nothing; no path reached the server twice;
  focus kept; console clean (`.out/press-drop/_drawcheck.log`).
- **The same press batch on `press-drop`** (no press against a press 100 ms
  ahead, all four cells): the press drew no copy in any of 100 runs, and
  the two columns agree within run-to-run spread in all 20 rows (for
  example desktop dark glassmorphism 219 (193 to 222) against 185 (181 to
  187), cottagecore 386 against 390; `.out/press-drop/tables.md`).
- **A quick click** (`trace-arrival.mjs --conditions hover
  --rest-before-click 150`, press and click together, desktop, 5 runs):
  dark grandmillennial 379 (364 to 395), glassmorphism 182 (180 to 214),
  cottagecore 385 (368 to 390), vaporwave 211 (208 to 231), bauhaus 81 (64
  to 93); light 382, 306, 362, 196, 68; the click 2 to 4 ms late and no copy
  in any run. That is the hold with no drawing ahead, as the founder's call
  intends.

### Rerunning

```
node scripts/themes/snap.mjs --name wrapup-main          # the build before the change
BDL_GPU=1 node scripts/themes/harness/draw-ahead-press.mjs --snap wrapup-main --port 4650 --label press-wrapup
node scripts/themes/snap.mjs --name press-drop           # the build after it
BDL_GPU=1 node scripts/themes/harness/draw-ahead-check.mjs --serve press-drop --port 4660 --sweep-paces 30,250,300 --label press-drop
BDL_GPU=1 node scripts/themes/harness/draw-ahead-press.mjs --snap press-drop --port 4650 --press-leads 100 --press-draws no --label press-drop
BDL_GPU=1 node scripts/themes/snap.mjs --name press-drop --reuse --port 4650 -- \
  node scripts/themes/trace-arrival.mjs --schools grandmillennial,glassmorphism,cottagecore,vaporwave,bauhaus \
  --conditions hover --rest-before-click 150 --fresh-browser --runs 5 --viewport desktop --scheme dark \
  --label press-drop --tag quick150-desktop-dark
```

Raw output: `scripts/themes/.out/press-wrapup/` (`tables.md`,
`press-*.runs.json`, `_batch.log`), `scripts/themes/.out/press-drop/`
(`tables.md`, `_drawcheck.log`, `quick150-*`).

## Wrap-up: drawing ahead and the navigation lifecycle

Written 09-24-26. The Stage 2 review panel's code lens found two bugs by
reading the code (`stage2-report.md`, review code-1 and code-2), and the
founder asked for both to be fixed before PR #90 merges. The first fix
(`953ef7f`) went through its own adversarial review
(`aplus-tier3-stage2-navfix-review-workflow.js`, run `wf_40469d84-2dd`: an
Opus code lens, a Sonnet browser lens, two Sonnet refute seats). That
review found one regression in the fix and one older race it did not
cover; both were reproduced by their refute seats and are fixed too.

### What was wrong

- **A copy drawn into a navigation's load** (review code-1): a rest timed
  while the next page loaded (the mouse reaching Shuffle during a slow
  load) drew a copy there; the swap took it away with the old body, and the
  runtime still counted it as up.
- **Shuffle's stale pick** (review code-2): the pick was dropped at
  page-load after a rest at the swap had already named it, and Safari's
  and Firefox's post-swap refocus started a focus rest, so a copy of a
  school Shuffle did not go to was drawn about 500 ms after arriving.
- **In the first fix** (navfix review code-1, a regression): a same-page
  hash link (every header's skip link) aborts a loading navigation and
  starts none, so the first fix's `navigating` stayed on and nothing was
  drawn ahead on that page until another navigation landed.
- **Older than both** (navfix review code-2): Back (or a click) during the
  old page's capture lets the first navigation swap while the second still
  loads; its after-swap resumed drawing ahead into the second's load.

### What ships

- `runtime.ts`: nothing is drawn, and no rest is timed, from a navigation's
  start until the latest navigation's page lands (`navigationBegan`,
  `swapBegan`, `navigationLanded`). An abort with nothing after it, a
  refused preparation and a back/forward-cache restore end the wait too
  (`navigationRefused`, `pageRestored`). Rests are timed afresh after.
- `switcher.ts`: Shuffle's pick belongs to the page it was made on (no
  page-load reset), and the switcher's own refocus after a swap draws
  nothing.
- `tests/draw-on-intent.test.ts`: every exit, in the order Astro's router
  sends its events, with plain AbortSignals; each guard was shown to fail
  its own test when removed.

### Evidence

| probe | build before the fixes | after the first fix (`953ef7f`) | final |
|---|---|---|---|
| `draw-ahead-nav-probe.mjs` load (a copy during a slow load) | 5 of 5 | 0 of 5 | 0 of 5 (the copy after landing is where Shuffle goes, 5 of 5; a new row rest draws in 401 to 404 ms) |
| `draw-ahead-nav-probe.mjs` refocus (a wasted copy after Safari's refocus) | 3 of 3 | 0 of 5 | 0 of 5 |
| `draw-ahead-nav-code-probe.mjs` hashabort (drawing ahead stuck) | not stuck | 2 of 2 stuck | 0 of 3 (a row rest draws in 351 to 361 ms) |
| `draw-ahead-nav-code-probe.mjs` race (a copy during the second load) | 1 of 1 | 2 of 2 | 0 of 3 |
| `draw-ahead-nav-code-probe.mjs` back (a copy during Back's load) | not run | 3 of 3 | 0 of 3 |

The browser lens also ran six cases on `953ef7f` (a slow load with Back,
an aborted row click, five Shuffles in a row, keyboard Shuffle on Safari's
path, a full load mid-navigation and Back, the contact form and Back): all
clean, 15 runs. Its back/forward-cache case never engaged the cache in
headless Chromium, so the restore path is checked by the unit test only.
Since the final fix: `npm run verify` clean (347 unit tests, astro check 0 errors and 0 warnings, 483 built-site tests); `draw-ahead-check.mjs` judged 96 copies, 96 moved no pixel, 12 of 12 presses and 36 of 36 sweeps drew nothing; `smoke.mjs` passed all 166 checks.

Raw output: `scripts/themes/.out/nav-probe/`, `nav-code-probe/`,
`navfix-browser/`.
