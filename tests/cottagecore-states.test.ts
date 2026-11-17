import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const ROOT = new URL('../src/themes/cottagecore/', import.meta.url);
const read = (p: string) => readFileSync(new URL(p, ROOT), 'utf8');
const css = read('theme.css');

/* Stage 5 B2 task 3: tactile states, tape corners, tablet and Contact. */
describe('cottagecore states and layout', () => {
  it('presses the label flat on :active and gates hover lift behind (hover: hover)', () => {
    expect(css).toMatch(/\.cc-label:active \{[^}]*translate: 0 1px[^}]*rotate: 0deg|\.cc-label:active \{[^}]*rotate: 0deg[^}]*translate: 0 1px/);
    expect(css).toMatch(/@media \(hover: hover\) \{\s*\[data-theme='cottagecore'\] \.cc-label:hover/);
    expect(css).toMatch(/@media \(hover: hover\) \{\s*\[data-theme='cottagecore'\] \.cc-note-link:hover svg/);
  });

  it('lifts every tape variant corner on hover and on tap', () => {
    for (const v of ['cut', 'half', 'ragged', 'pinked']) expect(css).toMatch(new RegExp(`\.cc-tape--${v} \{[^}]*--(c-x|curl|c-y)`));
    expect(css).toContain('.cc-tape:hover::after');
    expect(css).toContain(".cc-tape[data-lift]::after");
    expect(read('fx.ts')).toContain('mountTapes');
  });

  it('keeps the footer nav items on one line and 44px tall on phones', () => {
    const footer = read('Footer.astro');
    expect(footer).toContain('white-space: nowrap');
    expect(footer).toMatch(/min-height: 44px/);
  });

  it('breaks the Contact trust line at the flower', () => {
    const contact = read('pages/Contact.astro');
    expect(contact).toContain('<span class="tp">');
    expect(contact).toMatch(/\.trust \.tp \{ white-space: nowrap/);
  });
});
