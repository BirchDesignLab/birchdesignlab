/**
 * List every heading, display lede and paragraph on a school's pages that
 * ends on a lone word (a widow), with its line count and last line, so a
 * text-wrap change can be checked as numbers beside the stills.
 *
 * Written 09-23-26 for Tier 3 stage 2 (bauhaus E5: text-wrap balance on the
 * headings and ledes, pretty on paragraphs). Run it against the frozen main
 * build and against the builder's snapshot and diff the two outputs. Lines
 * are found from the text's client rects (a new line wherever a rect's top
 * moves down by more than half its height). It widens nothing and judges
 * nothing: it reports what wraps where, at today's copy.
 *
 * Usage (serve a build first; snap.mjs sets SNAP_BASE):
 *   BDL_GPU=1 node scripts/themes/snap.mjs --name head --reuse --port 4566 -- \
 *     node scripts/themes/harness/bauhaus-wrap-probe.mjs --school bauhaus \
 *     [--schemes light] [--viewports desktop,mobile] [--out <file.json>] [--shots <dir>]
 * Prints one line per element with a lone last word, then a count per page.
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}
const list = (name, fallback) => (arg(name, fallback) || '').split(',').filter(Boolean);

const base = arg('base', process.env.SNAP_BASE || 'http://127.0.0.1:8787').replace(/\/$/, '');
const school = arg('school', 'bauhaus');
const schemes = list('schemes', 'light');
const viewports = list('viewports', 'desktop,mobile');
const out = arg('out', '');
const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844, mobile: true },
};
const PAGES = ['', 'about/', 'services/', 'contact/', 'contact/sent/'];
/* --shots <dir> also screenshots these sections, for before/after sheets
   (the brief's E5 checks: the Home closer and opener, the Services process
   heading and ask band, About's lead and manifesto, the Contact lede). */
const shots = arg('shots', '');
const SHOTS = {
  '': ['.opener', '.closer'],
  'about/': ['.founder-body', '.manifesto'],
  'services/': ['.process-heading', '.ask', 'main h1'],
  'contact/': ['.lede', '.direct-body'],
};
const SELECTOR = 'main :is(h1, h2, h3, p)';

if (shots) await mkdir(shots, { recursive: true });
const gpu = process.env.BDL_GPU === '1';
const browser = await chromium.launch({
  args: gpu ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] : [],
});
const result = [];
for (const scheme of schemes) {
  for (const vpName of viewports) {
    const vp = VIEWPORTS[vpName];
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: vp.mobile ? 2 : 1,
      isMobile: !!vp.mobile,
      hasTouch: !!vp.mobile,
      colorScheme: scheme,
      reducedMotion: 'reduce',
    });
    await context.addInitScript((s) => { try { localStorage.setItem('scheme', s); } catch {} }, scheme);
    await context.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
    const page = await context.newPage();
    for (const path of PAGES) {
      await page.goto(`${base}/t/${school}/${path}`, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      const rows = await page.evaluate((sel) => {
        const found = [];
        for (const el of document.querySelectorAll(sel)) {
          if (el.closest('[aria-hidden="true"]')) continue;
          const text = el.textContent.replace(/\s+/g, ' ').trim();
          if (!text || getComputedStyle(el).display === 'none') continue;
          // Walk the words: each word's first rect says which line it is on.
          const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
          const words = [];
          for (let n = walker.nextNode(); n; n = walker.nextNode()) {
            const re = /\S+/g;
            let m;
            while ((m = re.exec(n.data))) {
              const r = document.createRange();
              r.setStart(n, m.index);
              r.setEnd(n, m.index + m[0].length);
              const rect = r.getClientRects()[0];
              if (rect) words.push({ w: m[0], top: rect.top, h: rect.height });
            }
          }
          const lines = [];
          for (const wd of words) {
            const last = lines[lines.length - 1];
            if (!last || wd.top > last.top + last.h / 2) lines.push({ top: wd.top, h: wd.h, words: [wd.w] });
            else last.words.push(wd.w);
          }
          const cls = typeof el.className === 'string' ? el.className.split(/\s+/).filter((c) => !c.startsWith('astro-')).join('.') : '';
          found.push({
            el: el.tagName.toLowerCase() + (cls ? `.${cls}` : ''),
            text: text.slice(0, 60),
            lines: lines.length,
            lastLine: lines.length ? lines[lines.length - 1].words.join(' ') : '',
            widow: lines.length > 1 && lines[lines.length - 1].words.length === 1,
          });
        }
        return found;
      }, SELECTOR);
      if (shots) {
        for (const [i, sel] of (SHOTS[path] || []).entries()) {
          const loc = page.locator(sel).first();
          if (await loc.count()) {
            await loc.scrollIntoViewIfNeeded();
            await loc.screenshot({ path: join(shots, `${(path || 'home/').replace(/\//g, '_')}${i}__${scheme}__${vpName}.png`) });
          }
        }
      }
      for (const r of rows) {
        result.push({ scheme, viewport: vpName, page: path || 'home/', ...r });
        if (r.widow) console.log(`${vpName} ${scheme} /${path || ''}  ${r.el}  ${r.lines} lines, ends "${r.lastLine}"  (${r.text})`);
      }
      console.log(`  ${vpName} ${scheme} /${path}: ${rows.filter((r) => r.widow).length} widows in ${rows.length} elements`);
    }
    await context.close();
  }
}
await browser.close();
if (out) await writeFile(out, JSON.stringify(result, null, 2));
