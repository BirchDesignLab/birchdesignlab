/**
 * Stage 6 wave 3, task 20: the toys must not move layout. Records the boxes
 * of every element the task touches and the page heights, per page, size and
 * scheme, against a snapshot; COMPARE=a,b diffs two recordings.
 *
 *   LABEL=after  node scripts/themes/snap.mjs --name s6-w3-t20 --reuse --port 4470 -- node scripts/themes/stage6/w3-t20-layout.mjs
 *   LABEL=before node scripts/themes/snap.mjs --name s6-w3r-t19r-r0 --reuse --port 4470 -- node scripts/themes/stage6/w3-t20-layout.mjs
 *   COMPARE=before,after node scripts/themes/stage6/w3-t20-layout.mjs
 */
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

if (process.env.COMPARE) {
  const [A, B] = process.env.COMPARE.split(',');
  const { OUT } = await import('./w3-t20-lib.mjs');
  const a = JSON.parse(await readFile(join(OUT, `layout-${A}.json`), 'utf8'));
  const b = JSON.parse(await readFile(join(OUT, `layout-${B}.json`), 'utf8'));
  let bad = 0, n = 0;
  for (const k of Object.keys(a)) {
    for (const sel of Object.keys(a[k])) {
      n++;
      const x = a[k][sel], y = b[k]?.[sel];
      if (JSON.stringify(x) !== JSON.stringify(y)) { bad++; console.log('DIFF', k, sel, JSON.stringify(x), '->', JSON.stringify(y)); }
    }
  }
  console.log(bad ? `${bad} of ${n} differ` : `all ${n} boxes identical`);
  process.exit(bad ? 1 : 0);
}

const { launch, open, OUT } = await import('./w3-t20-lib.mjs');
const LABEL = process.env.LABEL || 'after';
const { browser } = await launch();
const R = {};
const SELS = ['.seesaw', '.seesaw svg', '.letter-b', '.letter-b svg', 'h1', 'svg.corner', '.site-footer', '.closer', '.intro', '.num', '.step', '.door', '.billboard', '.poster', '.manifesto', '.founder'];
for (const scheme of ['light', 'dark']) {
  for (const width of [1440, 820, 390]) {
    for (const [id, path] of [['home', '/t/bauhaus/'], ['about', '/t/bauhaus/about/'], ['services', '/t/bauhaus/services/']]) {
      const { ctx, page } = await open(browser, { path, width, scheme, settle: 1800 });
      R[`${id}/${scheme}/${width}`] = await page.evaluate((SELS) => {
        const o = { height: document.documentElement.scrollHeight };
        for (const s of SELS) {
          o[s] = [...document.querySelectorAll(s)].map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.left * 10) / 10, Math.round((r.top + scrollY) * 10) / 10, Math.round(r.width * 10) / 10, Math.round(r.height * 10) / 10]; });
        }
        return o;
      }, SELS);
      await ctx.close();
    }
  }
}
await writeFile(join(OUT, `layout-${LABEL}.json`), JSON.stringify(R));
await browser.close();
console.log('recorded', LABEL, Object.keys(R).length);
