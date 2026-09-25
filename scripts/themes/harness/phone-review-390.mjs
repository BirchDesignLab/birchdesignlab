/**
 * A phone pass over every school for the Stage 2 review panel (visual lens):
 * at 390 px (a 2x touch phone), both schemes, every page, it reads
 *   - horizontal scroll (scrollWidth against clientWidth), and any visible
 *     element whose box runs past the viewport's right edge;
 *   - touch targets under 44 px (header, footer, main and the switcher's
 *     shadow bar), ignoring links inline in running text;
 *   - the switcher bar's box (must sit inside the viewport);
 * and shoots, per school and scheme: the top of Home with the first-load
 * prompt shown, Home scrolled to the middle (the header on scroll, with the
 * switcher over the page), and the switcher dialog open.
 *
 * Written 09-24-26 for Tier 3 stage 2's review panel. Read-only against a
 * served build; snap.mjs sets SNAP_BASE.
 *
 * Usage:
 *   BDL_GPU=1 node scripts/themes/harness/phone-review-390.mjs --base http://127.0.0.1:4603 \
 *     [--label stage2-review-visual-phone]
 * Output: scripts/themes/.out/<label>/ (PNGs + report.json); exit 1 if any
 * page scrolls sideways.
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}
const base = arg('base', process.env.SNAP_BASE || 'http://127.0.0.1:8787').replace(/\/$/, '');
const label = arg('label', 'stage2-review-visual-phone');
const out = join(HERE, '..', '.out', label);
await mkdir(out, { recursive: true });
const schools = arg('schools', 'vaporwave,glassmorphism,swiss,cottagecore,grandmillennial,bauhaus').split(',');
const pages = ['', 'about/', 'services/', 'contact/', 'contact/sent/'];

const gpu = process.env.BDL_GPU === '1';
const browser = await chromium.launch({ args: gpu ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] : [] });
const report = [];
let wide = 0;
for (const school of schools) {
  for (const scheme of ['dark', 'light']) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: scheme });
    await context.addInitScript((s) => { try { localStorage.setItem('scheme', s); } catch {} }, scheme);
    const page = await context.newPage();
    for (const p of pages) {
      await page.goto(`${base}/t/${school}/${p}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(p === '' ? 1400 : 300); // the prompt arrives after 1000 ms
      if (p === '') await page.screenshot({ path: join(out, `${school}__${scheme}__home-top-prompt.png`) });
      const r = await page.evaluate(() => {
        const vw = document.documentElement.clientWidth;
        const sw = document.documentElement.scrollWidth;
        const past = [];
        for (const el of document.body.querySelectorAll('*')) {
          const cs = getComputedStyle(el);
          if (cs.visibility === 'hidden' || cs.display === 'none') continue;
          const b = el.getBoundingClientRect();
          if (b.width === 0 || b.height === 0) continue;
          if (b.right > vw + 1) {
            // Only report if no ancestor clips it.
            let clipped = false;
            for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
              const ac = getComputedStyle(a);
              if (/(hidden|clip)/.test(ac.overflowX) && a.getBoundingClientRect().right <= vw + 1) { clipped = true; break; }
            }
            if (!clipped) past.push(`${el.tagName.toLowerCase()}.${[...el.classList].join('.')} right=${Math.round(b.right)}`);
          }
        }
        const small = [];
        const isInline = (el) => el.closest('p, li p, dd') && el.tagName === 'A';
        for (const el of document.querySelectorAll('header a, header button, footer a, footer button, main a, main button, main input, main textarea')) {
          const b = el.getBoundingClientRect();
          if (b.width === 0 || b.height === 0) continue;
          if (getComputedStyle(el).visibility === 'hidden') continue;
          if (isInline(el)) continue;
          if (el.closest('.skip, .skip-link') || el.classList.contains('skip')) continue;
          if (b.height < 44 || b.width < 44) small.push(`${el.closest('header') ? 'header' : el.closest('footer') ? 'footer' : 'main'} ${el.tagName.toLowerCase()} "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 24)}" ${Math.round(b.width)}x${Math.round(b.height)}`);
        }
        const sw_el = document.querySelector('bdl-switcher');
        const sr = sw_el?.shadowRoot;
        const bar = sr?.querySelector('.bar')?.getBoundingClientRect();
        const swSmall = [];
        for (const el of sr ? sr.querySelectorAll('.bar button, .bar a, .prompt button') : []) {
          const b = el.getBoundingClientRect();
          if (b.width === 0) continue;
          if (b.height < 44 || b.width < 44) swSmall.push(`${el.className} ${Math.round(b.width)}x${Math.round(b.height)}`);
        }
        const prompt = sr?.querySelector('.prompt');
        const pb = prompt && !prompt.hidden ? prompt.getBoundingClientRect() : null;
        return { vw, sw, past: past.slice(0, 12), small, swSmall,
          bar: bar && { l: Math.round(bar.left), r: Math.round(bar.right), t: Math.round(bar.top), b: Math.round(bar.bottom) },
          prompt: pb && { l: Math.round(pb.left), r: Math.round(pb.right), t: Math.round(pb.top), b: Math.round(pb.bottom) } };
      });
      if (r.sw > r.vw) wide++;
      report.push({ school, scheme, page: p || 'home', ...r });
      console.log(`${r.sw > r.vw ? 'WIDE' : 'ok  '} ${school} ${scheme} ${p || 'home'} sw ${r.sw}/${r.vw} past ${r.past.length} small ${r.small.length} swSmall ${r.swSmall.length} bar ${JSON.stringify(r.bar)} prompt ${JSON.stringify(r.prompt)}`);
      if (p === '') {
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight * 0.45));
        await page.waitForTimeout(500);
        await page.screenshot({ path: join(out, `${school}__${scheme}__home-scrolled.png`) });
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.evaluate(() => document.querySelector('bdl-switcher')?.shadowRoot?.querySelector('.open')?.click());
        await page.waitForTimeout(600);
        await page.screenshot({ path: join(out, `${school}__${scheme}__dialog.png`) });
        await page.evaluate(() => document.querySelector('bdl-switcher')?.shadowRoot?.querySelector('dialog')?.close());
      }
    }
    await context.close();
  }
}
await browser.close();
await writeFile(join(out, 'report.json'), JSON.stringify(report, null, 2));
console.log(`${wide} wide pages; report ${join(out, 'report.json')}`);
process.exit(wide ? 1 : 0);
