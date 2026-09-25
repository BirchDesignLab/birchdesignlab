# Tier 3, Stage 2 (the defect sweep): report for the founder

Written 09-24-26 at the Stage 2 stop. Stage 2 itself (40 commits after
`f797bc9`) was merged as PR #89 (`1f0882b`) and is live. The wrap-up is on
`feat/theme-schools-tier3-stage2-wrapup`, from `1f0882b`: the press
question, its change, the final gates, the review panel and this report.
Merging the wrap-up deploys one visitor-visible change: a press on a
switcher row no longer draws ahead.

## What Stage 2 shipped

Every school's Stage 2 repair, held to the shared swap acceptance (no frame
with two pages' body text, no white or unpainted frame, the switcher holds
still, in-school swaps under about 700 ms) and to the founder's wordmark
rule (never two wordmarks at once, the empty header at most 80 ms).

- **The wordmark, every school and quiet.** Astro's own 180 ms fade inside
  `@layer astro` beat the README's recipe; the fix is `inherit` on the
  images' duration, curve and delay (`p5-proof.md`). Every school now fades
  its old wordmark out and the new one in on the morph's own clock: no
  overlap anywhere, no blink in-school, and the blank is 0 to 68 ms.
- **vaporwave:** no white hero or green sun on the in-school swap (E1);
  Contact no longer scrolls sideways (E2); the floor runs to the page
  bottom; Exo 2 and VT323 preloaded (the cap is four); a gentler light-scheme
  CRT power-on; the tear band shows the pastel field in light;
  `preserveDrawingBuffer` dropped; the sunset links behind the beam.
- **glassmorphism:** no blur or double headline on arrival (E15); the header
  bar holds still in-school, its frost on an underlay.
- **swiss:** the column-panel wipe (item 10); the wordmark swaps in one step;
  the header holds still in-school.
- **cottagecore:** the fresh-sheet swap, no double exposure (item 2); the
  header holds still in-school; the page 34 to 37% lighter, pixel-identical.
- **grandmillennial:** the No. 1 swatch is a cut of the chintz (item 3); the
  drapes open from the first frame, with a staggered in-school swap (item
  4); the header holds still in-school; the `--lamp` token.
- **bauhaus:** balanced headings and pretty paragraphs (E5); the circle wipe
  is visible at once; the old wordmark fades without the arrival delay.
- **quiet in the Portal:** its wordmark default lives in
  `src/themes/quiet/portal.css`; the root business pages are untouched.
- **The Portal runtime:**
  - a swap clicked low on a page takes the off-screen wordmark out of the
    morph on both sides, so it never drops in from above;
  - drawing ahead: when a visitor rests the mouse 400 ms on a school's row
    (or Shuffle), or keeps keyboard focus on it 500 ms, an invisible copy of
    that page is drawn, so the GPU's first-draw work is done before the
    click. A press no longer draws (below).
- **Tooling for the next stages:** wordmark crops and the wordmark judge,
  `--from`, dense frames, `--draw-ahead` in `motion.mjs`; per-builder frozen
  builds (`snap.mjs`); the freeze harnesses; and, new in the wrap-up, the
  timed press (`trace-arrival.mjs --press-lead`,
  `harness/draw-ahead-press.mjs`) and a one-command gate runner
  (`harness/stage-gates.mjs`).

## The wrap-up's question: the press trigger (dropped)

A press on a row still drew its page ahead, a holdover from the first
version of call 1. It was filmed with a real press before you were asked
(400 runs on the live build). A press comes about 0.1 s before the click,
and a copy lays out its page in one block, so the click queued behind it.
From letting go of the button, a press 60 or 100 ms ahead was worse or even
almost everywhere: glassmorphism on a dark desktop 193 to 361 ms,
cottagecore on a phone 336 to 445, bauhaus up to twice as long. Only a slow
140 ms press mostly paid, and glassmorphism still lost.

Your call: drop it. A press now draws nothing, on any pointer; phones (no
hover) never draw ahead. Re-checked on the new build: 12 of 12 held presses
drew nothing and navigated cleanly, 96 drawn copies moved no pixel, and a
quick click holds exactly what it did before drawing ahead existed
(`freeze-investigation.md`, "Wrap-up: the press trigger").

## Evidence: the final gates

One fresh build of the wrap-up's HEAD, served through the Worker, run one
step at a time (`scripts/themes/.out/stage2-gates/gates.md`). All pass.

