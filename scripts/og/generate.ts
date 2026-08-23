/** Prebuild: writes one OG card per manifest page to public/og/. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { hashString } from '../../src/lib/bark/pattern';
import { OG_PAGES, OG_LAB_CARDS } from '../../src/lib/og/manifest';
import { renderOgCard } from './render';

const seed = hashString(new Date().toISOString().slice(0, 10)); // same derivation as the site's date strategy
const outDir = join(process.cwd(), 'public', 'og');
mkdirSync(outDir, { recursive: true });

for (const card of [...OG_PAGES, ...OG_LAB_CARDS]) {
  const file = join(outDir, `${card.name}.png`);
  writeFileSync(file, renderOgCard(seed, card.title));
  console.log(`og: wrote ${card.name}.png`);
}
