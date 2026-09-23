/**
 * Visible-text extraction for built HTML, shared by the root-copy fixture
 * script and the dist tests so both sides normalize the same way.
 *
 * Written 09-22-26 for the theme-schools build. Two guards rest on it:
 * the root pages must render exactly the text they rendered before their
 * bodies moved into theme components, and every school must render the
 * same copy as quiet.
 *
 * What counts as visible: text nodes outside script/style/template/noscript,
 * outside any aria-hidden="true" subtree (decoration by contract), outside
 * any selectors the caller passes, and, in parity mode, outside
 * [data-parity-skip] (content that legitimately differs between schools,
 * such as quiet's bark credit or the lab-derived "From the lab" entries).
 *
 * Blocks: block-level elements start a new line; inline elements do not.
 * Whitespace collapses to single spaces and each line is trimmed. The
 * copyright year is normalized so the fixture does not expire on Jan 1.
 */
import { parse } from 'node-html-parser';

const DROP = new Set(['script', 'style', 'template', 'noscript', 'head']);
const BLOCK = new Set([
  'address', 'article', 'aside', 'blockquote', 'body', 'br', 'button', 'dd', 'details', 'dialog', 'div',
  'dl', 'dt', 'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'header', 'hr', 'html', 'label', 'legend', 'li', 'main', 'nav', 'ol', 'option', 'p', 'pre', 'section',
  'summary', 'table', 'td', 'textarea', 'th', 'tr', 'ul',
]);

// Block separator: a control character that never appears in page text, so
// newlines inside source text nodes stay ordinary whitespace.
const BREAK = '\x00';

export function parseHtml(html) {
  return parse(html, { comment: false, blockTextElements: { script: true, style: true, noscript: true, pre: true } });
}

function hidden(el, skip, parity) {
  if (el.getAttribute?.('aria-hidden') === 'true') return true;
  if (parity && el.hasAttribute?.('data-parity-skip')) return true;
  for (const sel of skip) {
    if (el.parentNode?.querySelectorAll?.(sel)?.includes(el)) return true;
  }
  return false;
}

/**
 * @param {string} html
 * @param {{ skip?: string[], parity?: boolean }} [opts]
 *   parity: also drop [data-parity-skip] subtrees, and treat every element
 *   boundary as a word break (a flex nav of adjacent links reads as separate
 *   words on screen). Off for the root fixtures, which must stay sensitive to
 *   whitespace regressions such as Astro 7's compressHTML 'jsx' default.
 * @returns {string[]} normalized text lines, empty lines dropped
 */
export function visibleText(html, { skip = [], parity = false } = {}) {
  const root = parseHtml(html);
  const parts = [];
  const walk = (node) => {
    if (node.nodeType === 3) {
      if (/^\s*<!doctype/i.test(node.rawText)) return;
      parts.push(node.text.replace(/\s+/g, ' '));
      return;
    }
    if (node.nodeType !== 1 && node !== root) return;
    const tag = node.rawTagName?.toLowerCase();
    if (tag && DROP.has(tag)) return;
    if (tag && hidden(node, skip, parity)) return;
    const block = tag && BLOCK.has(tag);
    const sep = block ? BREAK : parity && tag ? ' ' : '';
    parts.push(sep);
    for (const child of node.childNodes) walk(child);
    parts.push(sep);
  };
  walk(root);
  return parts
    .join('')
    .split(BREAK)
    .map((line) => decode(line).replace(/&nbsp;|\xa0/g, ' ').replace(/\s+/g, ' ').trim())
    .map((line) => line.replace(/©\s*\d{4}/g, '© YEAR'))
    .filter(Boolean);
}

/** Lowercased word multiset, for parity checks where order is a design freedom. */
export function wordCounts(lines) {
  const counts = new Map();
  for (const line of lines) {
    for (const raw of line.split(/\s+/)) {
      const w = raw.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
      if (!w) continue;
      counts.set(w, (counts.get(w) ?? 0) + 1);
    }
  }
  return counts;
}

/** Differences between two word multisets: words missing from `b`, extra in `b`. */
export function diffWords(a, b) {
  const missing = [];
  const extra = [];
  for (const [w, n] of a) {
    const m = b.get(w) ?? 0;
    if (m < n) missing.push(`${w} x${n - m}`);
  }
  for (const [w, n] of b) {
    const m = a.get(w) ?? 0;
    if (m < n) extra.push(`${w} x${n - m}`);
  }
  return { missing, extra };
}

function decode(s) {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&rarr;/g, '→')
    .replace(/&larr;/g, '←')
    .replace(/&middot;/g, '·')
    .replace(/&copy;/g, '©')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, '&');
}
