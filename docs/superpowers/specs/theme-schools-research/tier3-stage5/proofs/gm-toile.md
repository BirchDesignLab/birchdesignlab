# Proof a1: grandmillennial, a real toile de Jouy

Stage 5 Tier A. Brief: `../briefs/a1-gm-toile.md` (item 1; dossier G1, T4, C5).
Nothing under `src/` changed. Images are scratch under
`scripts/themes/.out/stage5-proofs/gm-toile/` (not committed; `index.md` there
lists every file). GPU Chromium, renderer ANGLE / NVIDIA RTX 3070 (D3D11),
saved as `renderer.txt`.

## The question

Can we draw a single-ink, figurative toile in engraved line and hatching, after
Huet's "The Activities of the Farm", that reads as little scenes and not a leaf
scatter, at swatch scale and at wall scale, in both schemes?

## Answer: yes

It reads as scenes at both scales, in both schemes, and 100% crops show line
and hatching, not blobs. Six islands to a tile with bare ground between, birds,
butterflies, sprigs and shrubs in the gaps.

## What was made

All in `scripts/themes/proofs/stage5-gm-toile/`:

- `build-toile.mjs` and `draw-lib.mjs` draw the pattern (seeded, repeatable).
  Run `node scripts/themes/proofs/stage5-gm-toile/build-toile.mjs`.
- `toile-defs.svg.html` is the markup that drops into `parts/Defs.astro`:
  eleven `<g id="gm-toile-*">` vignettes and fillers plus
  `<pattern id="gm-toile">`. It replaces `#gm-toile-spray` and `#gm-porcelaine`.
- `proof.css` holds the ink tokens and the two classes.
- `scripts/themes/harness/stage5-gm-toile-proof.mjs` injects both into the
  frozen build and shoots everything.

Vignettes (all studio-native, all strokes, no fills):

1. **grove**: two pairs of birches with a slatted garden bench and a watering can.
2. **grove2**: a birch cluster, a bench with a book on it, a sundial.
3. **desk**: a writing desk with paper, inkwell and quill under a big tree, a
   ladder-back chair drawn up.
