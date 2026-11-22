/**
 * Stage 6 wave 2, task 9 fix round 1 (T2 C3): find and check the white
 * smudge in the hero window's bottom rim band at Frost 0. Serve a snap:
 *
 *   LABEL=diag node scripts/themes/snap.mjs --name s6-w2-t9 --reuse --port 4470 -- node scripts/themes/stage6/w2-t9-smudge.mjs
 *
 * GPU Chromium (--use-angle=d3d11 --enable-gpu), renderer checked through
 * WEBGL_debug_renderer_info; prefers-reduced-transparency forced to
 * no-preference; the portal prompt suppressed. Each try is one CSS rule (or
 * none) added at Frost 0; the corner is cropped for each, light and dark.
 * Output: scripts/themes/.out/stage6/w2/t9/<label>/crops/smudge-diag.png and
 * smudge-diag.json (geometry of the window, its rim layer and filter, and the
 * Control Centre).
 */
import { chromium } from 'playwright';
import sharp from 'sharp';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const LABEL = process.env.LABEL || 'diag';
const OUT = join(HERE, '..', '.out', 'stage6', 'w2', 't9', LABEL, 'crops');
await mkdir(OUT, { recursive: true });
const base = process.env.SNAP_BASE || 'http://127.0.0.1:4470';
const browser = await chromium.launch({ headless: true, args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--enable-gpu-rasterization', '--ignore-gpu-blocklist'] });
{
  const p = await browser.newPage();
  const renderer = await p.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl'); return gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL); });
  await p.close();
  console.log('renderer:', renderer);
  if (/swiftshader|llvmpipe|software/i.test(renderer)) throw new Error('software renderer: evidence invalid');
}

/** In-page: rebuild the window's rim displacement map with a given shift
    profile, `shift(d) = max * profile(1 - d / band)`, so profiles can be
    compared without a rebuild. `maxK` is max as a share of band (fx.ts: 0.9). */
const remap = (maxK, profileSrc) => `js:(() => {
  const win = document.querySelector('.window');
  const rim = win.querySelector(':scope > .glass-rim');
  const id = rim.style.backdropFilter.split('#')[1].split(')')[0].replace(/"/g, '');
  const f = document.getElementById(id);
  const w = win.clientWidth, h = win.clientHeight, cs = getComputedStyle(win);
  const border = parseFloat(cs.borderTopWidth) || 0;
  const r = Math.max(0, Math.min((parseFloat(cs.borderTopLeftRadius) || 0) - border, w / 2, h / 2));
  const band = Math.max(6, Math.min(24, r * 0.85, Math.min(w, h) * 0.22));
  const max = Math.min(30, band * ${maxK});
  const profile = ${profileSrc};
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); const img = g.createImageData(w, h);
  new Uint32Array(img.data.buffer).fill(0xff808080);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const x = i + 0.5, y = j + 0.5;
    const cx = x - w / 2, cy = y - h / 2, qx = Math.abs(cx) - (w / 2 - r), qy = Math.abs(cy) - (h / 2 - r);
    let d, nx, ny;
    if (qx > 0 && qy > 0) { const l = Math.hypot(qx, qy); d = r - l; nx = qx / l; ny = qy / l; }
    else if (qx > qy) { d = r - qx; nx = 1; ny = 0; } else { d = r - qy; nx = 0; ny = 1; }
    nx *= Math.sign(cx || 1); ny *= Math.sign(cy || 1);
    if (d >= band) continue;
    const t = Math.min(1, Math.max(0, 1 - d / band));
    const shift = max * profile(t);
    const k = (j * w + i) * 4;
    img.data[k] = Math.round(128 + ((-nx * shift) / max) * 127);
    img.data[k + 1] = Math.round(128 + ((-ny * shift) / max) * 127);
  }
  g.putImageData(img, 0, 0);
  f.querySelector('feImage').setAttribute('href', c.toDataURL('image/png'));
  f.querySelector('feDisplacementMap').setAttribute('scale', String(2 * max));
})()`;

/** In-page: blur the window rim's source by `sd` px before displacing it. */
const preblur = (sd) => `js:(() => {
  const rim = document.querySelector('.window > .glass-rim');
  const id = rim.style.backdropFilter.split('#')[1].split(')')[0].replace(/"/g, '');
  const f = document.getElementById(id);
  const fe = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur');
  fe.setAttribute('in', 'SourceGraphic'); fe.setAttribute('stdDeviation', '${sd}'); fe.setAttribute('edgeMode', 'duplicate'); fe.setAttribute('result', 'soft');
  f.insertBefore(fe, f.firstChild);
  f.querySelector('feDisplacementMap').setAttribute('in', 'soft');
})()`;

const SETS = {
  cand: [
    ['as is', ''],
    ['max 0.5 band, t^1.6', remap(0.5, '(t) => Math.pow(t, 1.6)')],
    ['max 0.55 band, t^1.6', remap(0.55, '(t) => Math.pow(t, 1.6)')],
    ['as is + source pre-blur 1px', preblur(1)],
    ['max 0.42 band, t^1.6', remap(0.42, '(t) => Math.pow(t, 1.6)')],
    ['as is + source pre-blur 2px', preblur(2)],
  ],
  profiles: [
    ['as is', ''],
    ['remap: same profile (control)', remap(0.9, '(t) => Math.pow(t, 1.6)')],
    ['remap: max 0.6 band, t^1.6 (no fold)', remap(0.6, '(t) => Math.pow(t, 1.6)')],
    ['remap: max 0.9 band, t^1.6 with y shift x0.5', remap(0.45, '(t) => Math.pow(t, 1.6)')],
    ['frost layer off', '.window > .glass-frost { display:none !important; }'],
    ['remap: max 0.9, t^1.6 then no-fold clamp', remap(0.9, '(t) => { const s = 0.98 / 0.9; const tf = Math.pow(s / 1.6, 1 / 0.6); return t <= tf ? Math.pow(t, 1.6) : Math.pow(tf, 1.6) + s * (t - tf); }')],
  ],
};

const TRIES = (process.env.TRIES ? JSON.parse(process.env.TRIES) : process.env.SET ? SETS[process.env.SET] : [
  ['as is', ''],
  ['CC pushed 200px down', '.control-centre { margin-top: 220px !important; }'],
  ['CC backdrop-filter none', '.control-centre { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }'],
  ['CC shadow off', '.control-centre { box-shadow: none !important; }'],
  ['CC ::before/::after off', '.control-centre::before, .control-centre::after { display: none !important; }'],
  ['CC tiles hidden', '.control-centre > * { visibility: hidden !important; }'],
]);

const frames = [];
const geo = {};
for (const scheme of ['light', 'dark']) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: scheme, reducedMotion: 'reduce' });
  await context.addInitScript((s) => { try { localStorage.setItem('scheme', s); } catch {} }, scheme);
  await suppressPrompt(context);
  await context.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
  for (const [note, css] of TRIES) {
    await page.goto(`${base}/t/glassmorphism/`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => document.querySelectorAll('.glass-rim').length >= document.querySelectorAll('.glass, .glass-strong').length, null, { timeout: 6000 }).catch(() => {});
    await page.waitForTimeout(700);
    await page.mouse.move(1430, 890);
    await page.locator('.cc-frost').fill(process.env.FROST || '0');
    await page.waitForTimeout(600);
    // A try that starts with "js:" runs in the page instead of adding CSS.
    if (css.startsWith('js:')) await page.evaluate(css.slice(3));
    else if (css) await page.addStyleTag({ content: css });
    await page.waitForTimeout(1200);
    if (note === 'as is') {
      geo[scheme] = await page.evaluate(() => {
        const rect = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; };
        const win = document.querySelector('.window');
        const rim = win.querySelector(':scope > .glass-rim');
        const id = (rim?.style.backdropFilter || '').match(/#([\w-]+)/)?.[1];
        const f = id ? document.getElementById(id) : null;
        const cc = document.querySelector('.control-centre');
        return {
          window: rect(win), client: [win.clientWidth, win.clientHeight], rim: rect(rim),
          filter: f ? { w: f.getAttribute('width'), h: f.getAttribute('height'), scale: f.querySelector('feDisplacementMap')?.getAttribute('scale') } : null,
          cc: rect(cc), ccBackdrop: cc ? getComputedStyle(cc).backdropFilter : null,
          ccRim: !!cc?.querySelector(':scope > .glass-rim'),
          frost: getComputedStyle(document.documentElement).getPropertyValue('--glass-frost'),
        };
      });
    }
    const r = await page.evaluate(() => { const b = document.querySelector('.window').getBoundingClientRect(); return { x: Math.round(b.left - 20), y: Math.round(b.bottom - 90), width: 520, height: 150 }; });
    frames.push({ buf: await page.screenshot({ clip: r }), note: `${scheme}: ${note}` });
  }
  await context.close();
}
await browser.close();

