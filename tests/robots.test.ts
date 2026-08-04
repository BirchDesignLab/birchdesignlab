import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const robots = readFileSync('public/robots.txt', 'utf8');

describe('robots.txt', () => {
  it('allows every crawler', () => {
    expect(robots).toMatch(/^User-agent: \*$/m);
    expect(robots).toMatch(/^Allow: \/$/m);
  });

  it('points at the sitemap index with an absolute URL', () => {
    expect(robots).toMatch(/^Sitemap: https:\/\/birchdesignlab\.com\/sitemap-index\.xml$/m);
  });

  it('disallows nothing, because Disallow would hide the noindex tag', () => {
    expect(robots).not.toMatch(/^Disallow:\s*\S/m);
  });

  it('ends with a trailing newline', () => {
    expect(robots.endsWith('\n')).toBe(true);
  });
});
