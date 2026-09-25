/**
 * Wave B1 glass critic (09-25-26): does any orb or the lens poster paint on
 * top of text or a control? For every link, button, heading, p, label, chip
 * and input on each glass page, scroll it into view and hit-test several
 * points across its box (pointer-events forced on for orbs so they hit-test);
 * report any point whose topmost element is an .orb / .lens-poster.
 * Desktop 1440 and phone 390, light and dark.
 *
 * Usage: BDL_GPU=1 node scripts/themes/glassmorphism/b1-critic-occlusion.mjs [--base URL]
 */
import { chromium } from 'playwright';

const bi = process.argv.indexOf('--base');
const BASE = bi === -1 ? 'http://127.0.0.1:4473' : process.argv[bi + 1];
const useGpu = process.env.BDL_GPU === '1';
const PAGES = ['/t/glassmorphism/', '/t/glassmorphism/services/', '/t/glassmorphism/about/', '/t/glassmorphism/contact/', '/t/glassmorphism/contact/sent/'];
const VPS = { desktop: { width: 1440, height: 900 }, phone: { width: 390, height: 844 } };

const browser = await chromium.launch({ args: ['--hide-scrollbars', ...(useGpu ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] : [])] });
let hits = 0;
for (const scheme of ['light', 'dark']) {
  for (const [vpName, vp] of Object.entries(VPS)) {
    const c = await browser.newContext({ viewport: vp, colorScheme: scheme, isMobile: vpName === 'phone', hasTouch: vpName === 'phone', deviceScaleFactor: vpName === 'phone' ? 2 : 1, reducedMotion: process.env.RM || 'reduce' });
    await c.addInitScript((s) => { try { localStorage.setItem('scheme', s); localStorage.setItem('theme', s); } catch {} }, scheme);
    await c.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
    const page = await c.newPage();
    for (const path of PAGES) {
      await page.goto(BASE + path, { waitUntil: 'networkidle' });
      await page.addStyleTag({ content: '.orb, .lens-poster { pointer-events: auto !important; } bdl-switcher { display: none !important; }' });
      const found = await page.evaluate(async () => {
        const out = [];
        const els = [...document.querySelectorAll('main a, main button, main h1, main h2, main h3, main p, main label, main input, main textarea, main .chip, footer a, footer p')];
        for (const el of els) {
          el.scrollIntoView({ block: 'center' });
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
          const r = el.getBoundingClientRect();
          if (r.width < 2 || r.height < 2) continue;
          for (const [fx, fy] of [[0.1, 0.5], [0.5, 0.5], [0.9, 0.5], [0.5, 0.2], [0.5, 0.8]]) {
            const x = r.left + r.width * fx, y = r.top + r.height * fy;
            if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) continue;
            const top = document.elementFromPoint(x, y);
            if (top && top.matches('.orb, .lens-poster')) {
              out.push(`${el.tagName.toLowerCase()}.${[...el.classList].join('.')} "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 40)}" covered by ${top.className} at (${fx},${fy}) scrollY=${Math.round(scrollY)}`);
              break;
            }
          }
        }
        return out;
      });
      for (const f of found) { hits++; console.log(`${scheme} ${vpName} ${path}: ${f}`); }
    }
    await c.close();
  }
}
await browser.close();
console.log(`total occlusions: ${hits}`);
