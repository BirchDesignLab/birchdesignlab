/** Probe: bauhaus B2 task 1 (pairing, lowercase, numerals). Port 4460, GPU Chromium.
    Measures overflow, button widths, uppercase leftovers, Unbounded use, numeral sizes;
    shoots whole pages and numeral crops into scripts/themes/.out/stage4/task-1/. */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveDist } from '../lib/serve-dist.mjs';
import { suppressPrompt } from '../lib/portal-prompt.mjs';
const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const OUT = join(REPO, 'scripts', 'themes', '.out', 'stage4', 'task-1');
mkdirSync(OUT, { recursive: true });
const server = await serveDist(4460, join(REPO, 'dist'));
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const routes = { home: '/t/bauhaus/', about: '/t/bauhaus/about/', services: '/t/bauhaus/services/', contact: '/t/bauhaus/contact/' };
try {
  for (const [w, h, mob] of [[1440, 900, 0], [1280, 800, 0], [1024, 768, 0], [820, 1180, 0], [390, 844, 1]]) {
    for (const scheme of ['light', 'dark']) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: !!mob, hasTouch: !!mob, reducedMotion: 'no-preference', colorScheme: scheme });
      await suppressPrompt(ctx);
      for (const [name, path] of Object.entries(routes)) {
        const p = await ctx.newPage();
        await p.emulateMedia({ reducedTransparency: 'no-preference', colorScheme: scheme });
        await p.goto(`http://127.0.0.1:4460${path}`, { waitUntil: 'networkidle' });
        await p.evaluate((s) => { document.documentElement.setAttribute('data-scheme', s); }, scheme);
        await p.evaluate(() => document.fonts.ready);
        // settle every reveal and let assemblies finish
        await p.evaluate(() => document.querySelectorAll('[data-reveal]').forEach((e) => e.classList.add('is-settled')));
        await p.waitForTimeout(2200);
        const o = await p.evaluate(() => {
          const out = { sw: document.documentElement.scrollWidth, iw: innerWidth };
          out.btns = [...document.querySelectorAll('.btn')].map((b) => { const r = b.getBoundingClientRect(); return { t: b.textContent.trim(), w: Math.round(r.width), h: Math.round(r.height), right: Math.round(r.right) }; });
          out.upper = [...document.querySelectorAll('main *, footer *')].filter((e) => getComputedStyle(e).textTransform === 'uppercase').length;
          out.unbounded = [...document.querySelectorAll('*')].filter((e) => /Unbounded/.test(getComputedStyle(e).fontFamily)).length;
          out.nums = [...document.querySelectorAll('.num')].map((n) => { const s = n.querySelector('.nm').getBoundingClientRect(); return { t: n.querySelector('.num-t').textContent, h: Math.round(s.height), n: n.querySelectorAll('.nm').length }; });
          out.designation = (() => { const d = document.querySelector('.designation'); return d && getComputedStyle(d).fontFamily.slice(0, 20); })();
          return out;
        });
        console.log(w, scheme, name, JSON.stringify(o));
        await p.screenshot({ path: join(OUT, `${name}-${scheme}-${w}.png`), fullPage: true });
        await p.close();
      }
      await ctx.close();
    }
  }
} finally { await browser.close(); server.close?.(); }
