/**
 * Render the marble-head candidates side by side for the founder.
 *
 * Written 09-25-26 for Tier 3 stage 3 (vaporwave F3, the head pick). Reads a
 * candidates JSON (an array of { rank, name, subject, source, licence,
 * triangles, shape, condition, thumbnailUrl, pageUrl }) and lays the public
 * thumbnails out in a grid with the facts under each, then screenshots it.
 * The thumbnails are hotlinked from their hosts (Sketchfab's media CDN, the
 * museums' own pages): nothing is saved but the sheet itself, and no mesh is
 * downloaded.
 *
 * Usage:
 *   node scripts/themes/vaporwave/marble-candidates-sheet.mjs \
 *     --in scripts/themes/vaporwave/marble-candidates.json \
 *     --out scripts/themes/.out/stage3-proofs/marble/candidates.png [--cols 4]
 */
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const argOf = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
};
const input = argOf('in', 'scripts/themes/vaporwave/marble-candidates.json');
const out = argOf('out', 'scripts/themes/.out/stage3-proofs/marble/candidates.png');
const cols = Number(argOf('cols', '4'));

const items = JSON.parse(readFileSync(input, 'utf8'));
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const tri = (n) => (n ? `${Math.round(n / 1000)}k tris` : 'tris n/a');

const cards = items
  .map(
    (c, i) => `
  <figure>
    <div class="img"><img src="${esc(c.thumbnailUrl)}" alt=""></div>
    <figcaption>
      <b>${i + 1}. ${esc(c.name)}</b>
      <span>${esc(c.source)} · ${esc(c.licence)} · ${tri(c.triangles)} · ${esc(c.shape)}</span>
      <span class="cond">${esc(c.condition)}</span>
    </figcaption>
  </figure>`,
  )
  .join('');

const html = `<!doctype html><meta charset="utf-8"><style>
  body { margin: 0; padding: 32px; background: #1d1b26; color: #f3eefc; font: 20px/1.35 system-ui, sans-serif; }
  h1 { font-size: 30px; margin: 0 0 24px; }
  .grid { display: grid; grid-template-columns: repeat(${cols}, 1fr); gap: 28px; }
  figure { margin: 0; background: #2a2735; border-radius: 12px; overflow: hidden; }
  .img { aspect-ratio: 4 / 3; background: #111; display: grid; place-items: center; }
  .img img { width: 100%; height: 100%; object-fit: cover; }
  figcaption { padding: 14px 16px 18px; display: grid; gap: 6px; }
  figcaption b { font-size: 22px; }
  figcaption span { font-size: 20px; color: #cfc6e6; }
  .cond { color: #ffd3e6; }
</style><h1>Vaporwave head: free candidates (thumbnails from each source's own page)</h1>
<div class="grid">${cards}</div>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 420 * cols + 64, height: 900 }, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: 'networkidle' });
const broken = await page.$$eval('img', (imgs) => imgs.map((im, i) => (im.complete && im.naturalWidth ? null : i + 1)).filter(Boolean));
if (broken.length) console.warn(`thumbnails that did not load: ${broken.join(', ')}`);
mkdirSync(dirname(out), { recursive: true });
await page.screenshot({ path: out, fullPage: true, type: out.endsWith('.jpg') ? 'jpeg' : 'png', ...(out.endsWith('.jpg') ? { quality: 92 } : {}) });
await browser.close();
console.log(`wrote ${out}`);
