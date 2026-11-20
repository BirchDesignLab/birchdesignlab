# W2 task 9: glass, the stop 2 answers and wave 1's deferred minors

Shared rules: `w2-common.md`. Sources: stop 2 answer 4 (glass G1 to G5,
from `../stop2-critique.md`), wave 1 tasks 1 to 3 deferred minors (quoted
below). R2 is its own stage later: do not start it, and do not tune
anything R2 replaces beyond what is listed.

**Stop 2 answers:**

1. **G1, lens fallback.** At 1024 the lens may still rest only in the two
   open corners, but a drag or throw that ends in the travel box eases to
   the **nearest** open spot by distance, and never glides under a pane on
   the way (today: about 1.8 s hidden under the window on the throw film;
   `lens/lens.ts` least-covered fallback around 628-641 and 1056-1063).
2. **G2, text plates.** One soft plate per text block (no seams between
   paragraph plates on Services' offer panes; the 1440 hero shows one plate,
   not two), with a wider feather. Do not lighten the plate at 390 unless a
   contrast re-measure of body text against its plate passes; fight the
   milkiness at 390 by thinning the pane fill instead. Record the measured
   contrast before and after (`meta.ts` method as task 2 left it).
3. **G3, light hues.** Services "04" icon (`--icon-pink #9e1f4e`) moves to a
   teal or sky blue, so the row reads blue, warm, warm, blue. One of the two
   near-identical amber orbs moves to a pale sky blue. No coral, cream or
   pink. Contrast pairs updated.
4. **G4, Tinted.** In light, Tinted becomes a neutral white frost (a little
   more white, a little more blur, close to Apple's own Tinted); it must not
   read grey-lilac or mauve over the blue bands. Dark keeps its warm umber.
5. **G5, header rim.** The header bar's bent rim stops smearing text that
   scrolls under it into barcode streaks: cut the bar's vertical
   displacement to about a third, or bend it sideways only (`fx.ts` around
   153-155, 343-344). The bar only: every other pane's rim is unchanged.

**Wave 1 deferred minors:**

- T1 C1: the phone and portrait-tablet corner start measures exactly 0.500
  covered against `REST_MAX_COVER` 0.5 with a strict `>`; any layout nudge
  moves the lens off the approved spot on the next tap. Give the start a
  margin (the approved spot stays where it is).
- T1 C2: a resize never runs `checkRest` (`onResize` only invalidates); the
  lens can stay 0.2 grabbable under a pane after a resize. Run the rest
  check after a resize settles.
- T1 C3: `lensHidden()` is read only at the idle mount (`home-boot.ts:151`);
  switching `prefers-contrast` from more to no-preference mid-visit brings
  the panes back but no lens. Mount the lens when the contrast query turns
  off (and tear it down when it turns on).
- T1 C4: the over-long E10 comment line in `theme.css` (around 1433).
- T2 C2: the `meta.ts` worst-orb method no longer bounds the crisp
  wallpaper (deep bands darker, amber bands brighter than the bounds); fix
  the method or its comment so the stated bound is true, measured.
- T2 C3: at Frost 0 a white smudge shows inside the hero pane near its
  bottom-left corner (the bevel displacement at 2px blur). Remove it.
- T2 C4: the dark Mica settings pane on Services mixes coral and navy into
  plum midtones (6.6% mauve frame). Pull it off plum.
- T3 C2: the orb push loop never settles while the pointer rests near a
  drifting orb (`light.ts:103`: the resting centre includes the drift
  transform). Settle it: no style writes while the pointer is still.
- T3 C3: under `prefers-contrast: more`, orbs are pushed 28px and the lit
  glow shows on the opaque ring (`theme.css:266`). E10 is flat and still:
  no push, no glow.
- T3 C4: Home's orb push goes stale on scroll (`orbs-clock.ts:148`);
  re-target on scroll as `light.ts` does.
- T3 C5: dead selectors for the retired window-bar switch (`theme.css`
  around 1580, Home.astro's `.switch` half). Remove them.

**Owns:** `src/themes/glassmorphism/**`, `tests/glass-*.test.ts`,
`scripts/themes/glassmorphism/**`, `scripts/themes/stage6/w2-t9-*.mjs`.

**Films:** viewport frames at scroll offsets on every page at 1440, 1024 and
390, both schemes; the throw film at 1024 (lens never hidden under a pane,
ends at the nearest open corner); a resize from 1280 to 1088 then the rest
check; `prefers-contrast` more to no-preference mid-visit; Clear and Tinted
over the blue bands in light; the header bar with text scrolling under it
at 1440 (Chrome); Frost 0 and max; pointer still near an orb for 2 s (no
style writes); the vaporwave boundary sheet in light. The header changes:
arrival and in-school swap at 1440 and 390 against `stage6-base`.
