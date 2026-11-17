// Builds share/public/ from the source pages it shows. Each source is an
// artifact-style HTML body (no doctype/head), so this wraps it in a real
// document with noindex. Re-run after editing a source, then deploy.
//   node share/build.mjs && npx wrangler deploy --config share/wrangler.jsonc
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
// The page list names client paths, so it lives in a gitignored file next to
// this script rather than in this public repo. Shape:
//   [{ "src": "<abs path to body html>", "out": "<client>/<page>/index.html",
//      "with": ["<abs path to a file the page loads by relative path>"] }]
const listPath = join(here, 'pages.local.json');
if (!existsSync(listPath)) {
  console.error('[share] missing share/pages.local.json (gitignored; see share/README.md)');
  process.exit(1);
}
const PAGES = JSON.parse(readFileSync(listPath, 'utf8'));

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
