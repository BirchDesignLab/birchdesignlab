// Verify the project review's fixed-height pages do not silently clip, and
// shoot each page for eyeballing. Written 08-18-26 after v28's page 3 pushed
// its last paragraph under the footer.
//
//   node scripts/docs/check-review-pages.mjs
//
// Why this exists: `.page` in bdl-review.css is a hard 8.5x11in box with
// `overflow:hidden`, so too much content is CLIPPED rather than reflowed onto
// a new page. Nothing errors, the PDF still says 4 pages, and the only signal
// is a paragraph colliding with the footer in the printed copy. This measures
// it instead.
//
// Exit code 1 if any page overflows. Page images land in assets/generated/
// (gitignored) for a look before the PDF is regenerated.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const HTML = resolve('docs/project-review/delivery-review.html');
const OUT = 'assets/generated';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 1200 }, deviceScaleFactor: 2 });

try {
  await page.goto(pathToFileURL(HTML).href, { waitUntil: 'load' });
  // The letterhead and headings are webfonts; measuring before they swap in
  // reports the fallback's metrics, which are not what prints.
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
    await el.screenshot({ path: `${OUT}/review-page-${i + 1}.png` });
  }

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
