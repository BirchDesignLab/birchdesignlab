// Parse-check every Mermaid block in README.md the way GitHub would render it.
// Writes scripts/readme/.out/mermaid-check.html (gitignored), which loads
// mermaid from jsDelivr and runs mermaid.parse() then render() on each block.
// Open it in a browser; document.title becomes "PASS n/n" or "FAIL ...", and
// window.results holds per-block errors.
//
// Usage: node scripts/readme/mermaid-check.mjs [README path] [--run]
// A stopgap until the backlog's "Mermaid render check" lands in npm run verify.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const arg = process.argv.slice(2).find((a) => !a.startsWith('--'));
const readme = resolve(arg ?? resolve(here, '../../README.md'));
const text = readFileSync(readme, 'utf8').replace(/\r\n/g, '\n');
const blocks = [...text.matchAll(/```mermaid\n([\s\S]*?)```/g)].map((m) => m[1]);
if (!blocks.length) {
  console.error('no mermaid blocks found in', readme);
  process.exit(1);
}

const html = `<!doctype html><meta charset="utf-8"><title>running</title>
<body><pre id="log"></pre><div id="out"></div>
<script type="module">
import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.esm.min.mjs';
mermaid.initialize({ startOnLoad: false });
const blocks = ${JSON.stringify(blocks)};
const results = [];
for (let i = 0; i < blocks.length; i++) {
  try {
    await mermaid.parse(blocks[i]);
    const { svg } = await mermaid.render('m' + i, blocks[i]);
    document.getElementById('out').insertAdjacentHTML('beforeend', svg);
    results.push({ i, ok: true });
  } catch (e) {
    results.push({ i, ok: false, error: String(e && e.message || e) });
  }
}
window.results = results;
const bad = results.filter((r) => !r.ok);
document.getElementById('log').textContent = JSON.stringify(results, null, 2);
document.title = bad.length ? 'FAIL ' + bad.map((r) => r.i).join(',') : 'PASS ' + results.length + '/' + results.length;
</script>`;

const out = resolve(here, '.out/mermaid-check.html');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html);
console.log(`${blocks.length} blocks -> ${out}`);

// --run: open the page in headless Chromium (playwright resolved from the
// current directory's node_modules) and exit 1 on any failed block.
if (process.argv.includes('--run')) {
  const { createRequire } = await import('node:module');
  const { pathToFileURL } = await import('node:url');
  const require = createRequire(resolve(process.cwd(), 'package.json'));
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(pathToFileURL(out).href);
  await page.waitForFunction(() => document.title !== 'running', null, { timeout: 60000 });
  const title = await page.title();
  const results = await page.evaluate(() => window.results);
  await browser.close();
  for (const r of results) console.log(r.ok ? `block ${r.i}: ok` : `block ${r.i}: ${r.error}`);
  console.log(title);
  process.exit(title.startsWith('PASS') ? 0 : 1);
}
