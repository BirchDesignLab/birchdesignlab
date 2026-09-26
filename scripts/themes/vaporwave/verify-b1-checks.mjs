/**
 * Sonnet-verifier ad hoc checks for vaporwave wave B1 (Tier 3 Stage 3).
 * Not a permanent harness tool; written to gather objective evidence for the
 * B1 verify pass's required cases. Run against a served snap (default
 * http://127.0.0.1:4476).
 *
 * Usage: BDL_GPU=1 node scripts/themes/vaporwave/verify-b1-checks.mjs
 * Output: scripts/themes/.out/b1-vw-ver/checks.json
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', '.out', 'b1-vw-ver');
const BASE = process.env.SNAP_BASE || 'http://127.0.0.1:4476';

const PAGES = [
  { slug: 'home', path: '/t/vaporwave/' },
  { slug: 'about', path: '/t/vaporwave/about/' },
  { slug: 'services', path: '/t/vaporwave/services/' },
  { slug: 'contact', path: '/t/vaporwave/contact/' },
  { slug: 'sent', path: '/t/vaporwave/contact/sent/' },
];
const WIDTHS = [390, 820, 1024, 1280, 1440];

async function main() {
  await mkdir(OUT, { recursive: true });
  const args = ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'];
  const browser = await chromium.launch({ headless: true, args });
  const results = {};

  // GPU renderer check
  {
    const page = await browser.newPage();
    await page.goto(BASE + '/t/vaporwave/');
    const renderer = await page.evaluate(() => {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl');
      const dbg = gl && gl.getExtension('WEBGL_debug_renderer_info');
      return dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'unknown';
    });
    results.gpuRenderer = renderer;
    await page.close();
  }

  // scrollWidth sweep
  results.scrollWidthSweep = {};
  for (const w of WIDTHS) {
    results.scrollWidthSweep[w] = {};
    for (const p of PAGES) {
      const page = await browser.newPage({ viewport: { width: w, height: 900 } });
      await page.goto(BASE + p.path, { waitUntil: 'networkidle' });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.waitForTimeout(200);
      const sw = await page.evaluate(() => document.documentElement.scrollWidth);
      const iw = await page.evaluate(() => window.innerWidth);
      results.scrollWidthSweep[w][p.slug] = { scrollWidth: sw, innerWidth: iw, ok: sw <= iw };
      await page.close();
    }
  }

  // canvas / webgl context count per page
  results.canvasCount = {};
  for (const p of PAGES) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(BASE + p.path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    const info = await page.evaluate(() => {
      const canvases = Array.from(document.querySelectorAll('canvas'));
      return canvases.map(c => ({ w: c.width, h: c.height, cls: c.className }));
    });
    results.canvasCount[p.slug] = info;
    await page.close();
  }

  // stills: network 404s, format, alt text
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const failed = [];
    page.on('response', (resp) => {
      if (!resp.ok() && /stills|_astro/.test(resp.url())) failed.push({ url: resp.url(), status: resp.status() });
    });
    await page.goto(BASE + '/t/vaporwave/', { waitUntil: 'networkidle' });
    const stillsHome = await page.evaluate(() => Array.from(document.querySelectorAll('picture')).map(p => ({
      sources: Array.from(p.querySelectorAll('source')).map(s => ({ srcset: s.srcset, type: s.type })),
      img: p.querySelector('img') ? { src: p.querySelector('img').currentSrc || p.querySelector('img').src, alt: p.querySelector('img').alt, loading: p.querySelector('img').loading } : null,
    })));
    await page.goto(BASE + '/t/vaporwave/about/', { waitUntil: 'networkidle' });
    const stillsAbout = await page.evaluate(() => Array.from(document.querySelectorAll('picture')).map(p => ({
      sources: Array.from(p.querySelectorAll('source')).map(s => ({ srcset: s.srcset, type: s.type })),
      img: p.querySelector('img') ? { src: p.querySelector('img').currentSrc || p.querySelector('img').src, alt: p.querySelector('img').alt, loading: p.querySelector('img').loading } : null,
    })));
    await page.goto(BASE + '/t/vaporwave/services/', { waitUntil: 'networkidle' });
    const stillsServices = await page.evaluate(() => Array.from(document.querySelectorAll('picture')).map(p => ({
      sources: Array.from(p.querySelectorAll('source')).map(s => ({ srcset: s.srcset, type: s.type })),
      img: p.querySelector('img') ? { src: p.querySelector('img').currentSrc || p.querySelector('img').src, alt: p.querySelector('img').alt, loading: p.querySelector('img').loading } : null,
    })));
    results.stills = { home: stillsHome, about: stillsAbout, services: stillsServices, failedRequests: failed };
    await page.close();
  }

  // 44px hit areas at phone width
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(BASE + '/t/vaporwave/', { waitUntil: 'networkidle' });
    const taskbarHits = await page.evaluate(() => Array.from(document.querySelectorAll('.task')).map(el => {
      const r = el.getBoundingClientRect();
      return { text: el.textContent.trim().slice(0, 20), w: r.width, h: r.height };
    }));
    const footerHits = await page.evaluate(() => Array.from(document.querySelectorAll('footer a')).map(el => {
      const r = el.getBoundingClientRect();
      return { text: el.textContent.trim().slice(0, 20), w: r.width, h: r.height };
    }));
    results.hitAreas = { taskbar: taskbarHits, footer: footerHits };
    await page.close();
  }

  // kana font check
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(BASE + '/t/vaporwave/', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.fonts.status === 'loaded');
    const kanaFonts = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('.vw-kana, .tray-kana, .opener-kana, .kiosk-kana, .intro-kana'));
      return els.map(el => ({ cls: el.className, family: getComputedStyle(el).fontFamily, text: el.textContent.trim().slice(0, 10) }));
    });
    results.kanaFonts = kanaFonts;
    await page.close();
  }

  // tray clock text + frozen check (2 captures 3s apart)
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(BASE + '/t/vaporwave/', { waitUntil: 'networkidle' });
    const clock1 = await page.evaluate(() => {
      const el = document.querySelector('.tray-kana')?.closest('[class*=tray]') || document.body;
      return el.textContent.match(/\d{1,2}:\d{2}/)?.[0] || null;
    });
    const ariaHidden = await page.evaluate(() => {
      const clockText = document.body.innerHTML;
      const m = document.evaluate("//*[contains(text(),'19:93')]", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
      return m ? { tag: m.tagName, ariaHidden: m.closest('[aria-hidden]')?.getAttribute('aria-hidden') || m.getAttribute('aria-hidden') } : null;
    });
    await page.waitForTimeout(3000);
    const clock2 = await page.evaluate(() => {
      const el = document.querySelector('.tray-kana')?.closest('[class*=tray]') || document.body;
      return el.textContent.match(/\d{1,2}:\d{2}/)?.[0] || null;
    });
    results.clock = { clock1, clock2, frozen: clock1 === clock2, ariaHidden };
    await page.close();
  }

  // screensaver Settings/Preview aria-hidden + not focusable, screensaver sun on vanishing point (qualitative bbox only)
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(BASE + '/t/vaporwave/contact/', { waitUntil: 'networkidle' });
    const winButtons = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, [role=button]')).filter(b => /settings|preview/i.test(b.textContent || ''));
      return btns.map(b => ({ text: b.textContent.trim(), ariaHidden: b.getAttribute('aria-hidden'), tabIndex: b.tabIndex, disabled: b.disabled }));
    });
    results.screensaverButtons = winButtons;
    await page.close();
  }

  // floor bottom check: does .vw-floor or continuation reach page bottom
  results.floorBottom = {};
  for (const p of PAGES) {
    for (const vp of [{ name: 'desktop', w: 1440, h: 900 }, { name: 'phone', w: 390, h: 844 }]) {
      const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h } });
      await page.goto(BASE + p.path, { waitUntil: 'networkidle' });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.waitForTimeout(200);
      const info = await page.evaluate(() => {
        const floor = document.querySelector('footer .floor');
        const pageH = document.documentElement.scrollHeight;
        if (!floor) return { found: false, pageH };
        const r = floor.getBoundingClientRect();
        const absoluteBottom = r.bottom + window.scrollY;
        const absoluteTop = r.top + window.scrollY;
        return { found: true, floorTop: absoluteTop, floorBottom: absoluteBottom, pageH, gapBelow: pageH - absoluteBottom };
      });
      results.floorBottom[`${p.slug}__${vp.name}`] = info;
      await page.close();
    }
  }

  await writeFile(join(OUT, 'checks.json'), JSON.stringify(results, null, 2));
  console.log('Wrote', join(OUT, 'checks.json'));
  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
