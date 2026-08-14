import { describe, it, expect } from 'vitest';
import { specimenCountLabel } from '../src/lib/specimen-count';

describe('specimenCountLabel', () => {
  it('reads as a sentence a person would say', () => {
    expect(specimenCountLabel(6, 3)).toBe('6 specimens · 3 working');
  });

  it('goes singular at one specimen', () => {
    expect(specimenCountLabel(1, 1)).toBe('1 specimen · 1 working');
  });

  it('handles a filter that matched nothing', () => {
    // Reachable: filter to Studies before any study is published.
    expect(specimenCountLabel(0, 0)).toBe('0 specimens · 0 working');
  });

  it('does not pluralise the working half, which is a count not a noun', () => {
    expect(specimenCountLabel(4, 1)).toBe('4 specimens · 1 working');
  });
});
