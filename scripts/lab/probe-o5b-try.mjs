// BDL-013 o5b: quick screenshots of the ch2 / ch4 / ch5 Try it states, desktop
// and phone, without the full shoot. node scripts/lab/probe-o5b-try.mjs
// Writes shots/try-<size>-<name>.png (gitignored).
import { createRequire } from 'node:module';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const { chromium } = createRequire(join(root, 'package.json'))('playwright');
const url = pathToFileURL(join(root, 'docs/bdl-013/mockups/o5b-framework.html')).href;
const out = join(root, 'docs/bdl-013/mockups/shots');
const b = await chromium.launch();
for (const [w, h, name, mobile] of [[1440, 900, 'd', false], [390, 844, 'm', true]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log('PE', String(e)));
  for (const ch of [2, 5]) {
    await p.goto(`${url}?ch=${ch}`); await p.waitForTimeout(1500);
    await p.screenshot({ path: join(out, `try-${name}-ch${ch}.png`) });
  }
  await p.goto(`${url}?ch=4`);
  await p.waitForFunction(() => /Running check 4 of 7/.test(document.getElementById('gstat').textContent), null, { timeout: 20000 });
  await p.screenshot({ path: join(out, `try-${name}-ch4-mid.png`) });
  await ctx.close();
}
await b.close();
