// Font embedding for the README charts. Marcellus (display) and Spectral (body,
// regular and italic) come from the @fontsource packages the site already uses.
// Each SVG gets a subset holding only the glyphs it draws, made by subset_font.py
// (python fonttools, `pip install fonttools brotli`), embedded as base64 woff2.
// Subsetting is deterministic: the head table's modified stamp is left alone. The
// subset step fails when the face has no glyph for a requested character, so a
// letter can never silently fall back to a system font.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT } from './layout.mjs';

const SOURCES = {
  display: { family: 'BDL Marcellus', style: 'normal', pkg: 'marcellus', file: 'marcellus-latin-400-normal.woff2' },
  body: { family: 'BDL Spectral', style: 'normal', pkg: 'spectral', file: 'spectral-latin-400-normal.woff2' },
  italic: { family: 'BDL Spectral', style: 'italic', pkg: 'spectral', file: 'spectral-latin-400-italic.woff2' },
};

const cache = new Map();

/** Subset one face to `text`. Returns a woff2 Buffer. Fails if the face lacks a glyph the text needs. */
export function subset(face, text) {
  const src = SOURCES[face];
  const rel = `@fontsource/${src.pkg}/files/${src.file}`;
  return subsetPinned(rel, text, {}).woff2;
}

/**
 * @font-face CSS for the glyphs collected in `glyphs` ({display, body, italic}
 * strings). Faces with no glyphs are left out.
 */
export function fontCss(glyphs) {
  const out = [];
  for (const face of ['display', 'body', 'italic']) {
    const text = glyphs[face];
    if (!text || !text.trim()) continue;
    const buf = subset(face, text);
    const { family, style } = SOURCES[face];
    out.push(
      `@font-face{font-family:'${family}';font-style:${style};font-weight:400;src:url(data:font/woff2;base64,${buf.toString('base64')}) format('woff2')}`,
    );
  }
  return out.join('\n');
}

const here = dirname(fileURLToPath(import.meta.url));

/**
 * One face for a showpiece, pinned to a weight and subset to `text`. `src` is a
 * path under node_modules/@fontsource*. Returns the woff2 and a ttf of the same
 * subset (opentype.js cannot read woff2, and measuring the subset itself gives
 * the widths of the pinned weight rather than the font's default).
 */
export function subsetPinned(src, text, pins = {}) {
  const key = `${src}|${JSON.stringify(pins)}|${[...new Set(text)].sort().join('')}`;
  if (cache.has(key)) return cache.get(key);
  const file = resolve(ROOT, 'node_modules', src);
  if (!existsSync(file)) throw new Error(`missing font file ${file}`);
  const dir = mkdtempSync(join(tmpdir(), 'bdl-font-'));
  try {
    const textFile = join(dir, 'text.txt');
    writeFileSync(textFile, [...new Set(text + ' ')].sort().join(''), 'utf8');
    const out = { woff2: join(dir, 'o.woff2'), ttf: join(dir, 'o.ttf') };
    const script = resolve(here, 'subset_font.py');
    execFileSync('python', [script, file, textFile, out.woff2, out.ttf, JSON.stringify(pins)], { stdio: ['ignore', 'pipe', 'pipe'] });
    const res = { woff2: readFileSync(out.woff2), ttf: readFileSync(out.ttf) };
    cache.set(key, res);
    return res;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

export const fontFace = (family, style, woff2) =>
  `@font-face{font-family:'${family}';font-style:${style};font-weight:400;src:url(data:font/woff2;base64,${woff2.toString('base64')}) format('woff2')}`;
