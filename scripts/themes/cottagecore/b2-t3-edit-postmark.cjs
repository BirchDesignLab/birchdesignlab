/* B2 task 3: postmark out of the heading's way, fern tucked under the postcard. Run once. */
const edit = require('./edit-helper.cjs');
edit('src/themes/cottagecore/pages/Contact.astro', [
[`  .postmark {
    position: absolute; top: 5.4rem; right: 4.4rem;
    width: 7.2rem;`, `  /* In the flow after the heading (never on top of it), raised into the
     stamp's lower-left corner like a real cancel; the room below is left for
     the lettering Task 4 adds. */
  .postmark {
    justify-self: end;
    margin: -1.5rem 2.8rem 0 0;
    width: 7.2rem;`],
[`    padding-right: 5.6rem;
    font-family: var(--font-display);`, `    padding-right: 5.6rem;
    min-height: 5.6rem;
    font-family: var(--font-display);`],
[`  .address { display: grid; gap: 1.1rem; margin-top: 1.8rem; }`, `  .address { display: grid; gap: 1.1rem; margin-top: 1.2rem; }`],
[`  .postcard {
    --tilt: 2deg;`, `  .postcard {
    --tilt: 2deg;
    position: relative; z-index: 1;`],
[`.post-posy :global(.pp-fern) { width: 7.5rem; left: 18%; rotate: -28deg; }`, `.post-posy :global(.pp-fern) { width: 8rem; left: 12%; top: -1.6rem; bottom: auto; rotate: -24deg; }`],
[`    .postmark { right: 3.2rem; top: 5rem; width: 6.2rem; }`, `    .postmark { position: absolute; margin: 0; right: 3.2rem; top: 5rem; width: 6.2rem; }`],
]);
