/**
 * Stage 4 B1 task 3: whole-page swiss sheets on the GPU.
 *
 * Serves dist/ (or the dir given as --dist) on one port, loads each swiss
 * page at 1440, 1280, 1024, 820 and 390 (2x), light and dark, with the portal
 * prompt suppressed and reduced-transparency forced to no-preference, and
 * writes a whole-page PNG per case plus probes.json (renderer string, About's
 * Birch ink box against its section, Home's last-baseline pairing, Contact's
 * sheet).
 *
 *   BDL_GPU=1 node scripts/themes/swiss/shoot-pages.mjs [--out=dir] [--pages=home,about] [--sizes=1440,390]
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveDist } from '../lib/serve-dist.mjs';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..');
const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=')[1] || d;
const OUT = join(REPO, arg('out', 'scripts/themes/.out/stage4/task-3'));
const PORT = 4460;
const ROUTES = { home: '/t/swiss/', about: '/t/swiss/about/', services: '/t/swiss/services/', contact: '/t/swiss/contact/' };
const SIZES = [
  { id: '1440', w: 1440, h: 900, dpr: 1 }, { id: '1280', w: 1280, h: 800, dpr: 1 },
  { id: '1024', w: 1024, h: 768, dpr: 1 }, { id: '820', w: 820, h: 1180, dpr: 1 },
  { id: '390', w: 390, h: 844, dpr: 2, mobile: true },
];
const pages = arg('pages', 'home,about,services,contact').split(',');
const sizeIds = arg('sizes', SIZES.map((s) => s.id).join(',')).split(',');
if (process.env.BDL_GPU !== '1') { console.error('BDL_GPU=1 is required'); process.exit(2); }

await mkdir(OUT, { recursive: true });
const server = await serveDist(PORT, process.env.DIST || join(REPO, 'dist'));
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const probes = {};
try {
  {
    const p = await browser.newPage();
    const r = await p.evaluate(() => {
      const gl = document.createElement('canvas').getContext('webgl');
      const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
      return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'no webgl';
    });
    await p.close();
    console.log(`renderer: ${r}`);
    probes.renderer = r;
    if (/swiftshader|llvmpipe|software|no webgl/i.test(r)) { console.error('software renderer: aborting'); process.exit(2); }
  }
  for (const sz of SIZES.filter((s) => sizeIds.includes(s.id))) {
    for (const scheme of ['light', 'dark']) {
      const context = await browser.newContext({
        viewport: { width: sz.w, height: sz.h }, deviceScaleFactor: sz.dpr,
        isMobile: !!sz.mobile, hasTouch: !!sz.mobile, colorScheme: scheme, reducedMotion: 'no-preference',
      });
      await suppressPrompt(context);
      await context.addInitScript((s) => { try { localStorage.setItem('scheme', s); } catch {} }, scheme);
      for (const name of pages) {
        const page = await context.newPage();
        await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'no-preference', reducedTransparency: 'no-preference' });
        await page.goto(`http://127.0.0.1:${PORT}${ROUTES[name]}`, { waitUntil: 'networkidle' });
        await page.addStyleTag({ content: 'bdl-switcher{display:none!important} *{scroll-behavior:auto!important}' });
        await page.evaluate(async () => { await document.fonts.ready; });
        // Lazy images: bring the whole page through the viewport once.
        await page.evaluate(async () => {
          for (let y = 0; y < document.documentElement.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
          window.scrollTo(0, 0);
          await Promise.all([...document.images].map((i) => i.decode().catch(() => {})));
        });
        await page.waitForTimeout(500);
        const got = await page.evaluate(() => ({ theme: document.documentElement.dataset.theme, scheme: document.documentElement.dataset.scheme }));
        if (got.theme !== 'swiss' || got.scheme !== scheme) console.warn(`WARN ${name} ${sz.id} ${scheme}: theme=${got.theme} scheme=${got.scheme}`);
        await page.screenshot({ path: join(OUT, `${name}__${scheme}__${sz.id}.png`), fullPage: true });
        const key = `${name}__${scheme}__${sz.id}`;
        probes[key] = await page.evaluate((n) => {
          const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { l: +b.left.toFixed(1), t: +(b.top + scrollY).toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) }; };
          const o = { scrollW: document.documentElement.scrollWidth, innerW: innerWidth };
          if (n === 'about') {
            const w = document.querySelector('.sw-birch');
            o.birch = { box: r(w), display: w && getComputedStyle(w).display, size: w && getComputedStyle(w).fontSize, section: r(document.querySelector('.founder')) };
            const img = document.querySelector('.field-img');
            o.field = { img: r(img), manifesto: r(document.querySelector('.manifesto')), loading: img && img.loading, src: img && img.currentSrc };
          }
          if (n === 'home') {
            o.billboard = r(document.querySelector('.billboard'));
            o.lede = r(document.querySelector('.lede'));
            o.more = r(document.querySelector('.more'));
            o.doors = [...document.querySelectorAll('.door')].map(r);
          }
          if (n === 'services') o.nums = [...document.querySelectorAll('.num')].map((e) => ({ ...r(e), fs: getComputedStyle(e).fontSize, lh: getComputedStyle(e).lineHeight }));
          return o;
        }, name);
        await page.close();
      }
      await context.close();
    }
  }
  await writeFile(join(OUT, 'probes.json'), JSON.stringify(probes, null, 2) + '\n');
} finally {
  await browser.close();
  server.close();
}
