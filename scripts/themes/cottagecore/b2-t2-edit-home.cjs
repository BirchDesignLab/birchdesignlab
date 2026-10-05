/* Stage 5 B2 task 2: Home.astro markup and styles. */
const edit = require('./edit-helper.cjs');
const strip = (left, top, rot) =>
  `      <svg class="pressed gum" viewBox="0 0 34 12" aria-hidden="true" focusable="false" style="left: ${left}%; top: ${top}%; rotate: ${rot}deg"><path class="gum-strip" d="M1.2 .6L33 0L32.6 11.4L0 12Z" /></svg>\n`;
edit('src/themes/cottagecore/pages/Home.astro', [
[`    <div class="sheet cc-paper">
      <span class="cc-tape t1"></span>
      <span class="cc-tape cc-tape--rose t2"></span>
      <Pressed kind="fern" seed={3} class="p-fern" />
      <Pressed kind="lavender" seed={5} class="p-lav" />
      <Pressed kind="rose" seed={9} class="p-rose" />
      <Pressed kind="daisy" seed={4} class="p-daisy" />
`,
`    <div class="sheet cc-paper cc-board">
      <span class="cc-tape t1"></span>
      <span class="cc-tape cc-tape--indigo cc-tape--cut t2"></span>
      <Pressed kind="fern" seed={3} class="p-fern" />
      <Pressed kind="lavender" seed={5} class="p-lav" />
      <Pressed kind="rose" seed={9} class="p-rose" />
      <Pressed kind="daisy" seed={4} class="p-daisy" />
${strip(30.7, 59.1, -19.1)}${strip(20.4, 30.5, -14.1)}${strip(75.5, 52.9, 194)}${strip(72.1, 63.2, 195)}${strip(39.4, 64.8, 177.4)}${strip(41.5, 76, 167.6)}`],
[`        <span class:list={['cc-tape', { 'cc-tape--butter': i % 2 === 1 }]} aria-hidden="true"></span>`,
 `        <span class:list={['cc-tape', i % 2 === 1 ? 'cc-tape--butter cc-tape--pinked' : 'cc-tape--half']} aria-hidden="true"></span>`],
[`  .t1 { top: -0.8rem; left: 16%; --tape-tilt: -9deg; }
  .t2 { bottom: -0.7rem; right: 12%; --tape-tilt: 7deg; }
  .sheet :global(.pressed) { position: absolute; }`,
`  .t1 { top: -0.8rem; left: 16%; --tape-tilt: -9deg; --tape-w: 8.5rem; }
  .t2 { bottom: -0.7rem; right: 12%; --tape-tilt: 7deg; --tape-w: 6.25rem; }
  .sheet :global(.pressed) { position: absolute; }
  /* The gum strips that hold the hero sprigs: a gummed parallelogram laid
     across each stem (the About twig's drawing), placed on bare stem and
     never over a bloom (the a5 hit test, 1440 / 820 / 390). Positions are
     percent of the sheet, so they hold at every size. */
  .sheet :global(.gum) { width: 9.5%; height: auto; translate: -50% -50%; pointer-events: none; }`],
[`  .card .cc-tape { top: -0.85rem; left: calc(50% - 3.75rem); --tape-tilt: -3deg; }
  .card:nth-child(2) .cc-tape { --tape-tilt: 4deg; }`,
`  .card .cc-tape { top: -0.85rem; left: calc(50% - var(--tape-w) / 2); --tape-tilt: -3deg; --tape-w: 7rem; }
  .card:nth-child(2) .cc-tape { --tape-tilt: 4deg; --tape-w: 8.25rem; }`],
[`  .note {
    background: var(--note);`,
`  .note {
    --torn-x: -310px;
    background: var(--note);`],
[`  .lab-tape { top: -0.9rem; left: calc(50% - 3.75rem); --tape-tilt: -2deg; }`,
 `  .lab-tape { top: -0.9rem; left: calc(50% - var(--tape-w) / 2); --tape-tilt: -2deg; --tape-w: 9rem; }`],
[`<span class="cc-tape cc-tape--butter lab-tape" aria-hidden="true">`, `<span class="cc-tape cc-tape--butter cc-tape--ragged lab-tape" aria-hidden="true">`],
]);
console.log('home ok');
