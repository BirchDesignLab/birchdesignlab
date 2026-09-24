/**
 * Screenshot a school's page at rest after the visitor has arrived on it by a
 * swap, not by a hard load, so two builds can be pixel-diffed there.
 *
 * Written 09-23-26 for Tier 3 stage 2 (the freeze investigation's agent L,
 * tier3-stage2/freeze-investigation.md). capture.mjs stills are hard loads,
 * and agent L's school changes (vaporwave's sunset linking behind the CRT
 * line, cottagecore's fireflies waiting for the arrival to finish) only act
 * on a swap from another school. This makes that swap, waits for the
 * arrival to finish and settle, and takes the viewport, with capture.mjs's
 * settings (reduced motion, so vaporwave draws its still frame and the
 * fireflies one still frame; no LCD text; switcher hidden; scheme seeded).
 * Math.random is replaced by a seeded generator before any page script, so
 * the fireflies land in the same places in both builds.
 * Also --trips page (the school's Home loaded, then its About link followed)
 * and load (the school's Home by a hard load, as capture.mjs takes it, but
 * with the seeded Math.random, so cottagecore's dark stills can be compared).
 *
 * Usage (against a snapshot):
 *   BDL_GPU=1 node scripts/themes/snap.mjs --name freeze-l1 --reuse --port 4493 -- \
 *     node scripts/themes/harness/arrival-rest.mjs --label freeze-l1-rest \
 *     [--schools vaporwave,cottagecore] [--schemes dark,light] [--viewports desktop,mobile] \
 *     [--trips arrive,page]
 * then: node scripts/themes/diff-captures.mjs --a freeze-l0-rest --b freeze-l1-rest
 * Output: scripts/themes/.out/<label>/<school>-<trip>__<scheme>__<viewport>.png
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VIEWPORTS } from '../capture.mjs';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}
const list = (name, fallback) => arg(name, fallback).split(',').filter(Boolean);
const base = arg('base', process.env.SNAP_BASE || 'http://127.0.0.1:8787').replace(/\/$/, '');
const label = arg('label', 'arrival-rest');
const schools = list('schools', 'vaporwave,cottagecore');
const schemes = list('schemes', 'dark,light');
const viewports = list('viewports', 'desktop,mobile');
const trips = list('trips', 'arrive,page');
/* After the arrival's transition has finished (data-from-theme cleared),
   this long for the canvases and reveals to settle. */
const SETTLE_MS = 1200;

const useGpu = process.env.BDL_GPU === '1';
const browser = await chromium.launch({
  args: [
    '--hide-scrollbars',
    '--font-render-hinting=none',
    '--disable-lcd-text',
    ...(useGpu ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] : []),
  ],
});
const outDir = join(HERE, '..', '.out', label);
await mkdir(outDir, { recursive: true });
const problems = [];
let renderer = null;

for (const school of schools) {
  for (const trip of trips) {
    for (const scheme of schemes) {
      for (const vpName of viewports) {
        const vp = VIEWPORTS[vpName];
        const context = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          deviceScaleFactor: vp.mobile ? 2 : 1,
          isMobile: !!vp.mobile,
          hasTouch: !!vp.mobile,
          colorScheme: scheme,
          reducedMotion: 'reduce',
        });
        await context.addInitScript((s) => {
          try { localStorage.setItem('scheme', s); localStorage.setItem('theme', s); } catch {}
          // mulberry32, seeded the same in every document.
          let a = 0x9e3779b9;
          Math.random = () => {
            a |= 0; a = (a + 0x6d2b79f5) | 0;
            let t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
          };
          document.addEventListener('DOMContentLoaded', () => {
            const style = document.createElement('style');
            style.textContent = 'bdl-switcher { display: none !important; }';
            document.head.append(style);
          });
        }, scheme);
        await suppressPrompt(context);
        await context.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
        const page = await context.newPage();
        page.on('pageerror', (e) => problems.push(`${school} ${trip} pageerror: ${e.message}`));
        page.on('console', (m) => { if (m.type() === 'error') problems.push(`${school} ${trip} console: ${m.text()}`); });
        if (!renderer) {
          await page.goto('about:blank');
          renderer = await page.evaluate(() => {
            const gl = document.createElement('canvas').getContext('webgl');
            const x = gl && gl.getExtension('WEBGL_debug_renderer_info');
            return x ? gl.getParameter(x.UNMASKED_RENDERER_WEBGL) : 'unknown';
          });
          console.log(`renderer: ${renderer}`);
          if (useGpu && /swiftshader|llvmpipe/i.test(renderer)) throw new Error('software rasteriser');
        }
        const start = trip === 'arrive' ? '/t/quiet/' : `/t/${school}/`;
        const to = trip === 'arrive' ? `/t/${school}/` : `/t/${school}/about/`;
        await page.goto(base + start, { waitUntil: 'networkidle' });
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(300);
        if (trip !== 'load') {
          await page.evaluate((href) => {
            const a = document.createElement('a');
            a.href = href;
            a.textContent = 'go';
            a.style.cssText = 'position:fixed;left:0;top:0;opacity:0';
            document.body.append(a);
            a.click();
          }, to);
          await page.waitForFunction((path) => location.pathname === path && !document.documentElement.dataset.fromTheme, to, { timeout: 10000 });
        }
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(SETTLE_MS);
        const file = `${school}-${trip}__${scheme}__${vpName}.png`;
        await page.screenshot({ path: join(outDir, file) });
        console.log(file);
        await context.close();
      }
    }
  }
}
await browser.close();
if (problems.length) {
  console.log('Problems:\n' + problems.join('\n'));
  process.exit(2);
}
