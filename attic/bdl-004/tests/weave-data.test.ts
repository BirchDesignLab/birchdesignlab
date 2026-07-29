import { describe, it, expect } from 'vitest';
import { YARNS, DAILY_WARPS, yarnHex } from '../src/experiments/bdl-004/data/yarns';
import { PRESETS } from '../src/experiments/bdl-004/data/presets';
import { yarnSchema, presetSchema } from '../src/lib/weave/schema';

describe('yarn shelf', () => {
  it('holds 14 valid yarns with unique ids', () => {
    expect(YARNS).toHaveLength(14);
    for (const y of YARNS) expect(yarnSchema.safeParse(y).success).toBe(true);
    expect(new Set(YARNS.map((y) => y.id)).size).toBe(14);
  });

  it('yarnHex resolves and throws on unknown id', () => {
    expect(yarnHex(YARNS[0].id)).toBe(YARNS[0].hex);
    expect(() => yarnHex('nope')).toThrow();
  });
});

describe('presets', () => {
  it('are the five spec patterns, all schema-valid', () => {
    expect(PRESETS.map((p) => p.id)).toEqual(['plain', 'twill', 'herringbone', 'houndstooth', 'goose-eye']);
    for (const p of PRESETS) expect(presetSchema.safeParse(p).success).toBe(true);
  });

  it('reference only yarns that exist on the shelf', () => {
    const ids = new Set(YARNS.map((y) => y.id));
    for (const p of PRESETS) {
      for (const s of [...p.defaultWarp, ...p.defaultWeft]) expect(ids.has(s.yarn)).toBe(true);
    }
  });

  it('houndstooth carries 4-and-4 stripe sequences in warp and weft', () => {
    const h = PRESETS.find((p) => p.id === 'houndstooth')!;
    expect(h.defaultWarp.map((s) => s.count)).toEqual([4, 4]);
    expect(h.defaultWeft.map((s) => s.count)).toEqual([4, 4]);
  });
});

describe('daily warps', () => {
  it('cover every preset and reference shelf yarns only', () => {
    expect(DAILY_WARPS.length).toBeGreaterThanOrEqual(8);
    const yarnIds = new Set(YARNS.map((y) => y.id));
    const presetIds = new Set(PRESETS.map((p) => p.id));
    for (const c of DAILY_WARPS) {
      expect(presetIds.has(c.preset)).toBe(true);
      for (const s of [...c.warp, ...c.weft]) expect(yarnIds.has(s.yarn)).toBe(true);
    }
    for (const id of presetIds) expect(DAILY_WARPS.some((c) => c.preset === id)).toBe(true);
  });

  it('keep the 4-and-4 color orders on houndstooth entries', () => {
    for (const c of DAILY_WARPS.filter((c) => c.preset === 'houndstooth')) {
      expect(c.warp.map((s) => s.count)).toEqual([4, 4]);
      expect(c.weft.map((s) => s.count)).toEqual([4, 4]);
    }
  });
});
