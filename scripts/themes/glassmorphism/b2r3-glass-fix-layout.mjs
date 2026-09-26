/**
 * B2 glass fix round 3 (09-26-26), seat glass-fix-r3: dump Home's first-view
 * geometry at the five review sizes, so the lens poster's CSS spot, the lens
 * start search and the Control Centre's placement can be chosen from real
 * numbers: header, hero window, Control Centre and its tiles, the portal
 * switcher (bdl-switcher host), every hero orb, the poster, the live lens and
 * its start mode. GPU Chromium (aborts on SwiftShader), reduced transparency
 * forced off, the portal prompt suppressed.
 *
 * Usage: node scripts/themes/glassmorphism/b2r3-glass-fix-layout.mjs --base http://127.0.0.1:4471 [--out <dir>]
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const arg = (n, f) => { const i = args.indexOf(`--${n}`); return i === -1 ? f : args[i + 1]; };
const base = arg('base', 'http://127.0.0.1:4471');
const OUT = arg('out', join(HERE, '..', '.out', 'stage3-b2', 'glass-fix-r3'));
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const R = {};
{
  const p = await browser.newPage();
  R.renderer = await p.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl'); return gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL); });
  await p.close();
  console.log('renderer:', R.renderer);
  if (/swiftshader|llvmpipe/i.test(R.renderer)) throw new Error('software renderer; abort');
}
const sizes = [[1440, 900, false], [1280, 800, false], [1024, 768, false], [820, 1180, false], [390, 844, true], [375, 667, true], [430, 932, true]];
for (const [w, h, phone] of sizes) {
  const context = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: phone, isMobile: phone, deviceScaleFactor: phone ? 2 : 1 });
  await suppressPrompt(context);
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
  await page.goto(`${base}/t/glassmorphism/`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelector('.lens-poster')?.style.display === 'none', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(400);
  R[`${w}x${h}`] = await page.evaluate(() => {
    const rr = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom].map(Math.round); };
    const q = (s) => document.querySelector(s);
    return {
      header: rr(q('.site-header')),
      window: rr(q('.hero .window')),
      cc: rr(q('.control-centre')),
      tiles: [...document.querySelectorAll('.cc-tile')].map((t) => [t.className.split(' ').pop(), rr(t)]),
      segRow: rr(q('.cc-seg-row')),
      switcher: rr(q('bdl-switcher')),
      poster: rr(q('.lens-poster')),
      posterDisplay: getComputedStyle(q('.lens-poster')).display,
      hit: rr(q('.lens-hit')),
      lensStart: q('#glass-lens-host')?.dataset.lensStart,
      lensCover: q('#glass-lens-host')?.dataset.lensCover,
      lensSource: q('#glass-lens-host')?.dataset.lensSource,
      hero: rr(q('section.hero')),
      ccTopDoc: Math.round(q('.control-centre').getBoundingClientRect().top + scrollY),
      vh: innerHeight,
      topAtLensCentre: (() => { const h = q('.lens-hit')?.getBoundingClientRect(); if (!h) return null; const e = document.elementFromPoint(h.left + h.width / 2, h.top + h.height / 2); return e ? `${e.tagName.toLowerCase()}.${[...e.classList].join('.')}` : null; })(),
      heroOrbs: [...document.querySelectorAll('.hero .orb')].map((o) => { const r = o.getBoundingClientRect(); return [o.className, Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2), Math.round(r.width / 2)]; }),
      docH: document.documentElement.scrollHeight,
    };
  });
  await page.screenshot({ path: join(OUT, `layout__${w}x${h}.png`) });
  await context.close();
}
await browser.close();
await writeFile(join(OUT, 'layout.json'), JSON.stringify(R, null, 1));
console.log(JSON.stringify(R, null, 1));
