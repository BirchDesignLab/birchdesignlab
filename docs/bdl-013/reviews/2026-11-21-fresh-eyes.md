# BDL-013 fresh-eyes review, 11-21-26

Two reviewers against the built page at b7a1db1, neither told the
controller's own concerns:
- First impression (Sonnet medium): a LinkedIn visitor, no source code.
- Adversarial design and copy judge (Opus high): truth, copy, design,
  confidentiality. Verdict: **ship with fixes**, one blocker.

Screenshots (gitignored): `scripts/themes/.out/bdl013/review-first/`,
`scripts/themes/.out/bdl013/review-judge/`.

House-rule sweep (judge): no emdash, no forbidden words, no time figures, no
identity leak. Confidentiality clean.

## A. Truth fixes (controller verified A1 and A3 against the repo)

1. **Blocker.** Plate opens "We build every client site on our own framework".
   False: BDL-005 Cheer and Chatter is a real client on Astro/React/Sanity,
   not bdlBase. Fix: "bdlBase is the web framework we built to make
   small-business sites."
2. "builds the whole website" (title block, plate) overclaims: the sheet's
   own revision table says words, look and settings stay the business's.
   Fix the sentence under the poster line; plate says the words and photos
   stay the business's own. Poster line "One page of facts. A whole website."
   can stay.
3. Languages slab: "Add a language and it goes live only once reviewed" is
   unqualified, but linked BDL-008 is live with demo-grade unreviewed
   Vietnamese (its own writeup says so). Fix: "On a real site, a new
   language goes live only once reviewed."
4. Plate: "a test searches the whole repo" → searches the salon's code,
   tests and config for the ordering folder and finds nothing.
5. Plate: "the switch above the sheet" → "at the top of the sheet".

## B. Clarity (both reviewers)

1. OG card says "Follow the arrows, then open the three details" (nothing to
   open on an image): show only the first sentence in `?og=1`. og:image:alt
   should describe the image, not repeat the title.
2. Detail 2 has four names (What ordering needs / needs and brings / is made
   of / Ordering parts list). Pick "What ordering is made of", sub "A parts
   list". Long Next label wraps on phone.
3. Callout 6 Checks comes from a lone `}` on desktop; show "{ … } the whole
   file" there too (phone already does).
4. Plain-mode jargon on Detail 3: promote the small lines to headings ("What
   the build refuses", "Every site must pass", "How a finished site takes a
   fix"), keep datasheet terms for Hood; Lighthouse as "95 / 100" in Plain.
5. "causes" (stiff) → "makes" everywhere; "Follow the arrows" three times on
   sheet 1.
6. Plate retells the bubbles; judge's rewrite below is shorter and adds what
   stays the business's own.

## C. Layout

1. Phone first screen has no drawing: title block + controls fill it. Shrink
   the title block on phone (drop Subject/Source rows or move them under the
   drawing) so row 1 and its arrow sit above the fold.
2. Tour dead-ends after Detail 3 (first impression): add a way on, e.g. "See
   a site built this way" (BDL-008) or back to the Lab.
3. "Switch one off" note slab is hatched inside the layer stack and reads as
   a layer: restyle as an unhatched note off the `},`.

## D. Founder taste calls (not applied without a ruling)

1. Title: keep "The Drawing Set" or judge's "bdlBase, Drawn".
2. Card: add a plain pitch or studio name (first impression); judge was fine
   with the poster line.
3. Night: stage is navy while wall label and plate strip stay site-dark,
   a visible seam (both reviewers).
4. Hood shows bypass flag names (`allowPlaceholderDemoConfig`, `isDemo`):
   low risk, founder call.
5. Grey bubble subs and Lighthouse note a step darker for legibility at 86%.
6. "Sheet 1 of 1" beside a four-step strip reads odd to non-drafters.

## Judge's proposed plate body

bdlBase is the web framework we built to make small-business sites. A business
is described once, in a single file, and bdlBase generates the site from it: the
pages, the features that are switched on, the languages, the rule for tracking
consent, and the checks the site must pass before it can go live. The words and
photos stay the business's own, and an upgrade never touches them.

The sheet is drawn the way an engineer draws a machine, with an arrow from each
line of the file to the part of the site it makes. The example is Harbor Table,
a demo restaurant we keep as a test fixture, so the file is an excerpt and
nothing on it belongs to a real business. Detail 1 is the claim we like best:
when a feature is off, its files are never written. Our salon demo, Magnolia &
Mane, has no ordering folder at all, and a test searches the salon's code,
tests and config for one and finds nothing.

Every number on the sheet comes from bdlBase's own source: the nine ordering
routes, the nine jobs a deploy waits on, the Lighthouse floors of 95 and 100.
Under the hood swaps the plain labels for real file and field names, for anyone
who wants to check our work.

## Judge's proposed summary

bdlBase, the web framework we built, drawn as an engineering sheet: one file
describes a business, and an arrow runs from each line to the part of the
website it builds.

## Applied 11-21-26 (founder: "apply A-C")

All of A, B and C, inline by the controller. Choices made on the way:
- Plate: the judge's rewrite, with "test fixture" softened to "a demo
  restaurant we keep for testing" (first-impression reviewer called it jargon)
  and Magnolia & Mane linked to BDL-008.
- Title-block call to action split into its own span: shown on sheet 1, hidden
  on the share card and on phones (the Try it cue sits right below there).
- Lighthouse in Plain: the gate reads "Lighthouse scores, out of 100", cells
  read 95 / 95 / 95 / 100 ("95 / 100" wrapped and pushed the payments note
  into the title block).
- Detail 2 is "What ordering is made of" everywhere; bubble titles balance
  their wrap; the phone Next button reads "Next" (no long label to wrap).
- After Detail 3 the filled button is "See a site built this way" (BDL-008).
- og:image:alt now describes the card (`ogAltFor` in `src/lib/og/manifest.ts`).
- Phone first screen: Subject/Source rows and the call to action dropped,
  title block tightened; row 1, its arrow and the Facts layer are above the
  fold at 390x844.
D (taste calls) untouched.

## D ruled 11-21-26 (founder: "sounds good")

Kept: title "The Drawing Set", the share card as is, Hood flag names,
"Sheet 1 of 1". Applied: the Lab pill, wall label and specimen plate wear
the stage's face (stage.ts stamps `html[data-ds-face]`, never `data-scheme`;
Experiment.astro maps the site tokens to the sheet's), and the muted grey is
one step stronger in both faces (#4a4337 Day, #b4cce2 Night).
