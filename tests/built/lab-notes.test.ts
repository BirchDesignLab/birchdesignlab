import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DIST } from './helpers';

/**
 * Lab entries keep working notes in markdown HTML comments, stripped at build
 * (src/lib/markdown-strip-comments.mjs). If that ever stops working, the notes'
 * telltale words reach the built page source again: this catches it.
 */
const LAB = join(DIST, 'lab');
const pages = existsSync(LAB)
  ? readdirSync(LAB, { withFileTypes: true })
      .filter((d) => d.isDirectory() && existsSync(join(LAB, d.name, 'index.html')))
      .map((d) => join(LAB, d.name, 'index.html'))
  : [];

describe('no Lab page ships its working notes', () => {
  it('finds the Lab pages', () => {
    expect(pages.length).toBeGreaterThan(5);
  });
  it.each(pages)('%s', (page) => {
    const html = readFileSync(page, 'utf8');
    expect(html).not.toMatch(/founder/i);
    expect(html).not.toContain('docs/private');
    expect(html).not.toMatch(/PR #\d/);
  });
});
