/** Probe: bauhaus B2 task 2 fix round 1. Port 4460, GPU Chromium. Needs a fresh dist/.
    1. About tree sticks (viewport top pins at 96 while body is in view).
    2. Contact textarea honours a set height; form bottom vs .talk bottom. */
import { chromium } from 'playwright';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveDist } from '../lib/serve-dist.mjs';
import { suppressPrompt } from '../lib/portal-prompt.mjs';
const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const server = await serveDist(4460, join(REPO, 'dist'));
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
try {
  for (const [w, h, mob] of [[1440, 900, 0], [1280, 800, 0], [1024, 768, 0], [390, 844, 1]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: !!mob, hasTouch: !!mob, reducedMotion: 'no-preference' });
    await suppressPrompt(ctx);
    const p = await ctx.newPage();
    await p.emulateMedia({ reducedTransparency: 'no-preference' });
    await p.goto('http://127.0.0.1:4460/t/bauhaus/about/', { waitUntil: 'networkidle' });
    await p.evaluate(() => document.querySelectorAll('[data-reveal]').forEach((e) => e.classList.add('is-settled')));
    const info = await p.evaluate(() => { const b = document.querySelector('.founder-body').getBoundingClientRect(); const t = document.querySelector('.tree').getBoundingClientRect(); return { renderer: (() => { const c = document.createElement('canvas'); const g = c.getContext('webgl'); const x = g && g.getExtension('WEBGL_debug_renderer_info'); return x ? g.getParameter(x.UNMASKED_RENDERER_WEBGL).slice(0, 50) : 'n/a'; })(), bodyTop: b.top + scrollY, bodyH: b.height, treeH: t.height, sw: document.documentElement.scrollWidth }; });
    const tops = [];
    for (let i = -2; i <= 8; i++) {
      const y = Math.round(info.bodyTop - 300 + i * 60);
      await p.evaluate((yy) => scrollTo(0, yy), y); await p.waitForTimeout(60);
      tops.push(await p.evaluate(() => { const t = document.querySelector('.tree').getBoundingClientRect(); const b = document.querySelector('.founder-body').getBoundingClientRect(); return [scrollY, Math.round(t.top), Math.round(b.bottom)]; }));
    }
    console.log(w, 'about', JSON.stringify(info), 'scrollY,treeTop,bodyBottom', JSON.stringify(tops));
    await p.goto('http://127.0.0.1:4460/t/bauhaus/contact/', { waitUntil: 'networkidle' });
    await p.waitForTimeout(800);
    const c = await p.evaluate(() => {
      const R = (s) => Math.round(document.querySelector(s).getBoundingClientRect().bottom + scrollY);
      const before = { form: R('form'), talk: R('.talk'), ta: Math.round(document.querySelector('textarea').getBoundingClientRect().height) };
      document.querySelector('textarea').style.height = '700px';
      const after = Math.round(document.querySelector('textarea').getBoundingClientRect().height);
      const formAfter = R('form');
      document.querySelector('textarea').style.height = '';
      return { before, after, formAfter };
    });
    console.log(w, 'contact', JSON.stringify(c));
    await ctx.close();
  }
} finally { await browser.close(); server.close?.(); }
