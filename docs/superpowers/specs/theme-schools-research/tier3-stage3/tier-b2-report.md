# Tier 3, Stage 3, wave B2 (the showpieces and interactables): report for the founder

Written 09-26-26 at the round-4 stop; the top updated 09-27-26 at the
round-5 stop. Branch `feat/theme-schools-tier3-stage3-b2`, draft PR #93
(not ready, not merged). The round-by-round record is `tier-b2-status.md`;
every answer is in `stage3-decisions.md`.

## Where it stands (after round 5)

- **Both schools pass.** Vaporwave passed at round 4. Glass passed at round
  5: the Opus critic found no blockers, the Sonnet verifier made 13 films
  and every case passed (steady lens starts over 36 loads, every hero orb
  within 2 px of B1 at five sizes, the tablet window at B1's height, the
  phone lens crossing the orb edge, the poster matching the live lens).
- **Gates on the round-5 tree: all seven pass** (smoke, timing, switcher,
  unname, wordmark, after-strips, sheets). `npm run verify` clean (410 unit
  tests, astro check 0 errors, 483 built-site tests).
- **Glass does not arrive later.** The round-4 number (+150 to +280 ms)
  came from a measure that fires when the old page starts to fade. Measured
  by when the glass page is actually on screen (`land90`), glass moved +12
  to +88 ms against Stage 2, inside the machine drift of schools Stage 3
  never touched (+34 to +131). What changed is that the old page now holds
  still a little longer and then cuts, where B1 faded early into an empty
  dark frame. Per your answer, nothing more is done now; the transitions
  phase takes it, and the gates now read `land90` beside `firstVisible`.
- **Next: your go to merge #93** (merging deploys), then your iPhone look.
  Four small taste calls from round 5 are below; none blocks.

## Calls from round 5 (none blocks)

1. At 1440 the poster and the live lens are now the same material, but CSS
   cannot bend the orb edge, so the edge inside the disc straightens on the
   poster and bends at the swap about 850 ms in, and the rim brightens
   (barely visible at 820 and 390). Accept, or a pre-rendered poster image
   later? Sheet `founder-r5/07`.
2. The phone lens's visible half crosses the peach orb's edge, but the peach
   showing below the window is small, so the bend reads weakly; more would
   move an orb or the lens off B1's spots. Accept? Sheet 08.
3. The tablet lens now starts at the lower-right corner over peach (round 4
   had lower-left over pink), where it crosses an orb edge with B1's window.
   Fine?
4. On phones and tablets, B1's first view had the next section's violet orb
   by the window's corner; with the Control Centre in the hero it sits about
   360 px lower. Accept?

Round-5 sheets: `scripts/themes/.out/stage3-b2/founder-r5/` (`index.md`).

## The round-4 stop (kept for the record; answered 09-26-26)

At round 4 vaporwave passed and glass blocked on 2 (the 820 lens jump and
the desktop orbs off B1's spots); both are fixed in round 5. The sections
below are as written then.

## How B2 ran

Six workflows: the build (10 agents), fix round parts 1 and 2, round 3 (8
agents), round 4 (6 agents: glass fixer Opus `medium`, vaporwave fixer
Sonnet `xhigh`, then per school an Opus `high` critic and a Sonnet `high`
verifier) and round 5 (glass only, 4 agents: fixer Opus `medium`, a
read-only timing investigator Opus `high`, critic Opus `high`, verifier
Sonnet `high`). What worked: Opus `medium` for lens and WebGL runtime fixes
(Sonnet fixers regressed them twice); Opus `high` critics (they found every
real defect); verifiers at Sonnet `high` (at `medium` they filmed nothing).

## What B2 built

### Glassmorphism

- **The lens:** a WebGL lens in every engine, refracting the same wallpaper
  file as the CSS background and the real orbs, rigid-glass handling (1:1,
  0.20 s glide, no spring, at most 4% stretch), grabbable on its visible
  disc only, draws only when something changes, context loss and restore,
  poster before the first frame and without WebGL. The rim colour split
  halved on your call. Z order: wallpaper, orbs, lens, panes.
- **Home's orbs** follow the page again exactly as B1 placed them on scroll
  (the clock now reads the same box CSS does; within 0.1 px).
- **Phone:** B1's hero is back; the lens starts half under the window's
  lower-right corner across the peach orb; a drag on its visible half moves
  it, a swipe on the covered half or the copy scrolls the page.
- **The Control Centre:** four compact tiles (location, Clear/Tinted, frost,
  time of day), frost live in Chromium and Safari's stepped path, settings
  held all session, one scroll below the first view on desktop (your call),
  67 to 204 px clear of the portal switcher at rest.
- **Services:** one settings pane, inert switches and steppers visible and on
  one baseline; the pointer light on commands.

### Vaporwave

- **The Venus:** a 30,000-triangle meshopt GLB, white marble with pastel
  rims, veins off the face; stills on About and beside the kiosk; the live
  About bust (drag, glide, idle turn, keyboard, context restore that looks
  right, a handoff under 2% changed pixels at every width).
- **Windows:** title-bar drag on desktop, captions that press like Win95 and
  select nothing.
- **Contact's screensaver:** Settings and Preview, three loops (sunset,
  marble sphere, 3D pipes). The pipes are now crisp shaded tubes with ball
  joints, no glow band.
