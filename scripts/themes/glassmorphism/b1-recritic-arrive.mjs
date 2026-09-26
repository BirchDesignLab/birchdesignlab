/**
 * Wave B1 glass re-critic (09-25-26): why does the cross-school arrival
 * (/t/quiet/ -> link -> /t/glassmorphism/) still show flat field frames?
 * Films the arrival over the CDP screencast (no-preference transparency,
 * like motion.mjs), and logs when the wallpaper AVIF request starts and ends
 * relative to the click and to Astro's swap events. Runs cold (fresh
 * context) and warm (glass page visited first, so the AVIF is in cache).
 * For every frame it reports the pixel spread (a flat field has almost none)
 * and saves the frames to scripts/themes/.out/b1-glass-recritic/arrive-<mode>/.
 *
 * Usage: BDL_GPU=1 node scripts/themes/glassmorphism/b1-recritic-arrive.mjs [--base URL] [--scheme light]
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', '.out', 'b1-glass-recritic');
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i === -1 ? d : process.argv[i + 1]; };
const BASE = arg('base', 'http://127.0.0.1:4475');
const scheme = arg('scheme', 'light');
const useGpu = process.env.BDL_GPU === '1';

const browser = await chromium.launch({ args: ['--hide-scrollbars', ...(useGpu ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] : [])] });
for (const mode of ['cold', 'warm']) {
  const dir = join(OUT, `arrive-${scheme}-${mode}`);
  await mkdir(dir, { recursive: true });
  const c = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: scheme });
  await c.addInitScript((s) => { try { localStorage.setItem('scheme', s); localStorage.setItem('theme', s); localStorage.setItem('bdl-switcher-prompt', 'dismissed'); } catch {} }, scheme);
  await c.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
  const page = await c.newPage();
  const cdp = await c.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
  if (mode === 'warm') { await page.goto(BASE + '/t/glassmorphism/', { waitUntil: 'networkidle' }); await page.waitForTimeout(500); }
  await page.goto(BASE + '/t/quiet/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const renderer = await page.evaluate(() => { const g = document.createElement('canvas').getContext('webgl'); const e = g?.getExtension('WEBGL_debug_renderer_info'); return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'n/a'; });
  const net = [];
  let t0 = 0;
  page.on('request', (r) => { if (/wallpaper|light-day|dark-day/.test(r.url())) net.push({ ev: 'req', url: r.url().split('/').pop(), t: Date.now() - t0 }); });
  page.on('requestfinished', (r) => { if (/light-day|dark-day/.test(r.url())) net.push({ ev: 'done', url: r.url().split('/').pop(), t: Date.now() - t0 }); });
  await page.evaluate(() => {
    window.__ev = [];
    for (const e of ['astro:before-preparation', 'astro:after-preparation', 'astro:before-swap', 'astro:after-swap', 'astro:page-load']) document.addEventListener(e, () => window.__ev.push([e, performance.now()]));
  });
  const frames = [];
  cdp.on('Page.screencastFrame', async (f) => {
    frames.push({ t: Date.now() - t0, data: f.data });
    try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch {}
  });
  await cdp.send('Page.startScreencast', { format: 'png', everyNthFrame: 1, maxWidth: 720, maxHeight: 450 });
  await page.waitForTimeout(300);
  const link = page.locator('header a[href="/t/glassmorphism/"]').first();
  const hasLink = await link.isVisible().catch(() => false);
  const clickPerf = await page.evaluate(() => performance.now());
  t0 = Date.now();
  if (hasLink) await link.click();
  else await page.evaluate(() => { const a = document.createElement('a'); a.href = '/t/glassmorphism/'; a.textContent = 'go'; a.style.cssText = 'position:fixed;left:0;top:0;opacity:0'; document.body.append(a); a.click(); });
  await page.waitForTimeout(1600);
  await cdp.send('Page.stopScreencast');
  const ev = await page.evaluate(() => window.__ev);
  const events = (ev || []).map(([e, t]) => ({ e, t: Math.round(t - 0) }));
  // Frame flatness: pixel spread of a downscaled copy, measured in page.
  const stats = [];
  const probe = await browser.newPage();
  for (const [i, f] of frames.entries()) {
    await writeFile(join(dir, `f${String(i).padStart(3, '0')}_${f.t}ms.png`), Buffer.from(f.data, 'base64'));
    const s = await probe.evaluate(async (b64) => {
      const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
      const cv = document.createElement('canvas'); cv.width = 72; cv.height = 45;
      const g = cv.getContext('2d'); g.drawImage(img, 0, 0, 72, 45);
      const d = g.getImageData(0, 0, 72, 45).data; let n = 0, m = [0, 0, 0], v = 0;
      for (let k = 0; k < d.length; k += 4) { m[0] += d[k]; m[1] += d[k + 1]; m[2] += d[k + 2]; n++; }
      m = m.map((x) => x / n);
      for (let k = 0; k < d.length; k += 4) v += (d[k] - m[0]) ** 2 + (d[k + 1] - m[1]) ** 2 + (d[k + 2] - m[2]) ** 2;
      return { mean: m.map(Math.round), spread: Math.round(Math.sqrt(v / n)) };
    }, f.data);
    stats.push({ t: f.t, ...s });
  }
  await probe.close();
  const report = { mode, scheme, renderer, clickPerf: Math.round(clickPerf), events, net, frames: stats };
  console.log(JSON.stringify(report));
  await writeFile(join(dir, 'report.json'), JSON.stringify(report, null, 1));
  await c.close();
}
await browser.close();
