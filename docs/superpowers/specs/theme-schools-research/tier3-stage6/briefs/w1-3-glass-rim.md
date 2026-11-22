# W1 task 3: glass R1 part 2, the bent rim, light that moves, the header, the rest

Shared rules: `w1-common.md`. Builds on task 2's material. Sources:
`../a1-critic-glassmorphism.md` (G4, G6, G7, G9, G10, G11, G12, R1).

1. **A visible bent rim** (G4): today `url(#bevel)` runs before the blur and
   is erased (`fx.ts` `buildOne()`). Draw the rim as its own masked band
   whose backdrop-filter is the displacement only (no blur), over the frosted
   interior, so content outside the pane visibly bends into its edge.
   Chromium only; Safari and Firefox keep frost as today. Measure per-pane
   GPU cost at 390 (trace) and report it.
2. **Light that moves** (G7): every pane gets a pointer-tracked specular
   rim and soft highlight (fine pointers; on touch, a brief highlight where
   tapped). A slow orb drift returns, or orbs ease away from the cursor; no
   loop runs while the page is hidden or off-screen.
3. **A clearer header** (G6): fill about 0.35, the rim band, a scroll-edge
   fade, so content scrolling beneath visibly passes under glass.
4. **One Clear/Tinted switch** (G9): keep the Control Centre tile, retire the
   hero `.switch` duplicate (its visible words, if any, stay or go only per
   word parity: if it carries visible words, keep the control and make it
   drive the same setting); Tinted reads clearly warmer and thicker.
5. **Tablet Control Centre** (G10): at 820 it spans the row (1x4 as on
   desktop) or centres under the window at full width; no stranded 2x2.
6. **About tablet** (G11): the reading pane clears the title's descenders at
   721-1279. **Contact** (G12): the intro becomes the showpiece thin pane, or
   the form wells become hairline fields.

**Owns:** `src/themes/glassmorphism/**` (not `lens/` logic beyond what the
highlight needs), `scripts/themes/stage6/w1-t3-*.mjs`, `tests/glass-*.test.ts`.

**Films:** a cursor pass over Home and Services at 1440 (rims bend, the
highlight follows); a scroll under the header at 1440 and 390; the tablet
Control Centre; About and Contact at 820 and 1440; both schemes.
