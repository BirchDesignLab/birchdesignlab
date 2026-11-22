/**
 * Stage 6 wave 3, task 23: the edits that put the dandelion clock and the date stamp on cottagecore's Home (the
 * closer), Contact and Sent, mount them from the header and note them in meta. The files are CRLF; each is read as
 * LF, every replacement must match exactly once, and each is written back CRLF.
 * This is the first pass; the sizes, the Home closer breakpoint rules and the second pass (w3-t23-edit-fx2.mjs)
 * were tuned by hand afterwards, so running it now would not reproduce the committed files: it is the record of
 * what was changed and why.
 *   node scripts/themes/stage6/w3-t23-edit-pages.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';

const root = new URL('../../../src/themes/cottagecore/', import.meta.url);

function edit(rel, steps) {
  const url = new URL(rel, root);
  let src = readFileSync(url, 'utf8').replace(/\r\n/g, '\n');
  for (const [from, to] of steps) {
    const n = src.split(from).length - 1;
    if (n !== 1) throw new Error(`${rel}: expected one match, found ${n}: ${from.slice(0, 80)}`);
    src = src.replace(from, () => to);
  }
  writeFileSync(url, src.replace(/\n/g, '\r\n'));
  console.log('edited', rel);
}

/* ---------- header: mount the toys beside the floaters ---------- */
edit('Header.astro', [[
`  import { mountFireflies, mountTapes } from './fx';

  mountFireflies();
  mountTapes();`,
`  import { mountFireflies, mountTapes } from './fx';
  import { mountToys } from './toys';

  mountFireflies();
  mountTapes();
  mountToys();`]]);

/* ---------- Home: the clock beside the lavender in the closer ---------- */
edit('pages/Home.astro', [
[`import Arrow from '../assets/Arrow.astro';`,
 `import Arrow from '../assets/Arrow.astro';
import Dandelion from '../assets/Dandelion.astro';`],
[`  <Pressed kind="rose" seed={52} class="c-right" />
  <p class="closer-lead">`,
 `  <Pressed kind="rose" seed={52} class="c-right" />
  <Dandelion class="c-clock" />
  <p class="closer-lead">`],
[`  .closer :global(.c-right) { right: max(0px, calc(50% - 25rem)); rotate: 20deg; }
`,
 `  .closer :global(.c-right) { right: max(0px, calc(50% - 25rem)); rotate: 20deg; }
  /* The dandelion clock (Stage 6 w3 task 23): standing on the cloth beside the lavender, in the gutter
     the lavender leaves, clear of the headline. Pressed, it blows seeds into the seed canvas (toys.ts). */
  .closer :global(.c-clock) { position: absolute; bottom: -1rem; width: 6.4rem; left: max(0px, calc(50% - 25rem - 7.4rem)); rotate: -4deg; }
`],
[`    .closer :global(.c-left) { left: 0; }
    .closer :global(.c-right) { right: 0; }
  }`,
 `    .closer :global(.c-left) { left: 0; }
    .closer :global(.c-right) { right: 0; }
    /* Beside the lavender still, in the cloth left of the button. */
    .closer :global(.c-clock) { width: 5rem; left: 6.5rem; bottom: 0; }
  }`],
[`  @media (max-width: 640px) {
    /* SOFT 0 sets the line narrower than the soft cut did, so it fits one`,
 `  @media (max-width: 640px) {
    /* A phone has no cloth beside the button: the clock stands under it, and the closer grows by the
       room it takes (the sprigs keep their place against the button). */
    .closer { padding-bottom: 6rem; }
    .closer :global(.c-left), .closer :global(.c-right) { bottom: 10.2rem; }
    .closer :global(.c-clock) { left: calc(50% - 2.5rem); bottom: 0.6rem; }
    /* SOFT 0 sets the line narrower than the soft cut did, so it fits one`],
]);

