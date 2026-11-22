// Stage 6 vaporwave critic: DOM measurements at the sizes the sheets raise.
// Run: node scripts/themes/snap.mjs --name stage6-base --reuse --port 4466 -- node scripts/themes/stage6/critic-vaporwave-measure.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = process.env.SNAP_BASE || 'http://127.0.0.1:4466';
const OUT = 'scripts/themes/.out/stage6-critic-vaporwave';
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] });
const PAGES = { home: '/t/vaporwave/', services: '/t/vaporwave/services/', about: '/t/vaporwave/about/', contact: '/t/vaporwave/contact/', sent: '/t/vaporwave/contact/sent/' };
const WIDTHS = [390, 600, 820, 1024, 1280, 1440];
const res = {};

for (const scheme of ['dark', 'light']) {
  for (const w of WIDTHS) {
    const mobile = w < 700;
    const ctx = await browser.newContext({ viewport: { width: w, height: w < 700 ? 844 : w < 1100 ? 1180 : 900 }, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile, colorScheme: scheme, reducedMotion: 'reduce' });
    await ctx.addInitScript((s) => { try { localStorage.setItem('scheme', s); localStorage.setItem('theme', s); } catch {} }, scheme);
    await ctx.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
    const page = await ctx.newPage();
    for (const [name, path] of Object.entries(PAGES)) {
      await page.goto(BASE + path, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(300);
      const m = await page.evaluate(() => {
        const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y + scrollY), w: Math.round(b.width), h: Math.round(b.height), r: Math.round(b.right), vis: getComputedStyle(el).display !== 'none' && b.width > 0 }; };
        const o = { scrollW: document.documentElement.scrollWidth, innerW: innerWidth };
        // task buttons: label overflow
        o.tasks = [...document.querySelectorAll('.task')].map((t) => ({ t: t.textContent.trim(), w: Math.round(t.getBoundingClientRect().width), sw: t.scrollWidth, cw: t.clientWidth, pad: getComputedStyle(t).paddingLeft }));
        // footer nav rows
        const fn = [...document.querySelectorAll('footer nav a')];
        const rows = {}; fn.forEach((a) => { const y = Math.round(a.getBoundingClientRect().y); (rows[y] ||= []).push(a.textContent.trim()); });
        o.footRows = Object.values(rows);
        const k = document.querySelector('.intro-kana'); const s = document.querySelector('.sublines');
        if (k) { o.kana = r(k); o.sublines = r(s); o.sublineP = [...s.querySelectorAll('p')].map(r); o.kanaCols = k.getClientRects().length; }
        const ok = document.querySelector('.opener-kana'); if (ok) o.openerKana = r(ok);
        o.kioskProp = r(document.querySelector('.kiosk-prop'));
        o.kioskVenus = r(document.querySelector('.kiosk-prop-venus'));
        o.lobbyPlanter = r(document.querySelector('.lobby-planter'));
        o.centerpiece = r(document.querySelector('.centerpiece'));
        o.palmL = r(document.querySelector('.hero .palm-l')); o.palmR = r(document.querySelector('.hero .palm-r'));
        o.hero = r(document.querySelector('.hero'));
        o.wins = [...document.querySelectorAll('.vw-win')].map((wn) => { const b = wn.getBoundingClientRect(); const bar = wn.querySelector('.vw-win-bar'); return { t: (wn.querySelector('.vw-win-title') || bar || wn).textContent.trim().slice(0, 30), r: Math.round(b.right), inactive: wn.className.includes('inactive') || (bar && bar.className.includes('inactive')) }; });
        o.desktopIcons = [...document.querySelectorAll('[class*=icon]')].filter((e) => e.closest('main')).length;
        return o;
      });
      (res[`${scheme}@${w}`] ||= {})[name] = m;
    }
    await ctx.close();
  }
}
fs.writeFileSync(`${OUT}/measure.json`, JSON.stringify(res, null, 1));
// summary
for (const [k, pages] of Object.entries(res)) {
  if (!k.startsWith('dark')) continue;
  const h = pages.home, s = pages.services, a = pages.about;
  console.log(`\n== ${k}`);
  for (const [n, p] of Object.entries(pages)) if (p.scrollW > p.innerW) console.log(`  OVERFLOW ${n} ${p.scrollW}>${p.innerW}`);
  console.log('  tasks', h.tasks.map((t) => `${t.t}:${t.w}/${t.sw}>${t.cw}`).join(' '));
  console.log('  footRows', JSON.stringify(h.footRows));
  if (s.kana) console.log('  svc kana', JSON.stringify(s.kana), 'cols', s.kanaCols, 'sublineP', JSON.stringify(s.sublineP));
  console.log('  kioskProp', JSON.stringify(h.kioskProp), 'venus', JSON.stringify(h.kioskVenus), 'planter', JSON.stringify(h.lobbyPlanter));
  console.log('  palms', JSON.stringify(h.palmL), JSON.stringify(h.palmR), 'hero', JSON.stringify(h.hero));
  console.log('  centerpiece', JSON.stringify(a.centerpiece));
  console.log('  contact wins', JSON.stringify(pages.contact.wins));
}
await browser.close();
