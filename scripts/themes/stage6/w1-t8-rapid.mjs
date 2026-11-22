/**
 * Stage 6 w1 t8, re-run in w2 t11 (C4): rapid division-key presses on the P3
 * proof. Three key clicks 80ms apart, dispatched in-page (no Playwright click
 * latency), from the page as built; the page must end on the third division
 * the cycle reaches (2, 3, 4: so 4). A CDP screencast films the sequence and
 * a timestamped strip (ms from the first press) is written beside the result.
 *
 * Exits 1 when any size does not end on 4, main's clip-path is not none, or
 * the page threw (w3 task 18, T11 C4).
 *
 * Usage (GPU Chromium only; exits 2 on a software renderer):
 *   node scripts/themes/snap.mjs --name s6-w1-t8        # freeze once
 *   BDL_GPU=1 node scripts/themes/stage6/w1-t8-rapid.mjs --port 4470 [--snap s6-w1-t8] [--out <dir>]
 * --port is required: pick a free one (the swarm assigns each task its own).
 * Sizes: 1440 and 390, light. Reduced transparency forced to no-preference,
 * the portal prompt suppressed. Output (scratch, not committed): --out
 * (default scripts/themes/.out/stage6/w2/t11/rapid): rapid.json and
 * rapid__light__<size>.png.
 */
import { chromium } from 'playwright';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suppressPrompt } from '../lib/portal-prompt.mjs';
import { serveProof } from '../proofs/stage6-swiss-p3/serve.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..');
const arg = (n, f) => { const i = process.argv.indexOf(`--${n}`); return i === -1 ? f : process.argv[i + 1]; };
const portArg = arg('port', null);
if (!portArg || !Number.isInteger(Number(portArg))) { console.error('usage: --port <free port> [--snap s6-w1-t8] [--out dir]'); process.exit(1); }
const PORT = Number(portArg);
const SNAP = arg('snap', 's6-w1-t8');
const OUT = resolve(arg('out', join(REPO, 'scripts', 'themes', '.out', 'stage6', 'w2', 't11', 'rapid')));
await mkdir(OUT, { recursive: true });
if (process.env.BDL_GPU !== '1') { console.error('BDL_GPU=1 required'); process.exit(2); }
const dist = join(REPO, 'scripts', 'themes', '.out', `snap-${SNAP}`);
if (!existsSync(dist)) { console.error(`no ${dist}`); process.exit(1); }
const server = await serveProof(PORT, dist);

