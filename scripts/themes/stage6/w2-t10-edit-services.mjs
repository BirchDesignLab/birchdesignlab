/** One-off edit of Services.astro (Stage 6 wave 2, task 10): the flat-topped 1 is lifted to the cap line and the numerals' offset retuned (T6 C5); phone rows are whole lines (T6 C6); a record of why the title is not corrected line by line (T4 C5). Kept as the record. */
import { readFileSync, writeFileSync } from 'node:fs';
const p = 'src/themes/swiss/pages/Services.astro';
let s = readFileSync(p, 'utf8');
const rep = (a, b) => { if (!s.includes(a)) throw new Error('missing: ' + a.slice(0, 70)); s = s.replace(a, b); };

rep(`       title's cap line: 4.5px is where the title's ink starts in its line,
       0.369em is where this face's digit ink starts, measured from pixels,
       below the middle of a line box. */
    --sw-l: round(up, 0.72em, var(--u));
    line-height: var(--sw-l);
    translate: 0 calc(4.5px - var(--sw-l) / 2 + 0.369em);`, `       title's cap line: 3.8px is where the title's ink starts in its line
       (the round digits 2 and 3 land on the cap line, a pixel or less low,
       where a face overshoots), 0.369em is where this face's digit ink
       starts, measured from pixels, below the middle of a line box. The 1 has
       a flat top: it sits 0.0108em lower than the round digits (measured at
       1440, 1280, 1024 and 820: 2.7, 2.3, 2.0, 2.6px lower), so --sw-flat
       lifts it (Stage 6 wave 2, T6 C5). */
    --sw-l: round(up, 0.72em, var(--u));
    line-height: var(--sw-l);
    translate: 0 calc(3.8px - var(--sw-l) / 2 + 0.369em - var(--sw-flat, 0em));`);
rep(`  .step:nth-child(1) .num { margin-inline-start: -0.1em; }`, `  .step:nth-child(1) .num { margin-inline-start: -0.1em; --sw-flat: 0.0108em; }`);
rep(`      translate: 0 calc(0.5px - var(--sw-l) / 2 + 0.369em);
      grid-column: 1 / 3;`, `      translate: 0 calc(4.2px - var(--sw-l) / 2 + 0.369em - var(--sw-flat, 0em));
      grid-column: 1 / 3;`);
rep(`    .step-body { grid-column: 1 / -1; grid-row: 2; max-width: none; margin-top: calc(var(--u) * 0.5); }
  }`, `    /* A whole line between the numeral and the text, so every row is a whole
       number of lines (it was half a line: 10.5, 11.5, 10.5, 9.5, and the
       rules fell between baselines; Stage 6 wave 2, T6 C6). */
    .step-body { grid-column: 1 / -1; grid-row: 2; max-width: none; margin-top: var(--u); }
  }`);
rep(`  .subline { max-width: 26em; }`, `  /* The title is not set flush line by line (Stage 6 wave 2, T4 C5). It wraps
     by measure ("Two things," over "done properly." from 640, a word a line
     on a phone), so the first letter of a line is the copy's, not the
     markup's, and a per-line step would hard-code today's breaks (the brief
     leaves copy-dependent breaks to the copy pass). The cost, measured from
     pixels: at most 2.1px at 1440 to 820 and 3.7px on "properly." at 390,
     against the 0 to 0.3px of the first line. */
  .subline { max-width: 26em; }`);
writeFileSync(p, s);
