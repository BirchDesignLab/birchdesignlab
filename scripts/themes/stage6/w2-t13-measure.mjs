/**
 * Stage 6 wave 2, task 13: DOM numbers for vaporwave V1 to V14 on any server.
 *
 *   node scripts/themes/stage6/w2-t13-measure.mjs                     (BASE env, default http://127.0.0.1:4470)
 *   ONLY=v1,v7 node scripts/themes/stage6/w2-t13-measure.mjs
 *
 * One line per finding and size. GPU Chromium; reduced transparency forced to
 * no-preference; the portal prompt suppressed. Nothing is written to disk.
 */
import { chromium } from 'playwright';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const BASE = process.env.BASE || process.env.SNAP_BASE || 'http://127.0.0.1:4470';
const ONLY = (process.env.ONLY || 'v1,v2,v3,v5,v6,v7,v8,v9,v13').split(',');
const H = (w) => (w < 700 ? 844 : w < 1100 ? 1180 : 900);
const browser = await chromium.launch({ headless: true, args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--enable-gpu-rasterization', '--ignore-gpu-blocklist'] });

async function open(width, height, scheme, path, mobile = width < 900) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile, colorScheme: scheme, reducedMotion: 'no-preference' });
  await suppressPrompt(ctx);
  await ctx.addInitScript((s) => { try { localStorage.setItem('scheme', s); } catch {} }, scheme);
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: 'bdl-switcher{display:none!important}' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
  return { ctx, page };
}
const R = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y + scrollY), w: Math.round(b.width), h: Math.round(b.height), r: Math.round(b.right), b: Math.round(b.bottom + scrollY), shown: getComputedStyle(el).display !== 'none' && b.width > 0 }; };

if (ONLY.includes('v1')) {
  for (const w of [761, 820, 1024, 1100, 1280, 1440]) {
    const { ctx, page } = await open(w, 900, 'dark', '/t/vaporwave/services/');
    const m = await page.evaluate((Rs) => {
      const R = eval(Rs);
      const k = document.querySelector('.intro-kana');
      const ps = [...document.querySelectorAll('.sublines p')];
      const kr = k.getBoundingClientRect();
      const ov = ps.map((p) => { const b = p.getBoundingClientRect(); return Math.max(0, Math.min(kr.right, b.right) - Math.max(kr.left, b.left)) > 0 && Math.min(kr.bottom, b.bottom) - Math.max(kr.top, b.top) > 0 ? Math.round(Math.min(kr.right, b.right) - Math.max(kr.left, b.left)) : 0; });
      return { kana: R(k), cols: k.getClientRects().length, fs: getComputedStyle(k).fontSize, ws: getComputedStyle(k).whiteSpace, sublines: R(document.querySelector('.sublines')), pad: ps.map((p) => getComputedStyle(p).paddingRight), overlapPx: ov, scrollW: document.documentElement.scrollWidth };
    }, R.toString());
    console.log('v1', w, JSON.stringify(m));
    await ctx.close();
  }
}

if (ONLY.includes('v2')) {
  for (const w of [761, 820, 1024, 1100, 1101, 1280, 1440]) for (const scheme of ['dark']) {
    const { ctx, page } = await open(w, w < 1100 ? 1180 : 900, scheme, '/t/vaporwave/');
    const m = await page.evaluate((Rs) => {
      const R = eval(Rs);
      const h = document.querySelector('.hero'); const hr = h.getBoundingClientRect();
      const l = R(h.querySelector('.palm-l')); const r = R(h.querySelector('.palm-r'));
      // The palm svg box is wider than its drawn crown: report the box and the clear gap between boxes.
      return { hero: R(h), palmL: l, palmR: r, gapBetweenBoxes: r.x - (l.x + l.w), sunW: Math.round(Math.min(innerWidth * 0.46, 420)) };
    }, R.toString());
    console.log('v2', w, scheme, JSON.stringify(m));
    await ctx.close();
  }
}

if (ONLY.includes('v3')) {
  for (const w of [390, 600, 640, 820, 900, 1024, 1440]) for (const page_ of ['home', 'services']) {
    const { ctx, page } = await open(w, H(w), 'dark', page_ === 'home' ? '/t/vaporwave/' : '/t/vaporwave/services/');
    const m = await page.evaluate((Rs) => {
      const R = eval(Rs);
      return {
        stand: R(document.querySelector('.kiosk-stand')), foot: R(document.querySelector('.stand-foot')), sphere: R(document.querySelector('.kiosk-prop:not(.kiosk-prop-venus)')), venus: R(document.querySelector('.kiosk-prop-venus')),
        planter: R(document.querySelector('.vw-lobby .lobby-planter')), column: R(document.querySelector('.vw-lobby .lobby-column')), lobby: R(document.querySelector('.vw-lobby')), scrollW: document.documentElement.scrollWidth,
      };
    }, R.toString());
    console.log('v3', page_, w, JSON.stringify(m));
    await ctx.close();
  }
}

