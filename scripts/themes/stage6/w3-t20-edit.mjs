/**
 * Stage 6 w3 task 20: the source edits, as one re-runnable script (the files
 * are CRLF on this machine, so multi-line hunks go through here). Idempotent:
 * a hunk whose result is already in the file is skipped.
 *   node scripts/themes/stage6/w3-t20-edit.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
function edit(rel, hunks) {
  const p = join(ROOT, rel);
  const raw = readFileSync(p, 'utf8');
  const crlf = raw.includes('\r\n');
  let t = raw.replace(/\r\n/g, '\n');
  for (const [from, to] of hunks) {
    if (t.includes(to)) continue;
    if (!t.includes(from)) throw new Error(`${rel}: hunk not found: ${from.slice(0, 60)}`);
    t = t.replace(from, to);
  }
  writeFileSync(p, crlf ? t.replace(/\n/g, '\r\n') : t);
  console.log('edited', rel);
}

edit('src/themes/bauhaus/pages/Home.astro', [
  [
    `  .seesaw { grid-column: 9 / span 4; width: 100%; height: auto; }`,
    `  /* A real button (parts/toys.ts initSeesaw); the svg inside is the picture. */
  .seesaw { grid-column: 9 / span 4; width: 100%; }
  .seesaw svg { width: 100%; height: auto; }`,
  ],
  [
    `  import { initLoose } from '../parts/loose';

  // The hero's circle, square and triangle can be picked up (parts/loose.ts).
  onMount(() => initLoose(document.querySelector<SVGSVGElement>('svg.poster')));`,
    `  import { initLoose } from '../parts/loose';
  import { initNumerals, initSeesaw } from '../parts/toys';

  // The hero's circle, square and triangle can be picked up (parts/loose.ts).
  onMount(() => initLoose(document.querySelector<SVGSVGElement>('svg.poster')));
  // The see-saw tips and the door numerals rebuild on a tap (parts/toys.ts).
  onMount(() => initSeesaw(document.querySelector<HTMLElement>('button.seesaw')));
  onMount(() => initNumerals());`,
  ],
]);

edit('src/themes/bauhaus/pages/Services.astro', [
  [
    `    .mini.ring { border-width: 6px; }
  }
</style>
`,
    `    .mini.ring { border-width: 6px; }
  }
</style>

<script>
  import { onMount } from '../../../lib/lifecycle';
  import { initNumerals } from '../parts/toys';

  // The constructed numerals rebuild on a tap (parts/toys.ts).
  onMount(() => initNumerals());
</script>
`,
  ],
]);

edit('src/themes/bauhaus/pages/About.astro', [
  [
    `  <svg class="letter-b" viewBox="0 0 320 420" aria-hidden="true" focusable="false">
    <rect class="asm" x="20" y="10" width="84" height="400" fill="var(--mark)" style="--from: scaleY(0); --d: 0ms; --beat: 0; --sub: 0ms" />
    <path class="asm" d="M104 10 A96 96 0 0 1 104 202 Z" fill="var(--red)" style="--from: translateX(-40%) rotate(-180deg); --d: 220ms; --beat: 1; --sub: 0ms" />
    <path class="asm" d="M104 202 A104 104 0 0 1 104 410 Z" fill="var(--blue)" style="--from: translateX(-40%) rotate(180deg); --d: 360ms; --beat: 1; --sub: 70ms" />
    <polygon class="asm" points="272,10 314,94 230,94" fill="var(--yellow)" style="--from: scale(0); --d: 560ms; --beat: 2; --sub: 0ms" />
  </svg>`,
    `  <button class="letter-b toy" type="button" aria-label="Letter B, take apart">
    <svg viewBox="0 0 320 420" aria-hidden="true" focusable="false">
      <rect class="asm" x="20" y="10" width="84" height="400" fill="var(--mark)" style="--from: scaleY(0); --d: 0ms; --beat: 0; --sub: 0ms" />
      <path class="asm" d="M104 10 A96 96 0 0 1 104 202 Z" fill="var(--red)" style="--from: translateX(-40%) rotate(-180deg); --d: 220ms; --beat: 1; --sub: 0ms" />
      <path class="asm" d="M104 202 A104 104 0 0 1 104 410 Z" fill="var(--blue)" style="--from: translateX(-40%) rotate(180deg); --d: 360ms; --beat: 1; --sub: 70ms" />
      <polygon class="asm" points="272,10 314,94 230,94" fill="var(--yellow)" style="--from: scale(0); --d: 560ms; --beat: 2; --sub: 0ms" />
    </svg>
  </button>`,
  ],
  [
    `  .letter-b { grid-column: 9 / span 4; grid-row: 1; width: 100%; max-width: 320px; height: auto; justify-self: end; }`,
    `  /* A real button (parts/toys.ts initLetterB); the svg inside is the picture. */
  .letter-b { grid-column: 9 / span 4; grid-row: 1; width: 100%; max-width: 320px; justify-self: end; }
  .letter-b svg { width: 100%; height: auto; }
  /* While the pieces are out they leave the svg's box; at rest nothing does,
     so the arrival's flight in stays clipped as it always was. */
  .letter-b svg:global(.is-apart) { overflow: visible; }`,
  ],
  [
    `  import { initQuestionnaire } from '../parts/questionnaire';
