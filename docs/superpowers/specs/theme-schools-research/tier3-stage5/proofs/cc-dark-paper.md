# Proof a5: cottagecore, paper in the dark scheme (D4)

Stage 5 Tier A. Brief: `../briefs/a5-cc-dark-paper.md` (D4, with items 3 and 5
folded in). Nothing under `src/` changed. Images are scratch under
`scripts/themes/.out/stage5-proofs/cc-dark-paper/` (not committed; `index.md`
there lists every file). GPU Chromium, renderer ANGLE / NVIDIA RTX 3070
(D3D11), saved as `renderer.txt`. Dark scheme only, Home and About, at 1440,
820 and 390 (2x). The switcher is hidden in every frame; the firefly canvas is
hidden except in the firefly frames.

## The question

In the lamplit dark scheme, which paper treatment separates the mounted
herbarium sheets from the table and the cards, and keeps the lamplight concept?
(a) today's lamp-brown papers everywhere; (b) dimmed cream papers everywhere;
(c) brown cards and notes kept, only the mounted sheets lifted to a heavier,
lighter board.

## Answer

- **(c) works and is the one to lift.** The brown card, butter note and letter
  stay as they are (they are small objects on the table, lit by it). The two
  mounted sheets become a dimmed-cream board with a visible edge. The hero
  sheet now separates from the table at a glance and the sprigs read as
  pressed on it, where in (a) the fern, daisy and rose sit in a brown field
  of nearly the same value as the table. `sheet-sheets.jpg`, `sheet-home.jpg`,
  `sheet-about.jpg`.
- **(b) also works, but it changes the room.** Cream cards, a cream butter note
  and a cream letter make the dark scheme mostly paper; the table reads as a
  dark margin around light objects, closer to the light scheme inverted in the
  other direction than to "lamplight on a dark table". It also drags work:
  every ink on paper has to be remapped (four tokens), and pages not shown
  (Contact's form, the postcard, the stamp, Sent) would all need the same
  pass. The hoop cloth is a textile, not paper; both options leave it dark
  (the cream cross-stitch on dark reads well, `sheet-papers.jpg` last row).
- **Item 3 (pressed flat) is visible and cheap.** No halo under the fern, daisy
  or rose in either option; gum strips hold the hero sprigs; the About twig
  keeps its own strips, now pale kraft (`--cc-gum-strip`) so they show on the
  board.
- **Item 5 (dark cloth) reads as a woven check at a glance.** `sheet-cloth.jpg`.
  It is quite a strong check in the Lab band at 0.18; 0.14 (the brief's lower
  bound) is the quieter setting if the founder finds it loud. It is still dark
  green cloth, not light gingham.
- **Fireflies (D7) are unchanged and fine.** The canvas stays under `main`
  (z-index 0 against 1), paper backgrounds are fully opaque, so motes drift
  over the cloth and vanish behind the sheets. Over six timed frames per size
  in (c), zero lit canvas pixels (alpha above 24) fell inside a text block
  while hundreds to over a thousand were lit elsewhere. See
  `sheet-fireflies-1440.jpg` and `-390.jpg` and `measures.json`.

## What was made

In `scripts/themes/proofs/stage5-cc-dark-paper/`:

- `shared.css`: items 3 and 5 (both options carry it).
- `paper-b.css`, `paper-c.css`: the two papers.
- `mount.js`: adds the class `cc-board` to the two sheets and lays the hero's
  gum strips (markup half of the proof).
- `strips.json`: the placements the strips landed on, for Tier B to hardcode.
- `desat.mjs`: how the petal tokens were desaturated.

Harness: `scripts/themes/harness/stage5-cc-dark-paper-proof.mjs` (injects into
the frozen `stage5-base` build; captures; measures contrast from live computed
colours; counts lit firefly pixels).

Every rule is under `html[data-theme='cottagecore'][data-scheme='dark']`. The
injected `:root` is for specificity only (it beats the theme's token block and
the Astro-scoped rules); in `theme.css` the `html` and `:root` can go.

## Settings used

### Item 5, dark cloth (shared.css)

| setting | value |
|---|---|
| `--gingham-ground` | `#1c251d` |
| `--gingham-thread` | sage `rgba(169,194,148,0.18)`, both directions, so crossings stack (three tones). Brief band 0.14 to 0.22. |
| `--gingham-texture` | faint diagonal weave, amber 0.035 (replaces the dashed SVG) |
| `--field-texture` (table behind) | linen hairlines, cream 0.022 and 0.026 (replaces the dashed 28px SVG) |
| scallop rim | 1.5px `rgba(255,214,150,0.42)` ring gradient inside the scallop tile, on `.valance` and `.hem` |
| tile sizes | the dark rule's `28px` first layer goes back to `auto` for `.cc-gingham` and `[data-portal-tail]` |

### Item 3, pressed flat (shared.css, mount.js)

| setting | value |
|---|---|
| `--press-shadow-mounted` | `none` on anything in `.cc-paper`, `.cc-board`, `.note` (hairline alternative in the comment: `drop-shadow(0 0.5px 0 rgba(58,42,31,0.12))`) |
| `--press-shadow` (loose sprigs: strays, closer pair, letter rose and fern) | `drop-shadow(0 1.5px 2px rgba(0,0,0,0.3))`, lighter than today's `0 2px 3px` at 0.45 |
| hero gum strips | 6 strips: 2 each on the fern, rose and daisy, none on the lavender. `<svg class="pressed gum" viewBox="0 0 34 12">` with the twig's `gum-strip` class; width 9.5% of the sheet, rotated across the stem. Each is placed at the nearest point to 0.30 and 0.64 along the stem path, among the points that pass at 1440, 820 and 390 all together, where a hit test finds only bare board, the sprig's own stem, leaf, frond or vein, or a crossing stem under the strip's footprint (with a 20% margin), never a bloom, bud or petal. Every sample is scrolled into the viewport before it is tested and a sample that cannot be seen fails, so the test holds below the fold at 390. The lavender stem is under the daisy or its buds everywhere a strip would fit at all three sizes, so it carries none |
| petals on mounted sheets | light palette (drawn for cream paper), petal fills 10% less saturated: `--cc-petal-back #efe6d4`, `--cc-rose-petal #e5b1ad`, `--cc-blush #fef4e5`, `--cc-lav #a596c9` (`--cc-petal` is already near white and does not move) |
| `--cc-gum-strip` | `#ece0c4` (was `#4a3b2c`, invisible on cream) |

### The papers

| token | (b) | (c) |
|---|---|---|
| surface | `--paper #d5c8ac`, `--note #d9c892` | `--board #cfc1a1` |
| ink | `--paper-ink #2f2219` | `--board-ink #2f2219` |
| muted ink | `--paper-ink-muted #4f3a2b` | `--board-ink-muted #4f3a2b` |
| accent | `--paper-accent #702a36` | `--board-accent #702a36` |
| link | `--paper-link #2f4a2a` | `--board-link #2f4a2a` |
| lamp | amber glow from the upper left (0.34) and a dimming foot (0.10) | same, on the board only |
| extras | none | edge: lit top lip, 2px `#a2936c` thickness, deeper shadow; plate mark 0.65rem inside (1px at 0.2) |

Ink tokens are remapped only inside paper (`--mark`, `--mark-muted`, `--accent`,
`--link`, `--rule`, `--margin-line`, plus `color`, which does not re-resolve on
its own). Text on the table keeps cream, amber and lit sage. `color` must be set
on the scope: the first run left headings cream on cream (1.3:1) because
`color` inherits its computed value, not the token.

## Contrast

Measured from the live computed colours at 1440 (`contrast-table.md`,
`measures.json`). "Darkest" is the surface with the foot dimming at full
strength under the text, the worst case.

| pair | (b) base / darkest | (c) base / darkest |
|---|---|---|
| ink on surface | 9.30 / 7.74 (paper), 9.26 / 7.70 (note) | 8.65 / 7.21 |
| muted ink | 6.43 / 5.35, 6.40 / 5.33 | 5.98 / 4.99 |
| accent | 6.12 / 5.09, 6.09 / 5.07 | 5.69 / 4.74 |
| link | 5.41 on paper at the token level (measured on the note 5.92 / 4.92) | 5.53 / 4.61 at the token level |

Lowest measured on a real element: (c) sheet "to shine" (accent) 5.69 / 4.74;
(b) note link 5.92 / 4.92. All clear 4.5:1. The hero herb-label scribble (a
stroke, 3:1 needed) is 3.96 (c) and 4.17 (b), darkest 3.48 and 3.66. The
herb-label's double rule is decoration (`--rule`, as today's 0.09 alpha) and is
reported, not enforced. Cards, butter note and letter in (c) are unchanged from
today (12.48 for card title down to 6.18 for note kicker). `contrast-entries.txt`
holds paste-ready `meta.contrast` entries for both options.

