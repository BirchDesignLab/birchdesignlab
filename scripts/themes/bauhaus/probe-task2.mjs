/** Probe: bauhaus B2 task 2 (diagonal, printshop register, composition, typophoto).
    Port 4460, GPU Chromium. Measures the alignments the brief names and shoots
    whole pages into scripts/themes/.out/stage4/task-2/. Needs a fresh dist/. */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveDist } from '../lib/serve-dist.mjs';
import { suppressPrompt } from '../lib/portal-prompt.mjs';
const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const OUT = join(REPO, 'scripts', 'themes', '.out', 'stage4', 'task-2');
mkdirSync(OUT, { recursive: true });
const server = await serveDist(4460, join(REPO, 'dist'));
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const routes = { home: '/t/bauhaus/', about: '/t/bauhaus/about/', services: '/t/bauhaus/services/', contact: '/t/bauhaus/contact/', sent: '/t/bauhaus/contact/sent/' };
const only = process.argv[2] ? process.argv[2].split(',') : null;
try {
  for (const [w, h, mob] of [[1440, 900, 0], [1280, 800, 0], [1024, 768, 0], [820, 1180, 0], [390, 844, 1]]) {
    for (const scheme of ['light', 'dark']) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: !!mob, hasTouch: !!mob, reducedMotion: 'no-preference', colorScheme: scheme });
      await suppressPrompt(ctx);
      for (const [name, path] of Object.entries(routes)) {
        if (only && !only.includes(name)) continue;
        const p = await ctx.newPage();
        await p.emulateMedia({ reducedTransparency: 'no-preference', colorScheme: scheme });
        await p.goto(`http://127.0.0.1:4460${path}`, { waitUntil: 'networkidle' });
        await p.evaluate((s) => { document.documentElement.setAttribute('data-scheme', s); }, scheme);
        await p.evaluate(() => document.fonts.ready);
        await p.evaluate(() => document.querySelectorAll('[data-reveal]').forEach((e) => e.classList.add('is-settled')));
        await p.evaluate(async () => { for (const i of document.images) { i.loading = 'eager'; } });
        await p.waitForTimeout(2200);
        const o = await p.evaluate(() => {
          const R = (s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { t: Math.round(r.top + scrollY), b: Math.round(r.bottom + scrollY), l: Math.round(r.left), r: Math.round(r.right) }; };
          const out = { sw: document.documentElement.scrollWidth, iw: innerWidth };
          out.renderer = (() => { const c = document.createElement('canvas'); const g = c.getContext('webgl'); const x = g && g.getExtension('WEBGL_debug_renderer_info'); return x ? g.getParameter(x.UNMASKED_RENDERER_WEBGL).slice(0, 60) : 'n/a'; })();
          out.h1 = R('main h1, h1'); out.two = R('.two'); out.talk = R('.talk'); out.form = R('form');
          out.note = R('.note'); out.sub = R('.sub'); out.lead = R('.opener .lead'); out.fine = R('.fine');
          out.shots = [...document.querySelectorAll('.shot')].map((i) => { const r = i.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), shown: r.width > 0 }; });
          out.trust = [...document.querySelectorAll('.trust span')].map((s) => { const r = s.getBoundingClientRect(); return Math.round(r.top) + ':' + Math.round(r.left); });
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
