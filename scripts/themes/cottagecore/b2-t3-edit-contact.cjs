/* B2 task 3: Contact. Run once. */
const edit = require('./edit-helper.cjs');
const f = 'src/themes/cottagecore/pages/Contact.astro';
edit(f, [
[`{copy.trust.map((part, i) => <>{i > 0 && <> <span class="sep" aria-hidden="true">&#10047;</span> </>}{part}</>)}`,
 `{copy.trust.map((part, i) => <>{i > 0 && <> <span class="sep" aria-hidden="true">&#10047;</span> </>}<span class="tp">{part}</span></>)}`],
[`    align-items: start;
    padding-block: clamp(2rem, 5vw, 4rem) 0;
  }`, `    align-items: start;
    padding-block: clamp(2rem, 5vw, 4rem) 0;
  }
  /* Both columns end together: the postcard column stretches to the
     stationery and the loose posy fills what the postcard leaves. */
  .stationery { align-self: start; }`],
[`  .field { display: grid; gap: 0.15rem; }`, `  .field { display: grid; gap: 0.25rem; }`],
[`  /* Lines to write on: a dashed line under each field, in --field-line
     (not the decorative --stitch) so the boundary clears 3:1. */
  .field input {
    border-bottom: 2px dashed var(--field-line);
    padding: 0.45rem 0.25rem;
  }`, `  /* Lines to write on: each input is one ruled line, the same pitch and rule
     as the textarea below it, so the form reads as one sheet of ruled
     stationery. Focus draws a --field-line outline (3:1 on paper). */
  .field input {
    box-sizing: border-box;
    height: 26px;
    line-height: 25px;
    padding: 0 0.25rem;
    border-bottom: 1px solid var(--rule);
  }`],
[`    resize: vertical;
    border: 2px dashed var(--field-line);
    border-radius: 4px;
    background-image`, `    resize: vertical;
    background-image`],
[`  .field input:focus-visible, .field textarea:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 3px;
    border-color: var(--accent);
    border-style: solid;
    background-color`, `  .field input:focus-visible, .field textarea:focus-visible {
    outline: 2px solid var(--field-line);
    outline-offset: 3px;
    border-radius: 2px;
    background-color`],
[`  .post { padding-top: clamp(0rem, 6vw, 5rem); }`, `  .post { padding-top: clamp(0rem, 6vw, 5rem); align-self: stretch; display: flex; flex-direction: column; }`],
[`  .post-posy { position: relative; height: 16rem; margin-top: 2rem; }`, `  .post-posy { position: relative; flex: 1 1 auto; min-height: 9rem; margin-top: -1.2rem; }`],
]);