One thing to hold for Tier B if (b) is chosen: `--field-line` (lit sage, form
field outlines, 3:1 on `--paper` today) fails on cream, and the Contact
postcard, stamp and Sent page were not proofed. (c) does not touch them.

## What Tier B lifts, for (c)

1. `shared.css` into `theme.css` dark (except the `.gum` geometry rule, which
   goes in the scheme-agnostic part, see step 3): the cloth tokens and the two scallop-rim
   rules, the `auto` size override, `--press-shadow` and `--press-shadow-mounted`
   and the mounted rule. The dashed `--gingham-texture` and `--field-texture`
   SVGs are deleted.
2. `paper-c.css` into `theme.css` dark: `--board*` tokens, the `.cc-board` rule
   and its `::after`.
3. Markup: class `cc-board` beside `cc-paper` on `.sheet` in `Home.astro` and
   `About.astro`; the hero's six gum strips in `Home.astro` as in `mount.js`,
   at the percentages in `strips.json` (they are the same at every size,
   drift 0 points). The same table was replayed and re-tested at 1440, 820 and
   390, in the full-page frames and in the 2x crops, and all six strips are clear
   of blooms and buds each time (`measures.json`: `stripAllClearAtEverySize` and
   `cropStripsAllClear` true).
4. `meta.ts`: the `--board*` entries from `contrast-entries.txt`.
5. The strip markup is in both schemes, so its geometry rule (`html[data-theme='cottagecore'] .sheet .gum`: absolute, 9.5% wide, centred) is not gated to dark in `shared.css`; probed in light, the strips render 40 to 42px at 1440, as in dark. Everything else here is dark only, and the rest of the light scheme is untouched. The mounted-sheet petal
   desaturation, the pale gum strip and the strips themselves are worth showing
   in light too (brief item 3 asks for visible strips in the light hero); that is
   not proofed here, since this task is dark only.

## Open for the founder

- (c) against (b): taste call; (c) is the recommendation and the brief's
  default. (b) is liftable as is.
- The hoop cloth stays dark in both. Making it cream aida in (b) is possible
  but was not drawn.
- The cloth check strength: 0.18 as shown; 0.14 is quieter.
- Six strips on the hero is a lot at 390 (they are 9.5% of a narrow sheet);
  one per sprig is the quieter setting.
