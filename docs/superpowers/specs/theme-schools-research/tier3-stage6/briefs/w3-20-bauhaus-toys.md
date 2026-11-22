# W3 task 20: bauhaus, four toys below the fold

Shared rules: `w3-common.md`. Source: `../a1-critic-bauhaus.md` (B3 a to d),
stop 1 call 7 ("all five bauhaus": the pick-me lift shipped in wave 2).

1. **The Home see-saw tips (B3 a).** Tapping either end tips the see-saw
   about 8 degrees toward it; the shape on the beam slides along to the low
   end; the beam then levels on `--ease-snap` (no overshoot). A real button,
   `aria-label` "See-saw, tip it" (it carries no visible word, so a plain
   label), Enter and Space tip toward the end last tapped, alternating.
2. **About's B comes apart and rebuilds (B3 b).** Tap the constructed B: its
   pieces (the stem, the two bowls, any accent) fly apart along straight
   lines to set offsets, hold, and re-assemble in the school's stepped
   order. A real button, `aria-label` "Letter B, take apart". A second tap
   while apart rebuilds at once.
3. **The footer's red corner square spins (B3 c).** A tap turns it 90
   degrees on `--ease-snap`; repeated taps keep turning. Inert:
   `aria-hidden`, not focusable, pointer and touch only.
4. **Constructed numerals re-assemble (B3 d).** Tapping a constructed
   numeral (Services' 01 to 04 stations, Home's numerals where present)
   knocks its parts out and builds it again in the stepped order, the way
   it first assembled. Inert: `aria-hidden`, not focusable.

Every motion is the school's: straight lines, hard stops, primary shapes, no
overshoot or wobble. Hover lift on mouse as the wave 2 hero shapes do,
where it fits.

**Owns:** `src/themes/bauhaus/**` (leave `AssemblySwitch.astro` and the
`?bh-assembly` switch alone), `tests/bauhaus-*.test.ts`,
`scripts/themes/bauhaus/**`, `scripts/themes/stage6/w3-t20-*.mjs`.

**Films:** each toy at 1440, 820 and 390, both schemes: tap, keyboard where
a control, a second tap mid-motion, a vertical swipe starting on the toy
scrolls on touch; an in-school swap mid-motion at 1440 (torn down, nothing
left behind, one instance on return).