| gate | result |
|---|---|
| `npm run verify` | clean: 331 unit tests, astro check 0 errors 0 warnings, 440 built-site tests |
| `smoke.mjs --contact` | all passed; every school's form lands on its own sent page |
| switcher holds still | 72 of 72 (six schools, arrive and page, desktop, mobile and phone, dark and light), worst 0.4% |
| its negative control | the unnamed switcher fails in 5 of 6 schools, as it must; bauhaus's circle wipe uncovers an identical bar, as in Stage 1 |
| wordmark judge | 56 of 56 (six schools and quiet): no overlap, blank at most 68 ms, no blink, nothing hidden and counted |
| after strips and sheets | 48 strips, 48 before/after sheets |

Five strips first missed their before-the-click frame (a known capture
miss); each was re-filmed and passes.

### Timing: the first-draw freeze, with and without drawing ahead

The longest time the screen showed nothing new after a school switch, in a
fresh browser (median of 5, ms). "Cold" is a quick click; "rest 1 s" is a
mouse resting on the row a second before clicking, so its page is drawn
ahead.

| desktop dark | cold | rest 1 s |
|---|---|---|
| grandmillennial | 432 | 37 |
| cottagecore | 396 | 67 |
| vaporwave | 228 | 57 |
| glassmorphism | 212 | 47 |
| bauhaus | 86 | 51 |
| swiss | 100 | 100 (its own step-timed wipe, not a stall) |

Desktop light is the same shape (glassmorphism 323 to 45, grandmillennial
427 to 37, cottagecore 351 to 108). On the phone viewport a quick tap
behaves as cold (339 grandmillennial, 357 cottagecore, 255 glassmorphism),
since phones do not draw ahead. The mobile rows are emulation on this
desktop, not phone numbers. Two mobile hover cells (quiet arriving from
vaporwave, 243 and 264) were a camera artifact: films show 39 to 47 ms and
Chrome traces show frames presented at least every 53 ms.

## Before and after, to look at

`scripts/themes/.out/stage2-after-compare/` has all 48 (before above, after
below, 80 ms a frame). Six to start with:

1. `vaporwave__page__dark__mobile.jpg`: the white hero and green sun at
   +160 ms are gone; one tear band at +320.
2. `cottagecore__page__light__mobile.jpg`: both pages superimposed at +240
   before; after, the old sheet leaves and the new one comes up alone.
3. `glassmorphism__arrive__dark__desktop.jpg`: quiet frozen to +400, then a
   pop, before; after, it fades to the field from +240. Still a plain fade
   (transitions phase).
4. `swiss__page__dark__desktop.jpg`: both sheets' type mixed at +240 and
   the red block over body text at +320 before; after, the columns clear
   to the field, hold, and the new sheet is laid, the header still.
5. `grandmillennial__arrive__dark__mobile.jpg`: the drapes a sliver at
   +240 and two wordmarks at once before; after, the drapes part from +160
   and the wordmarks never overlap.
6. `bauhaus__arrive__light__mobile.jpg`: the circle first seen at +320,
   quiet's wordmark under bauhaus's, before; after, the wipe shows from
   +160 and the old wordmark is gone before the new one lands.

## The review panel

Workflow `aplus-tier3-stage2-review-workflow.js`, run `wf_c802d75d-9b1`:
three reviewers, Opus/medium. **All three passed, with 14 findings, all
minor**, so no refute seat or fix round ran. Checked against the journal
and the disk: 35 motion films, 24 phone strips, 120 stills and 39 phone
shots are all there, and no agent touched git.

- **Motion** (28 films): every school's arrival and in-school swap meets the
  acceptance (no superimposed type, no white frame; wordmark worst overlap
  0.054, worst blank 68 ms, no blink). Drawing ahead behaves as you called
  it: a resting mouse gets the full choreography (cottagecore's longest gap
  33 ms), a quick click gets the held freeze, and resting on a page link
  draws nothing.
- **Code, contract and guards:** the README matches the code; the findings
  were guards that only films checked, stale comments, and two small
  runtime bugs (below).
- **Visual and phones:** no protected element broken; no overflow at 390 px;
  the six still read as six schools. Touch targets under 44 px exist, none
  from Stage 2.

Done in the wrap-up from the findings (no visitor-visible change):
- `npm run verify` now pins the founder's drawing-ahead rules (a 400 ms
  mouse rest and a 500 ms focus draw; a press or a touch never does; only
  the switcher's rows and Shuffle), Astro's wordmark scope on all 35 pages,
  every school's wordmark recipe, and vaporwave's floor against the tail
  height. Each new test was shown to fail on a planted fault.
- The README tells school authors what the drawn-ahead copy is and is not.
- Stale comments fixed; the archived probes got headers; the panel's own
  probes are kept in `scripts/themes/harness/`.
- `npm run verify` after them: 339 unit tests, astro check 0 errors and 0
  warnings, 483 built-site tests.

## Decisions taken in Stage 2

