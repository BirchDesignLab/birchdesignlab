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
- The flash is bigger at its peak so it registers at page scale, not only in a
  close crop (round 2): the halo radius is 7 mote radii when barely lit and grows
  by 7 more at the peak (it was a fixed 9), and the core is 0.7 radii growing by
  0.8 (it was 0.7 growing by 0.3). A peak halo is about 18 to 34 px in radius. The
  larger halo needs a little more clear air, so the text pad for a mote goes from
  8 to 12 px.
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
- Pushed by the pointer: a cursor inside 120 px pushes away (up to 600 px/s2, up from 340 in round 2 so a passing
  cursor is plainly answered; only while it moved in the last 1.5 s); a tap inside 170 px kicks (up to 230 px/s).
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
Every sheet frame is a real screenshot from a real film; the pictures were looked at
before this write-up was finished.

- `sheet-fireflies-1440.jpg`, `sheet-fireflies-390.jpg`: dark Home, whole-page
  frames. A flash is only a few pixels of a page, so the frames are chosen by what is
  in the pixels: each dark film waits (up to 1.8 s) for a mote that is on show and
  near the peak of a flash before every screenshot, the 36 frames are at least 0.33 s
  apart, and the sheet then shows the five frames with the brightest flash and the
  quietest one, in time order. "Peak" under each frame is the greatest rise in
  brightness over the page without fireflies (the darkest value each pixel takes in
  the film), 0 to 255. At 1440 the five frames show peaks of +188 to +205 and the
  flash is a plain warm dot with a halo on the dark cloth; at 390 the five show +177
  to +198 and are small but readable (a dot and a halo at 560 px a cell); the quiet
  frame is +0. Across the film 20 of 36 frames at 1440 and 24 of 36 at 390 have a
  flash of +100 or more. These frames are aimed at flashes, so they show what a
  flash looks like, not how often one is lit: for that see the lit-at-once numbers
  below (18 motes, 1.5 lit on average at 1440; 7 motes, 0.3 at 390).
- `sheet-fireflies-crops-1440.jpg`, `sheet-fireflies-crops-390.jpg`: the same
  frames, a 220 px square around the brightest spot at 2x, so each lit mote can be
  read.
- `sheet-seeds-home-1440.jpg`, `sheet-seeds-about-1440.jpg`, `sheet-seeds-home-390.jpg`,
  `sheet-seeds-about-390.jpg`: light, six frames over about 25 s (not aimed). Seeds
  move up and across over the cloth, vanish into the sheets, and keep clear of the
  headings and paragraphs.
- `sheet-pointer-dark-1440.jpg` (cursor onto a mote) and
  `sheet-pointer-dark-390.jpg` (a tap). The mote is set down in the roomiest open
  cloth the page has (a 3 x 3 sample box of +/-40 px, all of it shown with the canvas
  painted magenta so a tape or sheet over it would show, and at least 50 px from
  text; at 390 it is on the Home header at scroll 0, 62 px from text). The first clip
  is the mote dark; the next clips run through the rise and fall. Peak glow over the
  dark clip, read off the pixels: +198 at 1440, +182 at 390 (a tapped mote earlier
  sat on the edge of a tape and showed +0 to a dim halo; that is what the shown-box
  test fixes).
