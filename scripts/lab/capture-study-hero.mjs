/**
 * Capture a Lab study hero from a deployed site.
 *
 * Written 09-05-26 for BDL-008 (Magnolia & Mane). The salon specimen is a
 * fictional business, so there is no salon to photograph and never will be;
 * a screenshot of the deployed site is the only hero this study can have.
 * BDL-005 set that precedent — its hero is a homepage screenshot too.
 *
 * The capture is deliberately the header + hero band only, stopping short of
 * the service cards. The specimen's imagery is all flat placeholder JPGs, and
 * a shot that includes them advertises the placeholders rather than the site.
 * The hero band is type on the site's own ground, which is the part worth
 * showing. `--clip-to <selector>` is what enforces that: the shot ends at
 * that element's bottom edge rather than at a guessed pixel height, so it
 * stays correct if the band's height changes.
 *
 * /lab/[slug] renders the hero full-bleed with object-fit: cover at ~62vh and
 * lays a gradient veil plus the study title over the bottom of it. Cover-crop
 * means a source much wider than that box loses its left and right edges, so
 * the script prints the captured aspect ratio: keep it near the display box's
 * ~2.9:1 rather than letting it run thin.
 *
 * Usage:
 *   node scripts/lab/capture-study-hero.mjs \
 *     --url https://demo-magnolia-mane-salon.birchdesignlab.workers.dev/ \
 *     --out src/content/lab/bdl-008/hero.png \
 *     --width 1600 --height 900 --scale 2 --clip-to .hero
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}

const url = arg('url');
const out = arg('out');
if (!url || !out) {
  console.error('usage: --url <url> --out <path> [--width n] [--height n] [--scale n]');
  process.exit(1);
}
const width = Number(arg('width', 1920));
const height = Number(arg('height', 620));
const scale = Number(arg('scale', 2));

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width, height },
  deviceScaleFactor: scale,
});

await page.goto(url, { waitUntil: 'networkidle' });

// The consent banner is fixed to the bottom of the viewport and would sit in
// the middle of the crop. It is a real part of the site and gets its own
// paragraph in the writeup, but it is not the hero.
await page.evaluate(() => {
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (cs.position === 'fixed' && el.getBoundingClientRect().bottom >= innerHeight - 4) {
      el.style.display = 'none';
    }
  }
});

// Webfonts must be down before the shutter, or the type reflows in the image.
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(400);

const clipTo = arg('clip-to');
let clip;
if (clipTo) {
  const bottom = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    return Math.round(el.getBoundingClientRect().bottom + window.scrollY);
  }, clipTo);
  if (bottom === null) {
    console.error(`--clip-to matched nothing: ${clipTo}`);
    process.exit(1);
  }
  clip = { x: 0, y: 0, width, height: bottom };
}

await mkdir(dirname(out), { recursive: true });
await page.screenshot({ path: out, scale: 'device', clip });
await browser.close();

const captured = clip ? clip.height : height;
console.log(
  `captured ${url} -> ${out} (${width}x${captured} @${scale}x, aspect ${(width / captured).toFixed(2)}:1)`,
);
