/**
 * Wave B2 round 5, seat b2r5-glass-critic: why do Home's hero orbs sit off the
 * clock's positions with JavaScript off (the round-5 CSS view() stand-in)?
 * Dumps each hero orb's computed animation, timeline and translate, JS off vs
 * JS on, at 1440x900. GPU Chromium, reduced transparency forced off.
 * Usage: node scripts/themes/glassmorphism/b2r5-glass-critic-nojs-orbs.mjs --base http://127.0.0.1:4475
 */
import { chromium } from 'playwright';
import { suppressPrompt } from '../lib/portal-prompt.mjs';
const base = process.argv[process.argv.indexOf('--base') + 1] || 'http://127.0.0.1:4475';
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
for (const js of [false, true]) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: js });
  await suppressPrompt(context);
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
  await page.goto(`${base}/t/glassmorphism/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const r = await page.evaluate(() => ({
    theme: document.documentElement.dataset.theme, cls: document.documentElement.className,
    group: [...document.querySelectorAll('.hero .orbs')].map((g) => [...g.attributes].map((a) => `${a.name}=${a.value}`).join(' ')),
    orbs: [...document.querySelectorAll('.hero .orb')].map((o) => { const cs = getComputedStyle(o); const r = o.getBoundingClientRect(); return { name: cs.animationName, tl: cs.animationTimeline, range: cs.animationRange, translate: cs.translate, inline: o.getAttribute('style'), cy: Math.round(r.top + r.height / 2), anims: o.getAnimations().map((a) => a.animationName) }; }),
  }));
  console.log(js ? 'JS ON' : 'JS OFF', JSON.stringify(r, null, 1));
  await context.close();
}
await browser.close();
