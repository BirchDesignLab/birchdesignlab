/**
 * Wave B2 round 4, seat b2r4-glass-critic: is the corner start (lens.ts
 * planLensStart -> physics.ts cornerStart) the same spot at home-boot's early
 * poster placement and at the lens's own idle mount? planLensStart runs twice
 * (home-boot.ts before mountOrbClock, then mountLens at idle); the corner
 * branch ignores the poster's spot and re-reads the orb circles each time.
 * Logs, every animation frame from document start, the poster's centre while
 * it is displayed and the lens-hit centre once it exists, over N hard loads
 * per size and scheme, and reports every run where the disc changed spot
 * (a visible jump) or the final spot differs between runs. Also logs the orb
 * circles at the first poster placement and at the lens mount.
 * GPU Chromium (aborts on SwiftShader), reduced transparency forced off, the
 * portal prompt suppressed.
 * Usage: node scripts/themes/glassmorphism/b2r4-glass-critic-startrace.mjs --base http://127.0.0.1:4475 [--n 6] [--sizes 820x1180,390x844]
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const arg = (n, f) => { const i = args.indexOf(`--${n}`); return i === -1 ? f : args[i + 1]; };
const base = arg('base', 'http://127.0.0.1:4475');
const N = Number(arg('n', '6'));
const sizes = arg('sizes', '820x1180,390x844,430x932,1440x900').split(',').map((s) => s.split('x').map(Number));
const OUT = arg('out', join(HERE, '..', '.out', 'stage3-b2', 'glass-recritic-r4', 'startrace'));
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const R = { base };
{
  const p = await browser.newPage();
  R.renderer = await p.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl'); return gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL); });
  await p.close();
  console.log('renderer:', R.renderer);
  if (/swiftshader|llvmpipe/i.test(R.renderer)) { await browser.close(); throw new Error('software renderer; abort'); }
}

const LOGGER = () => {
  window.__log = [];
  const t0 = performance.now();
  let lastKey = '';
  const orbs = () => [...document.querySelectorAll('.orb')].map((o) => { const r = o.getBoundingClientRect(); return [o.className.replace('orb ', ''), Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2), Math.round(r.width / 2)]; });
  const tick = () => {
    const p = document.querySelector('.lens-poster');
    const hit = document.querySelector('.lens-hit');
    const c = document.querySelector('.lens-canvas');
    const pd = p ? getComputedStyle(p).display : null;
    const pr = p?.getBoundingClientRect();
    const hr = hit?.getBoundingClientRect();
    const poster = p && pd !== 'none' ? [Math.round(pr.left + pr.width / 2), Math.round(pr.top + pr.height / 2)] : null;
    const lens = hr ? [Math.round(hr.left + hr.width / 2), Math.round(hr.top + hr.height / 2)] : null;
    const cv = c ? getComputedStyle(c).visibility : null;
    // the hero's first orb too, so an orb that jumps after first paint is logged
    const o0 = document.querySelector('.hero .orb')?.getBoundingClientRect();
    const heroOrb = o0 ? Math.round(o0.top + o0.height / 2) : null;
    const key = JSON.stringify([poster, lens, cv, heroOrb]);
    if (key !== lastKey) { lastKey = key; window.__log.push({ t: Math.round(performance.now() - t0), poster, lens, canvas: cv, heroOrbCy: heroOrb, live: !!document.querySelector('.hero .orbs[data-live]'), driven: !!document.querySelector('.orbs[data-js-driven]'), orbs: orbs() }); }
    if (performance.now() - t0 < 6000) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

const rows = [];
for (const [w, h] of sizes) {
  const touch = w < 900;
  for (const scheme of ['light', 'dark']) {
    const finals = [];
    for (let i = 0; i < N; i++) {
      const context = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, hasTouch: touch, isMobile: touch, deviceScaleFactor: touch ? 2 : 1 });
      await suppressPrompt(context);
      await context.addInitScript((sch) => { try { localStorage.setItem('bdl-scheme', sch); } catch {} }, scheme);
      await context.addInitScript(LOGGER);
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }, { name: 'prefers-color-scheme', value: scheme }] });
      await page.goto(`${base}/t/glassmorphism/`, { waitUntil: 'load' });
      await page.waitForTimeout(4000);
      const log = await page.evaluate(() => window.__log);
      const posterSpots = [...new Set(log.filter((e) => e.poster).map((e) => e.poster.join(',')))];
      const final = log.at(-1).lens?.join(',') ?? null;
      finals.push(final);
      const jump = posterSpots.length > 1 || (final && posterSpots.length && !posterSpots.includes(final));
      const firstPlaced = log.find((e) => e.poster);
      const mount = log.find((e) => e.lens);
      R[`${w}x${h}__${scheme}__${i}`] = { posterSpots, final, jump, log: log.map(({ orbs, ...rest }) => rest), orbsAtFirstPoster: firstPlaced?.orbs, orbsAtLensMount: mount?.orbs };
      console.log(`${w}x${h} ${scheme} #${i}: poster spots ${posterSpots.join(' -> ')} | lens ${final} | ${jump ? 'JUMP' : 'steady'} | driven at first poster ${firstPlaced?.driven}`);
      if (args.includes('--film') ? i === 0 && scheme === 'light' : jump && rows.length < 2) {
        // film a cold load of this case (a fresh context, nothing cached) with screenshots as fast as possible
        await context.close();
        const fresh = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, hasTouch: touch, isMobile: touch, deviceScaleFactor: touch ? 2 : 1 });
        await suppressPrompt(fresh);
        await fresh.addInitScript((sch) => { try { localStorage.setItem('bdl-scheme', sch); } catch {} }, scheme);
        const p2 = await fresh.newPage();
        const c2 = await fresh.newCDPSession(p2);
        await c2.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }, { name: 'prefers-color-scheme', value: scheme }] });
        const t0 = Date.now();
        const nav = p2.goto(`${base}/t/glassmorphism/`, { waitUntil: 'commit' });
        await nav;
        const frames = [];
        while (Date.now() - t0 < 2600) {
          const buf = await p2.screenshot({ scale: 'css' }).catch(() => null);
          if (!buf) continue;
          const d = await p2.evaluate(() => { const p = document.querySelector('.lens-poster'); const pr = p?.getBoundingClientRect(); const hr = document.querySelector('.lens-hit')?.getBoundingClientRect(); return { poster: p && getComputedStyle(p).display !== 'none' ? [Math.round(pr.left + pr.width / 2), Math.round(pr.top + pr.height / 2)] : null, lens: hr ? [Math.round(hr.left + hr.width / 2), Math.round(hr.top + hr.height / 2)] : null }; }).catch(() => ({}));
          const oc = await p2.evaluate(() => { const o = document.querySelector('.hero .orb')?.getBoundingClientRect(); return o ? Math.round(o.top + o.height / 2) : '-'; }).catch(() => '-');
          frames.push([`+${Date.now() - t0} ms poster ${d.poster ?? '-'} lens ${d.lens ?? '-'} violet orb cy ${oc}`, buf]);
        }
        const pick = frames.filter((_, k) => k % Math.max(1, Math.ceil(frames.length / 10)) === 0);
        rows.push(pick.slice(0, 5).map(([l, b]) => [`${w}x${h} ${scheme}: ${l}`, b]), pick.slice(5, 10).map(([l, b]) => [`${w}x${h} ${scheme}: ${l}`, b]));
        await fresh.close();
        continue;
      }
      await context.close();
    }
    R[`${w}x${h}__${scheme}__summary`] = { finals, distinctFinals: [...new Set(finals)] };
  }
}
await writeFile(join(OUT, 'startrace.json'), JSON.stringify(R, null, 1));
if (rows.length) {
  const imgs = await Promise.all(rows.map((row) => Promise.all(row.map(async ([l, b]) => [l, await loadImage(b)]))));
  const scale = 0.3;
  const cw = Math.max(...imgs.flat().map(([, i]) => i.width)) * scale, ch = Math.max(...imgs.flat().map(([, i]) => i.height)) * scale;
  const cols = Math.max(...imgs.map((r) => r.length)); const lh = 58, pad = 12, th = 44;
  const c = createCanvas(Math.round(cols * (cw + pad) + pad), Math.round(th + imgs.length * (ch + lh + pad) + pad)); const g = c.getContext('2d');
  g.fillStyle = '#1c1c1c'; g.fillRect(0, 0, c.width, c.height); g.fillStyle = '#fff'; g.font = 'bold 26px sans-serif'; g.fillText('Cold hard load: the disc and the hero violet orb before and after the lens mounts', pad, 32); g.font = '20px sans-serif';
  imgs.forEach((row, ri) => row.forEach(([l, im], ci) => { const x = pad + ci * (cw + pad), y = th + pad + ri * (ch + lh + pad); const words = l.split(' '); let line = '', ly = y + 22, n = 0; for (const wd of words) { const t = line ? `${line} ${wd}` : wd; if (g.measureText(t).width > cw - 4 && line && n === 0) { g.fillText(line, x, ly); ly += 24; n++; line = wd; } else line = t; } g.fillText(line, x, ly); g.drawImage(im, x, y + lh, im.width * scale, im.height * scale); }));
  await writeFile(join(OUT, 'film__start-jump.jpg'), c.toBuffer('image/jpeg', 92));
  console.log('wrote film__start-jump.jpg');
}
await browser.close();
console.log('done');
