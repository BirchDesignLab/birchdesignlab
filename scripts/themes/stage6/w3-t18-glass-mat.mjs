/**
 * Stage 6 w3 task 18, item 5 C2: reads --mat-regular on glass Home at 390 and
 * 1440, light and dark, Clear and Tinted, with backdrop-filter as the browser
 * has it. (A browser without backdrop-filter cannot be emulated in Chromium;
 * the fallback's selectors and @supports nesting are checked in the built CSS.)
 *   node scripts/themes/snap.mjs --name s6-w3-t18 --reuse --port 4470 -- node scripts/themes/stage6/w3-t18-glass-mat.mjs
 */
import { chromium } from 'playwright';
import { suppressPrompt } from '../lib/portal-prompt.mjs';
const BASE = process.env.SNAP_BASE || 'http://127.0.0.1:4470';
const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const out = {};
for (const [w, h, m] of [[390, 844, true], [1440, 900, false]]) for (const scheme of ['light', 'dark']) for (const tint of ['clear', 'tinted']) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: m, hasTouch: m, colorScheme: scheme });
  await suppressPrompt(ctx);
  await ctx.addInitScript((s) => { try { localStorage.setItem('scheme', s); } catch {} }, scheme);
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
  await p.goto(`${BASE}/t/glassmorphism/`, { waitUntil: 'networkidle' });
  out[`${w}-${scheme}-${tint}`] = await p.evaluate((tint) => {
    if (tint === 'tinted') document.documentElement.setAttribute('data-glass-tint', 'tinted');
    const cs = getComputedStyle(document.documentElement);
    return { matRegular: cs.getPropertyValue('--mat-regular').trim(), supports: CSS.supports('backdrop-filter', 'blur(1px)') };
  }, tint);
  await ctx.close();
}
await b.close();
console.log(JSON.stringify(out, null, 1));
