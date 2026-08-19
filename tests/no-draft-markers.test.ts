import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Ship gate: no draft-copy markers in the source that renders to the client.
 *
 * The provisional/first-draft copy was flagged with HTML comments
 * (`<!-- first-draft copy -->`, `<!-- provisional copy ... -->`). Astro's
 * compressHTML does NOT strip HTML comments, so any that survive in an
 * .astro/.md source ship verbatim into production view-source. For a studio
 * whose pitch is craft and finish, "first-draft copy" in the live page source
 * is a self-inflicted wound. This test fails the build (via `vitest run`, the
 * pre-PR gate) if any reappear, so the copy-lock can only regress loudly.
 *
 * Scope: the phrases below are draft-status HTML comments, not real content.
 * A scan of source is equivalent to a scan of dist for these, because the
 * comments pass through the compiler unchanged.
 */
const SRC = new URL('../src/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const DRAFT_COMMENT = /<!--[^>]*\b(?:first-draft|provisional copy)\b[^>]*-->/i;
const SCANNED = /\.(astro|md|mdx|svelte)$/;

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (SCANNED.test(entry.name)) out.push(full);
  }
  return out;
}

describe('no draft-copy markers ship to production', () => {
  it('has zero first-draft / provisional-copy comments in rendered source', () => {
    const offenders = walk(SRC).filter((file) => DRAFT_COMMENT.test(readFileSync(file, 'utf8')));
    expect(offenders, `draft markers found in:\n${offenders.join('\n')}`).toEqual([]);
  });
});
