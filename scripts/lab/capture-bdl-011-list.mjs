/**
 * Capture the Field Guide's own List picture.
 *
 *   src/content/lab/bdl-011/guide.png   1920x1200 px (16:10)
 *
 * The List card for the Field Guide to the Styles (BDL-011) used to share the
 * Portal's six-style grid, so the two neighbouring cards looked like one
 * piece. What sets the Field Guide apart is that it is a written guide, so its
 * picture is a page of that writing: the Bauhaus section (founder ruling
 * 11-24-26), with its heading, era line, specimen, and the Believes and
 * Forbids lines, in the light scheme.
 *
 * SpecimenCard.astro picks guide.png up for BDL-011 and falls back to the
 * entry's own thumb if the file is missing. Re-run after the guide's Bauhaus
 * section changes:
 *
 *   node scripts/lab/capture-bdl-011-list.mjs [--origin http://localhost:4400]
 *
 * The site must be served already (astro preview or the dev server). Use
 * --gpu on the machine's GPU instead of SwiftShader.
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const OUT = join(root, 'src', 'content', 'lab', 'bdl-011', 'guide.png');

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}
const origin = arg('origin', 'http://localhost:4400');
const gpu = process.argv.includes('--gpu');
// The Bauhaus block (heading down to the Forbids line) is about 713 CSS px
// tall at any desktop width, so a 16:10 frame that holds all of it is
// 1280x800 CSS px. DPR 1.5 makes the file 1920x1200, plenty for a card that
// shows it at most 1280 px wide.
const W = 1280;
const H = 800;
const DPR = 1.5;

const browser = await chromium.launch(
  gpu ? { args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] } : {},
);
try {
  const ctx = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: DPR,
    colorScheme: 'light',
    reducedMotion: 'reduce',
  });
  const page = await ctx.newPage();
  await page.goto(`${origin}/lab/bdl-011/`, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);

  // Any consent dialog or banner is fixed to the viewport and would sit in the
  // middle of the crop.
  await page.evaluate(() => {
    for (const el of document.querySelectorAll('body *')) {
      const cs = getComputedStyle(el);
      if (cs.position === 'fixed' && !el.matches('header, header *, nav, nav *')) el.style.display = 'none';
    }
  });

  // The picture is the Bauhaus heading down to its Forbids line (the era line,
  // the specimen and the Believes line sit between). The prose after it, and
  // the next style, stay out of the frame. Centre that in the viewport.
  const info = await page.evaluate(() => {
    const h = [...document.querySelectorAll('h2')].find((n) => /bauhaus/i.test(n.textContent ?? ''));
    if (!h) return null;
    const top = h.getBoundingClientRect().top + window.scrollY;
    let el = h.nextElementSibling;
    let bottom = top;
    while (el && el.tagName !== 'H2') {
      bottom = el.getBoundingClientRect().bottom + window.scrollY;
      if (/^Forbids/.test(el.textContent ?? '')) break;
      el = el.nextElementSibling;
    }
    // Everything on either side of the block is hidden, so no half line of the
    // paragraphs around it shows at the frame's edges.
    for (let n = h.previousElementSibling; n; n = n.previousElementSibling) n.style.visibility = 'hidden';
    for (let n = el?.nextElementSibling; n; n = n.nextElementSibling) n.style.visibility = 'hidden';
    return { top, bottom };
  });
  if (!info) {
    console.error('no Bauhaus heading on the Field Guide page');
    process.exit(1);
  }
  // Centre the section in the frame.
  const pad = Math.max(0, Math.round((H - (info.bottom - info.top)) / 2));
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), Math.max(0, info.top - pad));
  // Lazy images and reveal-on-scroll pieces need a beat after the scroll.
  await page.waitForTimeout(800);
  await page.waitForFunction(() => [...document.images].filter((i) => i.getBoundingClientRect().bottom > 0 && i.getBoundingClientRect().top < innerHeight).every((i) => i.complete));

  await mkdir(dirname(OUT), { recursive: true });
  await page.screenshot({ path: OUT, scale: 'device' });
  console.log(`[guide] wrote ${OUT} (${W}x${H} @${DPR}x; section ${Math.round(info.bottom - info.top)}px tall)`);
} finally {
  await browser.close();
}
