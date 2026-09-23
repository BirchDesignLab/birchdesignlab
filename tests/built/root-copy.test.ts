import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO, readPage, visibleText } from './helpers';
import { ROOT_PAGES, ROOT_SKIP } from '../../scripts/themes/lib/root-pages.mjs';

/**
 * The root business pages render exactly the text they rendered before the
 * theme-schools work moved their bodies into src/themes/quiet/ and their copy
 * into the copy collection. Fixtures were captured from the pre-change build
 * by scripts/themes/capture-root-copy.mjs; a deliberate copy change re-runs
 * that script and says so in its commit.
 *
 * Line-exact on purpose: this is the guard that would have caught Astro 7's
 * compressHTML default eating the space in "survives in bright".
 */
describe('root pages keep their copy', () => {
  for (const { name, route } of ROOT_PAGES) {
    it(`${route} matches tests/fixtures/root-copy/${name}.txt`, () => {
      const fixture = readFileSync(join(REPO, 'tests', 'fixtures', 'root-copy', `${name}.txt`), 'utf8')
        .split(/\r?\n/) // autocrlf checks the fixtures out with CRLF on Windows
        .filter(Boolean);
      expect(visibleText(readPage(route), { skip: ROOT_SKIP })).toEqual(fixture);
    });
  }
});
