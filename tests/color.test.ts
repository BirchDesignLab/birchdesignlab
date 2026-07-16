import { describe, it, expect } from 'vitest';
import { luminance, contrast, rgbToHex } from '../src/lib/color';

describe('contrast', () => {
  it('matches known WCAG ratios', () => {
    expect(contrast('#ffffff', '#000000')).toBeCloseTo(21, 1);
    expect(contrast('#f4f1ea', '#1c1b19')).toBeCloseTo(15.26, 1);
  });
  it('is symmetric', () => {
    expect(contrast('#2b4a37', '#f5f1e8')).toBeCloseTo(contrast('#f5f1e8', '#2b4a37'), 5);
  });
});

describe('luminance', () => {
  it('bounds white and black', () => {
    expect(luminance('#ffffff')).toBeCloseTo(1, 5);
    expect(luminance('#000000')).toBeCloseTo(0, 5);
  });
});

describe('rgbToHex', () => {
  it('converts computed-style rgb strings', () => {
    expect(rgbToHex('rgb(244, 241, 234)')).toBe('#f4f1ea');
    expect(rgbToHex('rgba(28, 27, 25, 0.5)')).toBe('#1c1b19');
  });
  it('passes through non-rgb strings', () => {
    expect(rgbToHex('#abc')).toBe('#abc');
  });
});
