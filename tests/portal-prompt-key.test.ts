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
