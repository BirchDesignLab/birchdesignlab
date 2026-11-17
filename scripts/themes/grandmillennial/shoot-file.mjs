/**
 * Screenshot a local HTML or SVG file in GPU Chromium (B1 task 1 helper).
 * Usage: BDL_GPU=1 node scripts/themes/grandmillennial/shoot-file.mjs <file> <out.png> [w=1440] [h=900] [scale=1]
 */
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const [file, out, w = '1440', h = '900', scale = '1'] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: +scale });
await page.goto(pathToFileURL(resolve(file)).href);
await page.waitForTimeout(400);
const r = await page.evaluate(() => {
  const c = document.createElement('canvas').getContext('webgl');
  const e = c && c.getExtension('WEBGL_debug_renderer_info');
  return e ? c.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'none';
});
console.log('renderer:', r);
await page.screenshot({ path: out });
await browser.close();
