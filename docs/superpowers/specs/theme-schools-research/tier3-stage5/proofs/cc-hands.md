# Proof a4: cottagecore, three hands and three wetnesses

Stage 5 Tier A. Brief: `../briefs/a4-cc-hands.md` (items 1 and 17). Nothing under
`src/` changed. Images are scratch under
`scripts/themes/.out/stage5-proofs/cc-hands/` (not committed; `index.md` there
lists every file). GPU Chromium, renderer ANGLE / NVIDIA RTX 3070 (D3D11), saved
as `renderer.txt`. Fireflies and the switcher are hidden in every frame, so
before and after differ only by the proof CSS.

## The question

Do three hand roles drawn from Caveat Variable's 400 to 700 axis read as three
different writers on Home, Services and Contact, and do three Fraunces SOFT/WONK
settings read as three wetnesses, in both schemes, with every new ink passing
contrast?

## Answer

- **Hands: yes, mostly through ink and weight, less through the kicker.** The
  margin note (sepia, 450, a touch larger, +1deg) and the label (sage, 400,
  upright) are plainly different writers from the kicker. The kicker itself
  barely moves: it was already rose or amber at 600, and 650 with the
  standardised -1.5deg is a small step. Its size is not touched: every page
  keeps its own kicker size (round 1 dropped a size override that had shrunk
  Home's by 28%). On Home all three writers now show: "What we build" (kicker),
  "From the lab" (label) and "How we build" (note). See `sheet-hands.jpg`, which
  draws every crop at one scale (1 CSS px = 1 sheet px).
- **Wetness: the billboard is wetter than everything below it, but h2 against h3
  is subtle.** Billboard, wordmark and every h1 were already SOFT 100, so the top
  step is unchanged by design. SOFT 50 on h2 and SOFT 0 with WONK 0 on h3 are
  visible at 2x crops (the h3 is crisper, the h2 is between) and quiet at page
  scale. See `sheet-wetness.jpg`. Going further would need a wider spread than
  the brief's numbers.
- **Pull quotes: Sharp (SOFT 0, WONK 1).** Next to the billboard, SuperSoft italic
  reads as a second headline; Sharp reads as a drier, literary voice under it
  and gives the third wetness step. The difference is small at page scale
  (`sheet-pull-quotes.jpg`, five placements); the pick is a taste call for the
  founder.
- **Contrast:** every new ink clears 4.5:1 on `--paper`, `--note` and `--field`
  (and the lamp glow over `--field` in dark), both schemes. The lowest is
  light label ink on `--field` at 5.20 and dark label ink on the glow at 5.22.

## What was made

All in `scripts/themes/proofs/stage5-cc-hands/` and
`scripts/themes/harness/stage5-cc-hands-proof.mjs`:

- `proof.css`: the tokens and rules, every one under
  `html[data-theme='cottagecore']`, written to lift into
  `src/themes/cottagecore/theme.css`.
- `pick-inks.mjs`: how the two new inks were chosen (contrast of candidates).
- the harness: injects the CSS into the frozen build (`stage5-base`, reused),
  captures Home, Services, Contact and About at 1440, 820 and 390 (2x) in both
  schemes before and after, 2x role crops, the mobile nav, and the pull-quote
  comparison, and measures contrast from the live computed colours.

### The three hands

| role | weight | ink light | ink dark | size | tilt | applied to |
|---|---|---|---|---|---|---|
| kicker | 650 | `--accent` #9b4652 | `--accent` #eab86a | unchanged: each page's own (Home 2.2-2.9rem, Services 1.9-2.4rem, Contact 1.9-2.3rem, About letter 2.6rem) | -1.5deg | `.cc-hand` (Home "What we build", Services and Contact kickers), Home `.lead`, About `.letter h2` |
| margin note | 450 | #74502f (new) | #dcbd96 (new) | 1.85rem (footer place 1.55rem) | +1deg | `.cc-note-link` ("How we build", "Visit the lab", back link), `.f-loc`, the mobile nav links (1.6rem, no tilt) |
| label | 400 (numerals 500) | `--link` #4e6a45 | `--link` #a9c294 | 1.5rem (Contact form labels 24px; "From the lab" 1.7rem) | 0 | `.field label`, `.no` (Home, Services), `.num` (method rings), Home `.lab .cc-hand` ("From the lab") |

Judgement calls the brief left open, for the founder:

- "From the lab" takes the label hand (400, sage, upright, 1.7rem), not the
  kicker: it heads a butter note like a neat card label, and it is what makes
  Home read as three writers rather than two. Round 1 moved it from kicker to
  label for that reason; flip it back by deleting `.lab .cc-hand` from the label
  selector. At 390 it is 27.2px against the note's 29.6px, quieter by design.
- Numerals are 500, not 400: at 400 a 24px numeral inside the dashed ring looked
  thin. Form labels are the full 400.
- The note hand makes "How we build" and "Visit the lab" sepia, not link sage.
  The arrow and the hover wavy underline remain the link signal. The mobile nav
  links go sepia too, with accent on hover as before.
- Left alone: the wordmark's "Design Lab" hand (protected), the Contact email
  `.mail` hand (a link, kept link-coloured), and the About specimen label, which
  is Lora text, not a hand. The brief names "specimen labels" but no specimen
  label is Caveat today, so none were changed; the label hand has no specimen
  label to land on until Tier B draws the D1 sheet labels.

### Wetness by role

| role | SOFT | WONK | selectors |
|---|---|---|---|
| wettest | 100 | 1 | `h1` (billboard "Birch", "Sent.", page titles), `.wm-name`, `.f-name` |
| sheet title | 50 | 1 | `h2` |
| card title | 0 | 0 | `h3` |
| italic pull quotes | 0 | 1 | `.pull`, `.closer-lead`, `.invite`, `.manifesto` |

Page h1s other than the billboard (Services, Contact, About) stay SOFT 100; the
brief did not name them. The two `data-pull` rules at the end of `proof.css`
exist only for the comparison sheet.

### Specificity (round 1)

Contact's `.field[data-astro-cid] label[data-astro-cid]` and About's
`.letter[data-astro-cid] h2[data-astro-cid]` are (0,3,1), which beat the first
draft's (0,2,2): form labels and the About letter heading kept w600 in rose or
amber. The kicker, label and numeral rules now lead with `html[..]:root`
(0,3,2). Computed after, light and dark, 1440 and 390: Contact labels w400, 24px,
sage (`--link`), 0deg; About `.letter h2` w650, -1.5deg, size unchanged. Kicker
sizes are identical before and after on every page (Home 46.4/35.2px, Services
38.4/30.4px, Contact 36.8/30.4px at 1440/390), so at 390 every kicker is above the
29.6px note. The full table is `measures.json` `computed`, keyed
scheme/size/page/state. Tier B: once the pages' scoped rules for these elements
are deleted, `:root` and `html` can go.

## Contrast, ready to paste

Numbers are in `contrast-table.md` beside the images; the lowest per ink:

| ink | light low | dark low |
|---|---|---|
| kicker | 5.32 (`--field`) | 5.58 (glow over `--field`) |
| note | 6.15 (`--field`) | 5.67 (glow over `--field`) |
| label | 5.20 (`--field`) | 5.22 (glow over `--field`) |

`meta.contrast` entries (Tier B adds the three tokens to the token blocks first):

```ts
{ fg: '--hand-kicker-ink', bg: ['--paper'], min: 4.5, note: 'kickers on a card' },
{ fg: '--hand-kicker-ink', bg: ['--note'], min: 4.5, note: 'kickers on a butter note' },
{ fg: '--hand-kicker-ink', bg: ['--glow', '--field'], min: 4.5, note: 'kickers on the table' },
{ fg: '--hand-note-ink', bg: ['--paper'], min: 4.5, note: 'margin notes and the mobile nav on a card' },
{ fg: '--hand-note-ink', bg: ['--note'], min: 4.5, note: 'margin notes and the mobile nav on a butter note' },
{ fg: '--hand-note-ink', bg: ['--glow', '--field'], min: 4.5, note: 'margin notes and the mobile nav on the table' },
{ fg: '--hand-label-ink', bg: ['--paper'], min: 4.5, note: 'form labels and numerals on a card' },
{ fg: '--hand-label-ink', bg: ['--note'], min: 4.5, note: 'form labels and numerals on a butter note' },
{ fg: '--hand-label-ink', bg: ['--glow', '--field'], min: 4.5, note: 'form labels and numerals on the table' },
```

## What the images show

Founder sheets (read first), all under the scratch folder above:

- `sheet-hands.jpg`: kicker, lead, "From the lab", "How we build", footer place,
  No. 1, form label, method numeral; before above after, light and dark.
- `sheet-wetness.jpg`: billboard, h2, h3, before above after.
- `sheet-pull-quotes.jpg`: SuperSoft against Sharp, beside the billboard.
- `sheet-nav-390.jpg`: the mobile nav in the note voice.
- `sheet-<home|services|contact|about>-1440.jpg` and `-820-390.jpg`: whole pages,
  before and after, light and dark.

## What Tier B lifts

1. Tokens: the `--hand-*` block into the light token block and the
   `--hand-note-ink` dark override into the dark block of
   `src/themes/cottagecore/theme.css`.
2. Rules: the kicker, note and label rule groups into "type voices". Where the
   pages' scoped styles set `font-family: var(--font-hand)`, weight, size or
   colour on these same elements (Home `.lead`, `.no`; Services `.no`, `.num`;
   Contact `.field label`; Footer `.f-loc`; About `.letter h2`; Header mobile
   nav), delete the duplicates so the roles live in one place.
3. Fraunces: replace the blanket `'SOFT' 100, 'WONK' 1` on h1 to h3 with the
   per-role table; drop it from `.pull`, `.closer-lead`, `.invite`,
   `.manifesto` in favour of the Sharp rule.
4. `meta.ts` contrast entries above.
5. Drop the two `data-pull` comparison rules.
