/**
 * Stage 6 wave 3, task 27: the About page's edits for cottagecore's needle and thread (the hoop gets the
 * stitch layer under its words, the needle on its rim, and the ring width as a variable). Run once from the
 * repo root; every hunk is checked and the run stops if one is missing (the file is CRLF, so hunks are
 * matched with their \r\n). Idempotent: a hunk already applied is skipped.
 *
 *   node scripts/themes/stage6/w3-t27-edit-about.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = 'src/themes/cottagecore/pages/About.astro';
let src = readFileSync(FILE, 'utf8');
const crlf = src.includes('\r\n');
if (crlf) src = src.replace(/\r\n/g, '\n');

const hunks = [
  ['import Pressed from', "import Needle from '../assets/Needle.astro';\nimport Pressed from", "import Needle from '../assets/Needle.astro';"],
  [
    '    <div class="cloth">\n      <p class="manifesto">{copy.manifesto}</p>',
    '    <div class="cloth">\n      <svg class="nt-layer" aria-hidden="true" focusable="false"><g class="nt-threads"></g></svg>\n      <p class="manifesto">{copy.manifesto}</p>',
    'class="nt-layer"',
  ],
  [
    '      <Signature class="sig" />\n    </div>\n  </div>',
    '      <Signature class="sig" />\n    </div>\n    <Needle />\n  </div>',
    '<Needle />',
  ],
  [
    '    border-radius: 50%;\n    padding: 0.9rem;\n    background:',
    '    border-radius: 50%;\n    --ring: 0.9rem;\n    padding: var(--ring);\n    background:',
    '--ring: 0.9rem;',
  ],
  [
    '    .hoop { padding: 0.65rem; }',
    '    .hoop { --ring: 0.65rem; }',
    '.hoop { --ring: 0.65rem; }',
  ],
  [
    '  .manifesto {\n    max-width: 72%;',
    '  .manifesto {\n    position: relative; z-index: 1;\n    max-width: 72%;',
    'position: relative; z-index: 1;\n    max-width: 72%;',
  ],
  [
    '  .cloth :global(.motif) { width: 6.6rem; }',
    '  /* The stitch layer (needle.ts) lies under the hoop\'s words: the manifesto, the sprig and the maker\'s line sit above it. */\n  .cloth :global(.motif) { width: 6.6rem; position: relative; z-index: 1; }',
    "position: relative; z-index: 1; }",
  ],
  [
    "  .cloth :global(.sig) { width: 8.4rem; margin-top: -0.2rem; }",
    "  .cloth :global(.sig) { width: 8.4rem; margin-top: -0.2rem; position: relative; z-index: 1; }",
    "margin-top: -0.2rem; position: relative; z-index: 1; }",
  ],
];

for (const [from, to, done] of hunks) {
  if (src.includes(done) && !src.includes(from)) continue; // already applied
  if (!src.includes(from)) throw new Error(`hunk not found: ${from.slice(0, 60)}`);
  src = src.replace(from, to);
}
writeFileSync(FILE, crlf ? src.replace(/\n/g, '\r\n') : src, 'utf8');
console.log('About.astro edited');
