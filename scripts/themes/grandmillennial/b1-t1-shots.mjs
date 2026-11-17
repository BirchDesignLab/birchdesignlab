/**
 * B1 task 1 sheets: whole-page grandmillennial shots at every review size, both
 * schemes, for before (snap-stage5-base) and after, plus before/after sheets.
 *
 *   BDL_GPU=1 node scripts/themes/snap.mjs --name stage5-base --reuse --port 4460 -- \
 *     node scripts/themes/grandmillennial/b1-t1-shots.mjs --label before
 *   BDL_GPU=1 node scripts/themes/snap.mjs --name b1t1 --port 4460 -- \
 *     node scripts/themes/grandmillennial/b1-t1-shots.mjs --label after
 *   node scripts/themes/grandmillennial/b1-t1-shots.mjs --sheets      (no browser)
 *
 * Output: scripts/themes/.out/stage5/b1/t1/shots/<label>__<page>__<scheme>__<size>.jpg
 * and sheets/<page>__<scheme>.jpg (before | after, one row per size).
 * Exits 2 if the renderer is software. Prefers-reduced-transparency is forced to
 * no-preference, the portal prompt is suppressed, the switcher is hidden in shots.
 */
import { chromium } from 'playwright';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const OUT = join(REPO, 'scripts', 'themes', '.out', 'stage5', 'b1', 't1');
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i < 0 ? d : process.argv[i + 1]; };
const label = arg('label', 'after');
const only = arg('pages', '').split(',').filter(Boolean);
const PAGES = ['home', 'services', 'contact', 'about'].filter((p) => !only.length || only.includes(p));
const SIZES = [
  { id: '1440', w: 1440, h: 900, dpr: 1 }, { id: '1280', w: 1280, h: 800, dpr: 1 }, { id: '1024', w: 1024, h: 768, dpr: 1 },
  { id: '820', w: 820, h: 1180, dpr: 1 }, { id: '390', w: 390, h: 844, dpr: 2, mobile: true },
];
const SCHEMES = ['light', 'dark'];
const shotsDir = join(OUT, 'shots'), sheetsDir = join(OUT, 'sheets');
await mkdir(shotsDir, { recursive: true });
await mkdir(sheetsDir, { recursive: true });
const shotPath = (l, p, s, z) => join(shotsDir, `${l}__${p}__${s}__${z}.jpg`);

if (!process.argv.includes('--sheets')) {
  const base = (process.env.SNAP_BASE || '').replace(/\/$/, '');
  if (!base) { console.error('SNAP_BASE not set: run through snap.mjs'); process.exit(1); }
  const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
  let checked = false;
  for (const scheme of SCHEMES) for (const sz of SIZES) {
    const context = await browser.newContext({
      viewport: { width: sz.w, height: sz.h }, deviceScaleFactor: sz.dpr, isMobile: !!sz.mobile, hasTouch: !!sz.mobile,
      colorScheme: scheme, reducedMotion: 'no-preference',
    });
    await suppressPrompt(context);
    await context.addInitScript((s) => { try { localStorage.setItem('scheme', s); localStorage.setItem('theme', s); } catch {} }, scheme);
    await context.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setEmulatedMedia', { features: [
      { name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'no-preference' },
      { name: 'prefers-reduced-transparency', value: 'no-preference' } ] });
    for (const p of PAGES) {
      await page.goto(`${base}/t/grandmillennial/${p === 'home' ? '' : p + '/'}`, { waitUntil: 'networkidle' });
      await page.addStyleTag({ content: 'bdl-switcher{display:none!important} *{scroll-behavior:auto!important}' });
      await page.evaluate(async () => { await document.fonts.ready; });
      await page.waitForTimeout(500);
      if (!checked) {
        const r = await page.evaluate(() => { const c = document.createElement('canvas').getContext('webgl'); const e = c && c.getExtension('WEBGL_debug_renderer_info'); return e ? c.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'none'; });
        await writeFile(join(OUT, 'renderer.txt'), r + '\n');
        console.log('renderer:', r);
        if (/swiftshader|llvmpipe|software/i.test(r) || r === 'none') { console.error('software renderer'); process.exit(2); }
        checked = true;
      }
      const got = await page.evaluate(() => `${document.documentElement.dataset.theme}/${document.documentElement.dataset.scheme}`);
      if (got !== `grandmillennial/${scheme}`) console.warn(`WARN ${p} ${sz.id}: got ${got}, wanted ${scheme}`);
      await page.screenshot({ path: shotPath(label, p, scheme, sz.id), fullPage: true, type: 'jpeg', quality: 86 });
    }
    await context.close();
  }
  await browser.close();
  console.log(`shots done: ${label}`);
} else {
  // One sheet per page, scheme and size: before | after side by side, scaled to a readable width.
  for (const p of PAGES) for (const scheme of SCHEMES) for (const sz of SIZES) {
    const fa = shotPath('before', p, scheme, sz.id), fb = shotPath('after', p, scheme, sz.id);
    if (!existsSync(fa) || !existsSync(fb)) continue;
    const a = await loadImage(await readFile(fa)), b = await loadImage(await readFile(fb));
    const cellW = sz.w >= 1024 ? 760 : 560, gap = 16, pad = 16, head = 28;
    const ha = Math.round(a.height * (cellW / a.width)), hb = Math.round(b.height * (cellW / b.width));
    const cv = createCanvas(pad * 2 + cellW * 2 + gap, head + Math.max(ha, hb) + pad);
    const g = cv.getContext('2d');
    g.fillStyle = '#777'; g.fillRect(0, 0, cv.width, cv.height);
    g.font = '18px sans-serif'; g.fillStyle = '#fff';
    g.fillText(`${p} ${scheme} ${sz.id}: before`, pad, 20);
    g.fillText('after', pad + cellW + gap, 20);
    g.drawImage(a, pad, head, cellW, ha);
    g.drawImage(b, pad + cellW + gap, head, cellW, hb);
    await writeFile(join(sheetsDir, `${p}__${scheme}__${sz.id}.jpg`), cv.toBuffer('image/jpeg', 82));
  }
  console.log('sheets done');
}
