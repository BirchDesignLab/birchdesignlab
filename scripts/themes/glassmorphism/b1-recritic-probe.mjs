/**
 * Wave B1 glass re-critic (09-25-26): checks the fixer's round against the
 * blockers, in the state a visitor with no OS preference sees
 * (prefers-reduced-transparency forced to no-preference over CDP; headless
 * Chromium here defaults to reduce, which parks the orbs and hides the
 * wallpaper, so a probe without the override cannot see the E2/E4 drift).
 *
 *   occl    text/control points whose topmost element is an .orb, with every
 *           element scrolled to the viewport centre (the view() drift moves
 *           orbs with scroll), at orb drift phases 0/60/80/95% of cycle
 *   useless orbs mostly in view whose box is under 10% covered by any pane
 *           or solid surface, at scroll 0/25/50/75/100%
 *   e10     E10 in each scheme for default/no-preference/reduce, plus a live
 *           reduce toggle and a live light->dark toggle (stale inline blur)
 *   hit     visible focusable targets under 44px at 390 wide
 *   nojs    Sent (the real route) with JavaScript off: wallpaper and orbs
 *   heads   h1-h3 weight and tracking (D8: 740, -0.022em)
 * Stills to scripts/themes/.out/b1-glass-recritic/.
 *
 * Usage: BDL_GPU=1 node scripts/themes/glassmorphism/b1-recritic-probe.mjs [--base URL] [--only occl,useless,...]
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', '.out', 'b1-glass-recritic');
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i === -1 ? d : process.argv[i + 1]; };
const BASE = arg('base', 'http://127.0.0.1:4475');
const ONLY = arg('only', 'occl,useless,e10,hit,nojs,heads').split(',');
const useGpu = process.env.BDL_GPU === '1';
const PAGES = { home: '/t/glassmorphism/', services: '/t/glassmorphism/services/', about: '/t/glassmorphism/about/', contact: '/t/glassmorphism/contact/', sent: '/t/glassmorphism/contact/sent/' };
const VPS = { desktop: { width: 1440, height: 900 }, phone: { width: 390, height: 844 } };
await mkdir(OUT, { recursive: true });
const report = {};
const browser = await chromium.launch({ args: ['--hide-scrollbars', ...(useGpu ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] : [])] });

async function ctx(scheme, vpName, { rt = 'no-preference', js = true } = {}) {
  const vp = VPS[vpName];
  const c = await browser.newContext({ viewport: vp, colorScheme: scheme, isMobile: vpName === 'phone', hasTouch: vpName === 'phone', deviceScaleFactor: vpName === 'phone' ? 2 : 1, javaScriptEnabled: js, reducedMotion: 'no-preference' });
  await c.addInitScript((s) => { try { localStorage.setItem('scheme', s); localStorage.setItem('theme', s); localStorage.setItem('bdl-switcher-prompt', 'dismissed'); } catch {} }, scheme);
  await c.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
  const page = await c.newPage();
  const cdp = await c.newCDPSession(page);
  if (rt !== 'default') await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: rt }] });
  return { c, page, cdp };
}
const settle = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
async function setPhase(page, frac) {
  await page.evaluate((f) => {
    for (const a of document.getAnimations()) {
      if (a.animationName !== 'glass-drift') continue;
      const t = a.effect.getTiming();
      const d = typeof t.duration === 'number' ? t.duration : 0;
      a.pause();
      a.currentTime = d * f - (t.delay || 0); // phase measured on the iteration clock
    }
  }, frac);
}

if (ONLY.includes('occl') || ONLY.includes('useless')) {
  report.occl = []; report.useless = [];
  for (const scheme of ['light', 'dark']) for (const vpName of Object.keys(VPS)) {
    const { c, page } = await ctx(scheme, vpName);
    for (const [name, path] of Object.entries(PAGES)) {
      await page.goto(BASE + path, { waitUntil: 'networkidle' });
      await page.addStyleTag({ content: '.orb { pointer-events: auto !important; } bdl-switcher { display: none !important; }' });
      await page.evaluate(() => document.fonts.ready);
      if (ONLY.includes('useless')) {
        for (const pct of [0, 25, 50, 75, 100]) {
          await page.evaluate((p) => scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * p / 100), pct);
          await settle(page); await page.waitForTimeout(120);
          const u = await page.evaluate(() => {
            const panes = [...document.querySelectorAll('.glass, .glass-strong, .surface-solid')].map((e) => e.getBoundingClientRect());
            const out = [];
            for (const o of document.querySelectorAll('.orb')) {
              const r = o.getBoundingClientRect();
              const area = r.width * r.height; if (!area) continue;
              const vx = Math.max(0, Math.min(r.right, innerWidth) - Math.max(r.left, 0));
              const vy = Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0));
              const vis = (vx * vy) / area;
              if (vis < 0.5) continue;
              let cov = 0;
              for (const p of panes) {
                const ix = Math.max(0, Math.min(r.right, p.right) - Math.max(r.left, p.left));
                const iy = Math.max(0, Math.min(r.bottom, p.bottom) - Math.max(r.top, p.top));
                cov += ix * iy;
              }
              cov = Math.min(1, cov / area);
              if (cov < 0.1) out.push({ cls: o.className, cx: Math.round(r.left + r.width / 2), cy: Math.round(r.top + r.height / 2), d: Math.round(r.width), vis: +vis.toFixed(2), cov: +cov.toFixed(2) });
            }
            return out;
          });
          for (const x of u) report.useless.push({ scheme, vpName, name, pct, ...x });
          if (scheme === 'light' && (pct === 0 || pct === 50 || pct === 100)) await page.screenshot({ path: join(OUT, `scroll-${vpName}-${scheme}-${name}-${pct}.png`) });
        }
      }
      if (ONLY.includes('occl')) {
        for (const phase of [0, 0.6, 0.8, 0.95]) {
          await setPhase(page, phase);
          const found = await page.evaluate(async () => {
            const out = [];
            const els = [...document.querySelectorAll('main a, main button, main h1, main h2, main h3, main p, main label, main input, main textarea, main li, main .chip, footer a, footer p, header a')];
            for (const el of els) {
              const cs = getComputedStyle(el);
              if (cs.clip !== 'auto' && cs.clip !== '' || el.closest('[aria-hidden="true"], .hp, [hidden]')) continue;
              el.scrollIntoView({ block: 'center' });
              await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
              const r = el.getBoundingClientRect();
              if (r.width < 4 || r.height < 4) continue;
              for (const [fx, fy] of [[0.1, 0.5], [0.5, 0.5], [0.9, 0.5], [0.5, 0.2], [0.5, 0.8]]) {
                const x = r.left + r.width * fx, y = r.top + r.height * fy;
                if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) continue;
                const top = document.elementFromPoint(x, y);
                if (top && top.matches('.orb')) { out.push(`${el.tagName.toLowerCase()}.${[...el.classList].join('.')} "${(el.textContent || '').trim().slice(0, 40)}" by ${top.className} scrollY=${Math.round(scrollY)}`); break; }
              }
            }
            return out;
          });
          for (const f of found) report.occl.push({ scheme, vpName, name, phase, f });
        }
      }
    }
    await c.close();
  }
}

if (ONLY.includes('e10')) {
  report.e10 = [];
  for (const scheme of ['light', 'dark']) for (const rt of ['default', 'no-preference', 'reduce']) {
    const { c, page } = await ctx(scheme, 'desktop', { rt });
    for (const [name, path] of Object.entries(PAGES)) {
      await page.goto(BASE + path, { waitUntil: 'networkidle' }); await page.waitForTimeout(300);
      const i = await page.evaluate(() => {
        const q = (s) => document.querySelector(s);
        const th = q('.glass.thin'), st = q('.glass-strong'), g = q('.glass:not(.thin):not(.thick)');
        const cs = (e) => e && getComputedStyle(e);
        return {
          mq: matchMedia('(prefers-reduced-transparency: reduce)').matches,
          thinBg: cs(th)?.backgroundColor, thinBf: cs(th)?.backdropFilter, thinWbf: cs(th)?.webkitBackdropFilter,
          strongBf: cs(st)?.backdropFilter, regBf: cs(g)?.backdropFilter, regBg: cs(g)?.backgroundColor,
          wp: getComputedStyle(q('main'), '::before').backgroundImage.slice(0, 30),
          orbAnim: cs(q('.orb'))?.animationName, orbTranslate: cs(q('.orb'))?.translate,
          tintBefore: cs(th) && getComputedStyle(th, '::before').display,
        };
      });
      report.e10.push({ scheme, rt, name, ...i });
    }
    await c.close();
  }
  // live toggles
  {
    const { c, page, cdp } = await ctx('light', 'desktop');
    await page.goto(BASE + PAGES.home, { waitUntil: 'networkidle' }); await page.waitForTimeout(400);
    const read = () => page.evaluate(() => { const e = document.querySelector('.glass.thin'); return { scheme: document.documentElement.dataset.scheme, inline: e.style.backdropFilter, bf: getComputedStyle(e).backdropFilter, bg: getComputedStyle(e).backgroundColor }; });
    const live = { start: await read() };
    await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }] });
    await page.waitForTimeout(400); live.toReduce = await read();
    await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
    await page.waitForTimeout(400); live.backToNoPref = await read();
    // scheme toggle via the switcher's scheme button, else the attribute
    const toggled = await page.evaluate(() => {
      const sw = document.querySelector('bdl-switcher');
      const b = sw?.shadowRoot && [...sw.shadowRoot.querySelectorAll('button')].find((x) => /light|dark|scheme/i.test(x.textContent + (x.getAttribute('aria-label') || '')));
      if (b) { b.click(); return 'button'; }
      document.documentElement.dataset.scheme = 'dark'; return 'attr';
    });
    await page.waitForTimeout(600); live.afterScheme = { via: toggled, ...(await read()) };
    await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(400); live.darkFresh = await read();
    report.e10live = live;
    await c.close();
  }
}

if (ONLY.includes('hit')) {
  report.hit = [];
  for (const scheme of ['light']) {
    const { c, page } = await ctx(scheme, 'phone');
    for (const [name, path] of Object.entries(PAGES)) {
      await page.goto(BASE + path, { waitUntil: 'networkidle' });
      const small = await page.evaluate(() => {
        const out = [];
        for (const el of document.querySelectorAll('a[href], button, input:not([type=hidden]), textarea, select, [tabindex]:not([tabindex="-1"])')) {
          if (el.closest('bdl-switcher, [aria-hidden="true"]')) continue;
          const cs = getComputedStyle(el);
          if (cs.visibility === 'hidden' || cs.display === 'none') continue;
          const r = el.getBoundingClientRect();
          if (r.width < 2 || r.height < 2) continue; // hidden honeypot / skip
          if (r.right < 0 || r.left > innerWidth) continue;
          if (r.width < 44 || r.height < 44) out.push({ tag: el.tagName, text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30), w: +r.width.toFixed(1), h: +r.height.toFixed(1) });
        }
        return out;
      });
      for (const s of small) report.hit.push({ name, ...s });
    }
    await c.close();
  }
}

if (ONLY.includes('nojs')) {
  report.nojs = [];
  const { c, page } = await ctx('light', 'desktop', { js: false });
  for (const [name, path] of Object.entries(PAGES)) {
    const resp = await page.goto(BASE + path, { waitUntil: 'networkidle' });
    const i = await page.evaluate(() => ({ bg: getComputedStyle(document.querySelector('main'), '::before').backgroundImage.slice(0, 40), orbs: document.querySelectorAll('.orb').length }));
    report.nojs.push({ name, status: resp.status(), ...i });
  }
  const r404 = await page.goto(BASE + '/t/glassmorphism/sent/');
  report.nojs.push({ name: 'wrong-sent-url', status: r404.status() });
  await page.goto(BASE + PAGES.sent, { waitUntil: 'networkidle' });
  await page.screenshot({ path: join(OUT, 'nojs-sent-light.png') });
  await c.close();
}

if (ONLY.includes('heads')) {
  report.heads = [];
  const { c, page } = await ctx('light', 'desktop');
  for (const [name, path] of Object.entries(PAGES)) {
    await page.goto(BASE + path, { waitUntil: 'networkidle' });
    const h = await page.evaluate(() => [...document.querySelectorAll('main h1, main h2, main h3, footer h2, footer h3')].map((e) => { const cs = getComputedStyle(e); const fs = parseFloat(cs.fontSize); return { tag: e.tagName, cls: e.className, text: e.textContent.trim().slice(0, 30), w: cs.fontWeight, lsEm: +(parseFloat(cs.letterSpacing) / fs).toFixed(4), fs, fam: cs.fontFamily.slice(0, 30) }; }));
    for (const x of h) report.heads.push({ name, ...x });
  }
  await c.close();
}

await browser.close();
await writeFile(join(OUT, 'probe-report.json'), JSON.stringify(report, null, 1));
console.log(JSON.stringify(report, null, 1));
