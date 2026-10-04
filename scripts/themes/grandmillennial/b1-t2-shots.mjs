/**
 * B1 task 2 sheets and probes for the grandmillennial About (and Services' band):
 *
 *   node scripts/themes/grandmillennial/b1-t2-shots.mjs --base http://127.0.0.1:4460 --label after [--pages about,services] [--sizes 1440,390]
 *   node scripts/themes/grandmillennial/b1-t2-shots.mjs --base ... --measure     (card rects in the wall's drawing coordinates)
 *   node scripts/themes/grandmillennial/b1-t2-shots.mjs --sheets                  (before | after, no browser)
 *
 * Output: scripts/themes/.out/stage5/b1/t2/shots/<label>__<page>__<scheme>__<size>.jpg, sheets/.
 * GPU Chromium (d3d11); exits 2 if the renderer is software. Prefers-reduced-transparency
 * is forced to no-preference, the portal prompt is suppressed, the switcher is hidden.
 */
import { chromium } from 'playwright';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { open } from './t2-common.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const OUT = join(REPO, 'scripts', 'themes', '.out', 'stage5', 'b1', 't2');
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i < 0 ? d : process.argv[i + 1]; };
const flag = (n) => process.argv.includes(`--${n}`);
const label = arg('label', 'after');
const base = (arg('base', process.env.SNAP_BASE || '')).replace(/\/$/, '');
const pages = arg('pages', 'about,services').split(',').filter(Boolean);
const ALL = [
  { id: '1440', w: 1440, h: 900, dpr: 1 }, { id: '1280', w: 1280, h: 800, dpr: 1 }, { id: '1024', w: 1024, h: 768, dpr: 1 },
  { id: '820', w: 820, h: 1180, dpr: 1 }, { id: '390', w: 390, h: 844, dpr: 2, mobile: true },
];
const want = arg('sizes', '').split(',').filter(Boolean);
const SIZES = ALL.filter((s) => !want.length || want.includes(s.id));
const SCHEMES = arg('schemes', 'light,dark').split(',');
const shotsDir = join(OUT, 'shots'), sheetsDir = join(OUT, 'sheets');
await mkdir(shotsDir, { recursive: true });
await mkdir(sheetsDir, { recursive: true });
const shotPath = (l, p, s, z) => join(shotsDir, `${l}__${p}__${s}__${z}.jpg`);

if (!flag('sheets')) {
  if (!base) { console.error('--base (or SNAP_BASE) not set'); process.exit(1); }
  const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
  let checked = false;
  for (const scheme of SCHEMES) for (const sz of SIZES) {
    const { context, page } = await open(browser, scheme, sz);
    for (const p of pages) {
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
      if (flag('measure') && p === 'about') {
        const m = await page.evaluate(() => {
          const q = (s) => [...document.querySelectorAll(s)].map((e) => { const r = e.getBoundingClientRect(); return { s, x: Math.round(r.left), y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height), vis: getComputedStyle(e).display !== 'none' }; });
          return [...q('.scene-part'), ...q('.story'), ...q('.letter'), ...q('.sitter'), ...q('.gm-frame2'), ...q('.gilt-oval'), ...q('.gm-wall-band')];
        });
        await writeFile(join(OUT, `measure__${sz.id}.json`), JSON.stringify(m, null, 1));
        console.log(scheme, sz.id, m.length, 'rects');
      }
      if (!flag('measure')) await page.screenshot({ path: shotPath(label, p, scheme, sz.id), fullPage: true, type: 'jpeg', quality: 86 });
    }
    await context.close();
  }
  await browser.close();
  console.log(`shots done: ${label}`);
} else {
  for (const p of pages) for (const scheme of SCHEMES) for (const sz of SIZES) {
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