- **The kiosk attract loop:** plays in the part of the CRT that is on screen
  where you tapped, with no scroll.

## Glass blockers (for a round 5, your go)

1. **Portrait tablets (820 x 1180): the lens jumps across the window on
   arrival.** The poster sits at the lower-right corner, then the live lens
   mounts at the lower-left, 626 px away, with a blank frame between (10 of
   12 loads; the other 2 settle right, so it also varies). Cause: the start
   is planned twice, first before the orb clock has moved the orbs, then
   after. Phones happen to pick the same corner both times. Fix: plan from
   the clock's positions and keep the poster's spot when it is still valid.
   Sheet 03.
2. **Desktop hero orbs are not where B1 put them.** The Control Centre sits
   inside the hero, so the hero box grew 167 to 263 px and every
   percentage-placed orb moved down with it: at 1440 the pink and peach orbs
   at the window's lower corners are gone from the first view; at 1280 and
   1024 two of four first-view orbs are lost. This began when the tiles
   joined the hero (round 2), not in round 4; round 4 restored B1's orb box
   on phones only. Fix: give the orbs B1's box at every size. Sheets 01, 02.

Recommended: one more glass-only round (an Opus `medium` fixer for both,
then an Opus `high` critic and a Sonnet `high` verifier that films 820
arrivals). Three agents.

## Calls for the founder

Timing:

1. **Glass arrives later than before Stage 3.** First visible frame of the
   glass page after a cold or switcher-warm click, against the Stage 2
   gates: desktop dark +220 to +244 ms, mobile dark +259 to +279, mobile
   light about +183, desktop light only +17 to +28. Hover and warm arrivals
   are unchanged. Schools Stage 3 never touched (cottagecore,
   grandmillennial) also read +35 to +113 ms this run, so part of it is the
   machine; glass is still about 150 to 200 ms beyond that. After B1 it was
   20 to 70 ms. The arrival film shows no freeze: the old page simply holds
   about 160 ms longer before glass paints (`stage3-after-compare/`).
   Options: accept it and take it into the transitions phase (as you did
   after B1), or look now at what the lens and tiles add to glass's first
   paint. Recommended: a short investigation in round 5 (one question: what
   in the first paint costs 150 ms), fix only if it is cheap.

Glass taste:

2. The phone lens sits almost concentric with the peach orb, so its visible
   half shows the orb's lower edge inside the disc, not an edge crossing the
   rim. That look, or start further along the edge? Sheet 08.
3. Portrait tablet: the window sits at 152 px (B1: 290; round 3 moved it)
   and the Control Centre has a 5rem margin to clear the lens. Accept? Sheet
   09.
4. Desktop arrival: the poster reads as a solid tinted disc, then the clear
   live lens about 850 ms after the click (same spot and size; predates
   round 4). Match the poster to the lens, or accept?
5. Phone first view at rest: the portal switcher sits over the Control
   Centre's second tile row. Fine?

Vaporwave taste:

6. A tap with the kiosk button in the top ~200 px of a phone screen leaves
   under ~125 px of CRT on screen, so the loop plays mostly out of view.
   Accept, echo it on the plaque or button, or clamp it? Sheet 14.
7. The desktop attract loop now centres in the visible part of the screen
   when the CRT's top is scrolled off (identical when the whole screen is in
   view). Keep?
8. Pipes: a spawn point also gets a ball joint (the original does not), and
   the drop shadow shows as a thin crescent ahead of a growing head. Keep
   both? Sheets 10 to 12.

Still owed after deploy (your iPhone): the bust's seat and its 1.5x render
with 2x supersampling, Safari's frosted panes, the lens's iOS scroll.

## Verifier notes, not defects

- Vaporwave case 16 flagged a dark line on the face "at yaw 60". The frame
  shows a clean face; the probe's yaw labels are off (its "yaw 0" is the
  back of the head) and the marble code is untouched since round 3. Probe
  noise, most likely brow or nose shading.
- Vaporwave case 20's halo-band sub-metric reads 0.07 to 0.2 against 0.1 at
  small line widths (antialiasing); the 2x crops show no band.
- The glass verifier (10 films, 0 failures) did not film 820 arrivals, so it
  missed blocker 1; the critic caught it.

## S3 boundary

`15-s3-side-by-side-desktop.jpg` and `16-...-mobile.jpg`: glass and
vaporwave Home, About and Contact, dark and light. Glass dark (warm orbs
behind frosted panes) and vaporwave dark (neon grid, Win95 chrome) read
nothing alike. Holds.

## Where to look

- Founder sheets: `scripts/themes/.out/stage3-b2/founder-r4/` (numbered;
  `index.md` lists them).
- Gates: `scripts/themes/.out/stage3-gates/gates.md`; timing compare
  `scripts/themes/.out/stage3-gates-timing/compare-stage2-gates-timing-firstVisible.md`
  (`harness/b2r4-timing-compare.mjs`); before/after strips
  `scripts/themes/.out/stage3-after-compare/`.
- Round 4 reports: `scripts/themes/.out/stage3-b2/w5-reports.json`.
