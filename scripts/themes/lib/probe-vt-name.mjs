/**
 * Does a view-transition-name change how an element renders when no
 * transition is running? Probes the Chromium that Playwright ships.
 *
 * Written 09-23-26 for Tier 3 stage 1 (the naming contract, S2). The spec
 * (css-view-transitions-1, 2.1.1 Rendering Consolidation) says an element
 * whose computed view-transition-name is not none forms a stacking context
 * and a backdrop root "at any time", not only while captured. That matters
 * for glassmorphism: naming a bar whose children use backdrop-filter would
 * cut their backdrop off at the bar. This checks the browser agrees.
 *
 *   node scripts/themes/lib/probe-vt-name.mjs
 *
 * Self-contained (a data: page); needs no server.
 */
import { chromium } from 'playwright';
import { createCanvas, loadImage } from '@napi-rs/canvas';

const PAGE = `<!doctype html><style>
  body { margin: 0; background: rgb(255, 0, 0); }
  .cell { position: absolute; width: 100px; height: 100px; }
  .blue { background: rgb(0, 0, 255); z-index: 5; }
  .child { position: absolute; inset: 0; background: rgb(0, 255, 0); z-index: 10; }
  .invert { position: absolute; inset: 0; backdrop-filter: invert(1); }
</style>
<!-- Stacking context: a z-index:10 child of a position:relative, z-index:auto
     parent beats a z-index:5 sibling unless the parent is a stacking context. -->
<div class="cell" style="left: 0; top: 0; position: absolute">
  <div id="plain" style="position: relative; width: 100px; height: 100px"><div class="child"></div></div>
</div>
<div class="cell blue" style="left: 0; top: 0"></div>
<div class="cell" style="left: 120px; top: 0">
  <div id="named" style="position: relative; width: 100px; height: 100px; view-transition-name: probe-a"><div class="child"></div></div>
</div>
<div class="cell blue" style="left: 120px; top: 0"></div>
<!-- Backdrop root: an inverting backdrop-filter over the red page reads cyan,
     unless an ancestor is a backdrop root that has painted nothing yet. -->
<div class="cell" style="left: 0; top: 120px"><div class="invert"></div></div>
<div class="cell" style="left: 120px; top: 120px; view-transition-name: probe-b"><div class="invert"></div></div>
<div class="cell invert" style="left: 240px; top: 120px; view-transition-name: probe-c"></div>
</html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 400, height: 260 } });
await page.goto(`data:text/html,${encodeURIComponent(PAGE)}`);
const top = (x, y) => page.evaluate(([x, y]) => getComputedStyle(document.elementFromPoint(x, y)).backgroundColor, [x, y]);
const img = await loadImage(await page.screenshot());
const ctx = createCanvas(img.width, img.height).getContext('2d');
ctx.drawImage(img, 0, 0);
const pixel = (x, y) => {
  const d = ctx.getImageData(x, y, 1, 1).data;
  return `rgb(${d[0]}, ${d[1]}, ${d[2]})`;
};
console.log(`Chromium ${browser.version()}`);
console.log('stacking context (green = child escapes, blue = parent is a stacking context)');
console.log(`  no name:   ${await top(50, 50)}`);
console.log(`  named:     ${await top(170, 50)}`);
console.log('backdrop root (cyan = sees the page, red = backdrop cut off at the named ancestor)');
console.log(`  no name:               ${pixel(50, 170)}`);
console.log(`  named ancestor:        ${pixel(170, 170)}`);
console.log(`  named element itself:  ${pixel(290, 170)}`);
await browser.close();
