/** Prebuild: writes one OG card per manifest page to public/og/. */
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { hashString } from '../../src/lib/bark/pattern';
import { OG_PAGES, OG_LAB_CARDS, OG_LAB_CUSTOM } from '../../src/lib/og/manifest';
import { renderOgCard } from './render';

const seed = hashString(new Date().toISOString().slice(0, 10)); // same derivation as the site's date strategy
const outDir = join(process.cwd(), 'public', 'og');
mkdirSync(outDir, { recursive: true });

for (const card of [...OG_PAGES, ...OG_LAB_CARDS]) {
  const file = join(outDir, `${card.name}.png`);
  writeFileSync(file, renderOgCard(seed, card.title));
  console.log(`og: wrote ${card.name}.png`);
}

// Captured cards are committed next to the piece they belong to and copied
// in as they are: public/og/ is gitignored, so the copy has to happen here.
for (const card of OG_LAB_CUSTOM) {
  copyFileSync(join(process.cwd(), card.src), join(outDir, `${card.name}.png`));
  console.log(`og: copied ${card.name}.png`);
}
