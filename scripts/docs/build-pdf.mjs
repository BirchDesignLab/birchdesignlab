// Render a letterhead document to PDF.
//
//   node scripts/docs/build-pdf.mjs <document.html> [output.pdf]
//
//   node scripts/docs/build-pdf.mjs docs/pricing/pricing-sheet.html \
//     docs/pricing/Birch-Design-Lab-Price-Sheet.pdf
//
// Without an output path the PDF lands beside the document under its own name.
// Name the output explicitly for anything a client will receive: the file name
// is the first thing they see, and it outlives the conversation it arrived in.
//
// Run check-pages.mjs FIRST. The pages are hard 8.5x11in boxes with
// overflow:hidden, so anything too tall is clipped rather than reflowed, and
// this script will happily render the clipped version without complaining.
//
// preferCSSPageSize is what makes the CSS `@page { size:8.5in 11in; margin:0 }`
// authoritative. Without it Chromium applies Letter with its own default
// margins, every .page picks up a margin it was not designed for, and the
// footers walk off the bottom of the sheet.
//
// Adapted from the Cheer & Chatter repo's scripts/docs/build-review-pdf.mjs;
// the original is kept verbatim under reference/cheer-chatter/.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { basename, dirname, extname, resolve } from 'node:path';
import { injectLetterheads } from './letterhead.mjs';

const input = process.argv[2];
if (!input) {
  console.error('usage: node scripts/docs/build-pdf.mjs <document.html> [output.pdf]');
  process.exit(2);
}

const HTML = resolve(input);
const OUT = process.argv[3]
  ? resolve(process.argv[3])
  : resolve(dirname(HTML), `${basename(HTML, extname(HTML))}.pdf`);

const browser = await chromium.launch();
const page = await browser.newPage();

try {
  await page.goto(pathToFileURL(HTML).href, { waitUntil: 'load' });
  const { variant } = await injectLetterheads(page);
  // Marcellus and Spectral come from Google Fonts. Rendering before they swap
  // in prints the fallback, which is a different set of metrics and a visibly
  // different document.
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);

  mkdirSync(dirname(OUT), { recursive: true });
  await page.pdf({
    path: OUT,
    preferCSSPageSize: true,
    printBackground: true,
  });

  console.log(`wrote ${OUT} (${variant} face)`);
} finally {
  await browser.close();
}
