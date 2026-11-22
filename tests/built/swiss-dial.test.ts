import { describe, it, expect } from 'vitest';
import { readPage, doc, visibleText } from './helpers';

/* The width dial in the built Home: a slider with its range and a label that
   starts with a visible word, hidden until the script measures, adding no
   visible word (copy parity with quiet is held by portal.test.ts), and laid
   beside the untouched h1 inside the clipped hero sheet. */
describe('swiss Home width dial in the build', () => {
  const html = readPage('/t/swiss/');
  const root = doc(html);
  const dial = root.querySelector('[data-sw-dial]');

  it('is a slider with min, max and a label that starts with "Design"', () => {
    expect(dial).toBeTruthy();
    expect(dial!.getAttribute('role')).toBe('slider');
    expect(dial!.getAttribute('aria-valuemin')).toBe('62');
    expect(dial!.getAttribute('aria-valuemax')).toBe('125');
    expect(dial!.getAttribute('aria-label')!.startsWith('Design')).toBe(true);
    expect(dial!.hasAttribute('hidden')).toBe(true);
  });
  it('adds no visible word: the mark and the readout are aria-hidden and empty', () => {
    expect(dial!.querySelector('.dial-read')!.getAttribute('aria-hidden')).toBe('true');
    expect(dial!.querySelector('.dial-mark')!.getAttribute('aria-hidden')).toBe('true');
    expect(JSON.stringify(visibleText(html))).not.toMatch(/Design width/);
  });
  it('leaves the billboard h1 as it was, the dial its sibling in a clipped sheet', () => {
    const h1 = root.querySelector('h1.billboard')!;
    expect(h1.querySelectorAll('.ln').map((l) => l.text)).toEqual(['Birch', 'Design', 'Lab']);
    expect(h1.querySelector('[data-sw-dial]')).toBeNull();
    expect(root.querySelector('.hero-sheet [data-sw-dial]')).toBeTruthy();
  });
  it('the grid key is a pressable button and its layers start hidden', () => {
    const key = root.querySelector('[data-sw-grid-key]')!;
    expect(key.getAttribute('aria-pressed')).toBe('false');
    expect(root.querySelector('[data-sw-guides]')!.hasAttribute('hidden')).toBe(true);
    expect(root.querySelector('[data-sw-marks]')!.hasAttribute('hidden')).toBe(true);
  });
});
