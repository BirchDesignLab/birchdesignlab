/**
 * Stage 6 wave 3, task 23: the two toys close up (device scale 3), both schemes, on one sheet each.
 *   node scripts/themes/snap.mjs --name s6-w3-t23 --reuse --port 4470 -- node scripts/themes/stage6/w3-t23-zoom.mjs
 * Output: scripts/themes/.out/stage6/w3/t23/zoom-<scheme>.png
 */
import { join } from 'node:path';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { writeFile } from 'node:fs/promises';
import { launch, open, reach, OUT } from './w3-t23-lib.mjs';

const { browser } = await launch();
for (const scheme of ['light', 'dark']) {
  const shots = [];
  for (const [path, sel] of [['/t/cottagecore/', '[data-cc-toy="dandelion"]'], ['/t/cottagecore/contact/sent/', '[data-cc-toy="stamp"]']]) {
    const { ctx, page } = await open(browser, { path, width: 1440, scheme, settle: 1200 });
    await reach(page, sel);
    const box = await page.evaluate((sel) => { const r = document.querySelector(sel).getBoundingClientRect(); return { x: r.left - 24, y: r.top - 24, width: r.width + 48, height: r.height + 48 }; }, sel);
    // device scale 3: re-open a 3x context at the same place
    await ctx.close();
    const c3 = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 3, colorScheme: scheme, reducedMotion: 'no-preference' });
    await c3.addInitScript((s) => { try { localStorage.setItem('scheme', s); } catch {} }, scheme);
    const { suppressPrompt } = await import('../lib/portal-prompt.mjs');
    await suppressPrompt(c3);
    await c3.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
    const p3 = await c3.newPage();
    await p3.goto(`${process.env.SNAP_BASE}${path}`, { waitUntil: 'networkidle' });
    await p3.addStyleTag({ content: 'bdl-switcher{display:none!important}' });
    await p3.evaluate(() => document.fonts.ready);
    await reach(p3, sel);
    await p3.waitForTimeout(600);
    const b3 = await p3.evaluate((sel) => { const r = document.querySelector(sel).getBoundingClientRect(); return { x: Math.max(0, r.left - 24), y: Math.max(0, r.top - 24), width: r.width + 48, height: r.height + 48 }; }, sel);
    shots.push(await p3.screenshot({ clip: b3 }));
    await c3.close();
  }
  const imgs = await Promise.all(shots.map((b) => loadImage(b)));
  const W = imgs.reduce((a, i) => a + i.width + 20, 20), H = Math.max(...imgs.map((i) => i.height)) + 40;
  const c = createCanvas(W, H);
  const g = c.getContext('2d');
  g.fillStyle = '#1b1b1d'; g.fillRect(0, 0, W, H);
  let x = 20;
  for (const i of imgs) { g.drawImage(i, x, 20); x += i.width + 20; }
  await writeFile(join(OUT, `zoom-${scheme}.png`), await c.encode('png'));
}
await browser.close();
