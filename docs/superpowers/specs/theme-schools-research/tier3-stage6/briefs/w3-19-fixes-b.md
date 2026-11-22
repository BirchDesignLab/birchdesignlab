# W3 task 19: fixes B, vaporwave, grandmillennial, cottagecore

Shared rules: `w3-common.md` (no new toys in this task). Sources: stop 3
answer 2 (`../stop3-report.md` "Answers", `../stop3-critique.md`), wave 2
deferred minors for tasks 13 to 16 (quoted below).

**1. Vaporwave (stop 3 answer 2, task 13 minors):**
- **The drum's Venus:** re-render the same Venus through
  `scripts/themes/vaporwave/render-venus.mjs` in pink marble, turned the
  other way, and seat it on a white drum in Services' lobby (a new still
  file beside the others, same formats and sizes as `venus-kiosk-512`; the
  pink test render in `scripts/themes/.out/stage3-b2/vw-4a/tints-venus.png`
  shows the tint works).
- **Phone kiosk props (V3):** size by the visible figure: Venus about 60px
  tall, the sphere about 44px across at 390, scaled to the same read at
  820; bases dropped to the kiosk stand's foot line so they stand in front
  of it; clearance on the plaque (wave 3's elevator) and the TOUCH button
  re-checked at 360, 390, 820.
- C2: wave 3 task 24 makes window activation page-wide; until then keep the
  wave 2 inactive captions static on Contact and Services (`bringToFront`
  leaves `inactive` alone for windows outside `.door-grid, .apps`), so one
  press never leaves two active captions.
- C3: header labels at 360 and 375: at least 5px each side of SERVICES (a
  narrower step at 380px and below).
- C4: the fountain gets a stem from basin to bowl; its jets sized as a
  share of the fountain box, not px, so at 820 the centre jet stays below
  the horizon; the phone mall keeps a smaller escalator rail (about
  `clamp(110px, 30vw, 150px)` at the left, the fountain toward the centre).
- C5: below 760px the hero's CSS sky stops move to 64% / 64.2% so the
  pre-WebGL sky matches the shader's raised horizon (no jump on arrival);
  re-film the phone arrival against `stage6-base`.

**2. Grandmillennial (stop 3 answer 2, task 14 and 15 minors):**
- **Home frame:** 384px (24rem) from about 873 up at every width, desktop
  included, still never shrinking as the window grows; plates clear the
  frame at 1101 and 1180.
- Task 14 C3: the ribbon tape at 390 and 360 breaks at the fleuron (each
  trust part kept on one line), so "A" never sits alone; words unchanged.
- Task 14 rc1-N1: `w2-t14-fix1-bird-shots.mjs` shoots the bird after a tap
  too (the away point), or its docstring is corrected.
- Task 15 C1: measure the chintz frame's real outer box (strips and
  corners), record the item 8 skip and the tile byte count in the commit
  body.
- Task 15 C2: film arrival and in-school swap at 1440 and 390, dark
  included, against `stage6-base` (the canopy picture's sizing and the
  header changes).
- Task 15 C3 and C4: evidence against a built snapshot, not the dev server;
  the canopy probe with GPU flags and reduced transparency forced to
  `no-preference`.
- Task 15 C5: the wall-room padding as a custom property in `theme.css`,
  scaled in Services, instead of a copied literal.

**3. Cottagecore (stop 3 answer 2, task 16 minors):**
- **Phone seeds:** on phones only, a smaller seed size (below today's
  `sizeMin`) may seat in the header cloth beside the wordmark and under the
  nav, still under the paper; aim for 1 or 2 seeds on views with no strict
  seat (About, Contact's first screens); nothing over the sheet, no seed
  wedged in a sliver (CC3 holds).
- **Tablet Home (641 to 820):** the sheet floats right; the subline starts
  beside it under the lead and continues full width below, so no empty
  band; no single-word lines at 641.
- C2: limit the shortened firefly rest (and the re-seat if needed) to
  phones, so the approved desktop scatter (4 to 8 s rests) is unchanged;
  measure 1440 dark before and after.
- C3: the nav-link refusal tap lands on the link itself, navigation
  blocked, `litNear` recorded.
- rc1-N2: the fx header comment describes today's seat rules (a view with
  no strict seat shows only the header-cloth seeds).

**Owns:** `src/themes/vaporwave/**`, `src/themes/grandmillennial/**`,
`src/themes/cottagecore/**`, `tests/vaporwave-*.test.ts`,
`tests/gm-*.test.ts`, `tests/cottagecore-*.test.ts`,
`tests/fireflies.test.ts`, `scripts/themes/vaporwave/**`,
`scripts/themes/grandmillennial/**`, `scripts/themes/cottagecore/**`,
`scripts/themes/stage6/w2-t14-*.mjs`, `scripts/themes/stage6/w2-t15-*.mjs`,
`scripts/themes/stage6/w2-t16-*.mjs`, `scripts/themes/stage6/w3-t19-*.mjs`.

**Films:** vaporwave Services lobby at 1440, 820 and 390 both schemes; the
phone kiosk at 360, 390 and 820; the 360 header; the phone arrival; GM Home
at 873, 1024, 1101, 1180 and 1440 both schemes; the ribbon at 360 and 390;
GM arrival and swap at 1440 and 390 dark and light; cottagecore light About
and Contact at 390 (seed share over 12 s), Home at 641, 700 and 820, dark
1440 firefly scatter before and after; arrival and in-school swap at 1440
and 390 for all three schools against `stage6-base`.
