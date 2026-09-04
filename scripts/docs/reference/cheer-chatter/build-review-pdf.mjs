// Render the project review HTML to the delivered PDF.
//
//   node scripts/docs/build-review-pdf.mjs
//
// Written 08-26-26. Before this, the PDF was produced by hand out of a browser's
// print dialog, which is why the delivered copy could silently drift from the
// HTML that git tracks. It writes both copies the project keeps: the one beside
// the source, and the one in documentation/ that actually gets sent.
//
// Run `node scripts/docs/check-review-pages.mjs` FIRST. The pages are hard
// 8.5x11in boxes with overflow:hidden, so anything too tall is clipped rather
// than reflowed, and this script will happily render the clipped version
// without complaining. That checker is the only thing that catches it.
//
// preferCSSPageSize is what makes the CSS `@page { size:8.5in 11in; margin:0 }`
// authoritative. Without it Chromium applies Letter with its own default
// margins, every .page picks up a margin it was not designed for, and the
// footers walk off the bottom of the sheet.
import { chromium } from 'playwright';
import { copyFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';

const HTML = resolve('docs/project-review/delivery-review.html');
const OUT = resolve('docs/project-review/Cheer-and-Chatter-Project-Review-BDL.pdf');
const DELIVERED = resolve('../documentation/Cheer-and-Chatter-Project-Review-BDL.pdf');

const browser = await chromium.launch();
const page = await browser.newPage();

try {
  await page.goto(pathToFileURL(HTML).href, { waitUntil: 'load' });
  // Marcellus and Spectral come from Google Fonts. Rendering before they swap in
  // prints the fallback, which is a different set of metrics and a visibly
  // different document.
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);

  mkdirSync(dirname(OUT), { recursive: true });
  await page.pdf({
    path: OUT,
    preferCSSPageSize: true,
    printBackground: true,
  });

  copyFileSync(OUT, DELIVERED);
  console.log(`wrote ${OUT}`);
  console.log(`wrote ${DELIVERED}`);
} finally {
  await browser.close();
}
