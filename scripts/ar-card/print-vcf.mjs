// Print the vCard embedded in a built card landing page, decoded, one line per
// row. Run after `npm run build`. Use it to eyeball the exact card a visitor
// downloads BEFORE any physical card is printed or etched (the vCard identity
// is founder-edited data in src/components/CardLanding.astro; the escaping
// rules live in src/lib/vcard.ts).
//
//   node scripts/ar-card/print-vcf.mjs [channel]
//
// Defaults to hello. Every channel renders the same CardLanding, so the card
// is identical across them; the argument exists so a channel that ever grows
// its own contact details can be checked on its own terms.
import { readFileSync } from 'node:fs';

const channel = process.argv[2] ?? 'hello';
const page = `dist/${channel}/index.html`;

let html;
try {
  html = readFileSync(new URL(`../../${page}`, import.meta.url), 'utf8');
} catch {
  console.error(`Cannot read ${page}. Run npm run build first, or pass a channel that exists (hello, showcase).`);
  process.exit(1);
}
const match = html.match(/data:text\/vcard;charset=utf-8,[^"]+/);
if (!match) {
  console.error(`No vCard data URI found in ${page}. Run npm run build first.`);
  process.exit(1);
}
const vcf = decodeURIComponent(match[0].replace('data:text/vcard;charset=utf-8,', ''));
const CRLF = String.fromCharCode(13, 10);
if (!vcf.includes(CRLF)) {
  console.error('WARNING: vCard is not CRLF-terminated; iOS may reject it.');
}
for (const line of vcf.split(CRLF).filter(Boolean)) console.log(line);
