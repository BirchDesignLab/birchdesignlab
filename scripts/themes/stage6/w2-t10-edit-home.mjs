/** One-off edit of Home.astro's lab band (Stage 6 wave 2, task 10): the photograph ends on a drawn full-bleed rule, and on phones the pull sits under it. Kept as the record. */
import { readFileSync, writeFileSync } from 'node:fs';
const p = 'src/themes/swiss/pages/Home.astro';
let s = readFileSync(p, 'utf8');
const rep = (a, b) => { if (!s.includes(a)) throw new Error('missing: ' + a.slice(0, 70)); s = s.replace(a, b); };
rep(`    overflow: hidden;
    pointer-events: none;
    background: var(--white-field);
  }`, `    overflow: hidden;
    pointer-events: none;
    background: var(--white-field);
    /* The photograph ends on a rule, not in the open: a hairline the full width
       of the sheet on its bottom edge, the row the first specimen's own rule
       (the frame's part of it) is drawn on. A mass of bark that reaches the
       foot of the band is then cut on a line the page draws, in both schemes
       and at every width (Stage 6 wave 2, stop 2 answer 3, T6 C3). */
    box-shadow: 0 1px 0 var(--mark-muted);
  }`);
rep(`  .lab-more { grid-column: 1 / -1; }

  @media (min-width: 640px) {`, `  .lab-more { grid-column: 1 / -1; }

  /* Phones: the band is a picture. The photograph has a band of its own, twelve
     lines tall under the kicker (it ran about 230px, the kicker and a two-line
     pull stacked on it, and read as a texture), and the pull sits under it on
     the sheet's own ground, so it needs no label and no clear zone. The band
     ends on the rule above; 360 to 430 are all the same (Stage 6 wave 2, stop
     2 answer 3). */
  @media (max-width: 639.98px) {
    .lab-head { grid-template-rows: calc(var(--u) * 12) auto; align-content: start; }
    .lab-photo { bottom: auto; height: calc(var(--u) * 12.5); }
    .pull { margin-top: 0; }
    .pull .cut { background: none; box-shadow: none; }
  }

  @media (min-width: 640px) {`);
writeFileSync(p, s);
