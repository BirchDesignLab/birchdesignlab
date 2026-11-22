/**
 * Stage 6 wave 3, task 26: one-off edit of w3-t26-probe.mjs: the swipe is a real CDP touch sequence
 * (Input.dispatchTouchEvent), since synthesizeScrollGesture did not scroll this emulated page even from bare wall.
 * Kept for the record.
 */
import { readFileSync, writeFileSync } from 'node:fs';
const f = new URL('./w3-t26-probe.mjs', import.meta.url);
let s = readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
const a = "      await cdp.send('Input.synthesizeScrollGesture'";
const i = s.indexOf(a);
if (i < 0) throw new Error('anchor');
const j = s.indexOf('\n', i);
const swipe = `      const x = Math.round(at.x), y0 = Math.round(at.y);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: y0 }] });
      for (let k = 1; k <= 12; k++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + (k % 2), y: y0 - k * 25 }] }); await page.waitForTimeout(16); }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });`;
s = s.slice(0, i) + swipe + s.slice(j);
s = s.replace("on: document.elementFromPoint(Math.max(8, r.left - 6), hero.top + 30)?.className }", "on: String(document.elementFromPoint(Math.max(8, r.left - 6), hero.top + 30)?.getAttribute('class')) }");
writeFileSync(f, s);
