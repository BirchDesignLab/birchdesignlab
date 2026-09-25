/**
 * Wave B1 glass fix round 2 (09-25-26): which part of the new glass page
 * causes the flat field frames on a cold cross-school arrival (quiet ->
 * glass)? Films the same arrival b1-recritic-arrive.mjs films (CDP
 * screencast, prefers-reduced-transparency forced to no-preference), cold,
 * once per condition, each in a fresh context:
 *   asis     the page as built;
 *   nobend   fx.ts's Blink gate made false (navigator.userAgentData brands
 *            overridden), so no SVG bevel is built or prepended;
 *   tinywp   the wallpaper AVIF answered with a 64x40 PNG (decode ~free);
 *   nobf     every backdrop-filter off via a document-level adopted sheet
 *            (survives the ClientRouter swap);
 *   nowp     the wallpaper (main::before background-image) off the same way;
 *   rootwp   the body (so the canvas) painted with the wallpaper image too
 *            (hashed URLs of the b1-glass snap, 09-25-26), to test whether
 *            the fade-through-the-field frames show the canvas background;
 *   webp     the wallpaper AVIF answered with the same image's WebP (decode
 *            cost of the two formats; hashed names of the 09-25-26 snap);
 *   pale     the body painted the base build's pale field colour;
 *   field    the body painted this build's own --field token.
 * Per frame: time after the click, pixel spread and mean (a flat field has
 * almost no spread). "flat" = a frame after the swap whose spread is under
 * --flat (default 38) and whose mean differs from the start frame; "landed"
 * = first frame whose spread exceeds the start frame's by a margin and
 * differs from it; "settled" = first frame from which the picture stays
 * within 8 levels (mean, summed) of the last frame; "firstChange" = first
 * frame that differs from the start frame.
 *
 * Usage: BDL_GPU=1 node scripts/themes/glassmorphism/b1-fix2-arrive-ab.mjs
 *   [--base URL] [--scheme light|dark] [--conds asis,nobend,...] [--reps 2]
 *   [--vw 1440 --vh 900] [--tag name]
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i === -1 ? d : process.argv[i + 1]; };
const BASE = arg('base', process.env.SNAP_BASE || 'http://127.0.0.1:4471');
const scheme = arg('scheme', 'light');
const conds = arg('conds', 'asis,nobend,tinywp,nobf,nowp').split(',');
const reps = Number(arg('reps', '2'));
const vw = Number(arg('vw', '1440'));
const vh = Number(arg('vh', '900'));
const tag = arg('tag', 'ab');
const FLAT = Number(arg('flat', '38'));
const OUT = join(HERE, '..', '.out', 'b1-glass-fix2', `${tag}-${scheme}-${vw}`);
const useGpu = process.env.BDL_GPU === '1';
if (!useGpu) console.warn('BDL_GPU is not 1: this films on SwiftShader, which is a failure for this probe');

const browser = await chromium.launch({ args: ['--hide-scrollbars', ...(useGpu ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] : [])] });
const probe = await browser.newPage();
const tinyPng = Buffer.from(await probe.evaluate(() => {
  const c = document.createElement('canvas'); c.width = 64; c.height = 40;
  const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 64, 40);
  gr.addColorStop(0, '#e89a7a'); gr.addColorStop(1, '#6a5acd'); g.fillStyle = gr; g.fillRect(0, 0, 64, 40);
  return c.toDataURL('image/png').split(',')[1];
}), 'base64');
const stat = (b64) => probe.evaluate(async (b) => {
  const img = new Image(); img.src = 'data:image/png;base64,' + b; await img.decode();
  const cv = document.createElement('canvas'); cv.width = 72; cv.height = 45;
  const g = cv.getContext('2d'); g.drawImage(img, 0, 0, 72, 45);
  const d = g.getImageData(0, 0, 72, 45).data; let n = 0, m = [0, 0, 0], v = 0;
  for (let k = 0; k < d.length; k += 4) { m[0] += d[k]; m[1] += d[k + 1]; m[2] += d[k + 2]; n++; }
  m = m.map((x) => x / n);
  for (let k = 0; k < d.length; k += 4) v += (d[k] - m[0]) ** 2 + (d[k + 1] - m[1]) ** 2 + (d[k + 2] - m[2]) ** 2;
  return { mean: m.map(Math.round), spread: Math.round(Math.sqrt(v / n)) };
}, b64);

const summary = [];
for (const cond of conds) {
  for (let rep = 0; rep < reps; rep++) {
    const dir = join(OUT, `${cond}-${rep}`);
    await mkdir(dir, { recursive: true });
    const c = await browser.newContext({ viewport: { width: vw, height: vh }, colorScheme: scheme, deviceScaleFactor: 1 });
    await c.addInitScript(({ s, cond }) => {
      try { localStorage.setItem('scheme', s); localStorage.setItem('theme', s); localStorage.setItem('bdl-switcher-prompt', 'dismissed'); } catch {}
      if (cond === 'nobend') {
        Object.defineProperty(Navigator.prototype, 'userAgentData', { get: () => ({ brands: [{ brand: 'NotBlink', version: '1' }] }), configurable: true });
      }
      const wp = s === 'dark' ? '/_astro/dark-day.DZ9VbNFf.avif' : '/_astro/light-day.DBBKmb21.avif';
      const css = cond === 'nobf'
        ? '[data-theme=glassmorphism] *, [data-theme=glassmorphism] *::before { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }'
        : cond === 'nowp' ? '[data-theme=glassmorphism] main::before { background-image: none !important; }'
        : cond === 'rootwp' ? `[data-theme=glassmorphism] body { background: var(--wp-body) url(${wp}) center / cover no-repeat fixed !important; }`
        : cond === 'pale' ? '[data-theme=glassmorphism] body { background: #eef0fb !important; }'
        : cond === 'field' ? '[data-theme=glassmorphism] body { background: var(--field) !important; }' : '';
      if (css) {
        const apply = () => { const sh = new CSSStyleSheet(); sh.replaceSync(css); document.adoptedStyleSheets = [...document.adoptedStyleSheets, sh]; };
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply); else apply();
      }
    }, { s: scheme, cond });
    await c.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
    if (cond === 'webp') await c.route(/(light|dark)-day.[^/]*.avif/, async (r) => { const u = r.request().url().replace(/(light|dark)-day.[^/]*.avif/, (m, sc) => (sc === 'dark' ? 'dark-day.DwjJRSmj.webp' : 'light-day.CqYcWjQ3.webp')); const resp = await r.fetch({ url: u }); await r.fulfill({ response: resp, contentType: 'image/webp' }); });
    if (cond === 'tinywp') await c.route(/(light|dark)-day\.[^/]*\.(avif|webp)/, (r) => r.fulfill({ status: 200, contentType: 'image/png', body: tinyPng }));
    const page = await c.newPage();
    const cdp = await c.newCDPSession(page);
    await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
    await page.goto(BASE + '/t/quiet/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await page.evaluate(() => {
      window.__ev = [];
      for (const e of ['astro:before-preparation', 'astro:after-swap', 'astro:page-load']) document.addEventListener(e, () => window.__ev.push([e, performance.now()]));
      const orig = document.startViewTransition?.bind(document);
      if (orig) document.startViewTransition = (...a) => { const vt = orig(...a); vt.finished.then(() => window.__ev.push(['vt-finished', performance.now()])); vt.ready.then(() => window.__ev.push(['vt-ready', performance.now()])); return vt; };
    });
    const frames = [];
    let t0 = 0;
    cdp.on('Page.screencastFrame', async (f) => {
      frames.push({ t: Date.now() - t0, data: f.data });
      try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch {}
    });
    await cdp.send('Page.startScreencast', { format: 'png', everyNthFrame: 1, maxWidth: 720, maxHeight: 450 });
    await page.waitForTimeout(300);
    const clickPerf = await page.evaluate(() => performance.now());
    t0 = Date.now();
    await page.evaluate(() => { const a = document.createElement('a'); a.href = '/t/glassmorphism/'; a.textContent = 'go'; a.style.cssText = 'position:fixed;left:0;top:0;opacity:0'; document.body.append(a); a.click(); });
    await page.waitForTimeout(1500);
    await cdp.send('Page.stopScreencast');
    const ev = (await page.evaluate(() => window.__ev)).map(([e, t]) => `${e}@+${Math.round(t - clickPerf)}`);
    const pre = frames.filter((f) => f.t <= 0);
    const post = frames.filter((f) => f.t > 0);
    const start = await stat((pre.at(-1) || post[0]).data);
    const rows = [];
    for (const f of post) {
      const s = await stat(f.data);
      const moved = Math.abs(s.mean[0] - start.mean[0]) + Math.abs(s.mean[1] - start.mean[1]) + Math.abs(s.mean[2] - start.mean[2]) > 12;
      const kind = !moved ? 'old' : s.spread < FLAT ? 'FLAT' : 'room';
      rows.push({ t: f.t, ...s, kind });
      await writeFile(join(dir, `f_${String(f.t).padStart(4, '0')}ms_${kind}.png`), Buffer.from(f.data, 'base64'));
    }
    const flat = rows.filter((r) => r.kind === 'FLAT').map((r) => r.t);
    const landed = rows.find((r) => r.kind === 'room' && r.spread > start.spread + 10)?.t ?? null;
    // settled: first frame from which every later frame's mean stays within
    // 8 (summed over channels) of the last frame's, i.e. the room is in.
    const last = rows.at(-1);
    const near = (r) => Math.abs(r.mean[0] - last.mean[0]) + Math.abs(r.mean[1] - last.mean[1]) + Math.abs(r.mean[2] - last.mean[2]) <= 8;
    let si = rows.length - 1;
    while (si > 0 && near(rows[si - 1])) si--;
    const settled = rows[si]?.t ?? null;
    // firstChange: first frame that differs from the start frame at all.
    const firstChange = rows.find((r) => r.kind !== 'old')?.t ?? null;
    const line = { cond, rep, flat, firstChange, landed, settled, events: ev, trail: rows.map((r) => `${r.t}:${r.spread}:${r.kind}`).join(' ') };
    console.log(JSON.stringify(line));
    summary.push(line);
    await writeFile(join(dir, 'report.json'), JSON.stringify({ start, rows, ev }, null, 1));
    await c.close();
  }
}
await writeFile(join(OUT, 'summary.json'), JSON.stringify(summary, null, 1));
await browser.close();
