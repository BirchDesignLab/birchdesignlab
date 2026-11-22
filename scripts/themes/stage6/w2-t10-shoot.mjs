/**
 * Stage 6 wave 2, task 10: swiss sheets from a frozen snap, served in-process
 * on the task's port (4470) so the same script films before and after.
 *
 *   SNAP=s6-w2-t10-before OUT=scripts/themes/.out/stage6/w2/t10/before \
 *     node scripts/themes/stage6/w2-t10-shoot.mjs --pages home,about,services \
 *       --widths 1440,1280,1024,820,390 --schemes light,dark --what full,lab
 *
 * --what: full (whole page), band (the lab section from a line above its head
 *         to the second specimen row, full viewport width), lab (Home's .lab-head band, the sheet's head),
 *         manifesto (About's red field), process (Services' timetable).
 * GPU Chromium (d3d11), the renderer is recorded in OUT/renderer.txt;
 * prefers-reduced-transparency forced to no-preference; portal prompt and the
 * dial hint suppressed; lazy images forced eager and decoded.
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveDist } from '../lib/serve-dist.mjs';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUTROOT = join(HERE, '..', '.out');
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i === -1 ? d : process.argv[i + 1]; };
const SNAP = process.env.SNAP;
const BASE = process.env.BASE; // a running server (the dev server) instead of a snap
if (!SNAP && !BASE) throw new Error('SNAP=<snap name> or BASE=<url> required');
const OUT = resolve(process.env.OUT || join(OUTROOT, 'stage6', 'w2', 't10', SNAP || 'dev'));
mkdirSync(OUT, { recursive: true });
const PORT = Number(process.env.PORT || 4470);
const pages = arg('pages', 'home').split(',');
const widths = arg('widths', '1440,1024,820,390').split(',').map(Number);
const schemes = arg('schemes', 'light,dark').split(',');
const what = arg('what', 'full').split(',');
const heights = { 1440: 900, 1280: 800, 1024: 768, 820: 1180, 430: 932, 412: 915, 390: 844, 375: 812, 360: 740 };
const SEL = { lab: '.lab-head', manifesto: '.manifesto', process: '.process', steps: '.steps' };

const server = BASE ? null : await serveDist(PORT, join(OUTROOT, `snap-${SNAP}`));
const ORIGIN = BASE || `http://127.0.0.1:${PORT}`;
const browser = await chromium.launch({ args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
try {
  let renderer = '';
  for (const scheme of schemes) for (const w of widths) {
    const ctx = await browser.newContext({ viewport: { width: w, height: heights[w] || 900 }, deviceScaleFactor: 1, colorScheme: scheme });
    await suppressPrompt(ctx);
    await ctx.addInitScript((s) => { try { localStorage.setItem('scheme', s); sessionStorage.setItem('bdl-swiss-dial-hint', '1'); } catch {} }, scheme);
    for (const pg of pages) {
      const page = await ctx.newPage();
      const cdp = await ctx.newCDPSession(page);
      await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
      await page.goto(`${ORIGIN}/t/swiss/${pg === 'home' ? '' : pg + '/'}`, { waitUntil: 'networkidle' });
      await page.addStyleTag({ content: 'bdl-switcher,astro-dev-toolbar{display:none!important}' });
      if (!renderer) renderer = await page.evaluate(() => { const c = document.createElement('canvas').getContext('webgl'); const e = c && c.getExtension('WEBGL_debug_renderer_info'); return e ? c.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'unknown'; });
      await page.evaluate(async () => { document.querySelectorAll('img[loading=lazy]').forEach((i) => { i.loading = 'eager'; }); await Promise.all([...document.images].map((i) => i.decode().catch(() => {}))); await document.fonts.ready; });
      await page.waitForTimeout(600);
      for (const k of what) {
        const f = join(OUT, `${pg}__${scheme}__${w}__${k}.png`);
        if (k === 'full') await page.screenshot({ path: f, fullPage: true });
        else if (k === 'band') { const r = await page.evaluate(() => { const l = document.querySelector('.lab').getBoundingClientRect(); const s = document.querySelectorAll('.specimens li')[1].getBoundingClientRect(); return { y: l.top + scrollY - 48, b: s.top + scrollY }; }); await page.screenshot({ path: f, fullPage: true, clip: { x: 0, y: Math.max(0, r.y), width: w, height: r.b - r.y } }); }
        else if (k === 'vp') await page.screenshot({ path: f });
        else { const el = page.locator(SEL[k]).first(); if (await el.count()) await el.screenshot({ path: f }); }
      }
      await page.close();
    }
    await ctx.close();
  }
  writeFileSync(join(OUT, 'renderer.txt'), renderer + '\n');
  console.log('renderer:', renderer, '->', OUT);
} finally {
  await browser.close();
  if (server) await new Promise((r) => server.close(r));
}
