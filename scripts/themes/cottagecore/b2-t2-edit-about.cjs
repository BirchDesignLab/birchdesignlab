/* Stage 5 B2 task 2: About.astro (board class, ruled letter on whole pixels, tape and tear variants). */
const edit = require('./edit-helper.cjs');
edit('src/themes/cottagecore/pages/About.astro', [
[`  <div class="sheet cc-paper">`, `  <div class="sheet cc-paper cc-board">`],
[`<span class="cc-tape cc-tape--rose letter-tape" aria-hidden="true">`, `<span class="cc-tape cc-tape--rose cc-tape--cut letter-tape" aria-hidden="true">`],
[`  /* Lined writing paper with a double margin rule; every line of text sits
     on a ruled line because the heading and paragraphs share one rhythm. */
  .letter {
    --lh: 1.9rem;
    background-color: var(--paper);
    background-image:
      linear-gradient(90deg, transparent 3.1rem, var(--margin-line) 3.1rem 3.2rem, transparent 3.2rem 3.45rem, var(--margin-line) 3.45rem 3.55rem, transparent 3.55rem),
      linear-gradient(to top, var(--rule) 1px, transparent 1px);
    background-size: 100% 100%, 100% var(--lh);
    background-position: 0 0, 0 calc(var(--lh) * 0.72);`,
`  /* Lined writing paper with a double margin rule; every line of text sits
     on a ruled line because the heading and paragraphs share one rhythm.
     Whole pixels (brief item 4): a 30px pitch, every margin and padding a
     whole number of lines, and the rule 1px at --rule-y, about 0.2em under
     the baseline (theme.css, .cc-ruled). The lamp over the paper by night is
     the --paper-lamp token, so no scheme-gated rule has to out-rank this one. */
  .letter {
    --lh: 30px;
    --rule-y: 24px;
    --torn-x: -520px;
    background-color: var(--paper);
    background-image:
      linear-gradient(90deg, transparent 3.1rem, var(--margin-line) 3.1rem 3.2rem, transparent 3.2rem 3.45rem, var(--margin-line) 3.45rem 3.55rem, transparent 3.55rem),
      linear-gradient(to top, var(--rule) 1px, transparent 1px),
      var(--paper-lamp);
    background-size: 100% 100%, 100% var(--lh), 100% 100%;
    background-position: 0 0, 0 calc(var(--rule-y) + 1px - var(--lh)), 0 0;`],
[`  [data-theme='cottagecore'][data-scheme='dark'] .letter {
    background-image:
      linear-gradient(90deg, transparent 3.1rem, var(--margin-line) 3.1rem 3.2rem, transparent 3.2rem 3.45rem, var(--margin-line) 3.45rem 3.55rem, transparent 3.55rem),
      linear-gradient(to top, var(--rule) 1px, transparent 1px),
      linear-gradient(165deg, rgba(255, 200, 120, 0.14), transparent 60%);
    background-size: 100% 100%, 100% var(--lh), 100% 100%;
    background-position: 0 0, 0 calc(var(--lh) * 0.72), 0 0;
  }
`, ``],
[`  .letter-tape { top: calc(clamp(1rem, 3vw, 2rem) - 0.9rem); left: calc(50% - 3.75rem); --tape-tilt: 3deg; }`,
 `  .letter-tape { top: calc(clamp(1rem, 3vw, 2rem) - 0.9rem); left: calc(50% - var(--tape-w) / 2); --tape-tilt: 3deg; --tape-w: 6.5rem; }`],
[`    .letter { --lh: 1.8rem; font-size: 1rem; }`, `    .letter { font-size: 1rem; }`],
]);
console.log('about ok');
