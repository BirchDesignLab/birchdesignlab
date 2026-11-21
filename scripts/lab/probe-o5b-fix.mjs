// BDL-013 o5b: frames from the ch5 "Send a fix" move (desktop), to check the
// chip lands / merges / bounces. Writes shots/o5b-fix-<n>.png (gitignored).
//   node scripts/lab/probe-o5b-fix.mjs
import { createRequire } from 'node:module';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const { chromium } = createRequire(join(root, 'package.json'))('playwright');
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(pathToFileURL(join(root, 'docs/bdl-013/mockups/o5b-framework.html')).href + '?ch=5');
await p.waitForTimeout(1500);
await p.click('#sendFix');
for (const [i, ms] of [[1, 600], [2, 1500], [3, 1600], [4, 800]]) {
  await p.waitForTimeout(ms);
  await p.screenshot({ path: join(root, `docs/bdl-013/mockups/shots/o5b-fix-${i}.png`), clip: { x: 0, y: 230, width: 1440, height: 450 } });
}
await b.close();
