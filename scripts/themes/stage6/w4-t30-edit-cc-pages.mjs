/**
 * Stage 6 wave 4, task 30: one-off edit of cottagecore Home.astro (the stale CC6 comment, 19/C2; the closer's padding,
 * critique B2). (Sent.astro's gutters, critique B4, were written by hand in the same commit.) Kept for the record;
 * each hunk checks its anchor. The closer hunk ran at 9.6rem and was then put back to 11.6rem by hand (the puff probe
 * failed at 9.6rem), with its comment rewritten; the CC6 comment hunk is as committed.
 *
 *   node scripts/themes/stage6/w4-t30-edit-cc-pages.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';

function edit(file, hunks) {
  let src = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  for (const [name, from, to] of hunks) {
    if (src.split(from).length !== 2) throw new Error(`${file} hunk "${name}": anchor missing or not unique (already applied?)`);
    src = src.replace(from, () => to);
    console.log('ok', file, name);
  }
  writeFileSync(file, src);
}

const CLOSER = process.env.CLOSER || "11.6rem";

edit('src/themes/cottagecore/pages/Home.astro', [
  ['cc6-comment',
`  /* CC6 (founder, stop 1 call 10): from 641 to 820 the stacked hero left an
     empty right half beside the name above a centred sheet. The sheet slides
     right into it, beside the name and the handwritten line, keeping the
     off-centre collage; the one-sentence subline runs the full width under
     both. (The copy block lets its three children join the hero grid.) Phones
     keep the stack. */
  /* Stage 6 w3 task 19`,
`  /* CC6 (founder, stop 1 call 10): from 641 to 820 the stacked hero left an empty right half beside the name above a
     centred sheet, so the sheet slides right into it. It is a float now (task 19, below); phones keep the stack. */
  /* Stage 6 w3 task 19`],
  ['closer-padding',
`       and the closer grows by the room it takes (11.6rem: a released seed is seated clear of the button's
       lettering, so the head stands about 2rem under the button and the seeds have cloth to leave over;
       the sprigs keep their place against the button). */
    .closer { padding-bottom: 11.6rem; }`,
`       and the closer grows by the room it takes (${CLOSER}: a released seed is seated clear of the button's
       lettering, so the head stands about 2rem under the button and the seeds have cloth to leave over;
       the sprigs keep their place against the button; it was 11.6rem until the puffs started small and grew,
       Stage 6 w4 task 30, critique B2). */
    .closer { padding-bottom: ${CLOSER}; }`],
]);
