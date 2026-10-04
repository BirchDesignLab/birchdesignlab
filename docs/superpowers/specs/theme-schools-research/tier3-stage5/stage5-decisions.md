# Tier 3, Stage 5 (pair C: grandmillennial and cottagecore): decisions before the build

Written 10-03-26 at the start-of-pair stop. Branch
`feat/theme-schools-tier3-stage5` from `main` 5316e1c (the Stage 4 merge).
The briefs are `tier3-briefs/grandmillennial.md` and
`tier3-briefs/cottagecore.md`; Stage 0's answers
(`tier3-briefs/stage0-decisions.md`) win where they differ. Stage 4's shape
carries over: Tier A proofs, then one build wave per school on the saved
workflows (`bdl-task`, `bdl-wave`), an Opus critic on every task, the gates at
the end, and three hard stops (after Tier A, after the first school's wave,
after the second school's wave plus the gates). Taste calls park for the
stops; blockers stop the run. Founder read 09-23-26: both schools are
"absolutely selling what we can do", so the job is to raise them without
changing their character.

## Already done before this stage

- Grandmillennial item 3 (the No. 1 swatch grid) and item 4 (the arrival:
  drapes from frame one, the wordmark stagger, the in-school swap) shipped in
  Stage 2.
- Cottagecore item 2 (no double exposure, the still `cottagecore-header` on
  in-school swaps) shipped in Stage 2, and with it D5: the arrival is the
  "laid on the table" settle (`cc-sheet-settle`, translateY 10px, no
  rotateY).
- Both scrolled header bands were accepted in Stage 2 ("live with it for
  now"; the transitions phase revisits them).
- Grandmillennial D = yes (a cross-stitch alphabet band on the sampler,
  `aria-hidden` SVG). Cottagecore D1 = yes with the one fixed date 09-23-26
  (words below, for approval); D3 = yes (garden twine replaces the satin bow).
- S1 drops every reduced-motion item (grandmillennial item 15's last bullet,
  cottagecore item 13's last bullet); critics do not flag it.
- S5: grandmillennial owns counted cross-stitch lettering; cottagecore's hoop
  goes freehand with no alphabet row; grandmillennial keeps bows.

## Grandmillennial: what this stage applies

Defaults from the brief, in its order of leverage: 1 a real single-ink toile;
2 one papered wall per page (text on raised cards, never on pattern);
5 one saturated anchor surface per page in light; 6 a static lacquered dark
room; 7 aged prints (`--c-*` inks only, static grain, outlines, rose
variants); 8 the stationery measure and one axis per block; 9 the Home hero
at tablet and phone; 10 a collected off-axis porcelain wall that survives
phones, and a Kangxi jar; 11 mixed frames (chintz border with a blue band);
12 Contact composition; 13 Services offerings laid like cuttings;
14 Lab band entries as catalogue cards; 15 tactile states; 16 the sampler
border, the alphabet band (D) and the birch redrawn as a botanical study;
17 Cormorant SC small caps; 18 footer tightening.

## Cottagecore: what this stage applies

Defaults from the brief: 1 three hands from Caveat's axis (kicker, margin
note, label); 3 specimens pressed flat, the hero sprigs held by gum strips;
4 the writing on the lines (whole-pixel pitch); 5 the cloth stays a cloth by
lamplight; 6 the tablet layout (footer, cards dealt onto the table);
7 Contact composition and field language; 8 the desktop header with the
phone's care; 9 the repeats hidden (torn edges, tape variants);
10 the signed and dated objects (D1); 11 one printed clipping; 12 the
fireflies flash; 13 tactile states and touch hygiene; 14 cheaper firefly
bookkeeping; 15 hero and About balance; 16 the twine (D3); 17 Fraunces
wetness by role. Protected: the dark-mode fireflies (Stage 1 note), and
specimens never move.

## Open for the founder now

### Grandmillennial

1. **A. A chinoiserie scenic wall.** (1) About: a hand-painted,
   non-repeating birch-and-bird wall behind the oval; (2) a Home frieze;
   (3) none. Recommendation: (1). It is About's papered wall (item 2) and
   gives the birch a home in the school.
2. **B. A buttery lacquer yellow,** once, on the Services process band with
   hunter text. Recommendation: yes, Services only.
3. **C. Trim the bows.** Keep Home's and Sent's; Services gets a tassel or
   pleated rosette; About's oval hangs on a picture wire or plain ribbon.
   S5 says grandmillennial "keeps bows": the trim still keeps them as its
   motif, just not four identical ones. Recommendation: the trim.
4. **E. The duplicate wordmark on Home phones.** Recommendation: (1), a
   compact one-line header wordmark on Home under 760px (the billboard is
   `chrome.name` and the header wordmark is the transition anchor, so both
   stay).
5. **F. How loud the walls go.** Recommendation: toile walls at full ink
   (single ink is calm), chintz walls at about 60%, swatches at full
   strength, proved on Contact first (Tier A) before every page gets one.
6. **G and I** (moving lacquer, the swash pen-in) and **H** (the contract
   questions): the transitions phase, as the brief recommends.

### Cottagecore

7. **D1 wording (copy).** Drafts, studio-voiced, no person's name, one date:
   - Hero sheet label (RHS layout, label hand): "Garden flowers, pressed" /
     "Mississippi Gulf Coast" / "23 Sept. 2026" / "coll. Birch Design Lab".
     If D2 gives Home its own hero species, the first line becomes that
     species' common and Latin names.
   - Postmark ring: "GULF COAST MS" around, "SEP 23 2026" across. Stamp
     value: "3".
   - Sent envelope: the same stamp, with a wavy cancel and the same ring.
   - Hoop signature, freehand (S5: no counted lettering, no alphabet row),
     in a running or chain stitch script: "B.D.L. 9.23.26".
   All `aria-hidden` SVG; the parity guard is checked first and the letters
   drawn as paths if it reads SVG text.
8. **D2. Gulf Coast flora.** (a) keep the English four; (b) add two or three
   Gulf Coast specimens (southern magnolia, *Passiflora incarnata*, wax
   myrtle or Spanish moss) in the Pressed.astro style, one hero species per
   page, the birch kept on About; (c) swap entirely. Recommendation: (b).
9. **D4. Paper in the dark.** Recommendation: (c), keep the brown cards and
   notes and lift only the mounted herbarium sheets (Home hero, About) to a
   lighter board, proved in Tier A beside (a) and (b) on Home dark.
10. **D6. Light-scheme life.** The brief's write-on stays out (the
    transitions phase owns it); the dandelions (below) are the light
    scheme's life. Recommendation: agree.
11. **D7. Where the fireflies (and dandelions) live.** Recommendation: (a),
    over the cloth and under the sheets, documented in `fx.ts`.
12. **D8. One indigo thread.** Recommendation: one indigo-and-white gingham
    tape, no text on it.
13. **The dandelion floaters** (Stage 1 note). Proposal: pappus seeds (a
    hairline stalk, a parachute of radiating filaments, a seed body) in
    ink-brown at low alpha, light scheme only, the fireflies' counterpart in
    the same canvas and lifecycle (30 fps, DPR cap 1.5, hidden-tab pause,
    teardown). About 8 on desktop, 4 on phones; each on its own clock,
    drifting up and across on a slow breeze with a gentle sway and turn, now
    and then a gust; they fade off text blocks like the fireflies and never
    cross body text. Specimens stay still: the seeds are loose, not a plant.
    Proved as a film strip in Tier A.

### Both (S3: more interactable details, even inert ones)

14. Proposals, two per school:
    - Grandmillennial: **a bell-pull tassel** hanging from the awning: tug
      it down and it springs back (inert, `aria-hidden`). **The swatches
      lift** on press like cuttings picked off the table, showing a pinked
      selvedge edge underneath.
    - Cottagecore: **the floaters answer the pointer**: a seed drifts away
      from a passing cursor or tap, and in the dark a tapped firefly
      flashes. **Tape corners lift** on hover and press flat on release.
    Recommendation: the tassel and the floaters this stage (cheap, in each
    school's own material); the swatch lift and the tape corners as stretch
    items if the waves run clean.

## Answers (founder, 10-03-26)

"i think that sounds great": every recommendation above is taken (A = (1),
B yes, C the trim, E (1), F as recommended, G, H and I to the transitions
phase; D1 wording as drafted; D2 (b); D4 (c) proved beside (a) and (b); D6,
D7 and D8 as recommended; the dandelions as proposed; the Tier A proofs,
waves, seats and agent count as below). Item 14 goes further: "we should
always shoot for the stretch targets for the 'more things to interact with'
during this project". The swatch lift and the tape corners are in scope, not
stretch, and every later stage of the Portal treats its interactable stretch
items the same way.

Follow-ups the same day (10-03 to 10-04-26):
- Stage 4's parked interactables (the swiss width dial, the bauhaus
  questionnaire card) are owed under the same rule: "fold them into 6",
  so they are built in Stage 6, the set re-review.
- The bauhaus assembly pick stays **open**: "i still haven't locked in a
  bauhaus pick, let's keep that option open please". The `?bh-assembly=b|c`
  switch stays live, and (a) stays the default until the founder picks.

## Tier A proofs (proposed)

Only the risky items get a proof; everything else goes straight to the
waves. Proof pages under `scripts/themes/proofs/stage5-*`, no school code.

- a1 Grandmillennial toile (item 1): the repeat at swatch and wall scale,
  both schemes, at 100% zoom (line, not blobs; no seam at 1440).
- a2 Grandmillennial walls (item 2, F): the Contact wall at three
  loudnesses, both schemes, 1440, 820 and 390.
- a3 Grandmillennial chinoiserie and birch (A, item 16), if A = (1): the
  About wall with the redrawn birch in the oval.
- a4 Cottagecore hands and wetness (items 1 and 17): three writers, the
  contrast measured for every new ink, both schemes.
- a5 Cottagecore dark paper (D4): (a), (b) and (c) side by side, Home dark.
- a6 Cottagecore dandelions and the firefly flash (item 12, the Stage 1
  note): film strips, light and dark, desktop and phone.

## How it runs (proposed)

- **Tier A:** one `bdl-wave`, six proof tasks. Seats: implementer Sonnet
  `medium`, critic Opus `high`, verifier Sonnet `high`, gate Sonnet `low`,
  verifyHead Haiku; a fix round goes one step up. About 70 agents.
- **Wave B1, grandmillennial,** five tasks: (1) pattern: toile, walls, aged
  prints, the lacquer; (2) anchors and frames: the anchor surfaces and the
  yellow, mixed frames, the footer, the chinoiserie wall, the sampler border
  and alphabet band, the birch; (3) type and layout: measure, small caps,
  Contact, Services offerings, Lab band cards; (4) phones and porcelain: the
  Home hero at tablet and phone, the porcelain wall and the Kangxi jar, E,
  the bow trim; (5) states and the interactables. About 50 agents.
- **Wave B2, cottagecore,** five tasks: (1) hands, wetness, the header, hero
  and About balance; (2) paper and cloth: pressed flat, ruled lines, dark
  cloth, repeats, D4, the indigo tape; (3) layout: tablet, Contact, tactile
  states; (4) objects and flora: D1 objects, the clipping, the twine, D2;
  (5) `fx.ts`: the flash, the bookkeeping, the dandelions, D7, the
  floaters' pointer response. About 50 agents.
- **Gates:** `stage-gates.mjs` once at the end of the pair.
- **Total:** about 170 agents and about 19M subagent tokens (Stage 4: about
  140 agents, about 15M, for five proofs and eight tasks).
