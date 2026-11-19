# Stage 6 A1: grandmillennial critic

Opus `high`, 11-19-26. Probes `scripts/themes/stage6/critic-grandmillennial-{crop,probe}.mjs`
on port 4467 against snap-stage6-base (GPU); output and `probe/probe.json`
in `scripts/themes/.out/stage6-critic-grandmillennial/`.

**Verdict:** still sells. Walls, toile, chinoiserie About, yellow anchor,
mixed frames and sampler land; the cottagecore boundary is clean in both
schemes. Nothing is a teardown.

## Findings

- **GM1 important, Services ask, 390 and 1440, both schemes.** Rosette tails
  read as stubs: 45-unit tails against a 37-unit pleat ring leave about 10px
  below the pleats. Fix (Rosette.astro): tails about 95 units, ±6 widening
  to ±8.5 at the cut, splay ±17°, one about 7 units shorter; viewBox
  `-42 -42 84 145` (about 55px more height above the h1).
- **GM2 minor, Services 1440.** 72px of plain field between the toile
  wall's lower ticking (ends y=1883) and the yellow band (y=1955). Butt them.
- **GM3 minor, Services and Contact intros, light, 1440.** About 430px of
  bare cream above the wall; the first screen carries no pattern and sits
  nearest cottagecore's cream at thumbnail size. Put the `gm-trellis`
  lattice behind both intros.
- **GM4 minor, About 820.** Painted red bird half hidden behind the oval's
  rim (B1 T2 C4 residual). Move it about 40 units left in build-scene.mjs.
- **GM5 taste, Services dark.** Lacquer yellow #6f4700 reads as mustard or
  brown leather. Lift toward saffron (about #84560a), or `--edge-hi` and
  sheen so it reads glossy.
- **GM6 taste, About dark.** Both scene walls night-dark, so the stripe band
  cuts one wallpaper in two. Raise wall a's ground 6 to 8% lightness
  (moonlit sage).
- **GM7 taste, About oval birch.** Still a symmetric three-tier tree,
  lighter work than the wall's birches. Low priority.
- **GM8 for transitions.** In-school swap holds the old room to +640 ms then
  hard-cuts; on arrival the drapes start about +400 ms.
- **GM9 set critic note.** The hard edge at y=900 on dark full-page sheets
  is the fixed vignette's foot in a full-page capture, not a site bug.

## Owed looks

1. **Rosette tails: stubs** at both widths and schemes (GM1).
2. **Third frame type: yes, on Contact's trust strip** (today a hairline
   box): a cream grosgrain ribbon tape, oxblood picot edges, swallow-tail
   cut ends (as the rosette tails), a brass upholstery nail each end. Text
   unchanged. At 390 it wraps to two lines, so cut the ends with clip-path
   on pseudo-elements. Not pinked (that is the swatches' language).
3. **Dark awning piping: leave it.** The gilt rail is a flat #c9a95c at
   every sample; what darkens is the stripes' own top shade, as in light.

## Unsure, rendered

- **Specimen orphan: real** at 561, 650, 861, 900 (699 and 999 fit three).
  Fix: flex-wrap with `justify-content: center` so the third card centres.
- **Contact columns at 390: fine** (outer edges within 4px).
- **Half roses: confirmed** at 820, 1024, 1440 (Contact right runs, About
  top-right). Fix: runs as CSS backgrounds with `background-repeat: round`,
  or centre the pattern so both ends land on vine.
- **Bird fixes:** 820 collision fixed (GM4 remains); 390 sliver acceptable.

## Interactables

1. **The envelope opens (Contact).** Tap the wax seal: the flap hinges up
   (about 160°, 300 ms), a notecard with the B monogram slides 24px out
   (aria-hidden, no words); tap again to close.
2. **The plates swing (Home).** Brush or tap a plate: one damped swing under
   600 ms from the top rim, neighbours tilt slightly. No loop at rest.
3. **Re-stitch the sampler (About).** Tap a letter on the alphabet band: it
   re-stitches in the next thread (oxblood, hunter, gold), stitches drawing
   in. Visitors can spell initials. Strengthens S5.

## First three

1. GM1. 2. The ribbon trust strip with the specimen centring and the
`round` chintz runs in one frames task. 3. The sampler re-stitch, then the
envelope; the plates if there is room.