const cw = 520;
const m = await sharp(frames[0].buf).metadata();
const ch = Math.round((m.height / m.width) * cw);
const cols = TRIES.length > 3 ? 3 : TRIES.length;
const perScheme = Math.ceil(TRIES.length / cols);
const rows = perScheme * 2;
const comps = [];
for (let i = 0; i < frames.length; i++) {
  const s = Math.floor(i / TRIES.length), k = i % TRIES.length;
  const x = 12 + (k % cols) * (cw + 12), y = 12 + (s * perScheme + Math.floor(k / cols)) * (ch + 34);
  comps.push({ input: await sharp(frames[i].buf).resize(cw, ch).toBuffer(), left: x, top: y });
  const label = frames[i].note.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  comps.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${cw}" height="28"><text x="2" y="19" font-family="Segoe UI, sans-serif" font-size="15" fill="#eee">${label}</text></svg>`), left: x, top: y + ch + 2 });
}
const name = process.env.NAME || 'smudge-diag';
await sharp({ create: { width: 12 + cols * (cw + 12), height: 12 + rows * (ch + 34), channels: 3, background: '#1b1b1d' } }).composite(comps).png().toFile(join(OUT, `${name}.png`));
await writeFile(join(OUT, `${name}.json`), JSON.stringify(geo, null, 2));
console.log(JSON.stringify(geo, null, 2));
console.log('wrote', join(OUT, `${name}.png`));
