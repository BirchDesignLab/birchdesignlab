/**
 * Stage 6 wave 4, task 30: shared launcher and helpers for the task's evidence scripts (cottagecore and
 * grandmillennial closing C). It is w4-t29-lib with its own output folder and one addition: `arrive`, which reaches a
 * school's page through the REAL switcher (the portal bar's school row, on the same page of the quiet school), so the
 * evidence is shot the way a visitor arrives, never by a bare goto to /t/<school>/. GPU Chromium (d3d11, renderer
 * checked), reduced transparency forced to no-preference, the portal prompt suppressed. SNAP_BASE (set by snap.mjs)
 * picks the server, default http://127.0.0.1:4470. Output: scripts/themes/.out/stage6/w4/t30/ (gitignored scratch).
 */
import { mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { suppressPrompt } from '../lib/portal-prompt.mjs';
export * from './w4-t29-lib.mjs';
import { BASE as T28_BASE } from './w4-t29-lib.mjs';

export const BASE = T28_BASE;
export const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', '.out', 'stage6', 'w4', 't30');
await mkdir(OUT, { recursive: true });

/**
 * A fresh context, then the page `path` (for example '/t/cottagecore/about/') reached through the switcher: open the
 * quiet school's same page, open the switcher, press the school's row, wait for the URL. When the quiet school has no
 * such page (the Sent page is reached only by a form post) the school is chosen on its Home through the switcher and
 * the page is then loaded directly inside that school; `via` says which happened. The switcher is hidden afterwards so
 * it stays out of the shots.
 */
export async function arrive(browser, { path, width, scheme = 'light', touch, settle = 900, hideSwitcher = true, height, init }) {
  const mobile = touch ?? width < 900;
  const h = height ?? (width < 700 ? 844 : width < 1100 ? 1180 : 900);
  const ctx = await browser.newContext({ viewport: { width, height: h }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile, colorScheme: scheme, reducedMotion: 'no-preference' });
  await suppressPrompt(ctx);
  await ctx.addInitScript((s) => { try { localStorage.setItem('scheme', s); } catch {} }, scheme);
  if (init) await ctx.addInitScript(init);
  await ctx.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
  const school = path.split('/')[2];
  const rest = path.split('/').slice(3).join('/');
  let via = 'switcher';
  await page.goto(`${BASE}/t/quiet/${rest}`, { waitUntil: 'networkidle' });
  if (!(await page.evaluate(() => !!document.querySelector('bdl-switcher')))) throw new Error('no switcher on the quiet page');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  await page.evaluate(() => document.querySelector('bdl-switcher').shadowRoot.querySelector('.open').click());
  await page.waitForTimeout(500);
  const box = await page.evaluate((id) => {
    const a = document.querySelector('bdl-switcher').shadowRoot.querySelector(`a[data-school="${id}"]`);
    a.scrollIntoView({ block: 'nearest' });
    const r = a.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, school);
  if (mobile) await page.touchscreen.tap(box.x, box.y); else await page.mouse.click(box.x, box.y);
  await page.waitForURL((u) => u.pathname.startsWith(`/t/${school}/`), { timeout: 15000 });
  await page.waitForTimeout(1600);
  if (new URL(page.url()).pathname !== path) {
    via = 'switcher then goto';
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
  }
  if (hideSwitcher) await page.addStyleTag({ content: 'bdl-switcher{display:none!important}' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(settle);
  return { ctx, page, cdp, errors, mobile, via };
}

/** Launch GPU Chromium and check the renderer (the same check every wave 4 script makes). */
export { launch } from './w4-t28-lib.mjs';
export { chromium };
