/** One-off edit of About.astro (Stage 6 wave 2, task 10): the trunk's band ends on a rule below 1024 (T6 C4); the photograph's `sizes` follows the rendered widths (T6 C8); each line of the stacked title is set flush by its own first letter (T4 C5). Kept as the record. */
import { readFileSync, writeFileSync } from 'node:fs';
const p = 'src/themes/swiss/pages/About.astro';
let s = readFileSync(p, 'utf8');
const rep = (a, b, all = false) => { if (!s.includes(a)) throw new Error('missing: ' + a.slice(0, 70)); s = all ? s.split(a).join(b) : s.replace(a, b); };

// C8: the rendered widths. Below 640 --fld-w is min(125vw, 900px), from 640 to 1023 min(100vw, 820px); from 1024 the image runs the
// field's height (min-height clamp(640px, 54vw, 1000px)) at 1800 by 1250, so it is 1.44 times that wide: clamp(922px, 77.8vw, 1440px).
rep('sizes="(min-width: 1024px) 1100px, 125vw"', 'sizes="(min-width: 1024px) clamp(922px, 77.8vw, 1440px), (min-width: 640px) min(100vw, 820px), min(125vw, 900px)"', true);

// T4 C5: every line of the title.
rep(`  /* Phones: the title is cut condensed to fill the measure (cqw is the hero
     row's own width, the frame). */
  @media (max-width: 639.98px) {
    .title { font-size: calc(36.3cqw); --sw-s: 85; }
  }`, `  /* The stack is set flush line by line: each line steps by the difference
     between its own first letter's bearing and the T's the title's margin is
     measured for (T 0.018em; measured from pixels, ink minus the column, at
     1440, 1280, 1024 and 820: "The" 0.0068em right, "shining" 0.0211em right,
     "tree" 0.0022em left; w2-t10-flush.mjs). The lines are the words, so the
     rule holds for any copy of three words; Services' title wraps by measure
     and is not corrected line by line (see Services.astro). */
  .title .ln:nth-child(1) { margin-inline-start: -0.0068em; }
  .title .ln:nth-child(2) { margin-inline-start: -0.0211em; }
  .title .ln:nth-child(3) { margin-inline-start: 0.0022em; }
  /* Phones: the title is cut condensed to fill the measure (cqw is the hero
     row's own width, the frame), and the bearings are the condensed cut's. */
  @media (max-width: 639.98px) {
    .title { font-size: calc(36.3cqw); --sw-s: 85; }
    .title .ln:nth-child(1) { margin-inline-start: -0.0025em; }
    .title .ln:nth-child(2) { margin-inline-start: -0.0128em; }
    .title .ln:nth-child(3) { margin-inline-start: 0.0025em; }
  }`);

// T6 C4: the band's foot is a rule.
rep(`  .manifesto > :not(.field-img) { position: relative; z-index: 1; }`, `  .manifesto > :not(.field-img) { position: relative; z-index: 1; }
  /* Below 1024 the trunk is a band across the head of the field and its foot
     cuts the white trunk straight. The cut is made deliberate: a black
     hairline the width of the field on the image's last row (Swiss: a hard
     crop on a rule, Stage 6 wave 2, T6 C4). From 1024 the trunk stands on the
     right and runs off the sheet's edge, so there is no foot. */
  @media (max-width: 1023.98px) {
    .manifesto::after {
      content: '';
      position: absolute;
      z-index: 1;
      left: 0;
      right: 0;
      top: calc(var(--fld-w) * var(--fld-ratio) - 1px);
      height: 1px;
      background: var(--black);
      pointer-events: none;
    }
  }`);
writeFileSync(p, s);
