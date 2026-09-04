/**
 * `npm run cards` — render the still cards and carousel slides to PNG.
 *
 * NOT BUILT YET. Needs a card template (an HTML page inside social/, served
 * locally, styled from the brand's own type and colour — not imported from the
 * site's stylesheets, so a copy-pass on the site can never silently restyle an
 * asset that has already been posted).
 */
import { flatten, readManifest } from '../scripts/manifest.mjs';

const rows = flatten(await readManifest());
const targets = rows
  .filter((r) => r.kind.startsWith('card:') || r.kind === 'carousel' || r.kind === 'still')
  .flatMap((r) =>
    r.kind === 'carousel'
      ? Array.from({ length: r.slides ?? 0 }, (_, i) => `${r.id}-${String(i + 1).padStart(2, '0')}-${r.formats[0]}`)
      : r.formats.map((f) => `${r.id}-${f}`)
  );

console.log('render/cards.mjs is scaffolded but not implemented.\n');
console.log(`It would build ${targets.length} PNGs into social/out/:`);
for (const t of targets) console.log(`  ${t}.png`);
console.log('\nStill needed: the card template page and its type/colour scale.');
process.exit(1);