/* ---------- Contact: the date stamp on the cloth, the cancel marks over the postcard's stamp ---------- */
edit('pages/Contact.astro', [
[`import Postmark from '../assets/Postmark.astro';`,
 `import Postmark from '../assets/Postmark.astro';
import CancelMark from '../assets/CancelMark.astro';
import DateStamp from '../assets/DateStamp.astro';`],
[`      <Postmark class="postmark" arcId="pm-arc-contact" />
`,
 `      <Postmark class="postmark" arcId="pm-arc-contact" />
      <div class="cancel-pad" id="cc-pad-contact" data-jx="0.9" data-jy="1.8" aria-hidden="true">
        {[1, 2, 3, 4, 5, 6].map((n) => <CancelMark arcId={\`cm-arc-c\${n}\`} />)}
      </div>
`],
[`    <div class="post-posy" aria-hidden="true">
      <Pressed kind="myrtle" seed={103} class="pp-myrtle" />`,
 `    <div class="post-posy" aria-hidden="true">
      <DateStamp class="pp-stamp" pad="#cc-pad-contact" />
      <Pressed kind="myrtle" seed={103} class="pp-myrtle" />`],
[`  .post-posy :global(.pp-rose) { position: absolute; width: 7.4rem; left: 1rem; bottom: 0.7rem; rotate: 12deg; }
`,
 `  .post-posy :global(.pp-rose) { position: absolute; width: 7.4rem; left: 1rem; bottom: 0.7rem; rotate: 12deg; }
  /* The date stamp (Stage 6 w3 task 23) stands on the cloth beside the postcard; a press lays a fresh
     cancel mark over the postcard's postage stamp (toys.ts). */
  .post-posy :global(.pp-stamp) { position: absolute; right: 16%; top: 1.4rem; }
  /* The cancel marks' layer: the postage stamp's own box (same cell, same margins), so a mark is laid
     where the stamp is and rises at most 0.7rem past it into the empty cloth of the card. Nothing in the
     layer takes a press and none can reach the invite, the address or the fine print. */
  .cancel-pad {
    grid-column: 2; grid-row: 1; align-self: end;
    position: relative; z-index: 2;
    width: 5.6rem; height: 6.6rem;
    margin: -0.6rem -0.4rem 0 0.6rem;
    rotate: 4deg;
    pointer-events: none;
    --cm: 4.3rem;
  }
`],
[`    .post-posy :global(.pp-myrtle) { width: 5.4rem; left: auto; right: 14%; top: -3.2rem; rotate: 160deg; }
`,
 `    .post-posy :global(.pp-myrtle) { width: 5.4rem; left: auto; right: 14%; top: -3.2rem; rotate: 160deg; }
    .post-posy :global(.pp-stamp) { right: auto; left: 12%; top: 0.3rem; }
`],
[`    .postcard :global(.stamp) { grid-column: auto; grid-row: auto; position: absolute; top: 1.2rem; right: 1.2rem; margin: 0; }
`,
 `    .postcard :global(.stamp) { grid-column: auto; grid-row: auto; position: absolute; top: 1.2rem; right: 1.2rem; margin: 0; }
    .cancel-pad { grid-column: auto; grid-row: auto; position: absolute; top: 1.2rem; right: 1.2rem; margin: 0; }
`],
]);

/* ---------- Sent: the clock and the stamp under the envelope, one cancel over its postage stamp ---------- */
edit('pages/Sent.astro', [
[`import Arrow from '../assets/Arrow.astro';`,
 `import Arrow from '../assets/Arrow.astro';
import CancelMark from '../assets/CancelMark.astro';
import Dandelion from '../assets/Dandelion.astro';
import DateStamp from '../assets/DateStamp.astro';`],
[`<section class="sent cc-wrap">
  <div class="envelope cc-lamp" aria-hidden="true">`,
 `<section class="sent cc-wrap">
  <div class="env-col">
  <div class="envelope cc-lamp" aria-hidden="true">`],
[`    <Postmark class="env-postmark" arcId="pm-arc-sent" />
  </div>
`,
 `    <Postmark class="env-postmark" arcId="pm-arc-sent" />
    <div class="cancel-pad" id="cc-pad-sent" data-jx="0.5" data-jy="0.7" aria-hidden="true">
      <CancelMark arcId="cm-arc-s1" />
    </div>
  </div>
  <div class="toys" aria-hidden="true">
    <Dandelion class="sent-clock" />
    <DateStamp class="sent-stamp" pad="#cc-pad-sent" />
  </div>
  </div>
`],
[`  .envelope { position: relative; width: min(100%, 24rem); aspect-ratio: 300 / 260; justify-self: center; rotate: -4deg; --lamp-inset: -25%; }`,
 `  .env-col { display: grid; justify-items: center; justify-self: center; width: 100%; }
  .envelope { position: relative; width: min(100%, 24rem); aspect-ratio: 300 / 260; justify-self: center; rotate: -4deg; --lamp-inset: -25%; }
  /* Under the envelope, on the cloth (Stage 6 w3 task 23): the dandelion clock at the left and the date stamp
     at the right, below the postage stamp it cancels. A press on either is the toy's (toys.ts). */
  .toys { width: min(100%, 24rem); display: flex; justify-content: space-between; align-items: flex-end; margin-top: 2.4rem; padding-inline: 1.2rem; }
  .toys :global(.sent-clock) { width: 5.4rem; rotate: -3deg; }
  .toys :global(.sent-stamp) { rotate: 4deg; }
  /* The cancel marks' layer: the envelope's postage stamp's own box, so one cancel is laid over it. */
  .cancel-pad { position: absolute; right: 3%; top: 59%; width: 19%; aspect-ratio: 5.6 / 6.6; rotate: 5deg; pointer-events: none; --cm: 108%; }`],
[`    .envelope { width: min(76%, 18rem); margin-top: 3.5rem; }`,
 `    .envelope { width: min(76%, 18rem); margin-top: 3.5rem; }
    .toys { width: min(76%, 18rem); padding-inline: 0.6rem; }`],
]);

/* ---------- meta: the new drawings ---------- */
edit('meta.ts', [[
`an envelope with twine, a perforated stamp (value 3) and a lettered postmark;`,
`an envelope with twine, a perforated stamp (value 3) and a lettered postmark; a dried dandelion clock and a wooden-handled date stamp that lays fresh cancel marks (the postmark's ring and date), both inert toys;`]]);
