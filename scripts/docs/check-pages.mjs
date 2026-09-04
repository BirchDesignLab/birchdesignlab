// Verify a letterhead document's fixed-height pages do not silently clip, and
// shoot each page for eyeballing.
//
//   node scripts/docs/check-pages.mjs docs/pricing/pricing-sheet.html
//
// Why this exists: .page in docs/_letterhead/letterhead.css is a hard 8.5x11in
// box with overflow:hidden, so too much content is CLIPPED rather than reflowed
// onto a new page. Nothing errors, the PDF still reports the right page count,
// and the only signal is text colliding with the footer in the printed copy.
// This measures it instead. Run it before build-pdf.mjs, which will happily
// render the clipped version without complaining.
//
// Exit code 1 if any page overflows or crowds its footer. Page images land in a
// generated/ directory beside the document (gitignored).
//
// Adapted from the Cheer & Chatter repo's scripts/docs/check-review-pages.mjs;
// the original is kept verbatim under reference/cheer-chatter/.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { basename, dirname, extname, resolve } from 'node:path';
import { injectLetterheads } from './letterhead.mjs';

const input = process.argv[2];
if (!input) {
  console.error('usage: node scripts/docs/check-pages.mjs <path-to-document.html>');
  process.exit(2);
}

const HTML = resolve(input);
const NAME = basename(HTML, extname(HTML));
const OUT = resolve(dirname(HTML), 'generated');
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 1200 }, deviceScaleFactor: 2 });

try {
  await page.goto(pathToFileURL(HTML).href, { waitUntil: 'load' });
  const { variant, filled } = await injectLetterheads(page);
  // Marcellus and Spectral are webfonts; measuring before they swap in reports
  // the fallback's metrics, which are not what prints. The mark is injected
  // first because it occupies real height in the flow.
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);

  const report = await page.evaluate(() =>
    [...document.querySelectorAll('.page')].map((p, i) => {
      const foot = p.querySelector('.foot');
      const last = [...p.children].filter(c => !c.classList.contains('foot')).pop();
      const gap = foot && last
        ? Math.round(foot.getBoundingClientRect().top - last.getBoundingClientRect().bottom)
        : null;
      return {
        page: i + 1,
        clipped: p.scrollHeight - p.clientHeight,   // px of content cut off
        gapToFooter: gap,                            // negative = collision
      };
    }),
  );

  for (const [i, el] of (await page.locator('.page').all()).entries()) {
    await el.screenshot({ path: `${OUT}/${NAME}-page-${i + 1}.png` });
  }

  console.log(`${NAME}: ${variant} mark, ${filled} letterhead${filled === 1 ? '' : 's'}`);
  let bad = false;
  for (const r of report) {
    const trouble = r.clipped > 0 || (r.gapToFooter !== null && r.gapToFooter < 6);
    if (trouble) bad = true;
    console.log(
      `page ${r.page}: ${r.clipped > 0 ? `CLIPPED ${r.clipped}px` : 'fits'}` +
      `, gap to footer ${r.gapToFooter}px${trouble ? '  <-- fix this' : ''}`,
    );
  }
  console.log(`page images in ${OUT}/`);
  if (bad) process.exitCode = 1;
} finally {
  await browser.close();
}
