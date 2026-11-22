/**
 * Stage 6 wave 2, task 9 (glass: the stop 2 answers G1 to G5 and wave 1's
 * deferred minors): the evidence pass for everything but the lens films
 * (w2-t9-lens.mjs). Serve a snap, then run sections by name.
 *
 *   LABEL=before node scripts/themes/snap.mjs --name s6-w2-t9-before --reuse --port 4470 -- node scripts/themes/stage6/w2-t9-evidence.mjs
 *   LABEL=after  node scripts/themes/snap.mjs --name s6-w2-t9 --reuse --port 4470 -- node scripts/themes/stage6/w2-t9-evidence.mjs
 *   COMPARE=before,after node scripts/themes/stage6/w2-t9-evidence.mjs
 *
 * GPU Chromium (--use-angle=d3d11 --enable-gpu), renderer checked through
 * WEBGL_debug_renderer_info; prefers-reduced-transparency forced to
 * no-preference (CDP Emulation.setEmulatedMedia); the portal prompt
 * suppressed. Sections (ONLY=a,b,...):
 *   sheets   whole-page sheets at 1440, 1280, 1024, 820, 390, both schemes
 *            (reduced motion emulated so orbs hold still between the paired
 *            shots), plus viewport frames at every screen-height offset at
 *            1440, 1024 and 390 on every page (the fixed wallpaper paints only
 *            the top viewport of a full-page shot, so glass is judged here);
 *   crops    the plates (Home hero, Services head and offer panes, About),
 *            the Services step row (G3 icons), Clear and Tinted over the blue
 *            bands (G4), the dark Mica settings pane (T2 C4), Frost 0 and
 *            100 with the hero's bottom-left corner zoomed (T2 C3);
 *   header   films: text scrolling under the header bar at 1440 (G5), both
 *            schemes, with a 2x zoom of the bar's bottom edge;
 *   contrast measured on the page: every plated body-text element and the
 *            vibrant headline, text made transparent, the background pixels
 *            under its box against its own ink (5th percentile and median),
 *            at 1440 and 390, both schemes, every page and screen; plus the
 *            mauve share of the dark Mica pane;
 *   boundary glass beside vaporwave, Home, light, 1440, top viewport.
 * Output: scripts/themes/.out/stage6/w2/t9/<label>/
 */
import { chromium } from 'playwright';
import sharp from 'sharp';
import { writeFile, mkdir, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '.out', 'stage6', 'w2', 't9');

async function sideBySide(pa, pb, out, cwMax = 720) {
  const [ma, mb] = await Promise.all([sharp(pa).metadata(), sharp(pb).metadata()]);
  const cw = Math.min(ma.width, cwMax);
  const ha = Math.round((ma.height / ma.width) * cw), hb = Math.round((mb.height / mb.width) * cw);
  const [ta, tb] = await Promise.all([sharp(pa).resize(cw, ha).toBuffer(), sharp(pb).resize(cw, hb).toBuffer()]);
  await sharp({ create: { width: cw * 2 + 36, height: Math.max(ha, hb) + 24, channels: 3, background: '#1b1b1d' } })
    .composite([{ input: ta, left: 12, top: 12 }, { input: tb, left: cw + 24, top: 12 }])
    .png()
    .toFile(out);
}

if (process.env.COMPARE) {
  const [a, b] = process.env.COMPARE.split(',');
  const out = join(ROOT, `${a}-vs-${b}`);
  let n = 0;
  for (const sub of ['sheets', 'crops', 'header', 'boundary']) {
    await mkdir(join(out, sub), { recursive: true });
    let files = [];
    try { files = (await readdir(join(ROOT, a, sub))).filter((f) => f.endsWith('.png')); } catch { continue; }
    for (const f of files) {
      try { await sideBySide(join(ROOT, a, sub, f), join(ROOT, b, sub, f), join(out, sub, f), sub === 'crops' || sub === 'header' ? 900 : 720); n++; } catch (e) { console.log('skip', sub, f, String(e).split('\n')[0]); }
    }
  }
  console.log(`${n} pairs written to ${out}`);
  process.exit(0);
}

