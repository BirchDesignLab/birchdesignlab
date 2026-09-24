# Tier 3, Stage 2 (the defect sweep): plan

Written 09-23-26 at the start of the Stage 2 session. Branch
`feat/theme-schools-tier3-stage2`, from `main` at `f797bc9`. Proposed, waiting
for the founder's go. Binding inputs: `tier3-briefs/stage0-decisions.md`, then
the Stage 2 handoff (`HANDOFF-09-23-26-stage2.md`).

## The founder's mobile test (09-23-26)

iPhone 17 Pro Max, Safari, private mode, on the live site after #88:

- The switcher and the prompt are good. Entering and leaving the Portal works.
- Nothing individually looked broken. "Everything looked pretty good on the
  phone. I am still impressed."
- "Some of the transitions are a little stuttery or buggy, but I know that is
  coming down the road." Transitions phase. Our films are Chromium only, so
  Safari's behaviour is unmeasured (decision 6).

## Found while planning: the README's wordmark recipe has a hole

Every school's header carries `transition:name="wordmark"`, and for it Astro
writes a style block into every page:

```css
@layer astro {
  ::view-transition-old(wordmark) { animation: astroFadeOut 180ms cubic-bezier(0.76, 0, 0.24, 1) both; }
  ::view-transition-new(wordmark) { animation: astroFadeIn 180ms cubic-bezier(0.76, 0, 0.24, 1) both; }
}
```

(Checked in `dist/t/{quiet,cottagecore,grandmillennial,vaporwave}/index.html`
on the HEAD build.) No school styles the wordmark's images today, only its
group, so every arrival and every in-school swap runs Astro's simultaneous
180 ms crossfade inside a 240 to 640 ms morph. Both wordmarks sit near half
opacity together around +90 ms, each stretched to the morphing box. That is
the smear.

The README recipe sets only `animation-name` and the fill mode on the images.
Astro's layered duration and curve still apply, so the images keep 180 ms
rather than "inheriting the group's duration" as the README says. The fades
would finish in the first 180 ms of a 560 ms morph. That probably never shows
both wordmarks at once, but it is not the recipe the README describes, and it
is likely why Stage 1's proof was inconclusive. The proof settles it. The
likely fix is `animation-duration`, `-timing-function` and `-delay: inherit`
on both images, or explicit values. The README is corrected to match, and the
fix is proved by measurement, not by reasoning.

## Step 0: baseline (orchestrator only, no agents)

1. `npm run verify` on HEAD, so the stage starts green.
2. Serve HEAD with the Worker (`preview_start worker`, :8787).
3. Film `.out/stage2-before/` full frame: arrive and page, six schools, dark
   and light, desktop and mobile (48 strips). Stage 1's baseline predates the
   "From the lab" change, so it is not reused.

## Step 1: the P5 proof

Workflow `aplus-tier3-stage2-p5-workflow.js`: 4 agents, up to 6 with one fix
round.

| seat | model / effort | job |
|---|---|---|
| A. film tooling | Opus / high | Adds four things to `motion.mjs`: `--crop wordmark`; `--from <school>`; dense frames; and the overlap judge. The crop is the union of the old wordmark's box (measured before the trigger) and the new one's (measured after it settles), padded. Dense frames mean every screencast frame through the transition, not 16 picks. The overlap judge samples the computed opacity of `::view-transition-old(wordmark)` and `-new(wordmark)` every animation frame until `finished`, and fails a strip if both are visible together; the verdict goes in the manifest. Also writes `scripts/themes/snap.mjs`: under the render lock it builds, copies `dist/` to a per-name snapshot and releases the lock, then serves the snapshot on its own port and runs a command against it. That lets several builders film without a rebuild changing what they film. Films the HEAD wordmark crops for all six schools and quiet as a destination: the "before" set and the negative control, which must fail. |
| B. proof | Opus / high | Applies the recipe to one school (decision 1) and closes the Astro-layer hole. Corrects the README. Films on its own snapshot port, arriving from quiet, from vaporwave and from swiss, plus the in-school page swap; dark and light, desktop and mobile. Passes only if the judge passes every strip, the dense crops show no frame with both wordmarks legible, the in-school wordmark holds still (no blink), and the HEAD control fails. |
| C. critic | Opus / medium | Checks that the judge measures what the eye sees (image-pair opacity, sampling rate, crop geometry). Reviews the recipe and the README amendment. |
| D. refuter | Sonnet / medium | Reads every proof crop frame by frame and tries to find one with both wordmarks legible; confirms the HEAD control fails. Defaults to refuted when unsure. |
| E, F (only if C or D find a real fault) | Opus / high fixer, then Sonnet / medium re-check | One fix round. |

