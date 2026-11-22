/**
 * Stage 6 wave 4, task 30: one-off edit of grandmillennial parts/toys.ts, pages/About.astro and parts/Plate.astro.
 *   A1       the sampler and the seal get a touch beat on the common conditions (bauhaus/parts/beat.ts), touch only
 *   task 22  C3: the sampler band is role="toolbar" with an aria-label
 *   A1       the plates get a cursor and a gated hover (parts/Plate.astro)
 * Kept for the record; each hunk checks its anchor, so it refuses to run twice.
 *
 *   node scripts/themes/stage6/w4-t30-edit-gm-toys.mjs
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

edit('src/themes/grandmillennial/parts/toys.ts', [
  ['imports',
`import { nextThread } from './sampler';
`,
`import { scheduleBeat } from '../../bauhaus/parts/beat';
import { nextThread } from './sampler';

/** A finger (no hover, no fine pointer) gets each toy's one small beat; a mouse has the cursor and the hover. */
const mouseHere = (): boolean => window.matchMedia('(hover: hover) and (pointer: fine)').matches;
`],
  ['sampler-beat',
`  rove(current);
  set.addEventListener('click', onClick);`,
`  /* The touch beat (Stage 6 w4 task 30, critique A1): once a visit, when the band is at least 60% on screen, the page has
     been still 400 ms and no form field has focus (bauhaus/parts/beat.ts), ONE letter, the middle of the top row, is
     re-stitched in the next thread, its crosses drawing in along the letter's path as a tap would. It leaves the roving
     tab stop alone. A press on the band spends it. */
  const beatAbort = new AbortController();
  const stopBeat = mouseHere()
    ? () => {}
    : scheduleBeat(
      'grandmillennial:sampler',
      [set],
      () => {
        const top = letters[0].offsetTop;
        const row = letters.filter((b) => Math.abs(b.offsetTop - top) < 2);
        restitch(row[Math.floor(row.length / 2)]);
      },
      beatAbort.signal,
      () => letters.every((b) => !b.classList.contains('go')),
    );

  rove(current);
  set.addEventListener('click', onClick);`],
  ['sampler-teardown',
`  return () => {
    set.removeEventListener('click', onClick);
    set.removeEventListener('keydown', onKey);`,
`  return () => {
    stopBeat();
    beatAbort.abort();
    set.removeEventListener('click', onClick);
    set.removeEventListener('keydown', onKey);`],
  ['seal-beat',
`  set(false);
  env.addEventListener('click', onClick);
  return () => {
    env.removeEventListener('click', onClick);
    set(false);
  };`,
`  /* The touch beat (Stage 6 w4 task 30, critique A1): the wax seal alone, once a visit, on the common conditions
     (bauhaus/parts/beat.ts): it presses in a hair and comes back past rest, as a thumb would test it. It never opens the
     envelope. A press on the seal spends it. */
  const beatAbort = new AbortController();
  const art = seal.querySelector<SVGElement>('.seal');
  let beatAnim: Animation | null = null;
  const stopBeat = mouseHere() || !art
    ? () => {}
    : scheduleBeat(
      'grandmillennial:seal',
      [seal],
      () => {
        beatAnim = art.animate(
          [{ scale: '1' }, { scale: '0.9', offset: 0.3 }, { scale: '1.08', offset: 0.66 }, { scale: '1' }],
          { duration: 520, easing: 'ease-in-out' },
        );
      },
      beatAbort.signal,
      () => env.dataset.open !== 'true',
    );

  set(false);
  env.addEventListener('click', onClick);
  return () => {
    stopBeat();
    beatAbort.abort();
    beatAnim?.cancel();
    env.removeEventListener('click', onClick);
    set(false);
  };`],
]);

edit('src/themes/grandmillennial/pages/About.astro', [
  ['toolbar',
`     <div class="abc-in" role="group" data-sampler>`,
`     <div class="abc-in" role="toolbar" aria-label="Alphabet sampler, arrow keys move between letters" data-sampler>`],
]);

edit('src/themes/grandmillennial/parts/Plate.astro', [
  ['plate-hover',
`  .gm-plate use { pointer-events: visiblePainted; }`,
`  .gm-plate use { pointer-events: visiblePainted; }
  /* Stage 6 w4 task 30 (critique A1): every toy answers a mouse. A plate is inert (aria-hidden) but it swings when brushed
     or clicked, so it takes the press cursor on the painted disc and, under a fine pointer, lifts its shadow a little as
     it is touched. Gated: a finger has no hover. */
  .gm-plate { transition: filter 160ms ease-out; }
  @media (hover: hover) and (pointer: fine) {
    .gm-plate use { cursor: pointer; }
    .gm-plate:hover { filter: drop-shadow(0 7px 8px rgb(0 0 0 / 0.3)); }
  }`],
]);
