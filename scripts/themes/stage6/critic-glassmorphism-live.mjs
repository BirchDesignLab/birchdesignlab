/**
 * Stage 6 glass critic probe: the live desktop experience, viewport shots at
 * several scroll offsets (the full-page sheets only paint the fixed wallpaper
 * in the top viewport), in both transparency modes: the intended design
 * (prefers-reduced-transparency forced to no-preference via CDP) and the E10
 * fallback a Windows visitor with "Transparency effects" off sees (reduce).
 * Also records per-pane computed material, the media query state and the
 * lens canvas state. Read-only; writes under .out/stage6-critic-glassmorphism/.
 *
 * Run: node scripts/themes/snap.mjs --name stage6-base --reuse --port 4463 --
 *        node scripts/themes/stage6/critic-glassmorphism-live.mjs
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', '.out', 'stage6-critic-glassmorphism');
const BASE = process.env.SNAP_BASE || 'http://127.0.0.1:4463';
const ROUTES = { home: '/t/glassmorphism/', services: '/t/glassmorphism/services/', about: '/t/glassmorphism/about/', contact: '/t/glassmorphism/contact/', sent: '/t/glassmorphism/contact/sent/' };
const VPS = { d1440: { width: 1440, height: 900 }, d1280: { width: 1280, height: 800 } };
const only = (process.env.ONLY || '').split(',').filter(Boolean);

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({
  args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'],
});
const report = { renderer: null, runs: [] };

for (const transp of ['no-preference', 'reduce']) {
  for (const scheme of ['light', 'dark']) {
    for (const [vpName, vp] of Object.entries(VPS)) {
      if (transp === 'reduce' && vpName !== 'd1440') continue;
      const context = await browser.newContext({ viewport: vp, colorScheme: scheme, reducedMotion: 'no-preference' });
      await context.addInitScript((s) => { try { localStorage.setItem('scheme', s); localStorage.setItem('theme', s); } catch {} }, scheme);
      await suppressPrompt(context);
      await context.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: transp }] });
      if (!report.renderer) {
        await page.goto('about:blank');
        report.renderer = await page.evaluate(() => {
          const gl = document.createElement('canvas').getContext('webgl2');
          const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
          return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'none';
        });
        console.log('renderer', report.renderer);
        if (/swiftshader|llvmpipe/i.test(report.renderer)) throw new Error('software renderer');
      }
      for (const [rname, route] of Object.entries(ROUTES)) {
        if (only.length && !only.includes(rname)) continue;
        await page.goto(BASE + route, { waitUntil: 'networkidle' });
        await page.waitForTimeout(2500);
        const info = await page.evaluate(() => {
          const mq = (q) => matchMedia(q).matches;
          const panes = [...document.querySelectorAll('.glass, .glass-strong, .surface-solid')].map((el) => {
            const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
            return { cls: el.className.toString().slice(0, 60), bg: cs.backgroundColor, bf: cs.backdropFilter, x: Math.round(r.x), y: Math.round(r.y + scrollY), w: Math.round(r.width), h: Math.round(r.height) };
          });
          const canv = [...document.querySelectorAll('canvas')].map((c) => { const cs = getComputedStyle(c); const r = c.getBoundingClientRect(); return { cls: c.className.toString(), disp: cs.display, vis: cs.visibility, op: cs.opacity, z: cs.zIndex, x: Math.round(r.x), y: Math.round(r.y + scrollY), w: Math.round(r.width), h: Math.round(r.height) }; });
          const wp = getComputedStyle(document.querySelector('main'), '::before');
          return { rt: mq('(prefers-reduced-transparency: reduce)'), docH: document.documentElement.scrollHeight, wpImg: wp.backgroundImage.slice(0, 80), wpCol: wp.backgroundColor, panes, canv, attrs: { tint: document.documentElement.dataset.glassTint, tod: document.documentElement.dataset.glassTod } };
        });
        report.runs.push({ transp, scheme, vpName, rname, ...info });
        const offsets = [0];
        for (let y = vp.height * 0.8; y < info.docH - vp.height; y += vp.height * 0.8) offsets.push(Math.round(y));
        offsets.push(info.docH - vp.height);
        let i = 0;
        for (const y of offsets) {
          await page.evaluate((yy) => window.scrollTo(0, yy), y);
          await page.waitForTimeout(450);
          await page.screenshot({ path: join(OUT, `${rname}__${scheme}__${vpName}__${transp === 'reduce' ? 'rt' : 'live'}__${String(i++).padStart(2, '0')}.png`) });
        }
      }
      await context.close();
    }
  }
}
await writeFile(join(OUT, 'live-report.json'), JSON.stringify(report, null, 1));
await browser.close();
console.log('done', report.runs.length);
