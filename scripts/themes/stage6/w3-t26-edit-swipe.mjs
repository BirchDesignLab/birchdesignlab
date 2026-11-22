/**
 * Stage 6 wave 3, task 26: one-off edit of w3-t26-probe.mjs, the vertical-swipe step: re-measure the plate after the
 * scroll reset (the swipe must start ON the plate) and add a control swipe from bare wall. Kept for the record.
 */
import { readFileSync, writeFileSync } from 'node:fs';
const f = new URL('./w3-t26-probe.mjs', import.meta.url);
let s = readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
const a = s.indexOf('    // a vertical swipe starting on a plate scrolls');
const b = s.indexOf('  // room: every plate');
if (a < 0 || b < 0) throw new Error('anchors');
const block = `    // a vertical swipe starting on a plate scrolls (and a control swipe from bare wall scrolls the same)
    const cdp = await ctx.newCDPSession(page);
    for (const [label, pick] of [['from the plate', 'plate'], ['control, bare wall', 'wall']]) {
      await page.evaluate(() => scrollTo(0, 0));
      await page.waitForTimeout(150);
      await page.evaluate(install);
      const at = await page.evaluate((pick) => {
        const p = document.querySelector('.hero .gm-plate.' + (document.querySelector('.hero .gm-plate.a')?.getClientRects().length ? 'a' : 'y'));
        const r = p.getBoundingClientRect();
        const hero = document.querySelector('.hero').getBoundingClientRect();
        return pick === 'plate' ? { x: r.left + r.width / 2, y: r.top + r.height / 2, on: document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.tagName } : { x: Math.max(8, r.left - 6), y: hero.top + 30, on: document.elementFromPoint(Math.max(8, r.left - 6), hero.top + 30)?.className };
      }, pick);
      await cdp.send('Input.synthesizeScrollGesture', { x: Math.round(at.x), y: Math.round(at.y), yDistance: -300, speed: 800, gestureSourceType: 'touch' });
      await page.waitForTimeout(700);
      const rec = await page.evaluate(() => { window.__rec.on = false; return { run: Math.max(0, ...window.__rec.frames.map((f) => f.run)), y: scrollY }; });
      console.log(\`vertical swipe \${label} (starts on \${at.on}): scrollY 0 -> \${rec.y}, plate animations seen \${rec.run}\`);
    }
  }

`;
s = s.slice(0, a) + block + s.slice(b);
writeFileSync(f, s);
