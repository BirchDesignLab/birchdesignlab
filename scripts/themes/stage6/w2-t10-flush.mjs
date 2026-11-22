/**
 * Stage 6 wave 2, task 10 (T4 C5): optical flush-left, line by line. For every
 * swiss giant (Home, About, Services, Contact, Sent) at each width it finds each
 * rendered line of the h1, scans the line's pixels (DPR 3, light, no hint, no
 * LCD text) for the leftmost ink, and prints ink minus the frame's left edge in
 * px. Zero is flush.
 *
 *   SNAP=s6-w2-t10-before node scripts/themes/stage6/w2-t10-flush.mjs
 *   Results: scripts/themes/.out/stage6/w2/t10/flush-<SNAP>.json
 */
import { chromium } from 'playwright';
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveDist } from '../lib/serve-dist.mjs';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUTROOT = join(HERE, '..', '.out');
const SNAP = process.env.SNAP || 'dev';
const BASE = process.env.BASE; // a running server instead of a snap
const PORT = Number(process.env.PORT || 4470);
const WIDTHS = (process.env.WIDTHS || '1440,1280,1024,820,390').split(',').map(Number);
const PAGES = ['', 'about/', 'services/', 'contact/'];
const heights = { 1440: 900, 1280: 800, 1024: 768, 820: 1180, 390: 844 };
mkdirSync(join(OUTROOT, 'stage6', 'w2', 't10'), { recursive: true });
const server = BASE ? null : await serveDist(PORT, join(OUTROOT, `snap-${SNAP}`));
const ORIGIN = BASE || `http://127.0.0.1:${PORT}`;
const browser = await chromium.launch({ args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--font-render-hinting=none', '--disable-lcd-text'] });
const out = [];
try {
  for (const w of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: heights[w] }, deviceScaleFactor: 3, colorScheme: 'light' });
    await suppressPrompt(ctx);
    await ctx.addInitScript(() => { try { localStorage.setItem('scheme', 'light'); sessionStorage.setItem('bdl-swiss-dial-hint', '1'); } catch {} });
    for (const pg of PAGES) {
      const page = await ctx.newPage();
      await page.goto(`${ORIGIN}/t/swiss/${pg}`, { waitUntil: 'networkidle' });
      await page.addStyleTag({ content: 'bdl-switcher,astro-dev-toolbar{display:none!important}' });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(500);
      const lines = await page.evaluate(() => {
        const h1 = document.querySelector('main h1.sw-display');
        const frame = h1.closest('.sw-row').getBoundingClientRect();
        // One rect per rendered line: every text node's word ranges, grouped by their top.
        const walker = document.createTreeWalker(h1, NodeFilter.SHOW_TEXT);
        const rects = [];
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          const t = n.textContent;
          for (let i = 0; i < t.length; i++) {
            if (!t[i].trim()) continue;
            const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + 1);
            const b = r.getBoundingClientRect();
            if (b.width) rects.push({ ch: t[i], l: b.left, r: b.right, t: b.top, b: b.bottom });
          }
        }
        const groups = [];
        for (const r of rects) {
          const g = groups.find((g) => Math.abs(g.t - r.t) < 4);
          if (g) { g.text += r.ch; g.l = Math.min(g.l, r.l); g.r = Math.max(g.r, r.r); } else groups.push({ text: r.ch, t: r.t, b: r.b, l: r.l, r: r.r });
        }
        return { frameLeft: frame.left, y0: scrollY, fs: parseFloat(getComputedStyle(h1).fontSize), groups };
      });
      const row = { width: w, page: pg || 'home', lines: [] };
      for (const g of lines.groups) {
        const x = Math.max(0, lines.frameLeft - 60);
        const clip = { x, y: g.t + lines.y0, width: Math.min(w - x, 500), height: g.b - g.t };
        const buf = await page.screenshot({ clip, fullPage: true });
        const { data, info } = await sharp(buf).greyscale().raw().toBuffer({ resolveWithObject: true });
        let l = info.width;
        for (let y = 0; y < info.height; y++) for (let xx = 0; xx < info.width; xx++) if (data[y * info.width + xx] < 128 && xx < l) l = xx;
        row.lines.push({ text: g.text, inkMinusFrame: +((x + l / 3) - lines.frameLeft).toFixed(2) });
      }
      out.push(row);
      console.log(String(w).padStart(5), row.page.padEnd(9), row.lines.map((l) => `${l.text}:${l.inkMinusFrame}`).join('  '));
      await page.close();
    }
    await ctx.close();
  }
  writeFileSync(join(OUTROOT, 'stage6', 'w2', 't10', `flush-${SNAP}.json`), JSON.stringify(out, null, 1));
} finally {
  await browser.close();
  if (server) await new Promise((r) => server.close(r));
}
