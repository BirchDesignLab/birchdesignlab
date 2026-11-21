/** Stage 6 wave 3, task 26: one-off edit of parts/plates.ts, a swing's reach is capped at 1.1 x the peak however much room the plate has (rapid brushes sat at up to 14 degrees). Kept for the record. */
import { readFileSync, writeFileSync } from 'node:fs';
const f = new URL('../../../src/themes/grandmillennial/parts/plates.ts', import.meta.url);
let s = readFileSync(f, 'utf8');
const crlf = s.includes('\r\n');
s = s.replace(/\r\n/g, '\n');
const a = "    const { b, samples } = fitSwing(th0, peak, d, lag, g.pos, g.neg);";
if (!s.includes(a)) throw new Error('anchor');
s = s.replace(a, "    const { b, samples } = fitSwing(th0, peak, d, lag, Math.min(g.pos, CAP_DEG), Math.min(g.neg, CAP_DEG));");
const c = "export const SYMPATHY = 0.24;\n";
if (!s.includes(c)) throw new Error('anchor2');
s = s.replace(c, c + "/** However brushes pile up, no plate is ever carried past this: the struck plate's peak with a little slack for a restart in phase. */\nexport const CAP_DEG = PEAK_DEG * 1.1;\n");
writeFileSync(f, crlf ? s.replace(/\n/g, '\r\n') : s);
