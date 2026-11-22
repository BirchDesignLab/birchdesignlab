/** Stage 6 w1 t6: a scratch shot of one element (GPU Chromium, no switcher, no dev toolbar).
 *   MSYS_NO_PATHCONV=1 BASE=http://127.0.0.1:4470 node scripts/themes/stage6/w1-t6-shot.mjs /t/swiss/ .lab 1440 out.png [dark] */
import { chromium } from 'playwright';
const [path, sel, w, out, scheme = 'light'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu'] });
const ctx = await b.newContext({ viewport: { width: +w, height: 900 }, colorScheme: scheme, deviceScaleFactor: 1 });
await ctx.addInitScript((s) => { try { localStorage.setItem('scheme', s); sessionStorage.setItem('bdl-portal-prompt', 'dismissed'); sessionStorage.setItem('bdl-swiss-dial-hint', '1'); } catch {} }, scheme);
const p = await ctx.newPage();
await p.goto(`${process.env.BASE || 'http://127.0.0.1:4470'}${path}`, { waitUntil: 'networkidle' });
await p.addStyleTag({ content: 'bdl-switcher,astro-dev-toolbar{display:none!important}' });
await p.evaluate(async () => { document.querySelectorAll('img[loading=lazy]').forEach((i) => { i.loading = 'eager'; }); await Promise.all([...document.images].map((i) => i.decode().catch(() => {}))); });
await p.waitForTimeout(500);
const el = p.locator(sel).first();
await el.screenshot({ path: out });
await b.close();
