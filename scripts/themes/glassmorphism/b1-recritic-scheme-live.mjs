/**
 * Wave B1 glass re-critic (09-25-26): after a live light->dark switch, does a
 * pane's inline bevel+blur (fx.ts mountPanes) pick up dark's blur tokens, or
 * stay frozen at light's (it re-reads getComputedStyle, which returns its own
 * inline value)? Flips html[data-scheme] directly, as the scheme control does.
 * Usage: BDL_GPU=1 node scripts/themes/glassmorphism/b1-recritic-scheme-live.mjs [--base URL]
 */
import { chromium } from 'playwright';
const bi = process.argv.indexOf('--base');
const BASE = bi === -1 ? 'http://127.0.0.1:4475' : process.argv[bi + 1];
const browser = await chromium.launch({ args: process.env.BDL_GPU === '1' ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] : [] });
const c = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
const page = await c.newPage();
const cdp = await c.newCDPSession(page);
await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
await page.goto(BASE + '/t/glassmorphism/', { waitUntil: 'networkidle' });
await page.waitForTimeout(400);
const read = () => page.evaluate(() => { const e = document.querySelector('.glass.thin'); return { scheme: document.documentElement.dataset.scheme, token: getComputedStyle(e).getPropertyValue('--blur-thin').trim(), bf: getComputedStyle(e).backdropFilter }; });
console.log('light', JSON.stringify(await read()));
await page.evaluate(() => { document.documentElement.dataset.scheme = 'dark'; });
await page.waitForTimeout(500);
console.log('after flip', JSON.stringify(await read()));
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(600);
console.log('after resize to phone', JSON.stringify(await read()));
await browser.close();
