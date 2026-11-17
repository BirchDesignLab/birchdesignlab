// Render the README charts as github.com serves them (raw URL, through <img>,
// under raw.githubusercontent's CSP) beside the local file, to check that
// embedded fonts and the final frame survive. Usage:
//   node scripts/readme/charts/gh-render-check.mjs <branch> [chart-file ...]
// Output: scripts/readme/.out/charts/gh/<file>.png (gitignored).
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';

const [branch = 'main', ...files] = process.argv.slice(2);
const list = files.length ? files : ['4-portal-schools.dark.svg', '1-served.light.svg', '7-timeline.dark.svg'];
const out = resolve('scripts/readme/.out/charts/gh');
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1720, height: 1200 } });
for (const f of list) {
  const gh = `https://github.com/BirchDesignLab/birchdesignlab/raw/${branch}/assets/readme/charts/${f}`;
  const local = pathToFileURL(resolve('assets/readme/charts', f)).href;
  const html = resolve(out, 'page.html');
  writeFileSync(html, `<body style="margin:0;display:flex;gap:20px;background:#888">
    <figure><figcaption>github</figcaption><img id=a width=830 src="${gh}"></figure>
    <figure><figcaption>local</figcaption><img id=b width=830 src="${local}"></figure></body>`);
  await page.goto(pathToFileURL(html).href);
  await page.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0), null, { timeout: 30000 });
  await page.waitForTimeout(6000); // let motion settle to the final frame
  await page.screenshot({ path: resolve(out, f.replace('.svg', '.png')), fullPage: true });
  console.log('ok', f);
}
await browser.close();
