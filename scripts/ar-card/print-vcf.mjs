// Print the vCard embedded in the built AR card landing page, decoded, one
// line per row. Run after `npm run build`. Use it to eyeball the exact card a
// visitor downloads BEFORE any physical card is printed or etched (the vCard
// identity is founder-edited data in src/pages/ar-card.astro; the escaping
// rules live in src/lib/vcard.ts).
//
//   node scripts/ar-card/print-vcf.mjs
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../../dist/ar-card/index.html', import.meta.url), 'utf8');
const match = html.match(/data:text\/vcard;charset=utf-8,[^"]+/);
if (!match) {
  console.error('No vCard data URI found in dist/ar-card/index.html. Run npm run build first.');
  process.exit(1);
}
const vcf = decodeURIComponent(match[0].replace('data:text/vcard;charset=utf-8,', ''));
const CRLF = String.fromCharCode(13, 10);
if (!vcf.includes(CRLF)) {
  console.error('WARNING: vCard is not CRLF-terminated; iOS may reject it.');
}
for (const line of vcf.split(CRLF).filter(Boolean)) console.log(line);
