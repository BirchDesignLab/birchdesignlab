# W1 task 2: glass R1 part 1, a backdrop worth frosting and a clear material

Shared rules: `w1-common.md`. Sources: `../a1-critic-glassmorphism.md`
(diagnosis, G2, G3, G8, G13, G15, G16, R1), stop 1 call 2 (R1 in this wave;
the wallpaper repaint goes straight in and is judged at stop 2).

1. **Repaint the six wallpapers** with
   `scripts/themes/glassmorphism/paint-wallpaper.mjs` (extend it; keep its
   outputs, formats and the light/dark by time-of-day set that
   `lens/wallpaper-images.ts` imports): crisp-edged Big Sur layered waves,
   hard edges with light and shadow bands, amber, coral and deep blue, coral
   meeting blue through a cream or white light band, **no mauve, pink,
   lavender or violet midtones** (G13: those are vaporwave's). Dark keeps its
   orange and blue. Measure detail: mean absolute Laplacian of the open
   wallpaper clearly above the inside of a frosted pane (today 0.507 vs
   0.516); record before and after.
2. **Orbs** get crisp edges and a thin specular line; the rose orb
   (`#d63c73`) moves to amber.
3. **The material** (G3): thin panes blur 8-12px (now 20-30), saturate at
   most 1.2, no brightness step, light fill about 0.15, dark about 0.35;
   regular panes proportionally. Body text legibility comes from a soft
   inner plate behind body text only (display type may sit at 3:1, the D2 =
   C rule); update `meta.ts` contrast and its worst-orb method so it measures
   text against its plate, and state the method in the report.
4. **Palette off vaporwave** (G13): `--wp-body` a deep warm blue, not
   `#6b5a8e`; interior hues of every pane in light within about 20 degrees
   of the wallpaper behind it (today 264-334 against 228). Services' cream
   settings pane tinted toward the wallpaper (G15).
5. **Frost visibly does something** (G8): across the Control Centre's Frost
   range the hero pane changes by a clearly visible amount (measure; today
   1.5/255).
6. The lens texture follows the new wallpapers (same files); check it.

**Owns:** `src/themes/glassmorphism/**` except `lens/` logic files (the
wallpaper manifest `lens/wallpaper-images.ts` is yours),
`scripts/themes/glassmorphism/paint-wallpaper.mjs`,
`scripts/themes/stage6/w1-t2-*.mjs`, `tests/glass-*.test.ts`.

**Films and sheets:** viewport frames at scroll offsets, every page, 1440 and
390, both schemes, before and after; the Control Centre Frost at both ends;
a boundary sheet beside vaporwave in light (glass must read clearly
warmer and more neutral).
