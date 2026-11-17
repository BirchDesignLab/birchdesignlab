# Proof a3: grandmillennial, the chinoiserie wall and the botanical birch

Written 10-04-26. Brief: `../briefs/a3-gm-chinoiserie.md`. Decision A = (1);
dossier G10 and T10 (Zuber and de Gournay scenic papers). Nothing under `src/`
changed.

## The question

Does a hand-painted, non-repeating birch-and-bird chinoiserie scene on About,
behind the gilt oval, give the studio's birch a home in the school, with the
birch inside the oval redrawn as a hand-coloured botanical study in the same
hand (item 16)?

## What was made

Everything is in `scripts/themes/proofs/stage5-gm-chinoiserie/`, drawn by
`build-scene.mjs` (seeded, so a run repeats) and injected by
`scripts/themes/harness/stage5-gm-chinoiserie-proof.mjs`.

- **The wall** (`scene-defs.svg.html`): ONE drawing, 1600 x 1300 units, never
  tiled. Five full-height birches (three of them running off the top) plus
  four thin pale ones far back, curving trunks with a shade wash laid a hair
  inside the edge, papery curls, lenticels and the black collar eyes; tapering
  painted limbs; drooping twigs with serrated leaves and catkins (629 leaves,
  70 catkins from two leaf shapes); eleven long-tailed birds (four perched, an
  oxblood and a porcelain-blue colourway, seven in flight); two soft sage
  ridges, pierced scholar's rocks, ferns, grass and small flowers. Light: muted
  inks on a celadon ground (`--sc-ground` #e2e6d3). Dark: the hunter room,
  gold-cream line (#d9c58d) on #0b1f15, the wall darker than the cards.
- **The botanical birch** (`birch.svg.html`): same line and the same leaf and
  catkin drawing at a finer scale; a tapering trunk with a shade wash
  deliberately offset 1px from its ink, peeling curls and lenticels, five
  painted limbs with black collar eyes, drooping serrated leaves at varied
  angles, catkins, and a faint ground line with grass and two stones. Washes
  use the `--c-leaf` and `--c-leaf-lt` inks. Oval, chintz mat and placement are
  untouched.
- **The off-axis hang**: the oval is nudged left and up (start-aligned, 1.25rem
  up) and a small arched-gilt second frame (`frame2.html`, a perched blue bird
  study on a bough, same hand) hangs lower right on a short cord, overlapping
  the oval's gilt. The oval also hangs against the painted wall, so it overlaps
  the scene too.
- **Cards**: the founder letter stays on its `--field-raised` frame; the story
  (heading and etymology) also becomes a `--field-raised` card with a gilt
  hairline and outline, so no text sits on the painting. Wall bounded by the
  same stripe band as Contact's wall (a2) top and foot, and on phones also
  between the two panels.

## Byte sizes (`scene-stats.json`)

| Piece | Raw | Gzip |
|---|---|---|
| Wall (defs, scene group, three `<use>` crops) | 130,234 B | 29,788 B |
| Birch | 16,169 B | 3,820 B |

The wall is 3x the toile. It should not go in Header on every page: either
inline it only into About (Scene.astro rendered by About) or serve it as one
cached file. The leaves are 38 percent of it; a sparser tier B pass can halve it.

## What the images show

Images are in `scripts/themes/.out/stage5-proofs/gm-chinoiserie/` (`index.md`
lists all): `sheet-founder-1440.jpg` (before and after, both schemes),
`sheet-hero.jpg`, `sheet-sizes.jpg`, `sheet-wall-plain.jpg` (the wall with the
room hidden), `sheet-oval.jpg` (the oval and the second frame at 2x),
`sheet-before-after-390.jpg`; whole-page shots `shots/about__<scheme>__<size>.png`
at 1440, 1280, 1024, 820, 390. Renderer: RTX 3070 via ANGLE D3D11
(`renderer.txt`); all frames GPU.

## How the wall crops (measures.json `crops`)

The page is wall-wide, so the drawing is cropped with `slice`, never scaled to
fit:

- 1440: the whole height, x 251..1349 (69 percent of the width).
- 1280: x 287..1313 (64 percent). 1024: x 398..1202 (50 percent).
- 820 and 390: two panels instead of one stretched crop. Panel A (intro) shows
  the left cluster, panel B (founder) the right cluster. At 820, A shows x
  60..800, y 218..1082 (67 percent of the height) and B x 860..1600, y
  368..932 (43 percent). At 390, A shows x 60..464 and the full height, B x
  1053..1600, full height; a stripe band between the panels reads as a chair
  rail.

## Measures

- Word parity: the visible text of `main` is identical before and after at
  every size and scheme.
- Contrast (every text pair on the page, `measures.json`): lowest 9.50:1 in
  light and 7.55:1 in dark. Zero text elements sit on the wall; every text's
  opaque background is a card.
- Cards against the wall: light card #fdf9f0 on #e2e6d3 is 1.21:1; dark card
  #183426 on #0b1f15 is 1.28:1 (the card is the lighter one in both, as it
  should be). The cards are separated mainly by the shadow and the gilt rules.
- No horizontal overflow at any size (scrollWidth equals the viewport).

## Honest notes (for the founder)

- At 390 the cards fill the gutters (as on Contact), so the wall shows chiefly
  at the top behind the oval, in the gaps between sections and at the foot.
  The mobile wall is mostly top and foot, as the sheet shows.
- The drawing is outline-and-wash painting, not a copy of any maker's design.
  Trunks are straight-edged and fairly evenly spaced; a second pass could add
  one big curving "feature" tree and more negative space.
- The leaf and bird shapes are reused with rotation and scale (two leaf
  drawings, two bird drawings). Positions and angles are all different, but a
  keen eye can find the same leaf twice.

## What Tier B should lift

1. `scene-defs.svg.html`: the hidden `<svg class="gm-scene-defs">` goes in
   `parts/Defs.astro`'s neighbourhood (or a new `parts/Scene.astro` rendered on
   About only); the three `gm-scene-art` svgs go in About's wall wrapper.
2. `proof.css`: the `--sc-*` and `--bb-*` tokens under
   `html[data-theme='grandmillennial']` (and the dark block) go into
   `theme.css`. The `.sc-*`, `.bb-*` and `.gm-birch` rules stay UNPREFIXED
   (as in the file): Chromium does not match ancestor selectors inside a
   `<use>` shadow tree, so `html[data-theme] .sc-x` leaves everything black.
   In Astro they go in a global style or Defs-style scoped rule with no
   ancestor. The layout rules (`.gm-scene*`, story card, `.sitter`, `.gm-frame2`)
   go in About.astro.
3. `birch.svg.html` replaces `parts/Birch.astro`'s markup; delete its old
   scoped style. Its defs ids (`bb-l1`, `bb-l2`, `bb-ck`) are local to that
   svg.
4. `frame2.html` into About's `.sitter` after the oval; it needs `#sc-pb`,
   `#sc-l1`, `#sc-l2`, `#sc-ck` from the hidden defs.
5. About's markup gains the wall wrapper, two `gm-scene-part` divs and the
   bands, as the header comment of `proof.css` shows; no copy changes.
