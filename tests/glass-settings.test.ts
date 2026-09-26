import { describe, it, expect } from 'vitest';
import { parseSettings, readSettings, writeSettings, applyToDocument, DEFAULT_SETTINGS, type GlassSettings } from '../src/themes/glassmorphism/lens/settings';

function fakeStorage(initial: Record<string, string> = {}) {
  const store = { ...initial };
  return {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => { store[k] = v; },
    _dump: () => ({ ...store }),
  };
}

describe('parseSettings', () => {
  it('returns the default for null (nothing stored yet)', () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
  });
  it('returns the default for corrupt JSON', () => {
    expect(parseSettings('{not json')).toEqual(DEFAULT_SETTINGS);
  });
  it('falls back per-field for an invalid or missing value, never throwing', () => {
    expect(parseSettings(JSON.stringify({ tint: 'purple', tod: 'day', frost: 0.3 }))).toEqual({
      tint: DEFAULT_SETTINGS.tint,
      tod: 'day',
      frost: 0.3,
    });
    expect(parseSettings(JSON.stringify({}))).toEqual(DEFAULT_SETTINGS);
  });
  it('clamps an out-of-range frost value', () => {
    expect(parseSettings(JSON.stringify({ frost: 5 })).frost).toBe(1);
    expect(parseSettings(JSON.stringify({ frost: -5 })).frost).toBe(0);
    expect(parseSettings(JSON.stringify({ frost: Number.NaN })).frost).toBe(DEFAULT_SETTINGS.frost);
  });
  it('accepts a fully valid record unchanged', () => {
    const s: GlassSettings = { tint: 'tinted', frost: 0.8, tod: 'dusk' };
    expect(parseSettings(JSON.stringify(s))).toEqual(s);
  });
});

describe('readSettings / writeSettings', () => {
  it('round-trips through storage', () => {
    const storage = fakeStorage();
    const s: GlassSettings = { tint: 'tinted', frost: 0.2, tod: 'dawn' };
    writeSettings(storage, s);
    expect(readSettings(storage)).toEqual(s);
  });
  it('reads the default when storage throws (private mode)', () => {
    const storage = {
      getItem() { throw new Error('blocked'); },
      setItem() { throw new Error('blocked'); },
    };
    expect(readSettings(storage)).toEqual(DEFAULT_SETTINGS);
    expect(() => writeSettings(storage, DEFAULT_SETTINGS)).not.toThrow();
  });
});

describe('applyToDocument', () => {
  it('sets the tint and time-of-day attributes and the frost custom property', () => {
    const sets: Array<[string, string]> = [];
    const target = {
      documentElement: {
        dataset: {} as DOMStringMap,
        style: { setProperty: (n: string, v: string) => sets.push([n, v]) },
      },
    };
    applyToDocument(target, { tint: 'tinted', frost: 0.75, tod: 'dusk' });
    expect(target.documentElement.dataset.glassTint).toBe('tinted');
    expect(target.documentElement.dataset.glassTod).toBe('dusk');
    expect(sets).toEqual([['--glass-frost', '0.750']]);
  });
});
