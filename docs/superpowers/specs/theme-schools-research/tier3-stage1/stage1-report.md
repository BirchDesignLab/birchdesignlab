# Tier 3, Stage 1 (portal stage): report for the founder

Written 09-23-26 at the Stage 1 stop. Branch `feat/theme-schools-tranche-1`,
nothing pushed. Stage 2 (the defect sweep) waits for the founder.

## What shipped (commits 4ee4a55 to a2d43ab)

- **P1, the switcher holds still.** It has its own view-transition name
  (`bdl-switcher`). A layered `!important` block reverts every property a
  school could set on its transition pseudo-elements. On phones it is centred
  by layout, so its snapshot lands on whole pixels.
- **P2 / S2, the naming contract.** The runtime sets `data-to-theme` on the
  departing page and clears `data-from-theme` once an arrival finishes. A
  school names its own chrome `<id>-*` with one `:is()` rule, for in-school
  swaps only. Vaporwave's taskbar is the first (`vaporwave-taskbar`). The
  README has the contract; the built guard enforces it.
- **P3:** dropped (S1, reduced motion is out of scope).
- **P4:** measured in full (`p4-trace.md`). The warm-up is shipped: opening
  the dialog, or pointing at Shuffle, loads the destination pages into memory
  with their CSS, fonts and scripts, and a warmed switch makes no network
  request. A busy line marks the pressed control. The 160 ms target moves to
  the transitions phase (founder decision) and to each school's Stage 2
  items.
- **P5:** the default wordmark crossfade is in the README. The proof was
  inconclusive (see Carried to Stage 2).
- **P6 / S6 / S7:** the dialog opens on a placard (era, signature, lesson),
  a one-time prompt sits above the bar, and the schools run in era order
  after quiet.
- **The bar keeps one width** in every school and scheme, so Shuffle never
  moves under a thumb (from the review; a visible change, see decision 5).
- **Quiet's header:** Contact is no longer lit on `/contact/sent/`, root and
  portal alike. The Lab link still lights across the Lab section.
- **The name:** BDL-010 is "The Portal".
- **README:** S1, S2, S3, the wordmark default, and the forbidden
  properties on the shared `::view-transition` pseudo.
- **Review fixes:**
  - focus is kept on the switcher after a school change in Safari and older
    Firefox;
  - Back or Forward closes an open dialog;
  - a landscape phone opens the dialog with the placard in view;
  - Escape dismisses the prompt;
  - warm-ups survive a school switch, and the warm-up includes the Latin
    @font-face files.

## Evidence

- `npm run verify` is clean: 331 unit tests, astro check 0 errors and 0
  warnings, the build, and 431 built-site tests. The portal smoke test
  passes: 180 checks, including the new end-to-end runtime checks.
- **Hold-still** (the switcher judged frame by frame): 36 of 36 strips held
  still across arrivals and in-school swaps, all six schools, at desktop,
  mobile and phone (worst 0.3%). The final comparison set is 8 of 8.
- **Negative control:** the same check with the switcher unnamed fails. At
  desktop: vaporwave 54.9%, cottagecore 23.1%, glassmorphism 18.2%,
  grandmillennial 4.0%. So the check sees the fault.
- **Before and after strips** (`scripts/themes/.out/stage1-compare/`):
  1. vaporwave, desktop: the switcher vanishes into the CRT, then holds
     still;
  2. grandmillennial, phone: the drapes slice it, then it holds still;
  3. glassmorphism, desktop;
  4. and 5. vaporwave's taskbar on an in-school page change: before, it
     flashes red at +400 ms and blue at +480 ms; after, it holds still.
- **New baseline:** 48 full-frame strips (`.out/stage1-baseline`: arrive and
  page, all six, both schemes, desktop and mobile), filmed on the final
  build.

## Decisions for the founder

Copy is the founder's; the recommendations are only a starting point.

