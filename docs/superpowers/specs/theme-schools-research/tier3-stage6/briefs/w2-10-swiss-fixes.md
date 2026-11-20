# W2 task 10: swiss, the stop 2 answers and wave 1's deferred minors

Shared rules: `w2-common.md`. Sources: stop 2 answers 3 and 4 (swiss S1,
S2, from `../stop2-critique.md`), wave 1 tasks 4 and 6 deferred minors
(quoted below). P3 is parked: no grid switcher. The band stays in the lab
section. The new swiss toys (P2) are wave 3.

**Stop 2 answers:**

1. **The lab band at 390 (answer 3).** On phones the bark reads as a busy
   strip about 230px tall and the pull's chip runs past "the open.". Make
   the band read as a picture at 390 (and 360 to 430): a taller band, or the
   pull set under the photo on phones. Desktop and tablet keep today's
   composition.
2. **The flat crop (answer 3, ledger T6 C3).** The photo ends at bottom
   -1u, one line above the first specimen rule, so the big right-hand mass
   is cut in a straight line mid-sheet (light 1440 and 1024, dark 820). End
   the photo on a sheet edge or a rule, or re-crop so no mass is cut flat
   in the open.
3. **S1, snap-back.** `WidthDial.astro` speed 0.2 to 0.25 units/ms: a full
   return about 352 ms including the 100 ms hold, constant speed kept.
4. **S2, rest at 1024 to 1152.** Keep the lede collision test as it is
   (whole word): "Design" rests near 95 there. Set the CSS rest at those
   widths to match, so the word does not narrow or widen after mount or
   inside an arrival (closes T4 C2, including the no-JS overhang into the
   lede column at 1024).

**Wave 1 deferred minors:**

- T4 C3: the W table and bar position ignore Home.astro:93's left shift per
  width unit; at 1440 on the keyboard at 62 the bar sits about 11px closer
  than "one gutter past the ink", and the 1:1 drag is off by as much. Fold
  the shift into the table.
- T4 C4: when the grid is latched, the column "2" tag covers the grid key at
  820, the control that clears it. Keep the key clear of the tags.
- T4 C5: optical flush-left corrects only the first line of a stacked giant
  (About 1440 "shining" 5.5px off; Services 390 last line 4px). Correct
  every line, or record why not.
- T4 C6: the 1440 in-school "mid-return" swap film drags right from rest
  125, already max, so it proves nothing. Re-film dragging left.
- T6 C4: on 820 and 390, About's image bottom edge cuts the white trunk in a
  straight line above the type. Accept the hard crop (it is Swiss) but make
  it deliberate: on a rule or the field's edge.
- T6 C5: Services' numeral cap-line offset is tuned to the round digits, so
  the flat-topped 1 sits 3.9px low at 1440. Align the flat tops too.
- T6 C6: phone process rows are 10.5, 11.5, 10.5 and 9.5 lines, so rules fall
  off the baseline grid. Whole lines.
- T6 C7: `src/assets/swiss-photos-SOURCE.md` quotes the source file as the
  "before" weight; record the served WebPs (45,246 B at 480w, 85,750 B at
  760w, 142,226 B at 1120w, 190,726 B at 1477w) and the real per-visitor
  change (85.7 KB to 74.6 KB at 1440 DPR1), re-measured.
- T6 C8: About's `sizes` is wrong at both ends (125vw from 640 to 1023 where
  the field is `min(100vw, 820px)`; 1100px under-states above about 1530).
  Fix it to the rendered widths.
- T6 C9: wave 1 never compared the swap and arrival strips with
  `stage6-base`. This task does (below).

**Owns:** `src/themes/swiss/**`, `src/assets/swiss-photos-SOURCE.md`,
`tests/swiss-*.test.ts`, `scripts/themes/swiss/**`,
`scripts/themes/stage6/w2-t10-*.mjs`.

**Films:** Home at every review size plus 430, 412, 375 and 360, both
schemes, whole page against `stage6-base` and the lab band crops; About and
Services at every review size; the dial's snap-back timing at 1440 and 390;
Home at 1024, 1088 and 1152 with JS and without (no jump after mount, no
overhang into the lede); the grid key latched at 820; arrival through the
switcher and an in-school swap (dragging left before the swap) at 1440 and
390, compared with `stage6-base`.
