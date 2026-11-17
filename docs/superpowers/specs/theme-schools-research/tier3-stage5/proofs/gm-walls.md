# Proof a2: grandmillennial, how loud the papered walls go

Stage 5 Tier A. Brief: `../briefs/a2-gm-walls.md` (item 2, decision F). Nothing
under `src/` changed. Images are scratch under
`scripts/themes/.out/stage5-proofs/gm-walls/` (not committed; `index.md` there
lists every file). GPU Chromium, renderer ANGLE / NVIDIA RTX 3070 (D3D11), saved
as `renderer.txt`.

## The question

On Contact, with the desk card and envelope laid on a full-bleed chintz
wallpaper edged by a stripe band, which wall loudness keeps the room composed?
Founder answer to F: chintz walls at about 60%, toile walls at full ink,
swatches full.

## Answer: 60% ink, by opacity of the ink layer

The recommended wall is the new chintz at **0.6 ink opacity, both schemes**.
100% is a fabric shop: the wall out-shouts the gilt frame and the envelope and
the page stops being a desk. 60% keeps the roses, vines and forget-me-nots
legible as a wall but lets the cards and the gold lead. 40% is calm in light but
in dark the pattern almost disappears (see the numbers), so it reads as a stain,
not a paper.

## What was made

All in `scripts/themes/proofs/stage5-gm-walls/`:

- `build-wall.mjs` (seeded, repeatable: `node scripts/themes/proofs/stage5-gm-walls/build-wall.mjs`)
  writes `wall-defs.svg.html` (about 13 KB raw): two new motifs, `#gm-wall-bloom`
  (a pale open peony) and `#gm-wall-vine` (a trailing stem with leaves and a
  curl), plus `<pattern id="gm-chintz-wall">`. It reuses `#gm-rose`, `#gm-bud`,
  `#gm-sprig`, `#gm-leafpair` and `#gm-floret` already in `parts/Defs.astro`.
- `proof.css` has the two wall tokens, the wall, the border band and the card
  lift, every rule under `html[data-theme='grandmillennial']`.
- `scripts/themes/harness/stage5-gm-walls-proof.mjs` injects both into the frozen
  build, wraps Contact's `.desk`, shoots and measures.

### The repeat

Tile **928 x 544**: two 464-wide half-drop pairs side by side. The big cabbage
roses and the paler blooms sit in four columns (x = 116, 348, 580, 812), two
heroes per column 272 apart, the columns dropped by 0, 136, 68 and 204 px. That
is a half drop between neighbours, and no two columns share a height. Blooms,
vines, buds, sprigs, leaf pairs and gold beads fill the rest by seeded
best-candidate placement on a torus, at many angles and sizes. A big filler
(rose or bloom) is additionally kept at least about 34 px off the height of every
other big motif (torus dy), so the fillers cannot line up with the heroes. Anything
crossing a tile edge is drawn again one tile over, so there is no seam.

Why 928 and not 464: the first version was a 464 tile. Its fillers landed at
the heroes' heights, so nine near-identical roses ran in one evenly spaced line
across 1440 (about 155 px apart) with a second band of ten blooms below, and
the same rose and bloom repeated at the same height three times. Review caught
it; the 0.19 autocorrelation peak I had cited was that row. At 928 wide, 1440 shows
1.55 tiles, so any motif appears at most twice across, and the big motifs are kept
off each other's heights. The cost is a larger inline defs (about 13 KB,
123 uses, against 8.5 KB and 63) which Tier B can bake to a static SVG (see below).

### Loudness method

One group (`.k-wall-ink`) holds every motif and its opacity is `--wall-ink`,
over a solid ground rect filled with `--wall-ground`. Why opacity and not
lighter ink tokens:

- one number moves the whole wall in both schemes; ink tokens would need a
  second set of mixed colours per scheme and per loudness;
- the palette stays the house palette (the same `--c-*` inks, only thinner);
- group opacity composites the group once, so overlapping petals do not show
  double-dark seams, which per-shape opacity would.

Grounds: light `--c-ground` (#f5e5dc, a warm pink, distinct from the cream
`--field` and the `#fdf9f0` card paper). Dark is
`color-mix(in srgb, var(--field), #000 24%)`, deliberately darker than
`--field-raised`, so a card on the wall is paper on a darker room, never a hole
(the a1 faux card on a lighter hunter wall read as sunk).

