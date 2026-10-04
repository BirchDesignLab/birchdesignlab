# Proof a6: cottagecore floaters, dandelions by day and fireflies that flash

Brief: `briefs/a6-cc-floaters.md` (item 12, the Stage 1 dandelion note, S3 and the
answer to item 14). Nothing under `src/` changed.

## The question

Can the light scheme gain dandelion seeds as the daytime counterpart of the
fireflies, with the fireflies' burst flash and both answering the pointer,
without touching what the founder likes about the fireflies?

## Answer

Yes. One proof file, `scripts/themes/proofs/stage5-cc-floaters/fx.ts`, replaces
`src/themes/cottagecore/fx.ts` as it stands (same export, same import path,
same canvas). The fireflies keep their count, colour, halo, drift and lifecycle;
only the pulse changed. The seeds share the loop. Cost is no higher than
today's fireflies, and zero scroll-time rect reads.

## What was made

`fx.ts` (injected over the frozen build by `scripts/themes/harness/stage5-cc-floaters-proof.mjs`;
the bundle is the real file plus the real `src/lib/lifecycle.ts`).

Fireflies (dark), the numbers used:

- Burst: 2 to 4 flashes, start to start 500 ms (jitter +/- 70), rise 120 to 180 ms,
  fall 250 ms, then fully dark for 4 to 8 s. Each mote has its own random first
  rest, so they never line up.
- Peak core alpha stays at today's 0.95 (0.35 + 0.6 at full pulse), and the halo
  sprite's centre stop is lifted from 0.42 to 0.6 (brief item 12), so a flash is
  brighter than today's peak, not dimmer. Between bursts a mote is fully dark; the old always-on
  ember is gone. That follows the brief ("then 4 to 8 s dark") and is the one
  visible change to what people see; say so if the founder wants an ember kept.
- Hover (cursor within 26 px) or tap (within 44 px) starts a 2-flash burst now,
  with a 1.4 s cooldown per mote, then the usual dark rest.

Dandelions (light only):

- Sprite drawn once, offscreen, in ink-brown (`--cc-ink`, 58 42 31): a hairline
  stalk, 17 or 22 bowed filaments fanned over the upper half with pin-head tips,
  a knot and a tapered seed body. Two variants.
- 8 on desktop, 4 under 700 px wide. Size 0.8 to 1.25 of base (about 30 to 60 px
  tall), alpha 0.55 to 0.82 before fades.
- Breeze 21 px/s across, 11 px/s up, each seed at 0.7 to 1.35 of that, plus its
  own sway (3.6 to 6.4 s period, 5 to 11 px/s) and a slow turn (7 to 13 s, drawn
  as a squash of the sprite to 0.42 wide). A gust of up to 3.2x for 2.8 s, every
  14 to 30 s (the first about 7 to 15 s in).
- Pushed by the pointer: a cursor inside 120 px pushes away (up to 340 px/s2,
  only while it moved in the last 1.5 s); a tap inside 170 px kicks (up to 230 px/s).
  Seeds settle back onto the breeze in about 1.1 s.

Shared bookkeeping (item 14):

- Text rects are read in document space once on mount, and again, debounced 150 ms,
  when the body resizes or the fonts arrive. The draw subtracts `scrollY`. There is
  no scroll listener. Scope is `header, main, footer` text elements (the old scope
  was `main` only).
- One passive `pointermove`, one `pointerdown`, one `pointerleave`. Touch moves are
  ignored (they are scrolls). No layout read in any of them.