const LABEL = process.env.LABEL || 'run';
const OUT = join(ROOT, LABEL);
for (const sub of ['sheets', 'crops', 'header', 'boundary']) await mkdir(join(OUT, sub), { recursive: true });
const base = process.env.SNAP_BASE || 'http://127.0.0.1:4470';
const ONLY = (process.env.ONLY || 'sheets,crops,header,contrast,boundary').split(',');
const browser = await chromium.launch({ headless: true, args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--enable-gpu-rasterization', '--ignore-gpu-blocklist'] });
const metrics = { label: LABEL, base };
{
  const p = await browser.newPage();
  const renderer = await p.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl'); return gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL); });
  await p.close();
  console.log('renderer:', renderer);
  if (/swiftshader|llvmpipe|software/i.test(renderer)) throw new Error('software renderer: evidence invalid');
  metrics.renderer = renderer;
}

async function contextFor(w, h, scheme, opts = {}) {
  const context = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, reducedMotion: opts.motion ? 'no-preference' : 'reduce', isMobile: w < 700, hasTouch: w < 700 });
  await context.addInitScript((s) => { try { localStorage.setItem('scheme', s); } catch {} }, scheme);
  await suppressPrompt(context);
  await context.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
  return { context, page };
}

async function open(page, path, school = 'glassmorphism') {
  await page.goto(`${base}/t/${school}/${path}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  if (school !== 'glassmorphism') { await page.waitForTimeout(800); return; }
  if (!path) await page.waitForFunction(() => document.querySelector('.lens-canvas')?.style.visibility === 'visible', null, { timeout: 9000 }).catch(() => {});
  // The rim layers land one pane per idle slot after arrival.
  await page.waitForFunction(() => {
    const panes = document.querySelectorAll('.glass, .glass-strong').length;
    const rims = document.querySelectorAll('.glass-rim').length;
    return rims === 0 ? !document.querySelector('.glass') : rims >= panes;
  }, null, { timeout: 6000 }).catch(() => {});
  await page.waitForTimeout(900);
}

/** A labelled strip of PNG buffers. */
async function strip(frames, out, cols = 2, cw = 720) {
  const m = await sharp(frames[0].buf).metadata();
  const ch = Math.round((m.height / m.width) * cw);
  const rows = Math.ceil(frames.length / cols);
  const comps = [];
  for (let i = 0; i < frames.length; i++) {
    const x = 12 + (i % cols) * (cw + 12), y = 12 + Math.floor(i / cols) * (ch + 34);
    comps.push({ input: await sharp(frames[i].buf).resize(cw, ch).toBuffer(), left: x, top: y });
    const label = frames[i].note.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    comps.push({ input: Buffer.from(`<svg width="${cw}" height="24" xmlns="http://www.w3.org/2000/svg"><text x="2" y="17" font-family="Segoe UI, Arial" font-size="15" fill="#eee">${label}</text></svg>`), left: x, top: y + ch + 4 });
  }
  await sharp({ create: { width: 12 + cols * (cw + 12), height: 12 + rows * (ch + 34), channels: 3, background: '#1b1b1d' } }).composite(comps).png().toFile(out);
}

const SIZES = [[1440, 900], [1280, 800], [1024, 768], [820, 1180], [390, 844]];
const PAGES = ['', 'about/', 'services/', 'contact/'];
const tagOf = (path) => (path || 'home').replace(/\//g, '');

if (ONLY.includes('sheets')) {
  for (const scheme of ['light', 'dark']) {
    for (const [w, h] of SIZES) {
      const { context, page } = await contextFor(w, h, scheme);
      for (const path of PAGES) {
        const tag = `${tagOf(path)}__${scheme}__${w}`;
        await open(page, path);
        await page.screenshot({ path: join(OUT, 'sheets', `${tag}__full.png`), fullPage: true });
        await page.evaluate(() => scrollTo(0, 0));
        if (w === 1440 || w === 1024 || w === 390) {
          const total = await page.evaluate(() => document.documentElement.scrollHeight);
          for (let y = 0; y < total - 40; y += h) {
            await page.evaluate((y) => scrollTo(0, y), y);
            await page.waitForTimeout(450);
            await page.screenshot({ path: join(OUT, 'sheets', `${tag}__vp${String(y).padStart(5, '0')}.png`) });
          }
        }
      }
      await context.close();
      console.log('sheets', scheme, w);
    }
  }
}

/** Scrolls `sel` to `top` px below the viewport top and returns its rect. */
async function scrollToEl(page, sel, top = 120) {
  return page.evaluate(([sel, top]) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    scrollTo(0, el.getBoundingClientRect().top + scrollY - top);
    const r = el.getBoundingClientRect();
    return { x: Math.max(0, r.left), y: Math.max(0, r.top), w: Math.min(innerWidth, r.right) - Math.max(0, r.left), h: Math.min(innerHeight, r.bottom) - Math.max(0, r.top) };
  }, [sel, top]);
}
const clipOf = (r, pad = 16) => ({ x: Math.max(0, Math.round(r.x - pad)), y: Math.max(0, Math.round(r.y - pad)), width: Math.round(r.w + 2 * pad), height: Math.round(r.h + 2 * pad) });

if (ONLY.includes('crops')) {
  for (const scheme of ['light', 'dark']) {
    for (const [w, h] of [[1440, 900], [390, 844]]) {
      const { context, page } = await contextFor(w, h, scheme);
      // Plates: Home hero, Services head + first offer panes, About founder.
      await open(page, '');
      await page.screenshot({ path: join(OUT, 'crops', `plates__home-hero__${scheme}__${w}.png`) });
      await open(page, 'services/');
      await page.screenshot({ path: join(OUT, 'crops', `plates__services-head__${scheme}__${w}.png`) });
      const off = await scrollToEl(page, '.offer, .offering, main section:nth-of-type(2) .glass', 90);
      await page.waitForTimeout(500);
      await page.screenshot({ path: join(OUT, 'crops', `plates__services-offers__${scheme}__${w}.png`) });
      void off;
      // G3 / T2 C4: the step row on the settings pane.
      const sp = await scrollToEl(page, '.settings-pane', 80);
      await page.waitForTimeout(500);
      if (sp) await page.screenshot({ path: join(OUT, 'crops', `steps__services__${scheme}__${w}.png`), clip: clipOf({ ...sp, h: Math.min(sp.h, h - sp.y - 20) }) });
      await open(page, 'about/');
      await scrollToEl(page, '.founder, main section:nth-of-type(2)', 90);
      await page.waitForTimeout(500);
      await page.screenshot({ path: join(OUT, 'crops', `plates__about__${scheme}__${w}.png`) });
      await context.close();
      console.log('crops plates', scheme, w);
    }
    // G4: Clear and Tinted, Home and Services at 1440, top viewport and the
    // second screen (the blue bands sit behind the header and the window's
    // top left in light).
    for (const tint of ['clear', 'tinted']) {
      const { context, page } = await contextFor(1440, 900, scheme);
            await open(page, '');
      // Through the real control, so the session hold and the lens agree.
      const now = await page.evaluate(() => document.documentElement.dataset.glassTint || 'clear');
      if (now !== tint) { await page.locator('.cc-tint-switch').click(); await page.waitForTimeout(900); }
      await page.mouse.move(1430, 890);
      await page.screenshot({ path: join(OUT, 'crops', `tint__home__${scheme}__${tint}.png`) });
      await page.evaluate(() => scrollTo(0, 900));
      await page.waitForTimeout(600);
      await page.screenshot({ path: join(OUT, 'crops', `tint__home-2__${scheme}__${tint}.png`) });
      await open(page, 'services/');
      await page.screenshot({ path: join(OUT, 'crops', `tint__services__${scheme}__${tint}.png`) });
      await context.close();
    }
    // T2 C3: Frost 0 and 100, the hero pane's bottom-left corner zoomed.
    {
      const { context, page } = await contextFor(1440, 900, scheme);
      await open(page, '');
      await page.mouse.move(1430, 890);
      for (const v of ['0', '100']) {
        await page.locator('.cc-frost').fill(v);
        await page.waitForTimeout(900);
        await page.screenshot({ path: join(OUT, 'crops', `frost__home__${scheme}__frost${v}.png`) });
        const r = await page.evaluate(() => { const b = document.querySelector('.window').getBoundingClientRect(); return { x: b.left, y: b.bottom - 220, w: 320, h: 220 }; });
        const buf = await page.screenshot({ clip: clipOf(r, 20) });
        await sharp(buf).resize({ width: Math.round((r.w + 40) * 2) }).toFile(join(OUT, 'crops', `frost__corner__${scheme}__frost${v}.png`));
      }
      await context.close();
    }
    console.log('crops', scheme);
  }
}

if (ONLY.includes('header')) {
  for (const scheme of ['light', 'dark']) {
    for (const path of ['', 'services/', 'about/']) {
      const { context, page } = await contextFor(1440, 900, scheme, { motion: true });
      await open(page, path);
      await page.mouse.move(720, 896);
      const frames = [];
      for (let i = 0; i < 10; i++) {
        await page.mouse.wheel(0, i === 0 ? 260 : 70);
        await page.waitForTimeout(260);
        const bar = await page.evaluate(() => { const b = document.querySelector('.site-header .bar').getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; });
        const buf = await page.screenshot({ clip: { x: Math.round(bar.x), y: 0, width: Math.round(bar.w), height: Math.round(bar.y + bar.h + 30) } });
        frames.push({ buf, note: `scrollY ${await page.evaluate(() => Math.round(scrollY))}` });
      }
      const tag = `${tagOf(path)}__${scheme}__1440`;
      await strip(frames, join(OUT, 'header', `header__${tag}.png`), 2, 700);
      // A 2x zoom of the left half of the bar's bottom edge, at the last frame.
      const bar = await page.evaluate(() => { const b = document.querySelector('.site-header .bar').getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; });
      const z = await page.screenshot({ clip: { x: Math.round(bar.x), y: Math.round(bar.y + bar.h - 40), width: Math.round(bar.w / 2), height: 70 } });
      await sharp(z).resize({ width: Math.round(bar.w) }).toFile(join(OUT, 'header', `header-edge__${tag}.png`));
      await context.close();
      console.log('header', tag);
    }
  }
}

/* G5: text parked across the header bar's bottom rim band, zoomed 2x: a
   heading and a paragraph on Services and the Home window's headline. */
if (ONLY.includes('edge')) {
  const frames = [];
  for (const scheme of ['light', 'dark']) {
    const { context, page } = await contextFor(1440, 900, scheme);
    for (const [path, sel] of [['services/', '.head-card h1'], ['services/', '.offer p'], ['', '.hero h1 .b2']]) {
      await open(page, path);
      for (const dy of [6, 14, 22]) {
        const r = await page.evaluate(([sel, dy]) => {
          const bar = document.querySelector('.site-header .bar').getBoundingClientRect();
          const el = document.querySelector(sel);
          scrollTo(0, el.getBoundingClientRect().top + scrollY - (bar.bottom - dy));
          const e = el.getBoundingClientRect();
          return { x: Math.max(bar.left, e.left - 20), y: bar.bottom - 46, w: 620, h: 70 };
        }, [sel, dy]);
        await page.waitForTimeout(450);
        const buf = await page.screenshot({ clip: { x: Math.round(r.x), y: Math.round(r.y), width: r.w, height: r.h } });
        frames.push({ buf: await sharp(buf).resize({ width: r.w * 2 }).png().toBuffer(), note: `${scheme} ${path || 'home'} ${sel} top ${dy}px above the bar's bottom edge` });
      }
    }
    await context.close();
  }
  await strip(frames, join(OUT, 'header', 'header-rim-zoom__1440.png'), 3, 600);
  console.log('edge');
}