**Checkpoint (recommended, decision 2):** stop and show the before/after
wordmark crops, the judge's numbers and the README diff. The sweep adopts the
recipe only after that.

## Steps 2 and 3: the sweep, two waves of three schools

Workflow `aplus-tier3-stage2-sweep-workflow.js`, run once per wave. Wave A:
vaporwave, glassmorphism, swiss (the heavier transition repairs). Wave B:
cottagecore, grandmillennial, bauhaus. Each wave has 7 agents, up to 13 with
a fix round.

Each school is one pipeline lane:

1. **Builder, Opus / high.** Fixes the school's `portal.md` Stage 2 items
   without the reduced-motion parts (S1), adopts the wordmark default as the
   proof left it, and fixes its first-frame items from `p4-trace.md`. It
   films its own work on its own snapshot port (vaporwave 4461,
   glassmorphism 4462, swiss 4463, cottagecore 4464, grandmillennial 4465,
   bauhaus 4466) and iterates until its gates pass:
   - full-frame arrive and page strips;
   - the wordmark judge;
   - `--crop switcher` hold-still;
   - no horizontal scroll at 390 px;
   - `render.mjs` stills and contrast;
   - the school's unit tests.
   It never touches :8787, runs no git that changes state, and builds only
   through the lock.
2. **Verifier, Sonnet / medium.** Re-films independently from a fresh
   snapshot and tries to refute each acceptance claim (listed below).
3. **Critic, Opus / medium, one per wave.** Reviews the three schools'
   before/after strips and stills side by side. Checks the protect lists and
   the school's idiom, and that the fix does no pair-stage work early. Checks
   that copy is untouched (parity), and that fixes change structure rather
   than tune to today's words, because the copy pass reflows every school.
4. **Fix round.** Only for a school with a confirmed failure: an Opus / high
   fixer, then a Sonnet / medium re-check. One round inside the workflow;
   anything left comes back to the orchestrator.

The orchestrator checks each wave against its `journal.jsonl` and the disk
before starting the next.

**Shared swap acceptance** (portal.md section 4, minus reduced motion), plus
Stage 1's gates:

- no frame shows both pages' body text legible;
- no white or unpainted frame;
- the switcher holds still;
- in-school swaps stay under about 700 ms;
- `npm run verify` is clean;
- `smoke.mjs --contact` is clean;
- `motion.mjs --crop switcher` holds still for arrive and page;
- the `--unname-switcher` control still fails.

## Step 4: gates, review, report

1. **Gates, orchestrator only, on the final build through the Worker:**
   - `npm run verify` and `smoke.mjs --contact`;
   - hold-still for arrive and page, all six schools, at desktop, mobile and
     phone;
   - the `--unname-switcher` negative control;
   - the wordmark judge for all six, and quiet if decision 3 is yes;
   - `.out/stage2-after/` (48 strips) and `compare-strips.mjs` sheets
     against `stage2-before`;
   - `trace-arrival.mjs` (cold, switcher-warm, warm), so the first-frame
     items show in numbers.
2. **Review panel,** workflow `aplus-tier3-stage2-review-workflow.js`, up to
   9 agents:
   - three reviewers, Opus / medium: motion and acceptance; code, contract
     and guards; visual idiom and phones;
   - one refute seat per finding, Sonnet / medium, up to 6;
   - then one Opus / high fixer and one Sonnet / medium re-check if needed.
3. **`tier3-stage2/stage2-report.md`, then stop for the founder**, with
   strips and screenshots.

**Agent count for the stage:** about 27 as planned, 43 at most if every
optional fix round runs.

## Per-school decisions being applied (the defaults; the founder may revisit any)

