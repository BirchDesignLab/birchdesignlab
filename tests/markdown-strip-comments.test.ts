import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { ONLY_COMMENTS, stripComments } from '../src/lib/markdown-strip-comments.mjs';

/* Markdown HTML comments (the Lab entries' working notes) never reach the page; other raw HTML does. */
const visit = (value: string) => {
  const removed: unknown[] = [];
  const node = { type: 'html', value };
  stripComments.html(node, { removeNode: (n: unknown) => removed.push(n) });
  return removed.length === 1;
};

describe('markdown-strip-comments', () => {
  it('removes an html node that is only comments', () => {
    expect(visit('<!--\nnote to self\n-->')).toBe(true);
    expect(visit('  <!-- a --> <!-- b -->  ')).toBe(true);
  });
  it('keeps raw HTML that is not only comments', () => {
    expect(visit('<!-- x --><figure>kept</figure>')).toBe(false);
    expect(visit('<br>')).toBe(false);
    expect(ONLY_COMMENTS.test('<p>not a comment</p>')).toBe(false);
  });
  it('is wired into the markdown processor', () => {
    const config = readFileSync(new URL('../astro.config.mjs', import.meta.url), 'utf8');
    expect(config).toContain("markdown: { processor: satteri({ mdastPlugins: [stripComments] }) },");
  });
});