/* T2 C3: what the white smudge at the hero's bottom-left at Frost 0 is.
   The corner at Frost 0 as is, without the rim layers, and without the
   Control Centre below the window. */
if (ONLY.includes('smudge')) {
  const frames = [];
  for (const scheme of ['light', 'dark']) {
    const { context, page } = await contextFor(1440, 900, scheme);
    await open(page, '');
    await page.mouse.move(1430, 890);
    await page.locator('.cc-frost').fill('0');
    await page.waitForTimeout(900);
    const r = await page.evaluate(() => { const b = document.querySelector('.window').getBoundingClientRect(); return { x: Math.round(b.left - 20), y: Math.round(b.bottom - 120), width: 520, height: 160 }; });
    frames.push({ buf: await page.screenshot({ clip: r }), note: `${scheme} frost 0, as is` });
    await page.addStyleTag({ content: '.window > .glass-rim { visibility: hidden !important; }' });
    await page.waitForTimeout(300);
    frames.push({ buf: await page.screenshot({ clip: r }), note: `${scheme} frost 0, window rim layer hidden` });
    await page.addStyleTag({ content: '.window > .glass-rim { visibility: visible !important; } .control-centre { visibility: hidden !important; }' });
    await page.waitForTimeout(300);
    frames.push({ buf: await page.screenshot({ clip: r }), note: `${scheme} frost 0, Control Centre hidden` });
    await context.close();
  }
  await strip(frames, join(OUT, 'crops', 'smudge__frost0.png'), 3, 520);
  console.log('smudge');
}
/* T2 C3, the source: hide one candidate at a time (light, Frost 0). */
if (ONLY.includes('smudge2')) {
  const frames = [];
  const tries = [
    ['as is', ''],
    ['orbs hidden', '.orb { visibility: hidden !important; }'],
    ['lens and poster hidden', '.lens-host, .lens-poster { visibility: hidden !important; }'],
    ['window text hidden', '.window > :not(.glass-rim, .glass-frost) { visibility: hidden !important; }'],
    ['window ::before and ::after off', '.window::before, .window::after { display: none !important; }'],
    ['window shadow off', '.window { box-shadow: none !important; }'],
    ['rim displacement off', '.window > .glass-rim { backdrop-filter: none !important; }'],
    ['switcher hidden', 'bdl-switcher { visibility: hidden !important; }'],
  ];
  const { context, page } = await contextFor(1440, 900, 'light');
  for (const [note, css] of tries) {
    await open(page, '');
    await page.mouse.move(1430, 890);
    await page.locator('.cc-frost').fill('0');
    await page.waitForTimeout(700);
    if (css) await page.addStyleTag({ content: css });
    await page.waitForTimeout(400);
    const r = await page.evaluate(() => { const b = document.querySelector('.window').getBoundingClientRect(); return { x: Math.round(b.left - 20), y: Math.round(b.bottom - 90), width: 520, height: 110 }; });
    frames.push({ buf: await page.screenshot({ clip: r }), note });
  }
  await context.close();
  await strip(frames, join(OUT, 'crops', 'smudge-source__frost0.png'), 2, 520);
  console.log('smudge2');
}