if (ONLY.includes('v5')) {
  for (const w of [390, 820, 1024, 1280, 1440]) {
    const { ctx, page } = await open(w, H(w), 'dark', '/t/vaporwave/about/');
    const m = await page.evaluate((Rs) => {
      const R = eval(Rs);
      const t = document.querySelector('.temple'); const c = document.querySelector('.centerpiece-stage');
      const title = document.querySelector('.temple-title');
      return { temple: R(t), centerpiece: R(document.querySelector('.centerpiece')), stage: R(c), title: R(title), clearBetweenTitleAndCentre: Math.round(c.getBoundingClientRect().top + scrollY - (title.getBoundingClientRect().bottom + scrollY)), colL: R(document.querySelector('.col-l')), colR: R(document.querySelector('.col-r')), scrollW: document.documentElement.scrollWidth };
    }, R.toString());
    console.log('v5', w, JSON.stringify(m));
    await ctx.close();
  }
}

if (ONLY.includes('v6')) {
  const { ctx, page } = await open(1440, 900, 'dark', '/t/vaporwave/about/');
  console.log('v6', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('.vw-still img')].map((i) => ({ cls: i.closest('picture').className, loading: i.loading, fp: i.getAttribute('fetchpriority') })))));
  await ctx.close();
}

if (ONLY.includes('v7')) {
  for (const w of [390, 600, 621, 720, 820, 1024, 1280, 1440]) {
    const { ctx, page } = await open(w, H(w), 'dark', '/t/vaporwave/');
    const m = await page.evaluate(() => {
      const rows = {};
      for (const a of document.querySelectorAll('footer nav a')) { const y = Math.round(a.getBoundingClientRect().y + scrollY); (rows[y] ||= []).push(a.textContent.trim()); }
      return Object.values(rows);
    });
    console.log('v7', w, JSON.stringify(m));
    await ctx.close();
  }
}

if (ONLY.includes('v8')) {
  for (const w of [390, 375, 360, 621, 700]) {
    const { ctx, page } = await open(w, 844, 'dark', '/t/vaporwave/');
    const m = await page.evaluate(() => [...document.querySelectorAll('.task')].map((t) => {
      const cs = getComputedStyle(t); const range = document.createRange(); range.selectNodeContents(t); const tr = range.getBoundingClientRect(); const b = t.getBoundingClientRect();
      return { t: t.textContent.trim(), btn: Math.round(b.width), text: Math.round(tr.width), gapEach: Math.round((b.width - tr.width) / 2), ls: cs.letterSpacing, fs: cs.fontSize, pad: cs.paddingLeft, clipped: t.scrollWidth > t.clientWidth };
    }));
    console.log('v8', w, JSON.stringify(m));
    await ctx.close();
  }
}

if (ONLY.includes('v9')) {
  for (const p of ['', 'services/', 'about/', 'contact/', 'contact/sent/']) {
    const { ctx, page } = await open(1440, 900, 'dark', `/t/vaporwave/${p}`);
    console.log('v9', p || 'home', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('.vw-win')].map((w) => ({ t: w.querySelector('.vw-win-title').textContent.trim(), inactive: w.querySelector('.vw-win-bar').classList.contains('inactive') })))));
    await ctx.close();
  }
}

if (ONLY.includes('v13')) {
  for (const w of [390, 820, 1024, 1440]) {
    const { ctx, page } = await open(w, H(w), 'dark', '/t/vaporwave/about/');
    const m = await page.evaluate(() => {
      const el = document.querySelector('.manifesto');
      const spans = [...el.querySelectorAll('.manifesto-s')];
      const lines = (n) => { const rs = n.getClientRects(); const ys = new Set([...rs].map((r) => Math.round(r.top))); return ys.size; };
      const r = document.createRange(); r.selectNodeContents(el);
      const lineTops = [...new Set([...r.getClientRects()].map((q) => Math.round(q.top)))];
      return { text: el.textContent, spans: spans.length, linesInP: lineTops.length, perSpan: spans.map((s) => { const rr = document.createRange(); rr.selectNodeContents(s); return [...new Set([...rr.getClientRects()].map((q) => Math.round(q.top)))].length; }), fs: getComputedStyle(el).fontSize };
    });
    console.log('v13', w, JSON.stringify(m));
    await ctx.close();
  }
}
await browser.close();
