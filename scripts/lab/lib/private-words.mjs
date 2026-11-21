// Words that must never appear in public Lab copy: fingerprints of private
// clients and prospects. This repo is public, so the list itself is private:
// docs/private/forbidden-words.txt (gitignored), one regex term per line,
// `#` for comments. A worktree falls back to the main checkout's copy.
//
// Without the file the guards still run their public checks and print one
// warning, so a fresh clone works and nobody mistakes silence for a pass.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const CANDIDATES = [
  join(root, 'docs', 'private', 'forbidden-words.txt'),
  // .claude/worktrees/<name> -> the main checkout
  join(root, '..', '..', '..', 'docs', 'private', 'forbidden-words.txt'),
];

let warned = false;
/** The private terms, or [] (with one warning) when the file is absent. */
export function privateWords() {
  const file = CANDIDATES.find((f) => existsSync(f));
  if (!file) {
    if (!warned) console.warn('private-words: docs/private/forbidden-words.txt not found; private-name check skipped');
    warned = true;
    return [];
  }
  return readFileSync(file, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
}

/** The terms as a regex alternation with a trailing `|`, or '' when none. */
export function privateAlt() {
  const w = privateWords();
  return w.length ? w.join('|') + '|' : '';
}
