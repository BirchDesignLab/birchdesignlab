import { describe, it, expect } from 'vitest';
import { readPage, doc, visibleText } from './helpers';

/* Stage 6 wave 3 task 21 in the build: the toys add no visible word, no
   control and no tab stop; the numerals and the full stop stay inert and the
   pages still carry their own landmarks. */
describe('swiss toys in the build', () => {
  it('Services numerals stay aria-hidden paragraphs inside the process list', () => {
    const root = doc(readPage('/t/swiss/services/'));
    const nums = root.querySelectorAll('section.process .steps .num');
    expect(nums).toHaveLength(4);
    for (const n of nums) {
      expect(n.getAttribute('aria-hidden')).toBe('true');
      expect(n.hasAttribute('tabindex')).toBe(false);
      expect(n.hasAttribute('role')).toBe(false);
    }
  });
  it('Sent keeps its heading text and the full stop in its own span', () => {
    const html = readPage('/t/swiss/contact/sent/');
    const root = doc(html);
    expect(root.querySelector('.sent h1.title .stop')!.text).toBe('.');
    expect(root.querySelector('.sent h1.title')!.text.endsWith('.')).toBe(true);
  });
  it('About keeps the spine aria-hidden and the title stack as three lines, and adds a hidden filter', () => {
    const root = doc(readPage('/t/swiss/about/'));
    expect(root.querySelector('.sw-birch')!.getAttribute('aria-hidden')).toBe('true');
    expect(root.querySelectorAll('h1.title .ln')).toHaveLength(3);
    expect(root.querySelector('svg.flip-defs')!.getAttribute('aria-hidden')).toBe('true');
    expect(root.querySelector('#sw-flip-red')).toBeTruthy();
  });
  it('adds no visible word on any swiss page (the filter and the fields are wordless)', () => {
    for (const route of ['/t/swiss/', '/t/swiss/about/', '/t/swiss/services/', '/t/swiss/contact/', '/t/swiss/contact/sent/']) {
      const text = JSON.stringify(visibleText(readPage(route)));
      expect(text).not.toMatch(/sw-flip|data-live|pressed/i);
    }
  });
});
