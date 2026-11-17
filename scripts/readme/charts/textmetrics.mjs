// Text measuring and wrapping for the hand-laid charts, using opentype.js (already
// a dependency) on the same @fontsource faces that get embedded in the SVGs.
import opentype from 'opentype.js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT } from './layout.mjs';

const FILES = {
  display: ['marcellus', 'marcellus-latin-400-normal.woff'],
  body: ['spectral', 'spectral-latin-400-normal.woff'],
  italic: ['spectral', 'spectral-latin-400-italic.woff'],
};
const fonts = {};
function font(face) {
  if (!fonts[face]) {
    const [pkg, file] = FILES[face];
    const buf = readFileSync(resolve(ROOT, 'node_modules/@fontsource', pkg, 'files', file));
    fonts[face] = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  }
  return fonts[face];
}

/** Advance width in px of `text` set in `face` at `size`, with letter-spacing `ls` (em). */
export function width(face, size, text, ls = 0) {
  return font(face).getAdvanceWidth(text, size, { kerning: true }) + text.length * ls * size;
}

/**
 * Greedy wrap to `maxW`. Breaks at spaces; a single token wider than the box is
 * broken after a slash or hyphen if it has one, so paths wrap at a path boundary
 * instead of mid-word.
 */
export function wrap(face, size, text, maxW, ls = 0) {
  const pieces = [];
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (width(face, size, word, ls) <= maxW) pieces.push({ t: word, space: true });
    else {
      const parts = word.match(/[^/\-]+[/\-]?|[/\-]/g) ?? [word];
      parts.forEach((p, i) => pieces.push({ t: p, space: i === parts.length - 1 }));
    }
  }
  const lines = [];
  let cur = '';
  let curSpace = false;
  for (const p of pieces) {
    const joined = cur === '' ? p.t : cur + (curSpace ? ' ' : '') + p.t;
    if (cur !== '' && width(face, size, joined, ls) > maxW) {
      lines.push(cur);
      cur = p.t;
    } else cur = joined;
    curSpace = p.space;
  }
  if (cur) lines.push(cur);
  return lines;
}

/** Width of `text` set in a pinned, subset face (the ttf from fonts.subsetPinned). */
export function measureTtf(ttf, size, text, ls = 0) {
  const f = opentype.parse(ttf.buffer.slice(ttf.byteOffset, ttf.byteOffset + ttf.byteLength));
  return f.getAdvanceWidth(text, size, { kerning: true }) + text.length * ls * size;
}