1. **The first-load prompt.** The placeholder is "The Portal: this site in
   seven design schools. Pick one to step through." Two notes: "seven" goes
   stale when tranche 2 lands, and "step through" is passage wording, which
   the founder set aside for the transitions. Drafts:
   - A: "You're in the Portal: this site, rebuilt in one design school after
     another. Pick a school." (Echoes the Lab card; no count.)
   - B: "Welcome to the Portal. Choose a design school and watch this page
     change with it." (Points at the transitions, the crown jewel.)
   - C: "The Portal: same words, same pages, a new design school every time
     you switch. Pick one." (Says the rule of the exhibit.)
2. **The placard labels.** The kicker is "You are here" and the run-in tag
   is "Lesson". Keep, or replace them with portal wording.
3. **The placard repeats the current school's row** (name, era, signature)
   directly above that row. On desktop it pushes grandmillennial and
   glassmorphism below the list's fold; on a phone it fills most of the
   screen. Recommendation: the placard shows the era and the lesson only (the
   lesson is the one line the list lacks), or it becomes the highlighted row
   itself.
4. **The prompt's life.** It shows on the first portal page of a browser
   session and goes away on any navigation, a reload, or any switcher use.
   Is that right, or should it stay until the visitor clicks something?
5. **The bar's fixed width.** It is sized to "Grandmillennial" everywhere, so
   "Quiet" leaves a gap before the caret. It reads like a dropdown. Keep it,
   or centre the name.
6. **The prompt's arrival.** It rises after 650 ms, and a moss square pulses
   three times. More, less, or different?
7. **The busy cue.** A 2 px moss line sweeps along the pressed button. With
   the warm-up it shows for only tens of ms locally. Bolder, or fine as it
   is?
8. **Vaporwave's pressed task button** switches instantly on an in-school
   swap, like a Win95 click (the group has no animation). The alternative is
   a 250 ms fade.
9. **The dismiss control's name.** Screen readers hear "Dismiss". Suggested:
   "Dismiss the Portal prompt" (copy).
10. **BDL-010's summary and how-to lines** do not yet carry the portal idea.
    Only the title changed. For the voice pass.
11. **Something older than Stage 1, found by the review.** Every root
    business page already inlines the ClientRouter's CSS: quiet's Header and
    the router share a stylesheet chunk. The CSS is inert on the root pages,
    but it breaks the letter of "root pages untouched", and it is already on
    `main`. Fix now (split the chunk) or backlog it?

## Carried to Stage 2

- **P5 proof first.** Applied verbatim to grandmillennial as a throwaway
  (reverted), the header crop was sized to quiet's thin header, so it could
  not show whether both wordmarks are legible at once. Before the six
  schools adopt the default, film it with a crop around both wordmarks.
- **Per school** (evidence in `p4-trace.md`):
  - bauhaus: the circle wipe starts invisibly (about 217 ms), the only
    school over 160 ms even when warm;
  - grandmillennial: the drapes' slow start;
  - vaporwave: the heaviest first render, and Exo 2 and VT323 are missing
    from its preloads;
  - cottagecore: 337 KB of HTML;
  - glassmorphism and vaporwave: the first-use GPU cost of their snapshot
    filters.
- The Stage 2 defect list in `portal.md`, section 6, minus the
  reduced-motion items.

## Where things are

| what | where |
|---|---|
| trace and remedy | `tier3-stage1/p4-trace.md` |
| decisions | `tier3-briefs/stage0-decisions.md` ("Stage 1 decisions") |
| before/after strips | `scripts/themes/.out/stage1-compare/` |
| hold-still runs | `.out/stage1-fix-holdstill/`, `.out/stage1-fix-negative/` |
| baseline | `.out/stage1-baseline/` |
| screenshots | `.out/stage1-founder/` |
| workflow scripts | `aplus-tier3-stage1-build-workflow.js`, `aplus-tier3-stage1-review-workflow.js` |

The `.out/` folders are gitignored and can be regenerated with the scripts
named in each folder's manifest.
