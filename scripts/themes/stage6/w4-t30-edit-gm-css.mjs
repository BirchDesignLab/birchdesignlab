/**
 * Stage 6 wave 4, task 30: one-off edit of grandmillennial theme.css and meta.ts.
 *   critique B5  dark --flap-in #0b1c14 is 1.02:1 on the wall: #2a4a39 (1.76:1), with a contrast pair
 *   task 22 C4   the light gold thread is the school's own --gold-deep (4.79:1 on --field-raised), not #a07c2a
 * Kept for the record; each hunk checks its anchor.
 *
 *   node scripts/themes/stage6/w4-t30-edit-gm-css.mjs
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

edit('src/themes/grandmillennial/theme.css', [
  ['gold-thread',
`     round again). Each is a graphic on --field-raised at 3:1 or better (meta.contrast): the hunter is the school's
     own, the gold the deepest end of its gold (a lighter one fails on cream). */
  --thread-hunter: #1f4a33;
  --thread-gold: #a07c2a;`,
`     round again). Each is a graphic on --field-raised at 3:1 or better (meta.contrast): the hunter is the school's
     own, the gold its --gold-deep token (4.79:1 on --field-raised; the lighter --gold fails on cream). */
  --thread-hunter: #1f4a33;
  --thread-gold: var(--gold-deep);`],
  ['flap-in-dark',
`  --flap-in: #0b1c14;`,
`  /* Lifted from #0b1c14, which was 1.02:1 on the wall and vanished when the flap opened (Stage 6 w4 task 30,
     critique B5): 1.76:1 on --wall-ground, so the opened flap is seen against it. meta.contrast holds the pair. */
  --flap-in: #2a4a39;`],
]);
