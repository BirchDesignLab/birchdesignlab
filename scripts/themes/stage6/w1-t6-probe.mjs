/** Stage 6 w1 t6: a scratch probe, evaluates an expression on a page.
 *   BASE=http://127.0.0.1:4470 node scripts/themes/stage6/w1-t6-probe.mjs /t/swiss/ 1440 "document.title" */
import { chromium } from 'playwright';
const [path, w = '1440', expr] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--hide-scrollbars'] });
const p = await (await b.newContext({ viewport: { width: +w, height: 900 } })).newPage();
await p.goto(`${process.env.BASE || 'http://127.0.0.1:4470'}${path}`, { waitUntil: 'networkidle' });
console.log(JSON.stringify(await p.evaluate(expr), null, 1));
await b.close();