- `sheet-pointer-light-1440.jpg` (cursor sweeping through a run of open cloth, a
  hand-speed pass of about a second) and `sheet-pointer-light-390.jpg` (a tap
  behind the seed). Here the point is a seed whole on the cloth and visibly moving
  away, so how the seed is placed matters and is stated:
  - What counts as open cloth is read from the browser, not from `elementFromPoint`
    (a transparent host with a painted pseudo-element answers "bare" while a sheet
    covers it): the canvas is painted solid magenta and a cell counts only where the
    screenshot still shows magenta. The page is searched at 60 px scroll steps for
    the longest straight run (16 directions) along which the seed's whole drawn box
    is on show and clear of text by the 12 px pad plus a margin, preferring the run
    furthest from any text. The tap point is checked too: on a cell with no link,
    control or pointer cursor (an earlier take tapped a footer link and navigated).
  - One seed is then set down at the start of that run, at the breeze velocity, and
    left to the real loop. At 1440 it is a run of 340 px at scroll 0 with 34 px of air
    (the right margin, x about 1385); the cursor travels along it behind the seed.
    At 390 the longest run on the whole page is 100 px with 12 px of air (the Home
    footer, scrolled to 2760); the seed is drawn at scale 0.5 (size 0.8, the bottom of
    the real range) and the tap is placed 103 px behind it so the kick carries it
    about the length of the run.
  - Result, read per clip (the seed's drawn alpha above 0.3 and inside the clip):
    at 1440, 12 of 24 clips show the seed whole and 5 of those are 40 px or more
    off the breeze track, up to 151 px while on show (the later clips follow it out
    of the frame and are marked "not on show"). At 390, 12 of 14 clips show it whole,
    7 of them 30 px or more off track, up to 68 px while on show. The check is
    built into the harness (3 clips or more, 40 px at 1440 and 30 px at 390, or the
    take is retried and not kept); both passed on the first take.
  - A phone is a short drift. Its page has no run of open cloth longer than about
    100 px, so what the tap shows is a seed leaving the tap spot over about a second,
    not a long flight. On a phone a harder tap often makes the seed fade out instead
    of drift, because the kick sends it toward text and the 0.7 s look-ahead takes it:
    the keep-off-the-text rule winning over the push. That is why the tap is placed
    to carry it about the run and no further.

Resume: the burst clock is re-staggered whenever the dark branch restarts after a
gap (light to dark flip, hidden tab), and the gust clock is reset the same way.
Before this, a 10 s stay in light and a flip to dark lit 11 of 18 motes at once on
one frame (14 of 18 shared one start time). Now, after the same 10 s in light and a
flip, over 9 s: at most 8 of 18 lit at once at 1440 (4 of 7 at 390), 25 first bursts
at 1440 and 7 at 390, with at most 2 sharing a start frame (`resume-light-to-dark-*`
in measures.json).
- `shots/*__fullpage.png`: whole-page stills (the fixed canvas paints the first
  viewport only).

## Measured (measures.json)

Bursts, 70 s per size, read from the live state (round 2 re-run):

| | 1440 (18 motes) | 390 (7 motes) |
|---|---|---|
| bursts seen | 168 | 66 |
| flashes per burst (2, 3, 4) | 48, 60, 60 | 14, 19, 33 |
| gap start to start | 430 to 570 ms, mean 503 | 430 to 569, mean 503 |
| rise | 120 to 180 ms | 120 to 179 |
| dark rest | 4.04 to 8.04 s, mean 6.10 | 4.20 to 7.93, mean 5.95 |
| most lit at once | 7 of 18 (mean 1.5) | 2 of 7 (mean 0.3) |
| frames with every mote lit | 0 | 0 |
| frames with none lit | 19% | 69% |

Text, same independent rects, three slow sweeps up and down the page, every drawn
halo centre or seed:

- Fireflies at 1440: 9 of 2383 visible draws with the centre on text (0 above
  alpha 0.15); today's fireflies, same test, same scroll: 1998 of 13303 (1103 above 0.15).
  At 390: 3 of 526 (0 above 0.15) against 1159 of 4333 (608).
- Seeds, 60 s each: centre on text 0 in all four runs (Home and About, 1440 and 390).
  Drawn extent touching text: 0 at Home 1440, 2 at About 1440 (worst alpha 0.09), 0 at
  Home 390 and 0 at About 390. Nearest centre to any text 34 to 39 px.

Cost (12 s idle, then a 5 s scroll; CDP Performance deltas and rAF callback timing),
round 2 re-run with the larger flash and the stronger push:

| | today | proof |
|---|---|---|
| dark 1440 idle, task ms per s | 6.9 | 6.0 |
| light 1440 idle, task ms per s | 0.1 (nothing runs) | 5.7 |
| dark 390 idle | 6.4 | 5.8 |
| light 390 idle | 0 | 6.0 |
| rAF callback mean (all light and dark) | 0.02 to 0.04 ms | 0.02 ms, p95 0.1 ms, max 0.2 ms |
| rect reads during a 5 s scroll | 2156 (even in light, where nothing draws) | 0 |
| scroll task ms (5 s) dark 1440 | 69 | 52 |

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
- The flash is bigger at its peak than today's (halo up to about 34 px in radius
  against 22 at most), and a passing cursor pushes a seed harder (600 against 340
  px/s2). Both are constants at the top of `fx.ts` (`FIREFLY.haloMin/haloGrow`,
  `SEED.pushAccel`) if the founder wants either quieter.
