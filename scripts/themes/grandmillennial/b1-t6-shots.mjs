/**
 * B1 task 6 sheets: whole-page shots of the grandmillennial pages, both schemes,
 * every review size, GPU Chromium (exits 2 on a software renderer).
 *
 *   node scripts/themes/grandmillennial/b1-t6-shots.mjs --base http://127.0.0.1:4460 --label after \
 *        [--pages about,services,contact,home] [--sizes 1440,390] [--schemes light,dark]
 *
 * Output: scripts/themes/.out/stage5/b1/t6/shots/<label>__<page>__<scheme>__<size>.jpg
 * prefers-reduced-transparency is forced to no-preference, the portal prompt is
 * suppressed, the switcher is hidden.
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { open } from './t2-common.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const OUT = join(REPO, 'scripts', 'themes', '.out', 'stage5', 'b1', 't6');
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i < 0 ? d : process.argv[i + 1]; };
const label = arg('label', 'after');
const base = arg('base', 'http://127.0.0.1:4460').replace(/\/$/, '');
const pages = arg('pages', 'about,services,contact,home').split(',').filter(Boolean);
const ALL = [
  { id: '1440', w: 1440, h: 900, dpr: 1 }, { id: '1280', w: 1280, h: 800, dpr: 1 }, { id: '1024', w: 1024, h: 768, dpr: 1 },
  { id: '820', w: 820, h: 1180, dpr: 1 }, { id: '390', w: 390, h: 844, dpr: 2, mobile: true },
];
const want = arg('sizes', '').split(',').filter(Boolean);
const SIZES = ALL.filter((s) => !want.length || want.includes(s.id));
const SCHEMES = arg('schemes', 'light,dark').split(',');
const dir = join(OUT, 'shots');
await mkdir(dir, { recursive: true });

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
    await page.screenshot({ path: join(dir, `${label}__${p}__${scheme}__${sz.id}.jpg`), fullPage: true, type: 'jpeg', quality: 86 });
  }
  await context.close();
}
await browser.close();
console.log(`shots done: ${label}`);