### Border band

A 1.6rem band top and bottom of the wall: awning-wide stripes of `--stripe-a` and
`--stripe-b` (hunter and cream in light, oxblood and cream in dark) with a one
pixel `--accent` pinstripe down each cream stripe, between two 2px `--rule`
gold lines, and a soft shadow toward the wall. Stripe, ticking and gold rule in
one band, so at the top of the wall three patterns meet: chintz, stripe, and the
ruled writing paper in the textarea.

### Cards

All text sits on `--field-raised` (the stationery, the envelope) or, for the
trust line, a small `--field-raised` card with a gold hairline (no word changes;
it was loose text on the page). The intro (kicker, heading, subline) stays above
the wall on `--field`. Card shadows lift them off the cloth.

## What the images show

- `sheet-loudness-1440.jpg`, `sheet-loudness-390.jpg`: Contact at 100, 60, 40
  percent, light over dark. Look at these first.
- `sheet-fold-1440.jpg`: a 1440x900 viewport at the top band and one at the foot
  band (60%), so the patterns meeting in one viewport can be judged.
- `sheet-recommended-sizes.jpg`: the 60% wall at 1280, 1024, 820, 390.
- `sheet-before-after.jpg`: Contact as built beside the 60% wall.
- `sheet-seams-1440.jpg`: the plain wall at 1440, 900 tall at 100%, against the
  old 200px `#gm-chintz` as the control, with the tile edges marked in red on
  the left column. Single images: `crops/wall-1440__<ink>__<scheme>.png` and
  `crops/wall-1440-seams__...`.
- `sheet-loudness-walls.jpg`: the plain wall alone at each loudness.
- Full-page singles: `shots/contact__<100|60|40>__<light|dark>__<size>.png`.

## Does a tile row or seam read at 1440?

No tile edge reads, and (after the 928 rework) no row of roses or blooms reads
in the crop. The old tile at 200 px shows a plain grid of identical clusters
(7.2 across 1440). The new wall shows scattered motifs, with no edge visible even
with the red edges removed. Notes:

- The vertical repeat is still 544 px, so the same cluster recurs at the same x
  one tile down (a vine at y 110 and 655). That is the nature of a straight
  vertical repeat; the half-drop columns keep neighbours from sharing a height.
  Horizontally nothing repeats closer than 928 px: a given motif shows twice
  across 1440, at an x offset of 928, not three times in a line.
- Autocorrelation of luminance on the plain 1440 wall (1.0 is identical): at the
  tile period it is 1.0 by construction, at the half-drop offset (464, 272) it is
  -0.04 light and -0.05 dark, and the highest value away from the tile period
  along x is 0.06 (light) and 0.04 (dark), along y 0.12 and 0.14 at the 272 px
  lag (the two heroes per column). The old tile reads 0.06 to 0.08 away from its
  period but repeats 7 times across, which is what the eye sees as a grid.
- Row and column banding (new in this round; the lag scan only looks along one
  axis and cannot see a row of similar shapes at one height). The measure is the
  standard deviation of the row means (or column means) over the pixel standard
  deviation, on the plain 1440 wall: row banding is 0.14 light and 0.13 dark at
  every loudness, against 0.30 for the old 200 px tile; the 464 version it
  replaces measured 0.26 (light 100) and 0.29 (dark 60). Column banding is 0.23,
  against 0.28 old. The harness now fails (exit 1) if the new wall's row banding
  is not under 85 percent of the old tile's at any loudness in either scheme.
  Numbers are in `measures.json` under `wall` (`rowBand`, `colBand`).

## Contrast

Measured in the page on every text element in the intro and the wall
(`measures.json`, `contrast`, at 1440 and 390, every loudness). The audit also
walks each element's background chain: **every text element on the wall resolves
to a card, a field, or the button, never to the wall (`onWall` false for all
of them), at every loudness and both widths.** Loudness changes none of these
numbers, since the text never touches the pattern. WCAG ratios, 60% (identical at
100% and 40%):

