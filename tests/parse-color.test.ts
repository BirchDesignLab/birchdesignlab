import { describe, it, expect } from 'vitest';
import { parseColor } from '../src/lib/bark/renderer';

describe('parseColor', () => {
  it('parses 6-digit hex', () => {
    expect(parseColor('#f4f1ea')).toEqual([244 / 255, 241 / 255, 234 / 255]);
    expect(parseColor('#000000')).toEqual([0, 0, 0]);
  });
  it('parses 3-digit hex', () => {
    expect(parseColor('#fff')).toEqual([1, 1, 1]);
    expect(parseColor('#f00')).toEqual([1, 0, 0]);
  });
  it('parses rgb()/rgba() as produced by getComputedStyle', () => {
    expect(parseColor('rgb(244, 241, 234)')).toEqual([244 / 255, 241 / 255, 234 / 255]);
    expect(parseColor('rgba(28, 27, 25, 0.5)')).toEqual([28 / 255, 27 / 255, 25 / 255]);
  });
  it('tolerates surrounding whitespace', () => {
    expect(parseColor('  #fff  ')).toEqual([1, 1, 1]);
  });
  it('falls back to white on unparseable input', () => {
    expect(parseColor('')).toEqual([1, 1, 1]);
    expect(parseColor('var(--mark)')).toEqual([1, 1, 1]);
  });
});
