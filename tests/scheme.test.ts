import { describe, it, expect } from 'vitest';
import { readStoredScheme, setScheme, currentScheme, isScheme, SCHEME_KEY, LEGACY_SCHEME_KEY } from '../src/lib/scheme';

function memoryStorage(init: Record<string, string> = {}) {
  const data = new Map(Object.entries(init));
  return {
    data,
    getItem: (k: string) => (data.has(k) ? data.get(k)! : null),
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}

function fakeRoot() {
  const attrs = new Map<string, string>();
  return {
    attrs,
    getAttribute: (k: string) => attrs.get(k) ?? null,
    setAttribute: (k: string, v: string) => void attrs.set(k, v),
  } as unknown as HTMLElement & { attrs: Map<string, string> };
}

describe('readStoredScheme', () => {
  it('prefers the current key', () => {
    expect(readStoredScheme(memoryStorage({ [SCHEME_KEY]: 'light', [LEGACY_SCHEME_KEY]: 'dark' }))).toBe('light');
  });
  it('falls back to the legacy key', () => {
    expect(readStoredScheme(memoryStorage({ [LEGACY_SCHEME_KEY]: 'light' }))).toBe('light');
  });
  it('ignores junk in either key', () => {
    expect(readStoredScheme(memoryStorage({ [SCHEME_KEY]: 'sepia' }))).toBeNull();
    expect(readStoredScheme(memoryStorage({ [SCHEME_KEY]: 'sepia', [LEGACY_SCHEME_KEY]: 'dark' }))).toBe('dark');
    expect(readStoredScheme(memoryStorage({ [LEGACY_SCHEME_KEY]: 'vaporwave' }))).toBeNull();
  });
  it('tolerates missing or throwing storage', () => {
    expect(readStoredScheme(null)).toBeNull();
    expect(readStoredScheme({ getItem: () => { throw new Error('blocked'); } })).toBeNull();
  });
});

describe('setScheme', () => {
  it('paints the attribute, stores the current key and drops the legacy one', () => {
    const root = fakeRoot();
    const storage = memoryStorage({ [LEGACY_SCHEME_KEY]: 'dark' });
    setScheme('light', root, storage);
    expect(root.attrs.get('data-scheme')).toBe('light');
    expect(storage.data.get(SCHEME_KEY)).toBe('light');
    expect(storage.data.has(LEGACY_SCHEME_KEY)).toBe(false);
  });
  it('still paints when storage throws', () => {
    const root = fakeRoot();
    const throwing = { getItem: () => null, setItem: () => { throw new Error('quota'); }, removeItem: () => {} };
    setScheme('dark', root, throwing);
    expect(root.attrs.get('data-scheme')).toBe('dark');
  });
});

describe('currentScheme and isScheme', () => {
  it('reads light only when explicitly light', () => {
    const root = fakeRoot();
    expect(currentScheme(root)).toBe('dark');
    root.setAttribute('data-scheme', 'light');
    expect(currentScheme(root)).toBe('light');
  });
  it('accepts exactly two values', () => {
    expect(['light', 'dark', 'Light', '', null].map(isScheme)).toEqual([true, true, false, false, false]);
  });
});
