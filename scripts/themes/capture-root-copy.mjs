/**
 * Write the root-copy fixtures from the current dist/.
 *
 * Written 09-22-26. Run ONCE against the build from before the root pages'
 * bodies moved into src/themes/quiet/, then commit the fixtures. From then on
 * tests/dist/root-copy.test.ts holds every later build to the same visible
 * text, line for line. Re-run only for a deliberate copy change, and say so in
 * the commit.
 *
 * Usage: npm run build && node scripts/themes/capture-root-copy.mjs
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { visibleText } from './lib/visible-text.mjs';
import { ROOT_PAGES, ROOT_SKIP } from './lib/root-pages.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = join(REPO, 'tests', 'fixtures', 'root-copy');
await mkdir(OUT, { recursive: true });

for (const { name, file } of ROOT_PAGES) {
  const html = await readFile(join(REPO, 'dist', file), 'utf8');
  const lines = visibleText(html, { skip: ROOT_SKIP });
  await writeFile(join(OUT, `${name}.txt`), lines.join('\n') + '\n');
  console.log(`${name}: ${lines.length} lines`);
}
