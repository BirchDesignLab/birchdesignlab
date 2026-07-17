import { describe, it, expect } from 'vitest';
import { pickDaily } from '../src/lib/weave/daily';

describe('pickDaily', () => {
  it('is deterministic for a date', () => {
    expect(pickDaily('2026-07-16', 10)).toBe(pickDaily('2026-07-16', 10));
  });

  it('stays in range', () => {
    for (const d of ['2026-01-01', '2026-07-16', '2027-12-31']) {
      const i = pickDaily(d, 10);
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThan(10);
    }
  });

  it('varies across dates', () => {
    const picks = new Set(
      ['2026-07-16', '2026-07-17', '2026-07-18', '2026-07-19', '2026-07-20'].map((d) => pickDaily(d, 10)),
    );
    expect(picks.size).toBeGreaterThan(1);
  });
});
