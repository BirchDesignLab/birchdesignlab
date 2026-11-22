import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { PROMPT_KEY } from '../scripts/themes/lib/portal-prompt.mjs';

/**
 * The filming and timing scripts keep the switcher's first-load prompt out of
 * their output by setting its sessionStorage key. If switcher.ts renames the
 * key, the prompt comes back into every strip and every arrival timing
 * without any script failing, so the two are checked here.
 */
describe('the first-load prompt key', () => {
  it('scripts/themes/lib/portal-prompt.mjs uses switcher.ts PROMPT_KEY', () => {
    const src = readFileSync(new URL('../src/themes/portal/switcher.ts', import.meta.url), 'utf8');
    const key = /const PROMPT_KEY = '([^']+)'/.exec(src)?.[1];
    expect(key).toBe(PROMPT_KEY);
  });
});

/**
 * The prompt's closing sentence is the founder's own words (stop 4, 11-21-26):
 * it goes in exactly, with no em dash (a visitor reads it).
 */
describe('the first-load prompt text', () => {
  const src = readFileSync(new URL('../src/themes/portal/switcher.ts', import.meta.url), 'utf8');
  const text = /const FIRST_LOAD_PROMPT =\s*"([^"]+)";/.exec(src)?.[1] ?? '';
  it('ends with the founders sentence, after a space, exactly', () => {
    expect(text.endsWith(' Tap around, too: every school hides a few things that answer back.')).toBe(true);
  });
  it('keeps its first three sentences and uses no em dash', () => {
    expect(text.startsWith('Welcome to the Portal. Choose a design school and watch the page transform.')).toBe(true);
    expect(text).not.toContain(String.fromCharCode(0x2014));
    expect(text).not.toContain(String.fromCharCode(0x2013));
  });
});
