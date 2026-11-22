# W4 task 28: closing A, the business Lab's hovers, the guard, the welcome prompt, glass, bauhaus

Shared rules: `w4-common.md`. Sources: `../stop4-critique.md` A1 and A3
(the founder took every verdict), the founder's pick for the prompt
sentence (`../stop4-report.md`, Answers), wave 3 deferred minors for tasks
18 and 20 (quoted below).

**1. The business Lab's hovers (critique A3).** These are live business
pages (quiet luxury, Lighthouse 100s): **no visual change on a mouse or
trackpad.** Gate every ungated `:hover` in
`@media (hover: hover) and (pointer: fine)`:
`src/components/SpecimenCatalog.astro:85`, `SpecimenCard.astro:52, 84`,
`SpecimenPlate.astro:46`, `WallLabel.astro:52`,
`src/layouts/ExperimentLayout.astro:55`, `src/layouts/StudyLayout.astro:38`,
`src/pages/lab/experiments.astro:30`, `src/pages/lab/studies.astro:30`,
`src/pages/styleguide.astro:171, 180`, and the experiments:
`src/experiments/bdl-001/BarkEngine.svelte:175`,
`bdl-002/Experiment.astro:68, 79`, `bdl-003/NovgorodLetters.svelte:58, 72`,
`bdl-006/Regulator.svelte:360`,
`bdl-012/Experiment.astro:450, 467, 557, 571, 601, 744, 746`. Line numbers
are from 4201ebf; find every one, there may be more. Add an `:active` twin
where hover was the only feedback (summary, `.card`, `.hatch`), as
`src/styles/base.css` does. Two traps: `bdl-012:450` shares its selector
list with `.tour button[aria-pressed="true"]` (split it so the pressed state
stays ungated), and `bdl-003:60`'s reset lists `.fragment:hover` (gate that
branch too). Change only hover rules in the experiments: no other edit.

**2. The guard (A3).** Widen `tests/hover-guard.test.ts` to walk
`src/components`, `src/layouts`, `src/pages` and `src/experiments`,
including `.svelte` `<style>` blocks; raise `GATED_FLOOR` to match; update
`../hover-guard.md`'s Scope (and fix its line 71: the self-test uses a
quoted data URL, not a quoted brace; 18/critic:C5).

**3. The welcome prompt (A1 point 3).** In `src/themes/portal/switcher.ts`
(`FIRST_LOAD_PROMPT`, about line 43) append, after a space, exactly the
founder's sentence:

> Tap around, too: every school hides a few things that answer back.

Check the prompt's box at 1440, 820, 390 and 360 in both schemes: it must
not cover the switcher or push it off screen; adjust only the prompt's own
layout if it must wrap. `tests/portal-prompt-key.test.ts` and any test
pinning the text follow.

**4. Bauhaus (A1 and task 20 minors):**
- The signifier rule (`w4-common.md`): the corner square and the numerals
  get cursors and a gated hover; the see-saw and the B keep theirs. The
  pick-me beat moves onto the common touch conditions (visible, still,
  no focus) instead of its fixed delay after the build
  (`parts/loose.ts` around 281 to 303); each toy that lacks a touch beat
  gets one in the school's stepped manner.
- 20/C1: `initNumerals` returns early unless the theme is bauhaus, and
  listens on `main`, not `document`.
- 20/C2: Enter or Space, when the last tip came from a pointer, tips toward
  that end first, then alternates.
- 18/C3: `scripts/themes/stage6/w3-t18-bauhaus-edit.mjs` gains the
  CSSTransition hunk or a header note that it was edited by hand after.

**5. Glass (18/C2):** `isTap` tests the largest distance from the press
during the hold against `TAP_SLOP_PX` (`lens/lens.ts:728`,
`physics.ts:64`), so a flick back through the start keeps its throw. Glass
has no toys beyond the lens; the lens already reads as draggable.

**Owns:** `src/components/SpecimenCatalog.astro`,
`src/components/SpecimenCard.astro`, `src/components/SpecimenPlate.astro`,
`src/components/WallLabel.astro`, `src/layouts/ExperimentLayout.astro`,
`src/layouts/StudyLayout.astro`, `src/pages/lab/experiments.astro`,
`src/pages/lab/studies.astro`, `src/pages/styleguide.astro`,
`src/experiments/**` (hover rules only), `src/themes/portal/switcher.ts`,
`src/themes/glassmorphism/**`, `src/themes/bauhaus/**` (not the
`?bh-assembly` switch), `tests/hover-guard.test.ts`,
`tests/portal-prompt-key.test.ts`, `tests/glass-*.test.ts`,
`tests/bauhaus-*.test.ts`,
`docs/superpowers/specs/theme-schools-research/tier3-stage6/hover-guard.md`,
`scripts/themes/stage6/w3-t18-*.mjs`, `scripts/themes/stage6/w4-t28-*.mjs`.

**Films:** business `/lab/`, `/lab/experiments/`, `/lab/studies/`, one
experiment page and one study page at 1440 and 390, both schemes: whole-page
before and after (identical on mouse), a forced hover at 1440 (same as
before), a tap at 390 (no stuck colour); the prompt at 1440, 820, 390 and
360, both schemes; bauhaus every toy's cursor and hover at 1440 and every
touch beat at 390 (strips); the glass flick-back throw at 1024; arrival and
in-school swap at 1440 and 390 for bauhaus and glass against `stage6-base`.
