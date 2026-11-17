/* Stage 5 wave B2 task 1: lift the cc-hands proof (scripts/themes/proofs/
   stage5-cc-hands/proof.css) into the school, widened (Tier A call 6), plus
   the desktop header, hero and About balance. Run once from the repo root. */
const edit = require('./edit-helper.cjs');
const R = 'src/themes/cottagecore/';

/* ---- theme.css: tokens ---- */
edit(R + 'theme.css', [
  [`  --glow: rgba(255, 214, 150, 0);
`, `  --glow: rgba(255, 214, 150, 0);

  /* three hands (Caveat Variable): weight, ink and tilt per role. Sizes ride
     the pages' own steps, except the note and label, set below. */
  --hand-kicker-wght: 700;
  --hand-kicker-ink: var(--accent); /* rose-deep */
  --hand-kicker-tilt: -1.5deg;
  --hand-note-wght: 400;
  --hand-note-ink: #74502f; /* sepia, the ink-brown family */
  --hand-note-tilt: 1deg;
  --hand-label-wght: 450;
  --hand-label-ink: var(--link); /* sage-dark */
  --hand-label-tilt: 0deg;
`],
  [`  --glow: rgba(240, 165, 80, 0.26);
`, `  --glow: rgba(240, 165, 80, 0.26);
  --hand-kicker-ink: var(--accent); /* amber */
  --hand-note-ink: #dcbd96; /* tan, lamplit sepia */
  --hand-label-ink: var(--link); /* sage-light */
`],
  /* ---- type voices ---- */
  [`/* Handwriting: kickers, notes in the margin. */
[data-theme='cottagecore'] .cc-hand {
  font-family: var(--font-hand);
  font-weight: 600;
  font-size: clamp(1.6rem, 2.4vw, 2rem);
  line-height: 1.05;
  color: var(--accent);
  letter-spacing: 0;
}`, `/* Handwriting: three hands, three writers. The kicker is the loud one,
   written first (heavy, rose or amber, tilted back); the margin note was
   added later in another pen (light, loose, sepia, tilted forward); the
   label is the neat one, filled in on forms and numbered cards (upright,
   sage). The widths between them are wide on purpose, so they read apart on
   a whole page and not only in a crop. */
[data-theme='cottagecore'] .cc-hand {
  font-family: var(--font-hand);
  font-weight: var(--hand-kicker-wght);
  font-size: clamp(1.6rem, 2.4vw, 2rem);
  line-height: 1.05;
  color: var(--hand-kicker-ink);
  letter-spacing: 0;
}
/* Specificity: the pages' scoped rules are (0,3,1) on some labels, so the
   voice rules lead with html and :root to sit one step above them. */
html[data-theme='cottagecore']:root :is(.cc-hand, .lead, .letter h2) {
  font-weight: var(--hand-kicker-wght);
  color: var(--hand-kicker-ink);
  rotate: var(--hand-kicker-tilt);
  transform-origin: left center;
}
html[data-theme='cottagecore']:root :is(.cc-note-link, .f-loc) {
  font-weight: var(--hand-note-wght);
  font-size: 2rem;
  letter-spacing: 0.02em;
  color: var(--hand-note-ink);
  rotate: var(--hand-note-tilt);
  transform-origin: left center;
}
html[data-theme='cottagecore']:root .f-loc { font-size: 1.7rem; }
html[data-theme='cottagecore']:root :is(.field label, .no, .num),
html[data-theme='cottagecore']:root .lab .cc-hand {
  font-weight: var(--hand-label-wght);
  color: var(--hand-label-ink);
  rotate: var(--hand-label-tilt);
}
html[data-theme='cottagecore']:root .field label { font-size: 1.4rem; }
/* "From the lab" heads a butter note like a neat card label, so Home shows
   three writers: kicker (What we build), label (From the lab), note (How we
   build). */
html[data-theme='cottagecore']:root .lab .cc-hand { font-size: 1.55rem; }
/* The numerals keep the weight the proof records (specificity repeated to
   beat the label group's :is()). */
html[data-theme='cottagecore']:root :is(.no, .num):is(.no, .num):is(.no, .num) { font-weight: 500; }
/* The phone nav keeps its hand and stitched seam and takes the note voice. */
@media (max-width: 640px) {
  html[data-theme='cottagecore'] .cc-chrome nav a {
    font-weight: var(--hand-note-wght);
    font-size: 1.65rem;
    letter-spacing: 0.02em;
    color: var(--hand-note-ink);
  }
}
@media (max-width: 640px) and (hover: hover) {
  html[data-theme='cottagecore'] .cc-chrome nav a:hover { color: var(--accent); }
}

/* Fraunces wetness by role (SOFT 0 dry to 100 wet; never animate wght):
   the wettest is the billboard, every page title and the wordmark; sheet
   titles sit clearly in the middle; card titles are crisp with no wonk; the
   italic pull quotes are Sharp, drier than the billboard. */
html[data-theme='cottagecore'] :is(h1, .wm-name, .f-name) { font-variation-settings: 'SOFT' 100, 'WONK' 1; }
html[data-theme='cottagecore'] h2 { font-variation-settings: 'SOFT' 50, 'WONK' 1; }
html[data-theme='cottagecore'] :is(h3, .recipe h2) { font-variation-settings: 'SOFT' 0, 'WONK' 0; }
html[data-theme='cottagecore'] :is(.pull, .closer-lead, .invite, .manifesto) { font-variation-settings: 'SOFT' 0, 'WONK' 1; }`],
  /* the hand link's base: weight 600 -> note token, ink stays link at rest */
  [`  font-family: var(--font-hand);
  font-weight: 600;
  font-size: 1.75rem;
  line-height: 1.1;
  color: var(--link);
  text-decoration: none;
}`, `  font-family: var(--font-hand);
  font-weight: var(--hand-note-wght);
  font-size: 2rem;
  line-height: 1.1;
  color: var(--hand-note-ink);
  text-decoration: none;
}`],
]);

/* ---- meta.ts: contrast pairs ---- */
edit(R + 'meta.ts', [[`    { fg: '--field-line', bg: ['--paper'], min: 3, note: 'the write-on line under a form field' },
`, `    { fg: '--field-line', bg: ['--paper'], min: 3, note: 'the write-on line under a form field' },
    { fg: '--hand-kicker-ink', bg: ['--paper'], min: 4.5, note: 'kickers on a card' },
    { fg: '--hand-kicker-ink', bg: ['--note'], min: 4.5, note: 'kickers on a butter note' },
    { fg: '--hand-kicker-ink', bg: ['--glow', '--field'], min: 4.5, note: 'kickers on the table' },
    { fg: '--hand-note-ink', bg: ['--paper'], min: 4.5, note: 'margin notes and the phone nav on a card' },
    { fg: '--hand-note-ink', bg: ['--note'], min: 4.5, note: 'margin notes on a butter note' },
    { fg: '--hand-note-ink', bg: ['--glow', '--field'], min: 4.5, note: 'margin notes, footer place and phone nav on the table' },
    { fg: '--hand-label-ink', bg: ['--paper'], min: 4.5, note: 'form labels and numerals on a card' },
    { fg: '--hand-label-ink', bg: ['--note'], min: 4.5, note: 'numerals and labels on a butter note' },
    { fg: '--hand-label-ink', bg: ['--glow', '--field'], min: 4.5, note: 'labels and numerals on the table' },
`]]);
