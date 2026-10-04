# Stage 5 Tier A: the proofs, for the founder's stop

Run `s5-a` (bdl-wave, workflow run wf_1ab03eed-6fe), 10-03 to 10-04-26, from
a69e098 to a8d78be. All six proofs complete, every review clean and gate
green after one or two fix rounds; 80 agents, about 8.6M subagent tokens
(planned about 70). Nothing under `src/` changed. Write-ups in `proofs/`,
sheets under `scripts/themes/.out/stage5-proofs/<task>/`, the ledger in
`scripts/themes/.out/stage5/ledger.md`. The controller looked at every sheet
named below against the briefs.

## What came back

- **a1 Toile** (`gm-toile.md`, `sheet-swatch.jpg`, `sheet-crops.jpg`,
  `sheet-wall-1440.jpg`). A single-ink figurative toile with six islands to
  a tile: a birch grove with a bench, a second grove with a sundial, a desk
  under a tree, a reader by a pillar, a figure with a parasol, a garden urn.
  It reads as scenes at swatch and wall scale. Oxblood beats porcelain blue
  in light; gold on hunter in dark. No seam at 1440. 41 KB raw, 12.9 KB
  gzip.
- **a2 Walls** (`gm-walls.md`, `sheet-loudness-1440.jpg`,
  `sheet-loudness-390.jpg`). A new 928x544 chintz wall tile, edged with a
  stripe band. 60% ink by layer opacity, as recommended: 100% is a fabric
  shop, and 40% goes to a stain in dark. Text stays on cards; contrast
  passes.
- **a3 Chinoiserie** (`gm-chinoiserie.md`, `sheet-hero.jpg`,
  `sheet-oval.jpg`). A non-repeating birch-and-bird wall behind About's
  oval: eleven long-tailed birds and branches across the room, light and
  dark. The birch in the oval is redrawn as a botanical study, and a small
  second frame holds a perched blue bird. 130 KB wall, 16 KB birch.
- **a4 Hands** (`cc-hands.md`, `sheet-hands.jpg`, `sheet-home-1440.jpg`).
  Three hands from Caveat's axis; every new ink clears 4.5:1. The margin
  note (sepia) and the label (sage, upright) read as other writers. The
  kicker barely moves, and at page scale the whole change is quiet. The
  Fraunces h2 and h3 wetness steps show at 2x and are quiet at page scale.
  Pull quotes: Sharp.
- **a5 Dark paper** (`cc-dark-paper.md`, `sheet-home.jpg`). (c) works: the
  mounted sheets become a dimmed-cream board, the sprigs read as pressed and
  held by gum strips, and the brown cards stay. (b) turns the dark room into
  mostly paper. The dark cloth now reads as a woven check.
- **a6 Floaters** (`cc-floaters.md`, `sheet-seeds-home-1440.jpg`,
  `sheet-fireflies-1440.jpg`). One `fx.ts` that drops in: the fireflies
  flash in bursts and are otherwise unchanged; dandelion seeds drift by day
  over the cloth and under the sheets; both answer the pointer. Cost no
  higher than today's, with no rect reads while scrolling.

## Calls for you

1. **Toile density.** It is an airy line drawing, lighter than a copperplate
   toile (canopies are outlines with ticks, faces are blank). Keep it airy,
   or push the hatching in canopies, ground and figures? **Recommend: push
   it** (a modest byte cost), so it reads as engraved, not as illustration.
2. **Where the toile lives.** It is 41 KB inlined on every grandmillennial
   page, about 10 times today's pattern. **Recommend: an external SVG per
   scheme**, so it is cached after the first page.
3. **The wall on phones.** At 390 the cards fill the gutters, so the wall
   shrinks to slivers. **Recommend: more side padding and gaps on phones**,
   so a band of wall shows around each card.
4. **The chinoiserie leaves.** They read as chestnut or holly (long, coarse
   teeth), and the catkins are short cones. Real birch has small
   triangular, finely toothed leaves and slender drooping catkins. The oval
   shares the shapes. **Recommend: redraw both to true birch** in the wave.
   The oval still hangs from the bow in the proof; the wave applies your
   decision C (a picture wire).
5. **Interactables on About.** The wall adds none yet. **Recommend: a bird
   that takes off to another branch when tapped or hovered** (inert,
   `aria-hidden`), under your standing rule.
6. **The hands are too quiet.** At page scale the three writers are hard to
   tell apart, and the kicker barely changes. **Recommend: widen the gaps in
   the wave** (the kicker heavier and larger, the note lighter and looser),
   and widen the h2 and h3 wetness steps beyond the brief's numbers.
7. **Dark cloth against the butter note.** At 0.18 the woven check is
   lighter than the lit butter note, so the note looks sunk into the cloth.
   On the cream board, the dark tape tokens read as heavy bands.
   **Recommend: the check at 0.14, and light-scheme tapes on the cream
   boards.**
8. **The seeds are timid.** At 1440, three to five faint seeds sit at the
   page edges; at 390 one sliver shows in six frames. **Recommend: seeds
   about 1.5 times larger with a little more ink, and two or three always
   on the first phone screen**, without crossing text. The fireflies' flash
   reads, small and warm. Keep it.

## Next

Wave B1, grandmillennial, five tasks (`stage5-decisions.md`, "How it runs"),
with your answers above carried, plus the bird and the bell-pull tassel and
swatch lift (now in scope). About 50 agents: implementer Sonnet `medium`,
critic Opus `high`, verifier Sonnet `high`, gate Sonnet `low`, verifyHead
Haiku. It stops after the wave for your look.