All in `tier3-briefs/stage0-decisions.md`.
- Stage 2 start: all nine plan recommendations taken as written (proof on
  cottagecore, quiet fixed in the Portal only, font cap four, two waves,
  Safari parked, swiss's one-step wordmark, grandmillennial's named awning,
  bauhaus's 12ch heading kept).
- P5: the empty header between wordmarks at most 80 ms, tuned per school.
- Wave A: swiss and glass headers held still in-school; vaporwave's gentler
  light power-on; swiss's four desktop beats.
- Before wave B: swiss's scrolled header band accepted.
- Wave B: the portal-level scrolled wordmark fix; bauhaus's old wordmark
  fades at once; grandmillennial's header token; cottagecore's beat of bare
  table accepted.
- The freeze: drawing ahead only where the visitor is already changing
  school (the switcher), never on the page's own links; cottagecore's
  fireflies protected; vaporwave's sky-first frame on a slow GPU kept; the
  mouse rest lengthened to 400 ms; the press trigger dropped.
- What "the transitions phase" means: transitions become transformations;
  stalls are reduced where possible, never promised away.

## Open or held (not fixed in Stage 2)

- **For the transitions phase:**
  - glassmorphism's plain fade, and four schools' in-school swaps
    converging on one safe fade shape (`wave-b.md`, held item 4): every
    school needs its own gesture;
  - drawing ahead on a school's own links (the in-school freeze:
    grandmillennial About about 260 ms);
  - phones: no drawing ahead, so a tap into a heavy school still holds
    about 170 to 360 ms on this desktop's emulation (more on a real phone);
  - Safari and WebKit (untested with the equipment on hand).
- **Back to a scrolled page** still morphs the wordmark toward an off-screen
  box: the mirror of held item 3, older than Stage 2
  (`harness/wm-close-back.mjs`).
- **Quiet with its wordmark about 30% on screen** crossfades its old header
  line about 32 px from the new one: quiet's own page crossfade, older than
  Stage 2.
- **The arriving wordmark is found by matching Astro's inline style text**
  (`runtime.ts`): on the Astro-upgrade checklist, next to `loadWarmed`.
- **Arriving at quiet** still runs the browser's default root crossfade:
  both pages' type is legible together for about 100 ms (review motion-2;
  `portal.md` already holds quiet's own transition for the transitions
  phase). The wordmark judge passes it, because it judges only the
  wordmark.
- **Phone touch targets under 44 px**, older than Stage 2: the switcher's
  prompt dismiss (16 px wide) and its icon buttons (40 px wide), and some
  schools' header and footer links. A phone-target sweep for the pair
  stages and the portal (review visual-1 and visual-2).
- **Glass and vaporwave in dark** still share violet, magenta and cyan at
  thumbnail scale: the S3 palette boundary is Stage 3's first design call
  (review visual-3).
- **Tooling:** motion.mjs cannot tell a dropped navigation from a slow one
  (one film of 21 under load; review motion-3).

## Decisions for the founder

1. **Two small runtime bugs the code reviewer found by reading** (review
   code-1 and code-2; minor, both already live):
   - a copy can start drawing while a navigation is still loading (a mouse
     reaching Shuffle during a slow load); the swap then leaves it stuck,
     and nothing else draws ahead for up to 3 s;
   - after a Shuffle, the next Shuffle's page is not drawn ahead in Chrome;
     in Safari and Firefox, where the button is re-focused after the swap,
     a copy of a school Shuffle will not go to is drawn 500 ms after
     arriving, which would hitch the page just after a Shuffle, phones
     included (read from the code, not filmed there).
   Recommendation: **fix both before merging**, with a re-check (about 30
   minutes). The alternative is to make them Stage 3's first task.
2. **Grandmillennial's and cottagecore's header bands on a swap clicked
   low on a page** (review motion-1): their named header lands at the top
   of the screen over the old page for about 100 ms before the old page
   fades, the same as swiss's band, which you accepted. Recommendation:
   **accept it for both, as for swiss**; the transitions phase revisits all
   three.
3. **Merge the wrap-up?** It deploys the press change (a visitor who clicks
   a row quickly sees exactly what they saw before drawing ahead existed),
   plus the tests, records and tooling. PR: https://github.com/BirchDesignLab/birchdesignlab/pull/90.

## What's next

**Stage 3: pair B, glassmorphism and vaporwave**, in a new session from
`HANDOFF-09-24-26-stage3.md`. It opens by listing the per-school decisions
being applied (the Stage 0 rule) for you to revisit before anything is
built: glass's Liquid Glass direction, its palette boundary with vaporwave,
the extra controls; vaporwave's sunset-only-on-Home, the Marbloid-style
marble proposal, its wall-label wording.
