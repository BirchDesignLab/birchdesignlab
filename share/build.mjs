// Builds share/public/ from the source pages it shows. Each source is an
// artifact-style HTML body (no doctype/head), so this wraps it in a real
// document with noindex. Re-run after editing a source, then deploy.
//   node share/build.mjs && npx wrangler deploy --config share/wrangler.jsonc
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const PAGES = [
  {
    src: 'C:/git/websites/cheerAndChatter/files/docs/data-map/data-map-10-06-26.html',
    out: 'cheer-chatter/data-map/index.html',
    // files the page loads by relative path, copied next to it
    with: ['C:/git/websites/cheerAndChatter/files/docs/data-map/data-map-assets.js'],
  },
];

const head = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
`;

for (const p of PAGES) {
  const body = readFileSync(p.src, 'utf8');
  const out = join(here, 'public', p.out);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, head + body + '\n</html>\n');
  console.log('[share] wrote', p.out);
  for (const extra of p.with || []) {
    const name = extra.split('/').pop();
    copyFileSync(extra, join(dirname(out), name));
    console.log('[share] copied', name);
  }
}
