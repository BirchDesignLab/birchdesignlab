/** Prebuild: writes one OG card per manifest page to public/og/. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { hashString } from '../../src/lib/bark/pattern';
import { OG_PAGES } from '../../src/lib/og/manifest';
import { renderOgCard } from './render';
import { renderLogo } from './logo';

const seed = hashString(new Date().toISOString().slice(0, 10)); // same derivation as the site's date strategy
const outDir = join(process.cwd(), 'public', 'og');
mkdirSync(outDir, { recursive: true });

for (const page of OG_PAGES) {
  const file = join(outDir, `${page.name}.png`);
  writeFileSync(file, renderOgCard(seed, page.title));
  console.log(`og: wrote ${page.name}.png`);
}

writeFileSync(join(outDir, 'logo.png'), renderLogo());
console.log('og: wrote logo.png');
