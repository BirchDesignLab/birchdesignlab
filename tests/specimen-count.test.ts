import { describe, it, expect } from 'vitest';
import { labCountLabel } from '../src/lib/specimen-count';

describe('labCountLabel', () => {
  it('reads as sentences a person would say', () => {
    expect(labCountLabel(11, 10)).toBe('11 pieces. 10 live, 1 coming soon.');
    expect(labCountLabel(6, 3)).toBe('6 pieces. 3 live, 3 coming soon.');
  });

  it('says so when every piece is live', () => {
    expect(labCountLabel(11, 11)).toBe('11 pieces. All live.');
  });

  it('goes singular at one piece', () => {
    expect(labCountLabel(1, 1)).toBe('1 piece. Live.');
    expect(labCountLabel(1, 0)).toBe('1 piece. Coming soon.');
  });

  it('handles a filter that matched nothing', () => {
    // Reachable: filter to Studies before any study is published.
    expect(labCountLabel(0, 0)).toBe('0 pieces.');
  });

  it('says so when nothing is live yet', () => {
    expect(labCountLabel(3, 0)).toBe('3 pieces. All coming soon.');
  });

  it('keeps one word for each state and never says specimen', () => {
    for (let total = 0; total <= 12; total++) {
      for (let live = 0; live <= total; live++) {
        const line = labCountLabel(total, live);
        expect(line, `${total}/${live}`).not.toMatch(/specimen|forthcoming|working/i);
        expect(line, `${total}/${live}`).not.toContain(String.fromCharCode(0x2014));
      }
    }
  });
});
