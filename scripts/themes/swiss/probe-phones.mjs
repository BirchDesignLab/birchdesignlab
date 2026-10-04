/** Probe: swiss phones, header, buttons, mail, footer and grid key at the review sizes. Port 4460. */
import { chromium } from 'playwright';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveDist } from '../lib/serve-dist.mjs';
import { suppressPrompt } from '../lib/portal-prompt.mjs';
const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const server = await serveDist(4460, join(REPO, 'dist'));
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const routes = { home: '/t/swiss/', about: '/t/swiss/about/', services: '/t/swiss/services/', contact: '/t/swiss/contact/' };
try {
  for (const [w, h, mob] of [[390, 844, 1], [360, 800, 1], [820, 1180, 0], [1024, 768, 0], [1280, 800, 0], [1440, 900, 0]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: !!mob, hasTouch: !!mob, reducedMotion: 'no-preference' });
    await suppressPrompt(ctx);
    for (const [name, path] of Object.entries(routes)) {
      const p = await ctx.newPage();
      await p.emulateMedia({ reducedTransparency: 'no-preference' });
      await p.goto(`http://127.0.0.1:4460${path}`, { waitUntil: 'networkidle' });
      await p.evaluate(() => document.fonts.ready);
      const o = await p.evaluate(() => {
        const r = (e) => { if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top + scrollY), Math.round(b.width), Math.round(b.height)]; };
        const out = { sw: document.documentElement.scrollWidth, iw: innerWidth, header: r(document.querySelector('.site-header')), wm: r(document.querySelector('.wordmark')), nav: [...document.querySelectorAll('.site-header nav a')].map(r) };
        out.btns = [...document.querySelectorAll('.sw-btn')].map((b) => ({ c: b.className.replace('sw-btn ', ''), r: r(b), bg: getComputedStyle(b).backgroundColor }));
        const sub = document.querySelector('.subline'); if (sub) out.subline = r(sub);
        const t = document.querySelector('.billboard, .title'); if (t) { const rg = document.createRange(); rg.selectNodeContents(t); out.title = { fs: getComputedStyle(t).fontSize, stretch: getComputedStyle(t).fontStretch, maxLine: Math.max(...[...rg.getClientRects()].map((q) => Math.round(q.right))) }; }
        const m = document.querySelector('.mail'); if (m) { out.mail = r(m); out.mailLines = Math.round(m.getBoundingClientRect().height / 24); }
        return out;
      });
      console.log(w, name, JSON.stringify(o));
      await p.close();
    }
    await ctx.close();
  }
} finally { await browser.close(); server.close?.(); }
