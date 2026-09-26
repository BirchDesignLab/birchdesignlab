/**
 * B2 glass re-critic round 1 (09-26-26): can a visitor actually grab the lens
 * where it is visible? The fix round moved .lens-hit to z-index -1, so any
 * positioned section box above it (even a transparent one) takes the pointer.
 * At each size, mouse-drag (desktop) or touch-drag (phone, CDP touch events)
 * from the lens centre and from its most open visible point; report the top
 * element there, whether the lens moved, and the page scroll.
 * GPU Chromium, reduced transparency forced off, prompt suppressed.
 * Usage: node scripts/themes/glassmorphism/b2r3-glass-critic1-grab.mjs --base http://127.0.0.1:4477
 */
import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
// PROBE_OUT (added by glass-fix-r3): rerun into another seat's folder.
const OUT = process.env.PROBE_OUT || join(HERE, '..', '.out', 'stage3-b2', 'glass-recritic-r1');
const base = process.argv[process.argv.indexOf('--base') + 1] || 'http://127.0.0.1:4477';
const browser = await chromium.launch({ args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const R = {};
{ const p = await browser.newPage(); R.renderer = await p.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl'); return gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL); }); await p.close(); if (/swiftshader/i.test(R.renderer)) throw new Error('software'); }
for (const [w, h, phone] of [[1440, 900, false], [1280, 800, false], [1024, 768, false], [390, 844, true]]) {
  for (const where of ['centre', 'open-point']) {
    const context = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: phone, isMobile: phone, deviceScaleFactor: phone ? 2 : 1 });
    await suppressPrompt(context);
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
    await page.goto(`${base}/t/glassmorphism/`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.querySelector('.lens-poster')?.style.display === 'none', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(500);
    const info = await page.evaluate(() => {
      const q = document.querySelector('.lens-hit').getBoundingClientRect();
      const cx = q.left + q.width / 2, cy = q.top + q.height / 2, r = q.width / 2;
      const desc = (e) => e ? `${e.tagName.toLowerCase()}.${[...e.classList].join('.')}` : null;
      let open = null;
      for (let rr = 0; rr < r * 0.85 && !open; rr += 6) for (let a = 0; a < 360; a += 15) {
        const x = cx + rr * Math.cos(a * Math.PI / 180), y = cy + rr * Math.sin(a * Math.PI / 180);
        if (document.elementFromPoint(x, y)?.classList.contains('lens-hit')) { open = [x, y]; break; }
      }
      // what is visible over the lens: fraction of disc samples where the top element is a .glass pane vs lens-hit vs other
      const counts = {};
      for (let y = -r; y <= r; y += 6) for (let x = -r; x <= r; x += 6) { if (x * x + y * y > r * r) continue; const e = document.elementFromPoint(cx + x, cy + y); const k = e?.classList.contains('lens-hit') ? 'lens-hit' : e?.closest('.glass') ? 'glass pane' : desc(e); counts[k] = (counts[k] || 0) + 1; }
      return { c: [cx, cy], r, topAtCentre: desc(document.elementFromPoint(cx, cy)), openPoint: open, discTopCounts: counts };
    });
    const [x0, y0] = where === 'centre' ? info.c : (info.openPoint || info.c);
    const dx = w > 800 ? 300 : 120, dy = w > 800 ? 120 : -200;
    const before = await page.evaluate(() => scrollY);
    if (phone) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0 }] });
      for (let i = 1; i <= 12; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + dx * i / 12, y: y0 + dy * i / 12 }] }); await page.waitForTimeout(16); }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    } else {
      await page.mouse.move(x0, y0); await page.mouse.down();
      for (let i = 1; i <= 12; i++) { await page.mouse.move(x0 + dx * i / 12, y0 + dy * i / 12); await page.waitForTimeout(16); }
      await page.mouse.up();
    }
    await page.waitForTimeout(900);
    const after = await page.evaluate(() => { const q = document.querySelector('.lens-hit').getBoundingClientRect(); return { c: [q.left + q.width / 2, q.top + q.height / 2], scrollY, sel: String(getSelection()) }; });
    const moved = Math.round(Math.hypot(after.c[0] - info.c[0], after.c[1] - info.c[1]));
    R[`${w}x${h}__${where}`] = { ...info, c: info.c.map(Math.round), start: [Math.round(x0), Math.round(y0)], lensMovedPx: moved, scrollBefore: before, scrollAfter: after.scrollY, selectedText: after.sel.slice(0, 40) };
    if (where === 'centre') await page.screenshot({ path: join(OUT, `grab__${w}x${h}__after-drag-centre.png`) });
    await context.close();
  }
}
await browser.close();
await writeFile(join(OUT, 'grab-results.json'), JSON.stringify(R, null, 2));
console.log(JSON.stringify(R, null, 1));
