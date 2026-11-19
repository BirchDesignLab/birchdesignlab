/**
 * Stage 6 glass lens diagnosis, part 4: with NO media emulation, what does
 * this machine's Chromium report for prefers-reduced-transparency and
 * prefers-contrast, and does the lens mount and show on Home? (Windows'
 * "Transparency effects" switch feeds prefers-reduced-transparency in
 * Chromium; this machine's HKCU ...\Themes\Personalize EnableTransparency
 * read 0 on 11-19-26.) Tries Playwright's Chromium and, if installed, the
 * real Chrome channel, both headless.
 * Usage: node scripts/themes/snap.mjs --name stage6-base --reuse --port 4462 -- node scripts/themes/stage6/glass-diag-os-media.mjs
 */
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', '.out', 'stage6-glass-diag');
await mkdir(OUT, { recursive: true });
const base = process.env.SNAP_BASE || 'http://127.0.0.1:4462';
const R = {};
for (const channel of [undefined, 'chrome', 'msedge']) {
  let browser;
  try {
    browser = await chromium.launch({ channel, headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--enable-gpu-rasterization', '--ignore-gpu-blocklist'] });
  } catch (e) { R[channel ?? 'playwright-chromium'] = `launch failed: ${String(e).split('\n')[0]}`; continue; }
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${base}/t/glassmorphism/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  const key = channel ?? 'playwright-chromium';
  R[key] = await page.evaluate(() => {
    const mm = (q) => matchMedia(q).matches;
    const hit = document.querySelector('.lens-hit');
    const poster = document.querySelector('.lens-poster');
    const pane = document.querySelector('.window.glass');
    const gl = document.createElement('canvas').getContext('webgl');
    return {
      ua: navigator.userAgent,
      renderer: gl ? gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL) : null,
      reducedTransparency: mm('(prefers-reduced-transparency: reduce)'),
      contrastMore: mm('(prefers-contrast: more)'),
      forcedColors: mm('(forced-colors: active)'),
      reducedMotion: mm('(prefers-reduced-motion: reduce)'),
      lensHit: hit ? { display: getComputedStyle(hit).display, w: hit.getBoundingClientRect().width } : null,
      canvasVis: document.querySelector('.lens-canvas')?.style.visibility ?? null,
      posterDisplay: poster ? getComputedStyle(poster).display : null,
      paneBackdrop: pane ? getComputedStyle(pane).backdropFilter : null,
      paneBg: pane ? getComputedStyle(pane).backgroundColor : null,
    };
  });
  await page.screenshot({ path: join(OUT, `os-media__${key}.png`) });
  await browser.close();
}
await writeFile(join(OUT, 'os-media-results.json'), JSON.stringify(R, null, 2));
console.log(JSON.stringify(R, null, 1));
