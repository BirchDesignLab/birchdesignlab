/* B2 task 2 probe: whole-page sheets at the five review sizes in both schemes,
   the gum-strip hit test, the ruled-line drift measure, tape outlines, and the
   dark Lab-band crops, on GPU Chromium.
   Usage: BDL_GPU=1 node scripts/themes/snap.mjs --name b2t2 --port 4460 -- node scripts/themes/cottagecore/b2-t2-probe.mjs <label>
   (label: after | before; before is run against --name stage5-base --reuse) */
import { chromium } from 'playwright';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const label = process.argv[2] || 'after';
const base = (process.env.SNAP_BASE || '').replace(/\/$/, '');
const out = join('scripts', 'themes', '.out', 'stage5', 'b2', 's5-b2-t2', label);
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const SIZES = [
  { id: '1440', w: 1440, h: 900, dpr: 1 },
  { id: '1280', w: 1280, h: 800, dpr: 1 },
  { id: '1024', w: 1024, h: 800, dpr: 1 },
  { id: '820', w: 820, h: 1000, dpr: 1 },
  { id: '390', w: 390, h: 844, dpr: 2, mobile: true },
];
const PAGES = [['home', ''], ['services', 'services/'], ['contact', 'contact/'], ['about', 'about/']];
const report = { label, renderer: null, ruled: {}, tapes: {}, strips: {}, labCrops: [] };
const mountSrc = await readFile('scripts/themes/proofs/stage5-cc-dark-paper/mount.js', 'utf8');
const strips = JSON.parse(await readFile('scripts/themes/proofs/stage5-cc-dark-paper/strips.json', 'utf8')).strips;

for (const scheme of ['light', 'dark']) for (const sz of SIZES) {
  const context = await browser.newContext({ viewport: { width: sz.w, height: sz.h }, deviceScaleFactor: sz.dpr, isMobile: !!sz.mobile, hasTouch: !!sz.mobile, colorScheme: scheme, reducedMotion: 'no-preference' });
  await suppressPrompt(context);
  await context.addInitScript((s) => { try { localStorage.setItem('scheme', s); localStorage.setItem('theme', s); } catch {} }, scheme);
  await context.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
  const page = await context.newPage();
  for (const [name, path] of PAGES) {
    await page.goto(`${base}/t/cottagecore/${path}`, { waitUntil: 'networkidle' });
    await page.addStyleTag({ content: 'bdl-switcher{display:none!important} .cc-motes{display:none!important}' });
    await page.evaluate(async () => { await document.fonts.ready; });
    await page.waitForTimeout(400);
    const key = `${scheme}/${sz.id}/${name}`;
    /* ruled blocks: with every rotation off, each line's content-area top
       should sit on (block content top + k * lh + half-leading); report the
       worst deviation per block, for the first and the last line */
    report.ruled[key] = await page.evaluate(() => {
      const rows = [];
      const sels = ['.card p.cc-ruled', '.recipe .body.cc-ruled', '.letter', '.field textarea'];
      const saved = [];
      for (const el of document.querySelectorAll('*')) { const r = getComputedStyle(el).rotate; if (r && r !== 'none') { saved.push([el, el.style.rotate]); el.style.rotate = 'none'; } }
      for (const sel of sels) for (const el of document.querySelectorAll(sel)) {
        const cs = getComputedStyle(el);
        const lh = parseFloat(cs.getPropertyValue('--lh')) || parseFloat(cs.lineHeight);
        const pitch = parseFloat(cs.lineHeight);
        const box = el.getBoundingClientRect();
        const top0 = box.top + parseFloat(cs.borderTopWidth) + parseFloat(cs.paddingTop);
        const origin = sel === '.letter' ? box.top : top0;
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        const lines = new Map();
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          if (!n.textContent.trim()) continue;
          const parentCs = getComputedStyle(n.parentElement);
          if (n.parentElement.closest('h2')) continue;
          const range = document.createRange(); range.selectNodeContents(n);
          for (const r of range.getClientRects()) lines.set(Math.round(r.top * 2) / 2, [r, parentCs]);
        }
        const tops = [...lines.keys()].sort((a, b) => a - b);
        if (!tops.length) { rows.push({ sel, lh, pitch, note: 'no text' }); continue; }
        const dev = (t) => { const k = (t - origin) / lh; return Math.round((k - Math.round(k)) * lh * 10) / 10; };
        rows.push({ sel, lh, pitch, lines: tops.length, firstDev: dev(tops[0]), lastDev: dev(tops[tops.length - 1]), pitchHolds: tops.every((t, i) => i === 0 || Math.abs(t - tops[i - 1] - pitch) < 0.6 || Math.abs((t - tops[i - 1]) / pitch - Math.round((t - tops[i - 1]) / pitch)) < 0.03) });
      }
      for (const [el, v] of saved) el.style.rotate = v;
      return rows;
    });
    report.tapes[key] = await page.evaluate(() => [...document.querySelectorAll('.cc-tape')].map((t) => { const c = getComputedStyle(t); return { cls: t.className.replace('cc-tape', '').trim(), w: Math.round(parseFloat(c.width)), clip: c.clipPath.length, bg: c.backgroundColor }; }));
    await page.screenshot({ path: join(out, `${name}__${scheme}__${sz.id}.png`), fullPage: true });
    if (name === 'home' && (sz.id === '1440' || sz.id === '390')) {
      const lab = await page.$('.lab');
      if (lab) { await lab.scrollIntoViewIfNeeded(); await page.waitForTimeout(150); await lab.screenshot({ path: join(out, `lab__${scheme}__${sz.id}.png`) }); }
    }
    if (name === 'home' && label === 'after' && ['1440', '820', '390'].includes(sz.id) && scheme === 'light') {
      /* gum strip hit test: take the strips off, replay the table through the proof's
         hit test (bare stem or the sprig's own parts only), report each */
      await page.evaluate(() => document.querySelectorAll('.sheet .gum').forEach((g) => g.remove()));
      await page.evaluate(mountSrc);
      const res = await page.evaluate((t) => window.__ccMount({ strips: true, fixed: t }), strips);
      report.strips[sz.id] = res.map((r) => ({ sprig: r.sprig, left: r.left, top: r.top, clear: r.clear }));
    }
  }
  if (scheme === 'light' && sz.id === '1440') report.renderer = await page.evaluate(() => { const g = document.createElement('canvas').getContext('webgl'); const e = g.getExtension('WEBGL_debug_renderer_info'); return g.getParameter(e.UNMASKED_RENDERER_WEBGL); });
  await context.close();
}
await writeFile(join(out, 'measures.json'), JSON.stringify(report, null, 1));
await browser.close();
console.log(report.renderer);
