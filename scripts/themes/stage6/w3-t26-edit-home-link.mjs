/** Stage 6 wave 3, task 26: one-off edit of w3-t26-evidence.mjs, the swap's way back Home is the header wordmark. Kept for the record. */
import { readFileSync, writeFileSync } from 'node:fs';
const f = new URL('./w3-t26-evidence.mjs', import.meta.url);
let s = readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
const a = s.indexOf("    await page.evaluate(() => { [...document.querySelectorAll('header nav a')].find((l) => /^");
const b = s.indexOf('\n', a);
if (a < 0) throw new Error('anchor');
s = s.slice(0, a) + "    await page.evaluate(() => document.querySelector('header a.wordmark')?.click());" + s.slice(b);
writeFileSync(f, s);
