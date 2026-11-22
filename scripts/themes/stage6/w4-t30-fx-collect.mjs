/**
 * Stage 6 wave 4, task 30: one-off edit of cottagecore/fx.ts collectTextRects (the 19/C3 header band and the 23/C2
 * cancel marks). Kept for the record. Run from the repo root; each hunk checks its anchor, so it refuses to run twice.
 *
 *   node scripts/themes/stage6/w4-t30-fx-collect.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = 'src/themes/cottagecore/fx.ts';
let src = readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n');
function swap(name, from, to) {
  if (src.split(from).length !== 2) throw new Error(`hunk "${name}": anchor missing or not unique (already applied?)`);
  src = src.replace(from, () => to);
  console.log('ok', name);
}

swap('cancel-marks',
`          // The date stamp's cancel marks (task 23) are laid and faded by a press, so they are not lines of text
          // to keep seeds off (they sit over a postage stamp or a postcard that already is one).
          acceptNode: (n) => (n.nodeValue && n.nodeValue.trim() && !SKIP_TAGS.has(n.parentElement?.tagName ?? '') && !n.parentElement?.closest('.cancel-pad') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),`,
`          // The date stamp's cancel marks (task 23) are laid and faded by a press: a mark at opacity 0 is not a
          // line of text (the layer holds six, five of them blank on Contact), a mark that shows is. A press
          // re-measures (the cc:stamp event, below), so a mark laid or faded since the last sweep is counted right.
          acceptNode: (n) => {
            if (!n.nodeValue || !n.nodeValue.trim() || SKIP_TAGS.has(n.parentElement?.tagName ?? '')) return NodeFilter.FILTER_REJECT;
            const mark = n.parentElement?.closest('.cancel-pad .cm');
            if (mark && Number.parseFloat(getComputedStyle(mark).opacity) < 0.05) return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
          },`);
swap('header-band',
`      textBoxes = text;
      coverBoxes = cover;`,
`      const head = document.querySelector('header');
      headerBand = null;
      if (head) {
        const r = head.getBoundingClientRect();
        if (r.width >= 1 && r.height >= 1) headerBand = { l: r.left + sx, t: r.top + sy, r: r.right + sx, b: r.bottom + sy };
      }
      textBoxes = text;
      coverBoxes = cover;`);
swap('stamp-listener',
`    window.addEventListener('cc:blow', onBlow);
    document.documentElement.addEventListener('pointerleave'`,
`    window.addEventListener('cc:blow', onBlow);
    window.addEventListener('cc:stamp', onStamp);
    document.documentElement.addEventListener('pointerleave'`);
swap('stamp-remove',
`      window.removeEventListener('cc:blow', onBlow);
      blow?.report?.([]);`,
`      window.removeEventListener('cc:blow', onBlow);
      window.removeEventListener('cc:stamp', onStamp);
      blow?.report?.([]);`);
swap('stamp-handler',
`    const onPointerLeave = () => {
      pointer.fine = false;
    };
`,
`    const onPointerLeave = () => {
      pointer.fine = false;
    };
    /** A date stamp was pressed (toys.ts): a mark has been laid and the older ones have faded a step, so measure the
        text again once the new mark has come in (it fades in over 150 ms after the rubber lands). */
    const onStamp = () => scheduleRects(STAMP_SETTLE_MS);
`);
swap('stamp-const',
`const SETTLE_MS = 700;`,
`const SETTLE_MS = 700;
/** How long after a date stamp's press the text is measured again (ms): the mark has landed and the rest have faded. */
const STAMP_SETTLE_MS = 500;`);

writeFileSync(FILE, src);
