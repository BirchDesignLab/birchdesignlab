# W4 task 30: closing C, grandmillennial and cottagecore

Shared rules: `w4-common.md`. Sources: `../stop4-critique.md` A1 and B1 to
B7 (the founder took every verdict; B2 and B6 keep the clock on Home and
the double monogram as built), wave 3 deferred minors for tasks 19, 22,
23, 26 and 27 (quoted below).

**1. Cottagecore released seeds (B1).** Grow them at draw time only: give
each puff a `bornAt` in `releasePuff` and scale only the `drawImage` size
(`fx.ts` around 1169) from about 0.3 (the head's own seed scale) to 1 over
about 1.4 s. Never shrink `s.size` (`fx.ts` around 693 treats a seed under
`sizeMin` as a phone header seed; the seat tests read it). Stagger the
release: seed i waits i x 70 ms, still and undrawn. Seeds asked must still
equal seeds placed (`scripts/themes/stage6/w3-t23-r1-puff.mjs`).

**2. Cottagecore clock on Home (B2).** Keep under the button at 1000 and
below. After item 1, try about 9.6rem of closer padding; take it only if
the puff probe still places every seed at 1000, 820 and 390.

**3. Cottagecore needle in light (B3).** Set `--thread-rose:
var(--cc-rose-deep)` and `--thread-rose-edge: #7a3440` in light
(`theme.css` around 62 to 63), and add a `meta.ts` contrast row
`--thread-rose` on `--hoop-cloth`, min 3. A new stitch must read apart from
the hoop's dashed ring.

**4. Cottagecore Sent at 600 to 820 (B4).** `.env-col` gets
`position: relative` and `.toys` leaves the flow: the clock in the left
gutter beside the envelope (its right edge about
`calc(50% + min(38%, 9rem) + 1.2rem)` from centre, head at about 45% of the
envelope's height, so seeds rise over the flap and lavender, above the
postmark); the stamp tool in the right gutter, mirrored, its base at about
80% of the envelope's height, beside the postage it cancels (its target
`#cc-pad-sent` is unchanged). Below 600 keep the row. The empty band
between the envelope and "Sent." closes. Puff probe at 820, 700 and 640.

**5. Grandmillennial envelope (B5).** Dark `--flap-in` becomes #2a4a39
(`theme.css` around 240; add the contrast pair), and the flap's gold
diagonals (`Contact.astro` around 224 to 225) also paint on `.lid::after`.
Do not shorten the flap (`--flap-h` sets the seal's top and the card's
height). At 860 and below the flap opens to `rotateX(-105deg)`, ajar about
36px inside the gap, so the whole hinge shows; z-index 0 stays. The form is
never covered.

**6. Grandmillennial plates (B7).** `PEAK_DEG` 18, `OMEGA` 12, `DAMP` 6.5,
`SWING_MS` 560 (`parts/plates.ts` around 22 to 28); `CAP_DEG` follows. Add
the sibling plates' resting discs to `arcLimit`'s obstacles (a circle test:
centre distance under the sum of radii), so the room rule really binds; a
plate never swings over the frame, its text or another plate. Then the
plates get their touch beat (`w4-common.md`).

**7. Minors:**
- 19/C2: the stale CC6 comment in cottagecore `pages/Home.astro` (around
  324 to 329) is trimmed to its history line.
- 19/C3: phone seeds at `phoneSizes` seat only in the header cloth band
  (`fx.ts` around 672 to 678).
- 22/C3: the sampler band is `role="toolbar"` with an `aria-label` that
  starts with a visible word if there is one.
- 22/C4: the light gold thread is a palette token (`--gold-deep`, 4.79:1 on
  `--field-raised`), not #a07c2a.
- 23/C2: `collectTextRects` skips opacity-0 cancel-mark text and re-measures
  after a press.
- 26/C2: `lastVx` resets on pointerleave; an entry with no horizontal move
  uses the room-based default.
- 26/C3: a re-strike keeps a live neighbour moving through its lag (no
  dead stop mid-arc).
- 26/C4: the pivot sits at the screen top of each turned plate (rotate the
  offset by minus the rest angle in `swingTransform` and `hangPoint`).
- 26/C5: `DISC` about 0.98 to cover the scallops; fix the comment.
- 26/r1-N1: a plate ignores mouse presses with `e.button !== 0`.
- 27/C1: `finish()` flips the thread colour only when a thread was sewn.
- 27/C2: the needle's word mask is rebuilt on resize while a thread lives.
- 27/C3: the needle's eye never reaches the CTA label (clamp the tip, or
  shorten the idle at the bottom of the linen).
- 27/C4: the needle loop's first frame uses the rAF timestamp, so `dt` is
  never negative.
- 23/C5, 26/C6, 27/C5: evidence arrives through the real switcher, the
  plates' hidden-mid-swing check runs, and the needle's words probe runs at
  1440 and 820.
- The signifier rule: the sampler letters, the seal, the plates, the clock,
  the stamp and the needle get their cursors and a gated hover; the clock,
  stamp and needle nudges move onto the common touch conditions; the
  sampler, the seal and (after item 6) the plates get a touch beat.

**Owns:** `src/themes/grandmillennial/**`, `src/themes/cottagecore/**`,
`tests/gm-*.test.ts`, `tests/cottagecore-*.test.ts`,
`tests/fireflies.test.ts`, `scripts/themes/grandmillennial/**`,
`scripts/themes/cottagecore/**`, `scripts/themes/stage6/w3-t23-*.mjs`,
`scripts/themes/stage6/w3-t26-*.mjs`, `scripts/themes/stage6/w3-t27-*.mjs`,
`scripts/themes/stage6/w4-t30-*.mjs`.

**Films:** the clock tapped in light at 1440, 820 and 390 (puffs small to
full, staggered); Home at 1000, 820 and 390 (closer padding); a light
stitch at 820 beside the ring; Sent at 820, 700, 640 and 390 both schemes
(clock and stamp beside the envelope from 600 to 820, row below); the
envelope open at 820 and 390 in dark (the hinge visible, the form clear);
the plates brushed and tapped at 1440, 1101, 820 and 390 as strips over
700 ms (visible swing, no plate crossing another); every toy's cursor and
hover at 1440 and every touch beat at 390 (strips); arrival and in-school
swap at 1440 and 390 for both schools against `stage6-base`.