`,
    `  import { initQuestionnaire } from '../parts/questionnaire';
  import { initLetterB } from '../parts/toys';
`,
  ],
  [
    `  onMount(() => initQuestionnaire(document.querySelector<HTMLElement>('[data-quiz]')));`,
    `  onMount(() => initQuestionnaire(document.querySelector<HTMLElement>('[data-quiz]')));
  // The B comes apart and rebuilds on a tap (parts/toys.ts).
  onMount(() => initLetterB(document.querySelector<HTMLElement>('button.letter-b')));`,
  ],
]);

edit('src/themes/bauhaus/Footer.astro', [
  [
    `    <rect class="asm" x="30" y="0" width="110" height="110" fill="var(--red)" style="--from: rotate(-90deg) scale(0); --d: 0ms" />`,
    `    <rect class="asm" data-spin x="30" y="0" width="110" height="110" fill="var(--red)" style="--from: rotate(-90deg) scale(0); --d: 0ms" />`,
  ],
  [
    `  @media (max-width: 760px) {
    .ident, nav { grid-column: 1 / -1; }
    .corner { width: 120px; }
    nav { flex-direction: row; flex-wrap: wrap; gap: 0.25rem 1.25rem; }
  }
</style>
`,
    `  @media (max-width: 760px) {
    .ident, nav { grid-column: 1 / -1; }
    .corner { width: 120px; }
    nav { flex-direction: row; flex-wrap: wrap; gap: 0.25rem 1.25rem; }
  }
</style>

<script>
  import { onMount } from '../../lib/lifecycle';
  import { initCornerSpin } from './parts/toys';

  // A tap on the red corner square turns it 90 degrees (parts/toys.ts). Inert.
  onMount(() => initCornerSpin(document.querySelector<HTMLElement>('footer.site-footer')));
</script>
`,
  ],
]);

edit('src/themes/bauhaus/theme.css', [
  [
    `@media (prefers-reduced-motion: reduce) {
  [data-theme='bauhaus'] .asm { animation: none; }`,
    `/* The toys below the fold (Stage 6 w3 task 20, parts/toys.ts). The pivots
   are set here and not only under the assembly's no-preference gate, so a
   toy turns about its own centre however the page was reached. */
[data-theme='bauhaus'] .beam { transform-box: view-box; transform-origin: 200px 178px; }
[data-theme='bauhaus'] [data-spin] { transform-box: fill-box; transform-origin: center; }
/* The see-saw and the letter B are real buttons around their drawings. */
[data-theme='bauhaus'] .toy {
  display: block;
  appearance: none;
  margin: 0;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}
[data-theme='bauhaus'] .toy > svg { transition: translate 120ms var(--ease-snap); }
/* A real hover pointer lifts the whole drawing 4px up and left over a hard 4px
   block of ink, its own silhouette, as the hero shapes do. The block shows at
   once; only the drawing travels. */
@media (hover: hover) and (pointer: fine) {
  [data-theme='bauhaus'] .toy:hover > svg {
    translate: -4px -4px;
    filter: drop-shadow(4px 4px 0 var(--mark));
  }
}
@media (prefers-reduced-motion: reduce) {
  [data-theme='bauhaus'] .asm { animation: none; }`,
  ],
]);