/* ---- contrast, measured on the page ---- */
const lin = (c) => { const v = c / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
function pct(arr, p) { const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.max(0, Math.floor(p * (s.length - 1))))]; }

if (ONLY.includes('contrast')) {
  metrics.contrast = {};
  // Body text on its plate, and the vibrant headline (display, 3:1).
  const PLATED = ":where(.glass:not(.thick, .glass-strong)) :is(p:not(.chip, .lead, .pull, .ask-lead), label, .summary, .designation, .mail)";
  for (const scheme of ['light', 'dark']) {
    for (const [w, h] of [[1440, 900], [390, 844]]) {
      const { context, page } = await contextFor(w, h, scheme);
      for (const path of PAGES) {
        await open(page, path);
        const total = await page.evaluate(() => document.documentElement.scrollHeight);
        const rows = [];
        for (let y = 0; y < total - 40; y += h) {
          await page.evaluate((y) => scrollTo(0, y), y);
          await page.waitForTimeout(350);
          const els = await page.evaluate(([sel]) => {
            const out = [];
            const list = [...document.querySelectorAll(`main ${sel}`)].map((el) => ({ el, kind: 'body' }));
            const v = document.querySelector('.hero h1 .b2');
            if (v) list.push({ el: v, kind: 'display' });
            list.forEach(({ el, kind }, i) => {
              const r = el.getBoundingClientRect();
              if (r.bottom < 4 || r.top > innerHeight - 4 || r.width < 8) return;
              el.dataset.t9c = String(i);
              // The vibrant headline is gradient text: its ink is --vibrant-a
              // (the lower of the two pairs in meta.ts).
              let col = getComputedStyle(el).color;
              if (kind === 'display') {
                el.dataset.t9d = '';
                const probe = document.createElement('i');
                probe.style.color = 'var(--vibrant-a)';
                el.appendChild(probe);
                col = getComputedStyle(probe).color;
                probe.remove();
              }
              const m = col.match(/[\d.]+/g).map(Number);
              out.push({ i, kind, cls: (el.className || el.tagName).toString().slice(0, 30), ink: m.slice(0, 3), box: { x: Math.max(0, r.left), y: Math.max(0, r.top), w: Math.min(innerWidth, r.right) - Math.max(0, r.left), h: Math.min(innerHeight, r.bottom) - Math.max(0, r.top) } });
            });
            return out;
          }, [PLATED]);
          if (!els.length) continue;
          const hide = await page.addStyleTag({ content: '[data-t9c], [data-t9c] * { color: transparent !important; -webkit-text-fill-color: transparent !important; text-shadow: none !important; } [data-t9d] { background: none !important; } bdl-switcher, .site-header, .lens-host, .lens-poster { visibility: hidden !important; }' });
          await page.waitForTimeout(150);
          for (const e of els) {
            if (e.box.w < 4 || e.box.h < 4) continue;
            const buf = await page.screenshot({ clip: { x: Math.round(e.box.x), y: Math.round(e.box.y), width: Math.max(1, Math.round(e.box.w)), height: Math.max(1, Math.round(e.box.h)) } });
            const { data } = await sharp(buf).removeAlpha().raw().toBuffer({ resolveWithObject: true });
            const Li = lum(...e.ink);
            const rs = [];
            for (let k = 0; k < data.length; k += 3) rs.push(ratio(Li, lum(data[k], data[k + 1], data[k + 2])));
            rows.push({ scroll: y, kind: e.kind, el: e.cls, box: [e.box.x, e.box.y, e.box.w, e.box.h].map(Math.round), p05: +pct(rs, 0.05).toFixed(2), median: +pct(rs, 0.5).toFixed(2) });
          }
          await hide.evaluate((n) => n.remove());
          await page.evaluate(() => document.querySelectorAll('[data-t9c]').forEach((n) => { n.removeAttribute('data-t9c'); n.removeAttribute('data-t9d'); }));
        }
        const body = rows.filter((r) => r.kind === 'body');
        const disp = rows.filter((r) => r.kind === 'display');
        metrics.contrast[`${tagOf(path)}__${scheme}__${w}`] = {
          bodyWorstP05: body.length ? Math.min(...body.map((r) => r.p05)) : null,
          bodyMedianOfMedians: body.length ? +pct(body.map((r) => r.median), 0.5).toFixed(2) : null,
          bodyUnder45: body.filter((r) => r.p05 < 4.5).map((r) => `${r.el}@${r.scroll}:${r.p05}`),
          displayP05: disp.length ? Math.min(...disp.map((r) => r.p05)) : null,
          rows,
        };
        console.log('contrast', tagOf(path), scheme, w, JSON.stringify({ body: metrics.contrast[`${tagOf(path)}__${scheme}__${w}`].bodyWorstP05, under: metrics.contrast[`${tagOf(path)}__${scheme}__${w}`].bodyUnder45.length, display: metrics.contrast[`${tagOf(path)}__${scheme}__${w}`].displayP05 }));
      }
      await context.close();
    }
  }
  // T2 C4: the dark Mica pane's mauve share (hue 255 to 345, chroma >= 0.06).
  metrics.mica = {};
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const { context, page } = await contextFor(w, h, 'dark');
    await open(page, 'services/');
    const sp = await scrollToEl(page, '.settings-pane', 80);
    await page.waitForTimeout(500);
    await page.addStyleTag({ content: '.settings-pane > * { visibility: hidden !important; }' });
    await page.waitForTimeout(200);
    const buf = await page.screenshot({ clip: { x: Math.round(sp.x + 8), y: Math.round(sp.y + 8), width: Math.round(sp.w - 16), height: Math.round(Math.min(sp.h, h - sp.y) - 16) } });
    const { data } = await sharp(buf).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    let n = 0, mauve = 0;
    for (let i = 0; i < data.length; i += 3) {
      const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b), c = mx - mn;
      n++;
      if (c < 0.06) continue;
      let hh;
      if (mx === r) hh = ((g - b) / c) % 6; else if (mx === g) hh = (b - r) / c + 2; else hh = (r - g) / c + 4;
      const hd = ((hh * 60) % 360 + 360) % 360;
      if (hd >= 255 && hd < 345) mauve++;
    }
    metrics.mica[w] = { mauveShare: +(mauve / n).toFixed(4) };
    await context.close();
    console.log('mica', w, JSON.stringify(metrics.mica[w]));
  }
}

if (ONLY.includes('boundary')) {
  const shots = [];
  for (const school of ['glassmorphism', 'vaporwave']) {
    const { context, page } = await contextFor(1440, 900, 'light');
    await open(page, '', school);
    const f = join(OUT, 'boundary', `${school}__light__1440.png`);
    await page.screenshot({ path: f });
    shots.push(f);
    await context.close();
  }
  await sideBySide(shots[0], shots[1], join(OUT, 'boundary', 'glass-vs-vaporwave__light__1440.png'), 1440);
}

if (Object.keys(metrics).length > 3) await writeFile(join(OUT, `metrics-${ONLY.join('-')}.json`), JSON.stringify(metrics, null, 2));
await browser.close();
