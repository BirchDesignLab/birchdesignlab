/**
 * Stage 6 wave 4, task 30: one-off edit of cottagecore theme.css and meta.ts (critique B3): the needle's rose thread in
 * light is the school's rose-deep over dark's edge, so a new stitch reads apart from the hoop's dashed ring; a meta.ts
 * contrast row holds --thread-rose on --hoop-cloth at 3:1. Kept for the record; each hunk checks its anchor.
 *
 *   node scripts/themes/stage6/w4-t30-edit-cc-css.mjs
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

edit('src/themes/cottagecore/theme.css', [
  ['thread-rose',
`  /* The needle's two threads on the hoop's linen (needle.ts): the sprig's own rose and sage, a lighter
     top thread over a darker edge, as the lazy daisies and stems are drawn. The edge is what
     reads against the linen, so it is the one meta.contrast holds. */
  --thread-rose: var(--cc-rose-petal);
  --thread-rose-edge: var(--cc-rose-edge);`,
`  /* The needle's two threads on the hoop's linen (needle.ts): a lighter top thread over a darker edge, as the lazy
     daisies and stems are drawn. The sage is the sprig's own. The rose is NOT the sprig's pale petal in light (Stage 6
     w4 task 30, critique B3): that one was 1.04:1 against the hoop's own dashed ring (--stitch-rose at 0.75, about
     #b3727a), so a new stitch read as part of the ring. It is the school's rose-deep over dark's edge colour, 5.74:1
     on the linen and 1.65:1 apart from the ring; meta.contrast holds the edge and the top thread against the linen. */
  --thread-rose: var(--cc-rose-deep);
  --thread-rose-edge: #7a3440;`],
]);

edit('src/themes/cottagecore/meta.ts', [
  ['contrast-row',
`    { fg: '--thread-rose-edge', bg: ['--hoop-cloth'], min: 3, note: 'the edge of a rose needle stitch on the hoop linen' },`,
`    { fg: '--thread-rose-edge', bg: ['--hoop-cloth'], min: 3, note: 'the edge of a rose needle stitch on the hoop linen' },
    { fg: '--thread-rose', bg: ['--hoop-cloth'], min: 3, note: 'the top thread of a rose needle stitch on the hoop linen (Stage 6 w4 task 30: it must read apart from the hoop ring)' },`],
]);
