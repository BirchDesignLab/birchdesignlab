// Inject the Birch Design Lab wordmark into a document's letterhead blocks.
//
// Shared by build-pdf.mjs and check-pages.mjs. A document writes an empty
// placeholder per page:
//
//   <div class="letterhead" data-for="birchdesignlab.com"></div>
//
// and the mark is filled in at render time, from the brand asset. Before this,
// every page carried its own pasted copy of the 15KB outlined wordmark: the
// price sheet's two variants were 57KB each and roughly 90% logo path, a new
// document started life as a copy-paste job, and a mark that was truncated
// during one such paste rendered as "BIRCH DE" on a single page while the
// others were fine. One source, injected, removes the whole class of problem.
//
// The wordmark's text is outlined in the SVG, so it needs no font to render.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const REPO_ROOT = resolve(import.meta.dirname, '../..');

// The brand files are square-ish plates: a background rect sized to the full
// canvas, then the artwork. For a letterhead we want the artwork alone on the
// page's own field, cropped to the ink — hence dropping the rect and tightening
// the viewBox from the source's "0 0 460 110" to the mark's actual bounds, which
// lets it read larger without a taller letterhead.
const MARK_VIEWBOX = '30 6 378 98';

const markSvg = (variant) => {
  const file = `assets/brand/logos/files/8b-horizontal-${variant}.svg`;
  const src = readFileSync(resolve(REPO_ROOT, file), 'utf8');

  const cropped = src
    .replace(/<rect\b[^>]*><\/rect>/, '')
    .replace(
      /^<svg\b[^>]*>/,
      `<svg class="mark" xmlns="http://www.w3.org/2000/svg" viewBox="${MARK_VIEWBOX}" role="img" aria-label="Birch Design Lab">`,
    );

  if (!cropped.startsWith('<svg class="mark"')) {
    throw new Error(`${file}: unexpected SVG shape, could not rewrite the root element`);
  }
  return cropped;
};

// Fills every empty .letterhead on the page. Returns the variant used, and the
// number of blocks filled, so callers can fail loudly on a document whose
// placeholders are missing rather than silently printing without a mark.
export const injectLetterheads = async (page) => {
  const variant = await page.evaluate(() => document.body.dataset.letterhead || 'day');
  if (variant !== 'day' && variant !== 'night') {
    throw new Error(`body[data-letterhead] is "${variant}", expected "day" or "night"`);
  }

  const filled = await page.evaluate((svg) => {
    const blocks = [...document.querySelectorAll('.letterhead')];
    for (const block of blocks) {
      const forText = block.dataset.for;
      block.innerHTML = svg + (forText ? `<span class="for">${forText}</span>` : '');
    }
    return blocks.length;
  }, markSvg(variant));

  if (filled === 0) throw new Error('no .letterhead blocks found; nothing to inject');
  return { variant, filled };
};