4. **reader**: a small figure in a bonnet reading a letter, a ruined arch and
   pillar behind (Huet's ruins), a stile and a shrub.
5. **parasol**: a lady with a parasol beside a birch and a shrub.
6. **urn**: a garden urn on a plinth, overflowing, flanked by clipped yews.

Tone is hatching only: leaf ticks that thicken toward the shaded side,
horizontal strokes under every island, hatched gowns, pillar stone, plinths.
Birches carry bold lenticel dashes and a thin line of roundness.

## Repeat

704 x 800 px tile, a half drop: two columns of three islands, the second column
half a row lower, items jittered in x and y, mirrored and scaled so no motif
repeats at the same size or hand. Anything crossing a tile edge is drawn again
one tile over (the left-edge items and the bottom item of the second column),
so there is no seam. The width is 704 on purpose: 1440 / 704 is not a whole
number, so the wall is not two identical halves at the most common desktop
width. Checked at 1440, 1280, 1024, 820 and 390: no row, column or seam reads.
The usual half-drop zigzag is the only rhythm.

## Inks (one custom property per scheme)

```css
html[data-theme='grandmillennial'] { --toile-ground: var(--field-raised); --toile-ink: var(--oxblood); }
html[data-theme='grandmillennial'][data-scheme='dark'] { --toile-ground: var(--hunter); --toile-ink: var(--gold-light); }
.k-toile { fill: none; stroke: var(--toile-ink); stroke-width: 0.9; stroke-linecap: round; stroke-linejoin: round; }
.k-toile-ground { fill: var(--toile-ground); stroke: none; }
```

**Light: oxblood reads better than porcelain blue.** Same drawing, both inks
(`sheet-swatch.jpg`, `sheet-wall-*.jpg`). Oxblood `#7d1f2b` has the weight to
hold the 0.55px hatching and is the madder red of the V&A Huet (C5); the
porcelain ink `#2b58a0` is lighter and the fine strokes go pale, and blue is
already the voice of the Lab band and the old swatch. Use oxblood. Blue stays
available as an alternate with one attribute (`data-toile-ink='porcelain'`) if
the founder wants it on a second surface.

**Dark: gold-light line on `--hunter`.** Gold on the raised field
(`--field-raised`) has more contrast but the swatch sinks into the room; on
hunter it is a lifted cloth, which is the brief's "gold line on hunter". Use
hunter. The raised-field ground is kept as `data-toile-ground='field'` for
comparison only.

## Size and cost

- Markup: **41,081 bytes raw, 12,876 gzipped**, 22 `<use>` placements, one
  pattern. Paths are all relative with dropped separators.
- Paint, cold first paint of a full 1440x900 wall, median of 7, GPU Chromium
  (`measures.json`):

  | pattern | Paint (main thread) | Raster tasks |
  |---|---|---|
  | `gm-toile` | 0.31 ms | 4.8 ms |
  | `gm-porcelaine` (today) | 0.27 ms | 1.6 ms |
  | `gm-chintz` (today) | 0.53 ms | 3.8 ms |

  Rough numbers, but the order is clear: the toile rasterises once, about a
  millisecond more than the chintz wall, and then it is a cached tile. The
  first run in a fresh process cost 35 ms of raster (shader and cache warm-up),
  which every pattern pays.
- The cost that matters is page weight: `Defs.astro` renders in the Header on
  every grandmillennial page, and 41 KB raw (13 KB gzipped) is more than the
  old 4 KB. Tier B can trim (fewer leaf ticks, one fewer vignette) or serve the
  drawing as an external SVG file; see Tier B below.

## Swatch framing

The Services swatch is 352 x 440 and the tile is 704 x 800, so the swatch
shows a fragment. At scale 1 it shows one vignette and mostly bare ground, which
reads as empty. A cutting should show several scenes, so the swatch uses a
second pattern that inherits the first:

```html
<pattern id="gm-toile-swatch" href="#gm-toile" patternTransform="translate(14 -29) scale(0.72)"/>
```

and the `<rect>` in `parts/Toile.astro` fills with `url(#gm-toile-swatch)`.
At 0.72 the swatch shows five or six scenes (grove, urn, reader, shrub, grove2,
a sliver of the next) and the hatching is still visible. Walls use
`url(#gm-toile)` at scale 1.

## What the images show

- `sheet-swatch.jpg`: Services No. 2 swatch, before (leaf scatter) and with the
  toile, light oxblood, light porcelain, dark gold on hunter, dark gold on
  raised field, at 1440, 1280, 1024, 820 and 390. Single images are
  `shots/swatch2__<ox|blue|gold|goldfield>__<size>.png` and
  `shots/swatch2-before__<light|dark>__<size>.png`.
- `sheet-wall-1440.jpg` and `sheet-wall-390.jpg`: full-bleed wall, plain and
  with a faux raised card on it (bars, no words) for item 2 and a2. The card
  sits clear of the line work: text on a raised card, never on the pattern.
  `sheet-wall-sizes.jpg` adds 1280, 1024, 820.
- `sheet-crops.jpg`: 100% crops of all six vignettes in light and dark
  (`crops/crop-<vignette>__<ox|gold>.png`). Line, not blobs.
- `sheet-services-full.jpg`: whole Services page at every size with the toile
  on the No. 2 swatch (`shots/services__<ox|blue|gold>__<size>.png`).

Founder note: the sheets to look at first are `sheet-swatch.jpg` and
`sheet-wall-1440.jpg`.

## Weak spots to know about

- The reader's face is a minimal profile; at 100% it reads, at swatch scale it
  is a bonnet and a letter. Tier B could give her a little more.
- The tile repeats every 704 x 800 and a viewer who looks for it will find the
  grove twice in a 1440 view (once mirrored and smaller). That is the same
  nature as a real print repeat.
- The pattern is stroke-only with no grain; the "age the prints" item 7 can add
  its static grain on top.

## What Tier B should lift

1. `toile-defs.svg.html` into `parts/Defs.astro` in place of `#gm-toile-spray`
   and `#gm-porcelaine` (keep `.gm-defs`). The pattern id stays `gm-toile`.
2. The two classes `.k-toile` and `.k-toile-ground` into Defs.astro's style
   block (drop `.k-porc*`), and the `--toile-ground` / `--toile-ink` tokens into
   `theme.css` for both schemes (light oxblood on `--field-raised`, dark
   `--gold-light` on `--hunter`). Drop `--porcelain-ground` and
   `--porcelain-ink` once nothing else reads them (grep first: Plate and Jar
   may).
3. `parts/Toile.astro`: fill `url(#gm-toile-swatch)`, add the inheriting
   `<pattern>` above next to the main one; `.swatch.porcelain` background to
   `var(--toile-ground)` in `pages/Services.astro`. `meta.ts` `assets.note`
   should name the toile.
4. Walls (item 2): `<rect fill="url(#gm-toile)">` full bleed; text on raised
   cards. Founder decision F: toile at full ink.
5. Weight option: if the 41 KB per page is unwelcome, export two static SVG
   files (one per scheme, ink baked in) and use them as a CSS
   `background-image`; they cache across pages. Do this at the Tier B build if
   a Lighthouse run complains; the drawing does not change.

Regenerating: edit `build-toile.mjs` and rerun; the harness reads the output
files, so `BDL_GPU=1 node scripts/themes/snap.mjs --name stage5-base --reuse
--port 4460 -- node scripts/themes/harness/stage5-gm-toile-proof.mjs
--swatch-tf "translate(14 -29) scale(0.72)"` reshoots everything.
