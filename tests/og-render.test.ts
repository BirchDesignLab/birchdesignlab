import { describe, it, expect } from 'vitest';
import { renderOgCard, OG_WIDTH, OG_HEIGHT } from '../scripts/og/render';
import { hashString } from '../src/lib/bark/pattern';

const seed = hashString('2026-07-16');

describe('renderOgCard', () => {
  it('produces a 1200x630 PNG', () => {
    const png = renderOgCard(seed, 'Services');
    expect(png.subarray(1, 4).toString('ascii')).toBe('PNG');
    expect(png.readUInt32BE(16)).toBe(OG_WIDTH);
    expect(png.readUInt32BE(20)).toBe(OG_HEIGHT);
  });

  it('is deterministic for a given seed', () => {
    expect(renderOgCard(seed, 'Services').equals(renderOgCard(seed, 'Services'))).toBe(true);
  });

  it('differs across seeds', () => {
    expect(renderOgCard(seed, null).equals(renderOgCard(seed + 1, null))).toBe(false);
  });
});
