/**
 * Stage 6 w2 t11 (R2 C4, C6): the glass R2 proof under prefers-contrast: more
 * at 1440 (E10 off state: no lens, no ruler, no clear-bar fill), beside the
 * same page with no-preference. Also passes the snap dir to serveProof with
 * forward slashes, which used to 403 every request (C6).
 *
 *   BDL_GPU=1 node scripts/themes/stage6/w2-t11-contrast.mjs --port 4470 [--snap s6-w1-t7] [--out dir]
 * Output (scratch): contrast.json, contrast-<more|none>__<scheme>.png
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suppressPrompt } from '../lib/portal-prompt.mjs';
import { serveProof } from '../proofs/stage6-glass-r2/serve.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..');
const arg = (n, f) => { const i = process.argv.indexOf(`--${n}`); return i === -1 ? f : process.argv[i + 1]; };
const portArg = arg('port', null);
if (!portArg || !Number.isInteger(Number(portArg))) { console.error('usage: --port <free port>'); process.exit(1); }
const PORT = Number(portArg);
const SNAP = arg('snap', 's6-w1-t7');
const OUT = resolve(arg('out', join(REPO, 'scripts', 'themes', '.out', 'stage6', 'w2', 't11', 'contrast')));
await mkdir(OUT, { recursive: true });
if (process.env.BDL_GPU !== '1') { console.error('BDL_GPU=1 required'); process.exit(2); }
const dist = join(REPO, 'scripts', 'themes', '.out', `snap-${SNAP}`).split('\\').join('/');
if (!existsSync(dist)) { console.error(`no ${dist}`); process.exit(1); }
const server = await serveProof(PORT, dist); // forward slashes on purpose (C6)
const b = await chromium.launch({ headless: true, args: ['--hide-scrollbars', '--font-render-hinting=none', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] });
const done = async (c = 0) => { await b.close(); server.close(); process.exit(c); };
const R = {};
{
  const p = await b.newPage();
  R.renderer = await p.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl'); return gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL); });
  await p.close();
  console.log('renderer:', R.renderer);
  if (/swiftshader|llvmpipe|software/i.test(R.renderer)) { console.error('software renderer'); await done(2); }
}
for (const scheme of ['light', 'dark']) for (const mode of ['more', 'none']) {
  const context = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: scheme, reducedMotion: 'no-preference' });
  await suppressPrompt(context);
  await context.addInitScript((s) => { try { localStorage.setItem('scheme', s); } catch {} }, scheme);
  await context.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [
    { name: 'prefers-color-scheme', value: scheme },
    { name: 'prefers-reduced-motion', value: 'no-preference' },
    { name: 'prefers-reduced-transparency', value: 'no-preference' },
    { name: 'prefers-contrast', value: mode === 'more' ? 'more' : 'no-preference' },
  ] });
  const resp = await page.goto(`http://127.0.0.1:${PORT}/t/glassmorphism/`, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: 'bdl-switcher{opacity:0!important;pointer-events:none!important}' }).catch(() => {});
  await page.waitForTimeout(2500);
  const r = await page.evaluate(() => {
    const bar = document.querySelector('.site-header .bar');
    const vis = (el) => !!el && getComputedStyle(el).display !== 'none';
    const canvasEl = document.querySelector('.lens-canvas');
    const posterEl = document.querySelector('.lens-poster');
    return {
      contrastMore: matchMedia('(prefers-contrast: more)').matches,
      r2: document.documentElement.dataset.r2 ?? null,
      r2On: document.documentElement.classList.contains('r2-on'),
      r2Glass: [...document.querySelectorAll('.r2-glass')].filter(vis).length,
      barLens: [...document.querySelectorAll('.r2-bar-lens')].filter(vis).length,
      barBg: bar && getComputedStyle(bar).backgroundColor,
      barFrostLayers: [...document.querySelectorAll('.site-header .bar > :is(.glass-rim, .glass-frost)')].filter(vis).length,
      lensCanvasExists: !!canvasEl,
      lensCanvasShown: canvasEl ? getComputedStyle(canvasEl).display !== 'none' : false,
      lensPosterShown: vis(posterEl),
    };
  });
  R[`${mode}__${scheme}`] = { status: resp.status(), ...r, errors };
  await writeFile(join(OUT, `contrast-${mode}__${scheme}.png`), await page.screenshot({ type: 'png' }));
  console.log(mode, scheme, JSON.stringify(R[`${mode}__${scheme}`]));
  await context.close();
}
await writeFile(join(OUT, 'contrast.json'), JSON.stringify(R, null, 2));
await done(0);
