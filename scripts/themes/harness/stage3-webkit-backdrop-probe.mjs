/**
 * Minimal, page-independent probe: does Playwright's WebKit (on this machine)
 * visibly composite CSS backdrop-filter at all? Written 09-25-26 by the Opus
 * critic of the stage 3 lens WebKit run, to put the runner's "minimal repro"
 * claim on disk (proofs/lens.md, WebKit run, item 2).
 *
 * Renders a bare page: crisp stripes, with boxes on top carrying
 * backdrop-filter blur(14px), brightness(0.1), grayscale(1), and none, plus a
 * plain `filter: blur(14px)` on a stripe copy as a positive control (proves
 * the rasteriser can blur at all). Prints mean horizontal gradient and mean
 * luminance per box, and the WebGL renderer string.
 *
 * Usage: node scripts/themes/harness/stage3-webkit-backdrop-probe.mjs [--headed]
 */
import { webkit } from 'playwright';
import { createCanvas, loadImage } from '@napi-rs/canvas';

const headed = process.argv.includes('--headed');
const browser = await webkit.launch({ headless: !headed });
const page = await browser.newPage({ viewport: { width: 1000, height: 300 } });
const stripes = 'repeating-linear-gradient(90deg,#111 0 6px,#fff 6px 12px)';
const boxes = [
  ['bf-none', 'none'],
  ['bf-blur', 'blur(14px)'],
  ['bf-bright', 'brightness(0.1)'],
  ['bf-gray', 'grayscale(1)'],
];
await page.setContent(`<!doctype html><body style="margin:0;background:linear-gradient(90deg,#f33,#33f)">
${boxes.map(([id, bf], i) => `<div style="position:absolute;top:40px;left:${20 + i * 190}px;width:160px;height:160px;background:${stripes}"></div>
<div id="${id}" style="position:absolute;top:40px;left:${20 + i * 190}px;width:160px;height:160px;-webkit-backdrop-filter:${bf};backdrop-filter:${bf}"></div>`).join('\n')}
<div id="filter-blur" style="position:absolute;top:40px;left:780px;width:160px;height:160px;background:${stripes};filter:blur(14px)"></div>
</body>`);
await page.waitForTimeout(300);
const buf = await page.screenshot();
const img = await loadImage(buf);
const c = createCanvas(img.width, img.height);
const g = c.getContext('2d');
g.drawImage(img, 0, 0);
const d = g.getImageData(0, 0, img.width, img.height).data;
const at = (x, y) => { const i = (y * img.width + x) * 4; return [d[i], d[i + 1], d[i + 2]]; };
const measure = (left) => {
  let grad = 0, lum = 0, n = 0;
  for (let y = 60; y < 180; y++) for (let x = left + 20; x < left + 140; x++) {
    const a = at(x, y), b = at(x + 1, y);
    grad += (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2])) / 3;
    lum += (a[0] + a[1] + a[2]) / 3; n++;
  }
  return { grad: +(grad / n).toFixed(1), lum: +(lum / n).toFixed(1) };
};
const out = {};
boxes.forEach(([id], i) => { out[id] = measure(20 + i * 190); });
out['filter-blur (positive control)'] = measure(780);
out.renderer = await page.evaluate(() => {
  const gl = document.createElement('canvas').getContext('webgl');
  const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
  return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : null;
});
out.computed = await page.evaluate(() => getComputedStyle(document.getElementById('bf-blur')).backdropFilter);
out.version = browser.version();
out.headless = !headed;
console.log(JSON.stringify(out, null, 1));
await browser.close();
