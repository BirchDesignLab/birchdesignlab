import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { THEMES } from '../src/themes/registry';
import { checkTheme, themeCssPath } from '../src/lib/contrast';

const ROOT = new URL('../', import.meta.url);

/* Every registered school, both schemes, the required pairs plus its own
   meta.contrast extras (spec §6.3). scripts/themes/check-contrast.ts prints
   the same rows as a table. */
describe('school token contrast', () => {
  for (const theme of THEMES) {
    it(`${theme.id} holds every pair in both schemes`, () => {
      const css = readFileSync(new URL(themeCssPath(theme.id), ROOT), 'utf8');
      const failures = checkTheme(css, theme)
        .filter((r) => !r.ok)
        .map(
          (r) =>
            `${r.theme} / ${r.scheme} / ${r.pair.fg} on ${r.pair.bg.join(' over ')} / ` +
            (r.error ?? `${r.ratio.toFixed(2)} < ${r.pair.min}`),
        );
      expect(failures, failures.join('; ')).toEqual([]);
    });
  }
});
