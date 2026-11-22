/**
 * Stage 6 wave 2, task 10 (T4 C4): the grid key latched, the top of the screen.
 * 820 touch (the key a half line down: the column "2" tag used to cover it),
 * 820 mouse, 1440 mouse, 1024 touch, 390 touch. Writes crops and the rect
 * overlap of the key with every tag.
 *   BASE=http://127.0.0.1:4470 OUT=<dir> node scripts/themes/stage6/w2-t10-key.mjs
 *   SNAP=<name> OUT=<dir> node ...
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveDist } from '../lib/serve-dist.mjs';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const OUTROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '.out');
const OUT = resolve(process.env.OUT || join(OUTROOT, 'stage6', 'w2', 't10', 'key'));
mkdirSync(OUT, { recursive: true });
let server = null;
let BASE = process.env.BASE;
if (!BASE) { server = await serveDist(4470, join(OUTROOT, `snap-${process.env.SNAP}`)); BASE = 'http://127.0.0.1:4470'; }
const browser = await chromium.launch({ args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu'] });
const cases = [[820, 1180, true], [820, 1180, false], [1440, 900, false], [1024, 768, true], [390, 844, true]];
try {
  for (const [w, h, touch] of cases) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: touch, hasTouch: touch, colorScheme: 'light' });
    await suppressPrompt(ctx);
    await ctx.addInitScript(() => { try { sessionStorage.setItem('bdl-swiss-dial-hint', '1'); } catch {} });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
    await page.goto(`${BASE}/t/swiss/`, { waitUntil: 'networkidle' });
    await page.addStyleTag({ content: 'bdl-switcher{display:none!important}' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(400);
    const key = page.locator('[data-sw-grid-key]');
    if (touch) await key.tap(); else await key.click();
    await page.waitForTimeout(400);
    const info = await page.evaluate(() => {
      const kr = document.querySelector('[data-sw-grid-key]').getBoundingClientRect();
      const tags = [...document.querySelectorAll('[data-sw-guides] span')].filter((s) => s.getBoundingClientRect().width > 0).map((s) => {
        const cs = getComputedStyle(s, '::before');
        const r = s.getBoundingClientRect();
        const top = parseFloat(cs.top), left = r.left - 1, wd = parseFloat(cs.width), ht = parseFloat(cs.height);
        const ox = Math.max(0, Math.min(kr.right, left + wd) - Math.max(kr.left, left)), oy = Math.max(0, Math.min(kr.bottom, top + ht) - Math.max(kr.top, top));
        return { n: cs.content, top, overlapArea: Math.round(ox * oy) };
      });
      return { key: { l: kr.left, t: kr.top, r: kr.right, b: kr.bottom }, pressed: document.querySelector('[data-sw-grid-key]').getAttribute('aria-pressed'), covered: tags.filter((t) => t.overlapArea > 0) };
    });
    console.log(w, touch ? 'touch' : 'mouse', JSON.stringify(info));
    await page.screenshot({ path: join(OUT, `key__${w}__${touch ? 'touch' : 'mouse'}__latched.png`), clip: { x: 0, y: 0, width: w, height: Math.min(h, 220) } });
    await key.focus().catch(() => {});
    await ctx.close();
  }
} finally {
  await browser.close();
  if (server) await new Promise((r) => server.close(r));
}
