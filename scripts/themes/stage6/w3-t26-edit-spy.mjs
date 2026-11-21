/** Stage 6 wave 3, task 26: one-off edit of w3-t26-evidence.mjs, the animate spy installs once and resets its counters (a second install double-counted). Kept for the record. */
import { readFileSync, writeFileSync } from 'node:fs';
const f = new URL('./w3-t26-evidence.mjs', import.meta.url);
let s = readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
const a = "  window.__anim = { n: 0, first: 0, peak: 0 };\n  const orig = Element.prototype.animate;\n";
if (!s.includes(a)) throw new Error('anchor');
s = s.replace(a, "  window.__anim = { n: 0, first: 0, peak: 0 };\n  if (window.__spied) return;\n  window.__spied = true;\n  const orig = Element.prototype.animate;\n");
writeFileSync(f, s);
