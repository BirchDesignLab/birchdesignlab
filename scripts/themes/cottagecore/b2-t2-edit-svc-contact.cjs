/* Stage 5 B2 task 2: Services.astro and Contact.astro (tape and tear variants, textarea on the lines). */
const edit = require('./edit-helper.cjs');
edit('src/themes/cottagecore/pages/Services.astro', [
[`<span class:list={['cc-tape', { 'cc-tape--rose': i % 2 === 1 }]} aria-hidden="true"></span>`,
 `<span class:list={['cc-tape', i % 2 === 1 ? 'cc-tape--rose cc-tape--ragged' : 'cc-tape--cut']} aria-hidden="true"></span>`],
[`<span class="cc-tape cc-tape--butter method-tape" aria-hidden="true">`, `<span class="cc-tape cc-tape--butter cc-tape--half method-tape" aria-hidden="true">`],
[`  .recipe .cc-tape { top: -0.85rem; left: calc(50% - 3.75rem); --tape-tilt: -4deg; }`,
 `  .recipe .cc-tape { top: -0.85rem; left: calc(50% - var(--tape-w) / 2); --tape-tilt: -4deg; --tape-w: 7.5rem; }
  .recipe:nth-child(2) .cc-tape { --tape-tilt: 3deg; --tape-w: 6.5rem; }`],
[`  .method-sheet {
    background: var(--note);`, `  .method-sheet {
    --torn-x: -45px;
    background: var(--note);`],
[`  .method-tape { top: -0.9rem; left: calc(50% - 3.75rem); --tape-tilt: 2deg; }`,
 `  .method-tape { top: -0.9rem; left: calc(50% - var(--tape-w) / 2); --tape-tilt: 2deg; --tape-w: 8rem; }`],
]);
edit('src/themes/cottagecore/pages/Contact.astro', [
[`<span class="cc-tape cc-tape--rose pc-tape" aria-hidden="true">`, `<span class="cc-tape cc-tape--rose cc-tape--half pc-tape" aria-hidden="true">`],
[`  .field textarea {
    --lh: 1.9rem;
    line-height: var(--lh);
    padding: 0.2rem 0.6rem 0.4rem;
    min-height: calc(var(--lh) * 6 + 0.6rem);
    resize: vertical;
    border: 2px dashed var(--field-line);
    border-radius: 4px;
    background-image: linear-gradient(to top, var(--rule) 1px, transparent 1px);
    background-size: 100% var(--lh);
    background-position: 0 0.2rem;
    background-attachment: local;
  }`,
`  /* Writing on the lines (brief item 4): a 30px pitch, the first line 4px
     below the top edge and no padding under the last, so every line of text
     sits on its rule (1px at --rule-y, about 0.2em under the baseline; the
     rules scroll with the text). The rules are the textarea's own background,
     so they tilt with the stationery. */
  .field textarea {
    --lh: 30px;
    --rule-y: 24px;
    --pad-top: 4px;
    line-height: var(--lh);
    padding: var(--pad-top) 0.6rem 0;
    min-height: calc(var(--lh) * 6 + var(--pad-top));
    resize: vertical;
    border: 2px dashed var(--field-line);
    border-radius: 4px;
    background-image: linear-gradient(to top, var(--rule) 1px, transparent 1px);
    background-size: 100% var(--lh);
    background-position: 0 calc(var(--pad-top) + var(--rule-y) + 1px - var(--lh));
    background-attachment: local;
  }`],
]);
console.log('ok');
