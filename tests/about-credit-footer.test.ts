import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const src = (p: string) =>
  new URL(`../src/${p}`, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const read = (p: string) => readFileSync(src(p), 'utf8');

describe('About BDL-001 credit', () => {
  it('About hero credits BDL-001 through BarkCredit', () => {
    const about = read('pages/about.astro');
    expect(about).toMatch(/import BarkCredit from '\.\.\/components\/BarkCredit\.astro'/);
    expect(about).toMatch(/<BarkCredit[^>]*href="\/lab\/bdl-001"/);
  });
});

describe('Footer service area + reserved-room cleanup', () => {
  it('names the service area', () => {
    expect(read('components/SiteFooter.astro')).toMatch(/Mississippi Gulf Coast/);
  });

  it('reserved-room comment no longer lists Work or Field Notes (both became the Lab)', () => {
    const footer = read('components/SiteFooter.astro');
    expect(footer).not.toMatch(/Field Notes/);
    expect(footer).not.toMatch(/\bWork\b/);
  });
});
