# Tier 3, Stage 4 (pair A: swiss and bauhaus): decisions before the build

Written 10-02-26 at the start-of-pair stop. Branch
`feat/theme-schools-tier3-stage4` from `main` 1c5bdbb. The briefs are
`tier3-briefs/swiss.md` and `tier3-briefs/bauhaus.md`; Stage 0's answers
(`tier3-briefs/stage0-decisions.md`) win where they differ. The founder chose
on 10-02-26 to keep the Stage 0 answers, run Stage 3's shape (proofs, then
build waves, an Opus critic, the gates at the end) on the saved workflows
(`bdl-task`, `bdl-wave`, PR #94), with two founder stops per pair: this one
and the end-of-pair sheets. Taste calls park for the end stop; blockers stop
the run.

## Already done before this stage

- Swiss item 10 (the column-panel page swap, four uneven desktop beats, the
  one-step wordmark) shipped in Stage 2, and the swiss header holds still
  in-school (`swiss-header`).
- Bauhaus E5 (balanced headings, pretty body) and the F8 wordmark ghost fix
  shipped in Stage 2.
- Bauhaus F2 is declined (S4: no red type in bauhaus). Swiss D3 is none (S4:
  no lowercase in swiss). Swiss D4 is done; D5 (the billboard carries
  `wordmark`) waits for the transitions phase.

## Swiss: what this stage applies

Defaults from the brief ("tier 3 yes to all"), in its order of leverage:

1. One giant per page; the type scale collapses to three tokens plus the
   page's giant.
2. Stop drawing the grid: the resting column guides go (the guides come back
   only inside the transition, later).
3. Colour as full-bleed fields, never a gutter card.
4. Dark designed as the black sheet, with `#da0016` red intact and white
   type on red (split tokens; contrast passes in both schemes).
5. Red retires as a UI accent: fields, the one CTA, at most one typographic
   mark per page. States get a Swiss grammar (inversion, weight).
6. Each page its own composition under one programme (Home 2 fields, About 3,
   Services 4, Contact 1 sheet, Sent untouched). Contact's hero becomes a
   full-bleed black sheet in light too.
7. One family: Archivo only (standard axes); Public Sans and IBM Plex Mono
   go; section indices dropped.
8. Line-based vertical rhythm on a 24px line.
9. Phones: the first screen is a poster (one-band header, phone giants, one
   label layer).
11. One rule for buttons (two lines tall, label bottom-left, one width rule
    per viewport).
12. Tablet as its own sheet.
13. Orphans and the footer as one colophon.

Founder calls already made: **D1 = yes**, a red duotone of the Shining Tree
still as a full-bleed About field carrying the manifesto, and the Home red
rectangle goes. **D2 = yes**, one full-height condensed rotated "Birch" (the
copy's capital, per S4) on About only.

## Bauhaus: what this stage applies

Defaults from the brief:

- E1. The Kandinsky pairing (yellow triangle, red square, blue circle) made
  true everywhere, the footer first.
- E2. One lowercase voice: spaced capitals go from labels.
- E3. Constructed numerals from bars and circles (after Albers) replace
  Unbounded, as the school's signature detail.
- E4. The wall label's lesson line rebuilt on the Dessau motto (copy: below).
- E6. One diagonal composition (after Schmidt), and the footer carries the
  rest.
- E7. The printshop register on the working surfaces, inside the no-red-type
  rule (red as rules and blocks only).
- E8. Phones and tablets keep the structure (the heavy left rule on mobile).
- E9. Services process steps, and a more solid dark scheme.
- E10. Hover gating, press states, see-saw physics.
- E11. Composition balance on Contact, Sent, the opener, About and the
  footer.
- E12. Sent: the circle rolls down the triangle's slope into the square.
- F3. Keep the About B's red bowl; make the hero eye's stroke neutral.
- F4. Keep the yellow slab on "to shine".
- F5. Typophoto in the lab band: grayscale square crops of BDL-008 and
  BDL-007, a trial at desktop and tablet, off on phones if the band runs
  long.
- F6. Keep the black wall in dark (revisit after E1 and E9 are seen).
- F7. Static: no ambient motion (the perforated disc waits for the
  transitions phase).

## Open for the founder now

1. **Bauhaus F1, the assembly feel.** The critics call today's 12%-overshoot
   spring a UI spring; you like it. The brief recommends (b) mechanical
   (solid shapes from the first frame, no overshoot, the hero in three beats,
   about 1.1 s) behind one variable, with A/B strips side by side. (c) is
   the middle: (b)'s beats with a 3% overshoot. Recommendation: build the
   variable and show you (a), (b) and (c) as strips at the end-of-pair stop;
   ship (b) until you pick.
2. **Bauhaus E4, the lesson line (copy).** The brief's candidate: "Art and
   technology, a new unity: a few elementary forms, a strict grid, and every
   shape given a job." The lesson now lives in the BDL-011 case study, not
   the dialog. Approve, reword, or leave the old line until the copy pass.
   Recommendation: leave it for the copy pass (it is visitor copy, and the
   copy pass sweeps every school's words together).
3. **More interactable details (S3, "even if they do nothing").** Stage 0
   made this a rule for every school, after these briefs were written, so
   neither brief has any. Proposals, one or two per school:
   - Swiss: **a grid key.** Holding a small key (or a keyboard shortcut)
     shows the column guides over the page, the designer's grid made
     visible on demand, while the resting page stays undrawn (item 2).
     **A width dial** on the Home billboard: drag along "Design" to change
     Archivo's width axis, snapping back on release.
   - Bauhaus: **loose shapes.** The hero's shapes (or the Sent trio) can be
     picked up and dropped, then fall back to their marks on the beam.
     **The questionnaire card:** Kandinsky's three shapes and three colours
     to pair by tapping, the answer the house rule (credited to Kandinsky,
     not "the Bauhaus", per the dossier).
   Recommendation: the grid key and the loose shapes in this stage; the
   width dial and the questionnaire card as stretch items if the wave runs
   clean.
4. **Swiss body type.** Item 7 sets body in Archivo at width 100, with Inter
   as the fallback if Archivo reads too characterful at 17px. Recommendation:
   prove both in Tier A and pick on the sheet yourself at the end-of-pair
   stop only if the critic cannot.

## Tier A proofs (proposed)

Only the risky items get a proof before the build; everything else goes
straight to the waves.

- Swiss D1: the red duotone of the Shining Tree, white manifesto type on it
  (contrast measured), at 1440, 820 and 390, light and dark.
- Swiss item 7 and 9: Archivo body at 17px against Inter, and the phone
  billboard filling the measure at 390 with the width axis, no overflow.
- Swiss D2: the rotated condensed "Birch" running the height of About's
  section 02 at every size.
- Bauhaus E3: the constructed numerals (0 to 9 from bars and circles) at
  every size they appear.
- Bauhaus F1: the assembly variable with (a), (b) and (c) strips.

## How it runs (proposed)

- **Tier A:** one `bdl-wave`, five proof tasks, each a proof page or sheet
  under `scripts/themes/proofs/stage4-*` (no school code changes). Sonnet
  `medium` implementers; Opus `high` critic and Sonnet `high` verifier per
  task.
- **Tier B:** two waves on this branch, back to back. Wave B1 = swiss in
  four tasks (type and grid; colour, dark and red; page compositions with D1
  and D2; phones, tablet, buttons, footer and the grid key). Wave B2 =
  bauhaus in four tasks (pairing, lowercase and numerals; diagonal,
  printshop and composition balance; phones, tablets, process and dark;
  motion: F1 variable, E10, E12 and the loose shapes). WebGL is not
  involved, so no task needs `runtime: true`.
- **Gates:** `stage-gates.mjs` once at the end of the pair, then the
  end-of-pair stop with the sheets, the taste calls and the F1 strips.