- **vaporwave**:
  - E1: (a) keep the hero's pixels in the old capture (the builder picks
    `preserveDrawingBuffer` or render-and-hide from the strips); (b) a short
    opacity fade for the in-school old root, keeping `vw-crt-off` for
    leaving the school; (c) no hue rotation over 8 degrees, and the tape
    error carried by translate or skew plus one tear band.
  - E2: stack the trust parts as terminal lines at every width
    (structural).
  - The E3 tail only: paint `[data-portal-tail]` with the floor. The kiosk
    and lobby tile wait for pair stage 3.
  - The Exo 2 and VT323 preloads: decision 4.
- **glassmorphism**: E15 without its reduced-motion bullet. The in-school
  swap becomes a short opacity handoff, the arrival loses the text blur, and
  the wordmark group runs 333 ms `cubic-bezier(0.55, 0.55, 0, 1)` over the
  default fades.
- **swiss**: item 10 without its reduced-motion bullet. Column panels clear
  to the field, hold, then reveal, with the panels on the grid's columns. The
  wordmark: decision 7.
- **cottagecore**:
  - Item 2, using `cottagecore-header` (README contract). The opaque new
    sheet with a small lift replaces the page turn, only as far as item 2
    needs (portal.md section 5); "laid on the table" waits for the
    transitions phase.
  - The 337 KB page: cut structurally (each pressed specimen defined once
    and reused, or less path precision). Acceptance is pixel-identical
    stills (`diff-captures.mjs`).
  - The dark-mode fireflies are protected.
- **grandmillennial**:
  - Item 3: the No. 1 swatch clips the full-size `#gm-chintz` (the brief's
    first option).
  - Item 4: (a) the drapes start at `inset(0 47%)` on a decelerating curve;
    (b) becomes the README default; (c) the staggered in-school swap. If the
    awning blinks at the midpoint: decision 8.
- **bauhaus**:
  - E5: `text-wrap: balance` on headings and `pretty` on paragraphs. The
    brief's "widen the 12ch cap so the heading fits one line" is
    copy-dependent: decision 9.
  - The circle wipe gets a non-zero start radius and an ease without a flat
    start (the builder picks from the trace).

## Decisions for the founder before launch

1. **Proof school.** Recommend **cottagecore**: the smear finding came from
   it, and its wordmark's shape differs most from quiet's. Grandmillennial
   was Stage 1's throwaway try.
2. **Stop after the P5 proof?** Recommend **yes**: every school adopts its
   result.
3. **Quiet as a destination.** Arriving at `/t/quiet/` from any school runs
   Astro's crossfade too, because quiet has no stylesheet of its own.
   Recommend **fixing it in Stage 2** with a small stylesheet imported only
   by the `/t/quiet/` route, so the root pages stay untouched. The
   alternative is parking it for the transitions phase.
4. **Vaporwave's font preloads.** A guard caps each school at two preloads
   (`tests/theme-registry.test.ts`). Vaporwave paints four faces, so Exo 2
   and VT323 arrive after the swap. The options:
   - (a) keep the cap and preload the two faces that paint first;
   - (b) raise the cap to four for faces above the fold, which matches the
     founder's "eat it up front".
   Recommend **(b)**.
5. **Waves.** Recommend **two waves of three**: each stays under about 10
   agents, and the lessons from wave A reach wave B. The alternative is one
   six-lane workflow of 13 to 19 agents.
6. **Safari.** The founder saw stutter on iPhone Safari, and our films are
   Chromium only. Playwright's WebKit is a download, and its Windows build is
   not iOS Safari. Recommend **parking this for the transitions phase**,
   where it matters most, and noting it in the backlog.
7. **Swiss's wordmark.** Recommend the brief's **one-step swap** (a station
   clock): it tunes the default and never shows both wordmarks. The
   alternative is the default fades.
8. **Grandmillennial's awning, if it blinks mid-swap.** Recommend naming it
   `grandmillennial-header`, which the S2 contract now allows (the brief's
   "no second name" predates S2), rather than the brief's held-old-root
   fallback.
9. **Bauhaus's 12ch process heading.** Recommend **skipping the widening**:
   it tunes to today's words, and the copy pass reflows them.
