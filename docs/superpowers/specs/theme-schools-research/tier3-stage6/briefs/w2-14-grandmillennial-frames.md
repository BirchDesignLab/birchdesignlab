# W2 task 14: grandmillennial, rosette tails, the ribbon strip, frames, the swag

Shared rules: `w2-common.md`. Sources: `../a1-critic-grandmillennial.md`
(GM1 to GM6, "Owed looks"), `../a1-ledger-triage.md` (the two frame items),
stop 1 calls 4 (the swag), 8 (the ribbon strip) and 10 (GM5, GM6 taken). The
interactables (sampler, envelope, plates) are wave 3. Task 15 takes the rest
of the ledger leftovers: do not start them here.

1. **Rosette tails (GM1).** `parts/Rosette.astro`: tails about 95 units,
   width ±6 widening to ±8.5 at the cut, splay ±17°, one about 7 units
   shorter, swallow-tail cut ends; viewBox `-42 -42 84 145` (about 55px more
   height above the h1). Services ask at 390 and 1440, both schemes: they
   must read as ribbon tails, not stubs.
2. **The ribbon-tape trust strip (stop 1 call 8).** Contact's trust line
   (today a hairline box) becomes a cream grosgrain ribbon tape, oxblood
   picot edges, swallow-tail cut ends as the rosette tails, a brass
   upholstery nail at each end. Words unchanged. Not pinked (that is the
   swatches' language). At 390 it wraps to two lines: cut the ends with
   `clip-path` on pseudo-elements so the tape holds.
3. **The cameo swag (Stage 0 S8, stop 1 call 4).** Services' "how a project
   runs": the four cameos hang from one ribbon swag at staggered heights on
   the yellow band, in the school's existing ribbon language. Phones: the
   swag runs down one side with the cameos hung from it in a column. Copy
   unchanged.
4. **Frames (ledger B1 T3 N1, N2).** Chintz frame runs end in whole cells,
   or the pattern is centred under the corner knots, so no run ends in half
   a rose (`Framed.astro`, `Defs.astro`); render 820, 1024 and 1440. The
   lone third specimen card at 861 to 999 and 561 to 699 centres (explicit
   columns per breakpoint); render 561, 650, 699, 861, 900, 999.
5. **GM2** Services 1440: butt the toile wall's lower ticking against the
   yellow band (72px of plain field today).
6. **GM3** light Services and Contact intros: the `gm-trellis` lattice
   behind both intros (it also moves them further from cottagecore's cream
   at thumbnail size: run the boundary sheet beside cottagecore).
7. **GM4** About 820: the painted red bird moved about 40 units left so the
   oval's rim stops hiding it (`scripts/themes/proofs/stage5-gm-chinoiserie/build-scene.mjs`,
   regenerate its output).
8. **GM5** dark Services: the lacquer yellow lifted from `#6f4700` toward
   saffron (about `#84560a`), or `--edge-hi` and sheen so it reads glossy,
   not mustard. Contrast pairs updated.
9. **GM6** dark About: scene wall a's ground raised 6 to 8% lightness to a
   moonlit sage so the stripe band no longer cuts one wallpaper in two.

GM7 (the oval birch) stays as is; GM9 is a capture artefact, not a bug.

**Owns:** `src/themes/grandmillennial/**`, `tests/gm-*.test.ts`,
`scripts/themes/grandmillennial/**`,
`scripts/themes/proofs/stage5-gm-chinoiserie/**`,
`scripts/themes/stage6/w2-t14-*.mjs`.

**Films:** each item at the sizes it names plus every review size, both
schemes; the trust strip at 390 (two lines) and 1440; the swag at every
size; the cottagecore boundary sheet in light at 1440 and 390; arrival and
in-school swap at 1440 and 390 against `stage6-base` (layout changes on
Services and Contact).