| Pair | Light | Dark |
|---|---|---|
| Heading on field | 11.85 | 12.98 |
| Kicker on field | 8.80 | 8.85 |
| Subline on field | 6.80 | 8.48 |
| Card labels and letterhead (accent on raised) | 9.50 | 7.55 |
| Field text and envelope invite (mark on raised) | 12.80 | 11.07 |
| Mail link on raised | 8.31 | 7.89 |
| Fine print and trust line (mark-muted on raised) | 7.35 | 7.23 |
| Button label on accent | 9.19 | 8.85 |
| The decorative ornament in the trust line (aria-hidden, not text) | 2.74 | 5.98 |

All text pairs clear 4.5:1 (AA); the ornament is decorative. The honeypot field
shows in the audit with default colours; it is visually hidden.

Card against wall (mean luminance of the plain 1440 wall against the card
paper, a non-text separation, `measures.json`):

| Ink | Light | Dark |
|---|---|---|
| 100% | 1.29 | 1.25 |
| 60% | 1.25 | 1.03 |
| 40% | 1.22 | 1.14 |

Weak spot: in dark at 60% the card is nearly the same average lightness as the
wall (1.03). It separates by the gilt frame, the 1px rule, the shadow and the
pattern stopping at its edge, and it reads on the sheet, but it is the one place
loudness is borderline. If the founder wants a stronger card in dark, darken
`--wall-ground` further (for example `#000` 40%) before touching the ink value.

Wall texture, standard deviation of relative luminance: light 0.193 / 0.139 /
0.102 and dark 0.097 / 0.038 / 0.019 at 100 / 60 / 40, against 0.210 and 0.098
for the old 200px chintz. At 60% the light wall is about a third quieter than
the old tile; in dark the 40% wall is almost flat, which is why 60 and not 40.

## Weak spots to know about

- **Phones:** at 390 the cards fill the gutters, so the wall is a margin, a
  ribbon down each side and a strip between cards. It reads, but it is a quieter
  room than desktop. Tier B can add a little inline padding to `.gm-wall-room`
  under 560px (about 1.25rem) if the founder wants more wall on phones, or leave
  it, as the cards are the content.
- The envelope was left where it is (item 12 owns its composition).
- The pattern is flat colour with no grain; item 7's static grain can sit over it.

## What Tier B should lift

1. `wall-defs.svg.html` into `parts/Defs.astro`'s `<defs>`, after the existing
   motifs (the new groups use the existing `k-*` classes, so they are inked by
   the same `--c-*` tokens in both schemes). Add to its style block
   `.k-wall-ground { fill: var(--wall-ground); }` and
   `.k-wall-ink { opacity: var(--wall-ink); }`.
2. `proof.css`: the `--wall-ground` and `--wall-ink` tokens into `theme.css`
   (light `var(--c-ground)`, dark the darkened field mix, `--wall-ink: 0.6`;
   drop the `data-wall` proof hooks), and the `.gm-wall`, `.gm-wall-art`,
   `.gm-wall-room`, `.gm-wall-band` and card-lift rules.
3. `pages/Contact.astro`: wrap `.desk` in the `.gm-wall` markup shown at the top of
   `proof.css` (band, art svg, room, band). The intro stays outside. The trust
   line becomes a `--field-raised` card (the `.trust` rule). No copy changes.
4. **Every page's wall**, one shared wrapper, a per-page fill:
   - **Services:** toile at full ink (founder F). Same `.gm-wall` wrapper with
     the rect filled `url(#gm-toile)` and the ground `--toile-ground`; ticking
     band as here. Set the opacity token to 1 for it.
   - **Contact:** this proof, chintz at 0.6.
   - **About:** the chinoiserie wall from a3, behind the oval, with the same
     band and cards. Its ink value is a3's to set; start from 0.6 if it is a
     tinted scene.
   To share the wrapper, make the rect's fill a custom property
   (`.gm-wall-art rect { fill: var(--wall-fill); }` with
   `--wall-fill: url(#gm-chintz-wall)` per page). That `var()` carrying a
   `url(#id)` fill is expected to work in Chromium but was not tested here; if it
   does not, set the fill attribute per page instead.
5. Optional: bake the chintz wall into a static SVG per scheme for caching if a
   Lighthouse run complains about inline weight (as for the toile).

Regenerating: `BDL_GPU=1 node scripts/themes/snap.mjs --name stage5-base --reuse
--port 4460 -- node scripts/themes/harness/stage5-gm-walls-proof.mjs`.