const b = await chromium.launch({
  headless: true,
  args: ['--hide-scrollbars', '--font-render-hinting=none', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'],
});
const done = async (code = 0) => { await b.close(); server.close(); process.exit(code); };

const R = {};
{
  const p = await b.newPage();
  R.renderer = await p.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl'); return gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL); });
  await p.close();
  console.log('renderer:', R.renderer);
  if (/swiftshader|llvmpipe|software/i.test(R.renderer)) { console.error('software renderer: evidence invalid'); await done(2); }
}

const SIZES = { 1440: { w: 1440, h: 900, dpr: 1 }, 390: { w: 390, h: 844, dpr: 2, mobile: true } };

for (const sizeId of ['1440', '390']) {
  const sz = SIZES[sizeId];
  const context = await b.newContext({
    viewport: { width: sz.w, height: sz.h }, deviceScaleFactor: sz.dpr,
    isMobile: !!sz.mobile, hasTouch: !!sz.mobile, colorScheme: 'light', reducedMotion: 'no-preference',
  });
  await suppressPrompt(context);
  await context.addInitScript(() => {
    try { localStorage.setItem('scheme', 'light'); } catch {}
    try { sessionStorage.setItem('bdl-swiss-dial-hint', '1'); } catch {}
  });
  await context.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
  const p = await context.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(String(e)));
  const cdp0 = await context.newCDPSession(p);
  await cdp0.send('Emulation.setEmulatedMedia', { features: [
    { name: 'prefers-color-scheme', value: 'light' },
    { name: 'prefers-reduced-motion', value: 'no-preference' },
    { name: 'prefers-reduced-transparency', value: 'no-preference' },
  ] });
  await p.goto(`http://127.0.0.1:${PORT}/t/swiss/`, { waitUntil: 'networkidle' });
  await p.addStyleTag({ content: 'bdl-switcher{opacity:0!important;pointer-events:none!important} *{scroll-behavior:auto!important}' }).catch(() => {});
  await p.waitForFunction(() => window.__p3?.relay && document.querySelector('.p3-key'), null, { timeout: 8000 });
  await p.waitForTimeout(700);

  // Film.
  const cdp = await context.newCDPSession(p);
  const frames = [];
  cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
    frames.push({ data, at: metadata.timestamp });
    try { await cdp.send('Page.screencastFrameAck', { sessionId }); } catch {}
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 85, everyNthFrame: 1 });
  await p.waitForTimeout(200);
  const t0 = Date.now() / 1000;
  const out = await p.evaluate(async () => {
    const k = document.querySelector('.p3-key');
    const start = window.__p3.current;
    const seen = [];
    for (let i = 0; i < 3; i++) { k.click(); seen.push(window.__p3.current); await new Promise((r) => setTimeout(r, 80)); }
    await new Promise((r) => setTimeout(r, 1000));
    return { start, seen, end: window.__p3.current, cols: window.__p3.cols(), clip: getComputedStyle(document.querySelector('main')).clipPath, status: document.querySelector('[role="status"]')?.textContent };
  });
  await cdp.send('Page.stopScreencast');
  const kept = frames.filter((f) => f.at >= t0 - 0.02).map((f) => ({ ...f, ms: Math.round((f.at - t0) * 1000) }));
  R[`light__${sizeId}`] = { ...out, errors, frameCount: kept.length, lastMs: kept.at(-1)?.ms };

  // Strip: up to 8 frames spread over the film, timestamped from the first press.
  const n = Math.min(8, kept.length);
  const pickd = Array.from({ length: n }, (_, i) => kept[Math.round((i * (kept.length - 1)) / Math.max(1, n - 1))]);
  const tw = sizeId === '390' ? 220 : 360;
  const th = Math.round(tw * (sz.h / sz.w));
  const cv = createCanvas(tw * n + 6 * (n + 1), th + 40);
  const g = cv.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height);
  g.fillStyle = '#000'; g.font = '13px sans-serif';
  for (let i = 0; i < n; i++) {
    const im = await loadImage(Buffer.from(pickd[i].data, 'base64'));
    const x = 6 + i * (tw + 6);
    g.drawImage(im, x, 28, tw, th);
    g.fillText(`+${pickd[i].ms}ms`, x, 18);
  }
  await writeFile(join(OUT, `rapid__light__${sizeId}.png`), cv.toBuffer('image/png'));
  console.log(sizeId, JSON.stringify(R[`light__${sizeId}`]));
  await context.close();
}
await writeFile(join(OUT, 'rapid.json'), JSON.stringify(R, null, 2));
// Pass only if every size ended on 4 with no clip and no page error (w3 task 18, T11 C4).
const fails = Object.entries(R)
  .filter(([k]) => k.startsWith('light__'))
  .flatMap(([k, r]) => [
    r.end !== 4 && `${k}: ended on ${r.end}, not 4`,
    r.clip !== 'none' && `${k}: main clip-path is ${r.clip}, not none`,
    r.errors.length > 0 && `${k}: ${r.errors.length} page error(s): ${r.errors.join(' | ')}`,
  ])
  .filter(Boolean);
if (fails.length) {
  console.error(`FAIL\n${fails.join('\n')}`);
  await done(1);
}
console.log('PASS: every size ended on 4, clip none, no errors');
await done(0);
