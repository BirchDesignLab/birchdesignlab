/**
 * Wave B2 glass RE-CRITIC round 2 (09-26-26): P1 at 390x844 (touch) on glass
 * Home and Services: every visible, focusable control's box (a, button,
 * input, [role=switch|radio]) under 44 px in either dimension, the contact
 * honeypot excluded, plus the lens hit control and aria checks (focusables
 * inside aria-hidden). GPU Chromium, reduced transparency forced off, prompt
 * suppressed.
 * Usage: BDL_GPU=1 node scripts/themes/glassmorphism/b2r3-glass-critic2-targets.mjs --base http://127.0.0.1:4475
 */
import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = process.env.PROBE_OUT || join(HERE, '..', '.out', 'stage3-b2', 'glass-recritic-r2', 'own'); // round 5: PROBE_OUT
const base = process.argv[process.argv.indexOf('--base') + 1] || 'http://127.0.0.1:4475';
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const R = {};
for (const path of ['', 'services/']) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  await suppressPrompt(context);
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
  R.renderer = await page.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl'); return gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL); });
  if (/swiftshader|llvmpipe/i.test(R.renderer)) throw new Error('software renderer; abort');
  await page.goto(`${base}/t/glassmorphism/${path}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  R[path || 'home'] = await page.evaluate(() => {
    const small = [];
    let n = 0;
    for (const e of document.querySelectorAll('a[href], button, input, select, textarea, [role="switch"], [role="radio"], [tabindex]')) {
      if (e.closest('[data-honeypot], .hp, [aria-hidden="true"]') || e.tabIndex < 0) continue;
      const q = e.getBoundingClientRect();
      const cs = getComputedStyle(e);
      if (q.width < 1 || q.height < 1 || cs.visibility === 'hidden') continue;
      n++;
      if (q.width < 44 || q.height < 44) small.push({ el: `${e.tagName.toLowerCase()}.${[...e.classList].join('.')}`, label: e.getAttribute('aria-label') || e.textContent.trim().slice(0, 24), w: Math.round(q.width), h: Math.round(q.height) });
    }
    const focusInHidden = [...document.querySelectorAll('[aria-hidden="true"] a[href], [aria-hidden="true"] button, [aria-hidden="true"] input, [aria-hidden="true"] [tabindex]')].filter((e) => e.tabIndex >= 0).map((e) => e.className || e.tagName);
    const hit = document.querySelector('.lens-hit');
    return { checked: n, under44: small, focusInHidden, lensHit: hit ? { label: hit.getAttribute('aria-label'), w: hit.getBoundingClientRect().width } : null };
  });
  await context.close();
}
await writeFile(join(OUT, 'targets-390.json'), JSON.stringify(R, null, 1));
console.log(JSON.stringify(R, null, 1));
await browser.close();
