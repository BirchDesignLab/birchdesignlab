// BDL-013 opener mockups: timed screenshots of one mockup, for review.
//
//   node scripts/lab/shoot-bdl-013-mockups.mjs <name> [ms,ms,...] [WxH]
//   e.g. node scripts/lab/shoot-bdl-013-mockups.mjs o1-assembly 1000,4000,8000 1440x900
//
// Opens docs/bdl-013/mockups/<name>.html from disk, takes a shot at each
// elapsed time, writes docs/bdl-013/mockups/shots/<name>-<ms>.png, and prints
// any console errors. Uses the GPU (see the GPU-rendering memory: headless
// otherwise falls back to SwiftShader). Playwright comes from this checkout's
// node_modules, or from the main checkout's when run inside a worktree.
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..');
const candidates = [join(root, 'package.json'), 'C:/git/birchdesignlab/package.json'];
let chromium;
for (const c of candidates) {
  try {
    ({ chromium } = createRequire(c)('playwright'));
    break;
  } catch {}
}
if (!chromium) throw new Error('playwright not found in this checkout or C:/git/birchdesignlab');

// Optional 4th arg: light | dark. Emulates prefers-color-scheme, which the
// mockups read for their default face. Shots then carry the scheme in the name.
const [name, times = '1000,4000,8000', size = '1440x900', scheme] = process.argv.slice(2);
if (!name) throw new Error('usage: shoot-bdl-013-mockups.mjs <name> [ms,...] [WxH] [light|dark]');
if (scheme && scheme !== 'light' && scheme !== 'dark') throw new Error('scheme must be light or dark');
const file = join(root, 'docs', 'bdl-013', 'mockups', `${name}.html`);
if (!existsSync(file)) throw new Error(`no such mockup: ${file}`);
const [width, height] = size.split('x').map(Number);
const out = join(root, 'docs', 'bdl-013', 'mockups', 'shots');
await mkdir(out, { recursive: true });

const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({
  viewport: { width, height },
  deviceScaleFactor: 1,
  ...(scheme ? { colorScheme: scheme } : {}),
});
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(pathToFileURL(file).href);
const t0 = Date.now();
for (const ms of times.split(',').map(Number).sort((a, b) => a - b)) {
  const wait = ms - (Date.now() - t0);
  if (wait > 0) await page.waitForTimeout(wait);
  const p = join(out, `${name}-${width}${scheme ? `-${scheme}` : ''}-${ms}.png`);
  await page.screenshot({ path: p });
  console.log(p);
}
console.log(errors.length ? `ERRORS:\n${errors.join('\n')}` : 'no console errors');
await browser.close();
