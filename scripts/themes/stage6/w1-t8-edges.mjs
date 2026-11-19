/**
 * Stage 6 w1 task 8, fix round 1: left edge of every block per division and
 * size (are the four layouts four?), plus the width dial's rest width.
 * BDL_GPU=1 node scripts/themes/stage6/w1-t8-edges.mjs [--port 4470]
 * Output: scripts/themes/.out/stage6/w1/t8/edges.json (scratch)
 */
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suppressPrompt } from '../lib/portal-prompt.mjs';
import { serveProof } from '../proofs/stage6-swiss-p3/serve.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', '.out', 'stage6', 'w1', 't8');
const i = process.argv.indexOf('--port');
const PORT = i === -1 ? 4470 : Number(process.argv[i + 1]);
if (process.env.BDL_GPU !== '1') { console.error('BDL_GPU=1 required'); process.exit(2); }
await mkdir(OUT, { recursive: true });
const server = await serveProof(PORT, join(HERE, '..', '.out', 'snap-s6-w1-t8'));
const browser = await chromium.launch({ headless: true, args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const SIZES = { 1440: [1440, 900], 1024: [1024, 768], 820: [820, 1180], 390: [390, 844] };
const SEL = { lede: '.hero .lede', lead: '.hero .lead', door1: '.doors .door:nth-child(1)', door2: '.doors .door:nth-child(2)', more: '.doors .more', kicker: '.doors .kicker', pull: '.lab .pull', designation: '.lab .designation', summary: '.lab .summary', labMore: '.lab .lab-more', cta: '.closer .closer-cta' };
const R = {};
for (const [id, [w, h]] of Object.entries(SIZES)) {
  for (const scheme of ['light', 'dark']) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, isMobile: w < 500, hasTouch: w < 500 });
    await suppressPrompt(ctx);
    await ctx.addInitScript(() => { try { sessionStorage.setItem('bdl-swiss-dial-hint', '1'); } catch {} });
    await ctx.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
    const page = await ctx.newPage();
    for (const d of [0, 2, 3, 4, 6]) {
      await page.goto(`http://127.0.0.1:${PORT}/t/swiss/${d ? `?div=${d}` : ''}`, { waitUntil: 'networkidle' });
      await page.waitForFunction(() => window.__p3?.relay, null, { timeout: 8000 });
      await page.waitForTimeout(600);
      R[`${id}_${scheme}_${d}`] = await page.evaluate((SEL) => {
        const out = { lefts: {}, h: document.documentElement.scrollHeight, overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth };
        for (const [k, s] of Object.entries(SEL)) { const e = document.querySelector(s); if (e) out.lefts[k] = Math.round(e.getBoundingClientRect().left); }
        const wd = document.querySelector('.billboard .ln:nth-child(2)');
        const r = document.createRange(); r.selectNodeContents(wd);
        out.dialWord = Math.round(r.getBoundingClientRect().width);
        out.sd = wd.style.getPropertyValue('--sw-d');
        const bb = document.querySelector('.billboard').getBoundingClientRect(), lede = document.querySelector('.hero .lede').getBoundingClientRect();
        out.ledeTop = Math.round(lede.top); out.billboardBottom = Math.round(bb.bottom);
        return out;
      }, SEL);
    }
    await ctx.close();
  }
}
await writeFile(join(OUT, 'edges.json'), JSON.stringify(R, null, 2));
for (const id of Object.keys(SIZES)) {
  console.log('== ' + id);
  for (const d of [0, 2, 3, 4, 6]) { const r = R[`${id}_light_${d}`]; console.log(d, 'H', r.h, 'ox', r.overflowX, 'dial', r.dialWord, r.sd, JSON.stringify(r.lefts)); }
}
await browser.close(); server.close();