- Avoidance is slightly stronger than before, on purpose, because the first
  measurement (below) showed text sliding under motes while scrolling: the test also
  looks where the scroll is taking the text (6 frames of last frame's scroll), fades
  off faster than on (fireflies 0.25 off, 0.08 on per 30 fps frame; before it was 0.08
  both ways; seeds 0.4 off, 0.15 on), and seeds test their whole drawn extent plus
  12 px, looking 0.7 s ahead along the drift. The fireflies' fade-in is unchanged.

D7 (a) holds: the canvas stays `position: fixed; z-index: 0`, over the cloth and
under `main` (z-index 1), so sheets, cards and notes sit on top. Seeds under a
sheet are simply hidden, as the fireflies already are.

## What the images show

All in `scripts/themes/.out/stage5-proofs/cc-floaters/` (index.md lists them).
GPU Chromium, renderer in `renderer.txt` (RTX 3070, D3D11); no software frames.
Strips are 36 real frames per film, timestamped; each sheet shows six.

- `sheet-fireflies-1440.jpg`, `sheet-fireflies-390.jpg`: dark Home. Lit-mote count
  per frame is printed under each. Flashes are small at page scale; the pointer
  sheets are the close view.
- `sheet-seeds-home-1440.jpg`, `sheet-seeds-about-1440.jpg`, `sheet-seeds-home-390.jpg`,
  `sheet-seeds-about-390.jpg`: light, six frames over about 25 s. Seeds move up and
  across over the cloth, vanish into the sheets, and keep clear of the headings and
  paragraphs.
- `sheet-pointer-dark-1440.jpg` (cursor onto a mote, mote dark in the first two
  clips, lit by the third; the rise, a flash and the fall are all in frame) and
  `sheet-pointer-dark-390.jpg` (a tap).
- `sheet-pointer-light-1440.jpg` (cursor sweeping toward a seed) and
  `sheet-pointer-light-390.jpg` (a tap beside a seed). The seed is chosen with a
  bare 3 x 3 sample box and clear air around it, so what the clips show is the
  seed answering: about 105 px off track at 1440 and 135 px at 390 within about
  1.2 s (peak figures in measures.json). On a phone the text columns leave almost
  no open cloth, so the 390 clip stages one seed onto the clearest spot of the
  viewport; even there the seed fades toward the nearby heading as it moves. A tap
  on a phone often makes a seed fade out rather than drift away, because the
  kick sends it toward text and the look-ahead fade takes it. That is the intended
  keep-off-the-text rule winning over the push.

Resume: the burst clock is re-staggered whenever the dark branch restarts after a
gap (light to dark flip, hidden tab), and the gust clock is reset the same way.
Before this, a 10 s stay in light and a flip to dark lit 11 of 18 motes at once on
one frame (14 of 18 shared one start time). Now, after the same 10 s in light and a
flip, over 9 s: at most 7 of 18 lit at once at 1440 (4 of 7 at 390), 20 first bursts
and no two with the same start time (`resume-light-to-dark-*` in measures.json).
- `shots/*__fullpage.png`: whole-page stills (the fixed canvas paints the first
  viewport only).

## Measured (measures.json)

Bursts, 70 s per size, read from the live state:

| | 1440 (18 motes) | 390 (7 motes) |
|---|---|---|
| bursts seen | 173 | 64 |
| flashes per burst (2, 3, 4) | 64, 58, 51 | 23, 19, 22 |
| gap start to start | 430 to 570 ms, mean 502 | 431 to 570, mean 503 |
| rise | 120 to 180 ms | 121 to 180 |
| dark rest | 4.05 to 8.05 s, mean 5.98 | 4.04 to 7.95, mean 6.29 |
| most lit at once | 6 of 18 (mean 1.6) | 3 of 7 (mean 0.3) |
| frames with every mote lit | 0 | 0 |
| frames with none lit | 20% | 69% |

Text, same independent rects, three slow sweeps up and down the page, every drawn
halo centre or seed:

- Fireflies at 1440: 12 of 2524 visible draws with the centre on text (0 above
  alpha 0.15); today's fireflies, same test, same scroll: 1468 of 14250 (885 above 0.15).
  At 390: 6 of 537 (0 above 0.15) against 1174 of 4847 (571).
- Seeds, 60 s each: centre on text 0 in all four runs (Home and About, 1440 and 390).
  Drawn extent touching text: 0 at Home and About 1440; 2 at Home 390 (worst alpha
  0.21) and 2 at About 390 (worst alpha 0.14). Nearest centre to any text 31 to 40 px.

Cost (12 s idle, then a 5 s scroll; CDP Performance deltas and rAF callback timing):

| | today | proof |
|---|---|---|
| dark 1440 idle, task ms per s | 6.8 | 5.8 |
| light 1440 idle, task ms per s | 0 (nothing runs) | 5.7 |
| dark 390 idle | 6.0 | 5.6 |
| light 390 idle | 0.1 | 5.5 |
| rAF callback mean (all light and dark) | 0.02 to 0.03 ms | 0.02 ms, p95 0.1 ms, max 0.3 ms |
| rect reads during a 5 s scroll | 2156 (even in light, where nothing draws) | 0 |
| scroll task ms (5 s) dark 1440 | 69 | 51 |

So the dark scheme gets cheaper, and the light scheme pays about 0.6% of one core
for the seeds, at 30 fps. Frame cadence is the same 30 fps throttle off a 60 Hz rAF.

## Not changed or not applicable

- Reduced motion: no work (founder rule S1). The old still-frame branch is kept as it
  was; critics do not flag it.
- No CSS animation rule was added, so there is no built-CSS check to make
  (lightningcss and `animation-timeline` do not come into it).
- Specimens do not move: nothing in the page's drawings animates; only the canvas does.

## Tier B should lift

1. Replace `src/themes/cottagecore/fx.ts` with the proof `fx.ts`. Delete the
   PROOF-ONLY probe lines (the `__ccFloatersProbe` block after `sync()`).
2. `theme.css` (about line 466): collapse the `.cc-motes` rules to
   `[data-theme='cottagecore'] .cc-motes { position: fixed; inset: 0; width: 100%; height: 100%; z-index: 0; pointer-events: none; display: block; }`
   and drop the dark-only `display: block` line. The proof injects exactly
   `display: block` in both schemes.
3. `Header.astro` keeps `<canvas class="cc-motes" data-cc-motes aria-hidden="true">`
   and `mountFireflies()` as they are.
4. Update `docs/` and the README motion note: light now has seeds; the canvas is
   no longer dark-only; the pulse is a burst.

## Decisions worth a look from the founder

- The resting ember is gone: between bursts a firefly is fully dark. The brief
  asked for that; the old always-on glow is what disappears.
- The fade-off speed on text is faster than today's (a change under the protected
  fireflies). It is a single constant per school, `fadeOut`, if it should go back to
  0.08.
- At 390 the seeds are only 4 and the pages are mostly text, so a seed is often
  faded out; seen on the sheets as a mostly empty cloth with one or two seeds.
