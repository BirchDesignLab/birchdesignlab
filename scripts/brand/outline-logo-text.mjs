// Outline the wordmark text in the exported marks to paths.
//
// THE BUG THIS FIXES: the export leaves the wordmark as live <text> in
// `Marcellus, serif`. That only renders correctly where Marcellus is installed
// or loaded by the host page. An SVG loaded as an <img>, as a CSS background,
// or handed to a rasteriser cannot reach the page's webfonts, so it silently
// falls back to a generic serif — a different logo, quietly.
//
// It went unnoticed because the review sheet loads Marcellus itself, so the
// marks look right there and only there.
//
// Same approach and the same pinned font as scripts/brand/build-lockups.mjs,
// whose header says it outright: outlined to paths "so the SVGs render with no
// font installed". Font is fetched once into scripts/brand/.cache (gitignored).
//
// Run: node scripts/brand/outline-logo-text.mjs
import { access, mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import opentype from 'opentype.js';

const DIR = path.join('assets', 'brand', 'logos', 'files');
const CACHE = path.join('scripts', 'brand', '.cache');
const TTF = path.join(CACHE, 'Marcellus-Regular.ttf');
// Pinned to a commit, not a branch: an upstream font revision would silently
// reflow every wordmark. Same pin as build-lockups.mjs.
const FONT_URL =
  'https://raw.githubusercontent.com/google/fonts/90abd17b4f97671435798b6147b698aa9087612f/ofl/marcellus/Marcellus-Regular.ttf';

async function ensureFont() {
  try { await access(TTF, constants.F_OK); return; } catch {}
  const res = await fetch(FONT_URL);
  if (!res.ok) throw new Error(`font fetch failed: ${res.status}`);
  await mkdir(CACHE, { recursive: true });
  await writeFile(TTF, Buffer.from(await res.arrayBuffer()));
}

const attr = (attrs, name) => {
  const m = new RegExp(`${name}="([^"]*)"`).exec(attrs);
  return m ? m[1] : undefined;
};

function outline(svg, font, report) {
  return svg.replace(/<text\s([^>]*)>([^<]*)<\/text>/g, (_m, attrs, content) => {
    const size = parseFloat(attr(attrs, 'font-size'));
    // SVG letter-spacing is a length; opentype wants em. The marks set it in
    // user units at a known font-size, so the conversion is exact.
    const tracking = parseFloat(attr(attrs, 'letter-spacing') ?? '0') / size;
    const fill = attr(attrs, 'fill') ?? '#000';
    const anchor = attr(attrs, 'text-anchor') ?? 'start';
    const y = parseFloat(attr(attrs, 'y'));
    let x = parseFloat(attr(attrs, 'x'));

    const opts = { kerning: true, letterSpacing: tracking };
    const width = font.getAdvanceWidth(content, size, opts);
    // text-anchor is a rendering-time behaviour and does not survive being
    // turned into a path, so it has to be resolved into the x now.
    if (anchor === 'middle') x -= width / 2;
    else if (anchor === 'end') x -= width;

    const d = font.getPath(content, x, y, size, opts).toPathData(2);
    report.push({ content, anchor, size, left: x, width });
    // The live text stays in a comment: it is the editable source of truth,
    // the same convention build-lockups.mjs uses.
    return `<!-- ${content} — Marcellus ${size}px, letter-spacing ${attr(attrs, 'letter-spacing') ?? 0}, outlined -->` +
      `<path d="${d}" fill="${fill}"></path>`;
  });
}

await ensureFont();
const buf = await readFile(TTF);
const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));

const files = (await readdir(DIR)).filter((f) => f.endsWith('.svg')).sort();
let changed = 0;
for (const file of files) {
  const full = path.join(DIR, file);
  const before = await readFile(full, 'utf8');
  if (!before.includes('<text')) continue;

  const report = [];
  const after = outline(before, font, report);
  if (after.includes('<text')) throw new Error(`${file}: a <text> element survived outlining`);

  await writeFile(full, after);
  for (const r of report) {
    console.log(
      `${file.padEnd(36)} "${r.content}" ${r.size}px anchor=${r.anchor} -> x ${r.left.toFixed(1)}, width ${r.width.toFixed(1)}`,
    );
  }
  changed++;
}
console.log(`\n${changed} marks outlined; ${files.length - changed} had no text`);
