/**
 * Stage 6 wave 4, task 30: one-off edit of grandmillennial Contact.astro (critique B5). The flap's gold diagonals also
 * paint on the inside face (.lid::after), so the opened flap's edges read on the dark wall; and at 860 and below (the
 * one-column desk, where the flap folds up into the 40px gap behind the form) it opens to rotateX(-105deg) instead of
 * -160deg, so it stands ajar about 36px inside the gap and the whole hinge shows. z-index 0 stays: the form is never
 * covered. Kept for the record; each hunk checks its anchor.
 *
 *   node scripts/themes/stage6/w4-t30-edit-gm-contact.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';

const file = 'src/themes/grandmillennial/pages/Contact.astro';
let src = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
function swap(name, from, to) {
  if (src.split(from).length !== 2) throw new Error(`hunk "${name}": anchor missing or not unique (already applied?)`);
  src = src.replace(from, () => to);
  console.log('ok', name);
}

swap('diagonals-var',
`  .envelope { --ease: cubic-bezier(0.3, 0.6, 0.25, 1); --flap-h: 7.5rem; --seal-size: 4.6rem; }
  .flap {
    position: relative;
    height: var(--flap-h);
    background:
      linear-gradient(to bottom left, transparent calc(50% - 2px), color-mix(in srgb, var(--rule), transparent 40%) calc(50% - 2px) 50%, transparent 50%) left / 50% 100% no-repeat,
      linear-gradient(to bottom right, transparent calc(50% - 2px), color-mix(in srgb, var(--rule), transparent 40%) calc(50% - 2px) 50%, transparent 50%) right / 50% 100% no-repeat;`,
`  /* --diagonals is the flap's two gold edges (the two slopes of the V): painted on the flap and, since Stage 6 w4 task 30
     (critique B5), on the inside face of the lid too, so the opened flap's edges read against the wall. */
  .envelope {
    --ease: cubic-bezier(0.3, 0.6, 0.25, 1); --flap-h: 7.5rem; --seal-size: 4.6rem;
    --diagonals:
      linear-gradient(to bottom left, transparent calc(50% - 2px), color-mix(in srgb, var(--rule), transparent 40%) calc(50% - 2px) 50%, transparent 50%) left / 50% 100% no-repeat,
      linear-gradient(to bottom right, transparent calc(50% - 2px), color-mix(in srgb, var(--rule), transparent 40%) calc(50% - 2px) 50%, transparent 50%) right / 50% 100% no-repeat;
  }
  .flap {
    position: relative;
    height: var(--flap-h);
    background: var(--diagonals);`);
swap('lid-after',
`  .lid::after { background: var(--flap-in); transform: rotateY(180deg); }`,
`  .lid::after { background: var(--diagonals), var(--flap-in); transform: rotateY(180deg); }`);
swap('ajar',
`    .envelope { width: min(100%, 28rem); justify-self: center; rotate: 1.4deg; z-index: 0; }
  }`,
`    .envelope { width: min(100%, 28rem); justify-self: center; rotate: 1.4deg; z-index: 0; }
    /* Open, the flap stands ajar (105 degrees, not 160): about 36px of it inside the 40px gap above the envelope, so the
       whole hinge shows and it still never reaches the form (Stage 6 w4 task 30, critique B5). */
    .envelope[data-open='true'] .lid { transform: perspective(900px) rotateX(-105deg); }
  }`);

writeFileSync(file, src);
