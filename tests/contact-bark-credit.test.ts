import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';

const src = (p: string) =>
  new URL(`../src/${p}`, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const read = (p: string) => readFileSync(src(p), 'utf8');

describe('BarkCredit extraction + home refactor', () => {
  it('BarkCredit component exists and takes href + label props', () => {
    expect(existsSync(src('components/BarkCredit.astro'))).toBe(true);
    const c = read('components/BarkCredit.astro');
    expect(c).toMatch(/href/);
    expect(c).toMatch(/label/);
    // owns the shared hover treatment, not positioning
    expect(c).toMatch(/focus-visible/);
    expect(c).not.toMatch(/position:\s*absolute/);
  });

  it('home hero credits BDL-001 through BarkCredit, not an inline anchor', () => {
    const home = read('pages/index.astro');
    expect(home).toMatch(/import BarkCredit from '\.\.\/components\/BarkCredit\.astro'/);
    expect(home).toMatch(/<BarkCredit[^>]*href="\/lab\/bdl-001"/);
    expect(home).toMatch(/BDL-001 · The Bark Engine, live/);
    // the old inline credit anchor is gone
    expect(home).not.toMatch(/<a class="bark-credit smallcaps"/);
  });

  it('/contact/sent credits BDL-001 with a link', () => {
    const sent = read('pages/contact/sent.astro');
    expect(sent).toMatch(/import BarkCredit from '\.\.\/\.\.\/components\/BarkCredit\.astro'/);
    expect(sent).toMatch(/<BarkCredit[^>]*href="\/lab\/bdl-001"/);
  });
});
