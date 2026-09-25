# Theme schools: Tier 3 Stage 3 handoff, pair B (09-24-26)

Start here. It supersedes `HANDOFF-09-24-26-stage2-wrapup.md`. Stage 3 is
pair B: **glassmorphism and vaporwave** (`tier3-briefs/portal.md`, section
6). Glass lags most, and its palette and chrome set the boundary with
vaporwave, so the two are designed in one sitting.

## Where things stand

- Stage 2 (the defect sweep) is merged (PR #89, `1f0882b`) and live.
- The Stage 2 wrap-up is on `feat/theme-schools-tier3-stage2-wrapup`
  (PR #90, https://github.com/BirchDesignLab/birchdesignlab/pull/90): the
  press trigger dropped, the final gates, the review panel and
  `tier3-stage2/stage2-report.md`. If it is merged, branch Stage 3 from
  `main`; if not, ask the founder before branching from the wrap-up branch.
- `npm run verify` was clean at the wrap-up: 331 unit tests, astro check
  0 errors and 0 warnings, 440 built-site tests.

## Read first, in this order

All under `docs/superpowers/specs/theme-schools-research/`.

1. `tier3-briefs/stage0-decisions.md`: binding, every section. The ones that
   shape this stage: S2 (the naming contract), S3 (glass against vaporwave,
   and "more interactable details, not fewer" for every school), Stage 0's
   glassmorphism D1 and D3 and vaporwave F1, the Marbloid reference, and the
   drawing-ahead calls (a 400 ms mouse rest or 500 ms focus on the
   switcher only; never a press; never a page link).
2. `tier3-briefs/glassmorphism.md` and `tier3-briefs/vaporwave.md`: the
   briefs (protect lists, E items, founder decisions), and their dossiers in
   `dossiers/`.
3. `tier3-briefs/portal.md` section 1, "Pair 2", for the boundary.
4. `tier3-stage2/stage2-report.md`: what Stage 2 left, and the open list.
5. `src/themes/README.md`: the contract (view-transition names and their
   three traps, the wordmark default and its judge, motion rules).

## First: the per-school decisions, before anything is built

The Stage 0 rule: at each pair's stage, list the per-school decisions being
applied and let the founder revisit any of them before the build starts.
"Tier 3 yes to all" makes each brief's recommendation the default, except
where the founder overrode it. Put this list to the founder first:

**glassmorphism**
- D1, lineage: **Liquid Glass forward** (founder override of the brief's
  hybrid): lensing and refraction, specular edge light, tint that adapts to
  what is behind the glass, controls that materialize rather than fade.
- Palette (S3): the wallpaper leads with warm (Big Sur warm set) or blue
  (Bloom) hues; magenta and cyan only as accents, off vaporwave's palette.
  Which of the two leads is a design call to show the founder.
- Chrome (S3): no window title bar (vaporwave owns window chrome); keep the
  traffic lights.
- D5 is superseded by S3: keep the hero toggle and the location pill, and
  add more interactable details (switches, sliders, segmented controls,
  steppers, draggable panes). Where cheap a control does something small
  (the toggle flips the glass tint); one that does nothing is `aria-hidden`
  and not focusable (README, "More interactable details").
- D3, noise: **none** (founder). The school forbids paper grain; back to the
  founder only if the glass proves it needs it.
- Defaults from the brief: D2 (C, the WCAG 3:1 floor for display-only
  regions), D4 (B, the gradient headline as the one coloured text), D7 (B,
  flat discs with crisp edges, no hotspot), D8 (A, keep Plus Jakarta Sans).
  D8 was recommended under the hybrid lineage; with Liquid Glass forward,
  ask whether Inter Display fits better.
- Done in Stage 2: E15 (no smear) and D6 (`glassmorphism-header` holds
  still in-school).

**vaporwave**
- F1 = **(b)** (founder): the Home hero stays exactly as it is, the one
  sunset. The other pages get mall, lobby and screensaver framing.
- F2, the wall label: draft the era, signature and lesson for F1 (b) and get
  the founder's approval; the words are theirs, studio "we", no em dashes.
- F3, the head: the founder's reference (Marbloid and Vapordays by supyrb)
  leans toward rendered, glossy, over-stylised 3D marble (busts, columns,
  spheres), where the brief recommended a drawn vector bust. Bring a concrete
  proposal. The one-WebGL-canvas-per-page rule holds (Home's canvas is the
  sunset), and a script-drawn canvas is not warmed by drawing ahead.
- Defaults from the brief: F4 (b, the grid as a loop with a visible seam;
  show a side-by-side first), F5 (static inactive back windows, keep the
  three-stop active bar), F6 (decline the bottom taskbar echo).
- Backlog item for this stage: the pressed task button switches instantly
  on an in-school swap; the alternative is a 250 ms fade of only that
  button ("address later", Stage 1).
- Done in Stage 2: E1, E2, the E3 tail (the floor to the page bottom), the
  font preloads, the light CRT power-on; E9's taskbar naming since Stage 1.

## The work

- **glassmorphism:** E1 to E14 and E16 (`glassmorphism.md`, section 3) under
  the Liquid Glass direction, plus the new controls (S3). Glass's page-swap
  choreography (its plain fade) is still the transitions phase's, not this
  stage's.
- **vaporwave:** the E3 plaza (kiosk and lobby tile), E4 to E8, E10 to E15,
  the rest of E9, under F1 (b), with F2 to F5 as decided.
- Hold both to the Stage 2 gates (below), and to each brief's Protect list.
  Check the S3 boundary side by side: glass dark and vaporwave dark must not
  read as the same purple-and-pink page at sheet scale.

## Gates and tools

- **The gates are one command now:** `harness/stage-gates.mjs` (verify
  first, then serve a fresh build through the Worker on :8787). It runs
  smoke --contact, the fresh-browser timing table, switcher hold-still at
  desktop, mobile and phone, the unnamed-switcher control, the wordmark
  judge for six schools and quiet, the after strips and the before/after
  sheets, and writes `gates.md`. `--reuse` re-reads verdicts after a strip
  is re-filmed alone.
- Film the "before" set first (`motion.mjs --label stage3-before`, the same
  48 as `stage2-after`), so the sheets compare against this stage's start.
- Builders film on their own `snap.mjs` ports; nothing films :8787 until
  the gates.

## How to work (lessons so far)

- **Show first:** the plan, the model per stage and the agent count before
  any workflow. Stop after each stage with strips and sheets
  (`compare-strips.mjs --out x.jpg` for the phone).
- **Verify every workflow result against its `journal.jsonl` and the disk.**
  Re-film anything a verifier did not film itself.
- **Keep an Opus critic per workflow;** Sonnet verifiers get a required list
  of adversarial cases and a `films_made` minimum.
- **Scripts go in `scripts/themes/` or `scripts/themes/harness/`,** never a
  scratchpad; say so in every prompt.
- **Long batches:** agents wait once (one Monitor, or foreground chunks
  under 10 minutes).
- **Timing needs the machine alone:** never build or film while anything
  measures, and check no other session is building before a timing batch.
- **What a visitor waits for is measured from their input.** A click that
  queues behind main-thread work (a drawn copy, a script) adds its lateness
  to the hold: read late + still, not still alone (the press trigger lesson).
- **A long screencast hold with a normal page animation-frame gap can be the
  camera:** confirm with a Chrome trace (`trace-arrival.mjs --trace`,
  presented frames) before calling it a stall. The screencast also
  sometimes misses the frame before the trigger; re-film that strip alone.
- **`snap.mjs` builds rewrite `dist/`,** which the :8787 Worker serves.
  Rebuild the Worker before the gates.

## Open or held (not Stage 3's)

- For the transitions phase: glassmorphism's plain fade and the in-school
  swaps' shared fade shape; drawing ahead on a school's own links; phones
  get no drawing ahead; Safari and WebKit.
- Back to a scrolled page still morphs the wordmark toward an off-screen box
  (`harness/wm-close-back.mjs`); quiet's own header crossfade at about 30%
  on screen.
- The arriving wordmark is found by matching Astro's inline style text
  (`runtime.ts`): on the Astro-upgrade checklist, next to `loadWarmed`.
- Arriving at quiet runs the browser's default root crossfade (both pages'
  type legible for about 100 ms): quiet's own transition is the
  transitions phase's.
- Phone touch targets under 44 px, older than Stage 2 (the switcher's
  prompt dismiss and icon buttons; some schools' header and footer links):
  fix glass's and vaporwave's in their chrome work here, the rest at their
  pair stages, the switcher's in a portal pass (`stage2-report.md`).
- Review code-1 and code-2 (a copy drawn into a navigation's load; a stale
  Shuffle pick and Safari's refocus drawing a wrong copy) were fixed before
  PR #90 merged, on the founder's word (`953ef7f`;
  `harness/draw-ahead-nav-probe.mjs` shows both before and after).
- Grandmillennial's and cottagecore's scrolled header bands: the founder
  lives with them for now, as with swiss's; the transitions phase
  revisits all three.
- `motion.mjs` cannot tell a dropped navigation from a slow one (review
  motion-3); a failed arrive film under load should be re-filmed alone.
