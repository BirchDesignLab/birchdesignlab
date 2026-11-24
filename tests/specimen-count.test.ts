import { describe, it, expect } from 'vitest';
import { labCountLabel } from '../src/lib/specimen-count';

describe('labCountLabel', () => {
  it('reads as sentences a person would say', () => {
    expect(labCountLabel(11, 10)).toBe('11 pieces. 10 open today, one still in the workshop.');
    expect(labCountLabel(6, 3)).toBe('6 pieces. 3 open today, 3 still in the workshop.');
  });

  it('says "one" for a single piece still in the workshop and a number from two', () => {
    expect(labCountLabel(5, 4)).toBe('5 pieces. 4 open today, one still in the workshop.');
    expect(labCountLabel(5, 3)).toBe('5 pieces. 3 open today, 2 still in the workshop.');
  });

  it('says so when every piece is open', () => {
    expect(labCountLabel(11, 11)).toBe('11 pieces. All open today.');
  });

  it('goes singular at one piece', () => {
    expect(labCountLabel(1, 1)).toBe('1 piece. Open today.');
    expect(labCountLabel(1, 0)).toBe('1 piece. Still in the workshop.');
  });

  it('handles a filter that matched nothing', () => {
    // Reachable: filter to Studies before any study is published.
    expect(labCountLabel(0, 0)).toBe('0 pieces.');
  });

  it('says so when nothing is open yet', () => {
    expect(labCountLabel(3, 0)).toBe('3 pieces. All still in the workshop.');
  });

  it('keeps one wording for each state and never says specimen, live or an em dash', () => {
    for (let total = 0; total <= 12; total++) {
      for (let live = 0; live <= total; live++) {
        const line = labCountLabel(total, live);
        expect(line, `${total}/${live}`).not.toMatch(/specimen|forthcoming|coming soon|\blive\b|school/i);
        expect(line, `${total}/${live}`).not.toContain(String.fromCharCode(0x2014));
      }
    }
  });
});
