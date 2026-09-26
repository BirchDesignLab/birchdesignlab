/**
 * Wave B1 glass fix round 2 (09-25-26): after a live scheme flip, a resize
 * across 720 px, and back, does every bent pane's inline backdrop-filter
 * (fx.ts mountPanes: url(#bevel) + the pane's blur token) carry the CURRENT
 * scheme's and width's token? The re-critic found the thin pane kept light's
 * blur(20px) saturate(2.1) brightness(1.12) after a flip to dark. For each
 * state this reads, per .glass/.glass-strong pane, the token its class maps
 * to and the inline list, and reports any pane whose inline list (url()
 * stripped) differs from its token. Waits 1.5 s after each change (the
 * rebuild runs at idle, one pane per idle slot).
 * prefers-reduced-transparency is forced to no-preference over CDP.
 * Usage: BDL_GPU=1 node scripts/themes/glassmorphism/b1-fix2-scheme-live.mjs [--base URL] [--path /t/glassmorphism/]
 */
import { chromium } from 'playwright';

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i === -1 ? d : process.argv[i + 1]; };
const BASE = arg('base', process.env.SNAP_BASE || 'http://127.0.0.1:4471');
const path = arg('path', '/t/glassmorphism/');
const gpu = process.env.BDL_GPU === '1';
const browser = await chromium.launch({ args: gpu ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] : [] });
const c = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
await c.addInitScript(() => { try { localStorage.setItem('scheme', 'light'); localStorage.setItem('bdl-switcher-prompt', 'dismissed'); } catch {} });
await c.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
const page = await c.newPage();
const cdp = await c.newCDPSession(page);
await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
await page.goto(BASE + path, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
const read = (label) => page.evaluate((label) => {
  const tokenFor = (el) => (el.classList.contains('glass-strong') || el.classList.contains('thick') ? '--blur-thick' : el.classList.contains('thin') ? '--blur-thin' : '--blur');
  const panes = [...document.querySelectorAll('.glass, .glass-strong')].map((el) => {
    const token = getComputedStyle(el).getPropertyValue(tokenFor(el)).trim();
    const inline = el.style.backdropFilter;
    const list = inline.replace(/url\([^)]*\)\s*/g, '').trim();
    return { cls: el.className, hasUrl: /url\(/.test(inline), token, list, ok: !inline || list === token };
  });
  const bent = panes.filter((p) => p.hasUrl);
  return { label, scheme: document.documentElement.dataset.scheme, width: innerWidth, bent: bent.length, stale: panes.filter((p) => !p.ok), sample: bent[0] };
}, label);
const states = [];
states.push(await read('light desktop'));
await page.evaluate(() => { document.documentElement.dataset.scheme = 'dark'; });
await page.waitForTimeout(1500);
states.push(await read('flip to dark'));
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(1500);
states.push(await read('dark, resize to phone'));
await page.evaluate(() => { document.documentElement.dataset.scheme = 'light'; });
await page.waitForTimeout(1500);
states.push(await read('flip to light on phone'));
await page.setViewportSize({ width: 1440, height: 900 });
await page.waitForTimeout(1500);
states.push(await read('light, back to desktop'));
for (const s of states) console.log(JSON.stringify(s));
const bad = states.filter((s) => s.stale.length || s.bent === 0);
console.log(bad.length ? `FAIL: ${bad.map((s) => s.label).join(', ')}` : 'PASS: every bent pane carries the current token in every state');
await browser.close();
