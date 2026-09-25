/** Opus re-critic probe, B1 vaporwave after fix round 2 (09-25-26).
    Checks the fixer's claims against the snap:
      seam   - WebGL uniform log (uSeam, uStripe) over two separate loads;
               every wrap must draw 0.16 then -0.06; hero shots at 0/60/80/95%
               of the 6.4s cycle; the off-screen pause/resume path
      props  - About centrepiece + Home kiosk, dark/light x desktop/tablet/phone
               (2x element shots, hscroll)
      bands  - every page: gap between main's last scene and the footer, the
               footer floor's display, and a closer-to-footer shot
      sent   - desktop icons at 3x, the wallpaper's bottom edge
      floor  - Contact screensaver CSS floor at 0/60/80/95% and the 99.45/99.7%
               seam steps (animations paused and scrubbed)
    Forces prefers-reduced-transparency: no-preference over CDP (house rule).
    Usage: BDL_GPU=1 node scripts/themes/vaporwave/b1-recritic2.mjs [base] [seconds]
    Output: scripts/themes/.out/b1-vw-recritic2/ */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', '.out', 'b1-vw-recritic2');
const BASE = process.argv[2] || process.env.SNAP_BASE || 'http://127.0.0.1:4475';
const SECONDS = Number(process.argv[3] || 30);
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({
  args: ['--hide-scrollbars', '--font-render-hinting=none', '--disable-lcd-text',
    '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'],
});
const report = {};
const VPS = { desktop: { width: 1440, height: 900 }, tablet: { width: 820, height: 1180 }, phone: { width: 390, height: 844 } };
const PAGES = [['home', '/t/vaporwave/'], ['about', '/t/vaporwave/about/'], ['services', '/t/vaporwave/services/'], ['contact', '/t/vaporwave/contact/'], ['sent', '/t/vaporwave/contact/sent/']];

async function newCtx(vp, scheme, dsf = 2, init) {
  const ctx = await browser.newContext({ viewport: VPS[vp], deviceScaleFactor: dsf, colorScheme: scheme });
  if (init) await ctx.addInitScript(init);
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }, { name: 'prefers-color-scheme', value: scheme }] });
  const errors = [];
  p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  p.on('pageerror', (e) => errors.push(String(e)));
  return { ctx, p, errors };
}
async function load(p, path) {
  await p.goto(BASE + path, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  await p.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 400) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); }
    scrollTo(0, 0);
  });
  await p.waitForLoadState('networkidle');
  await p.waitForTimeout(300);
}
async function shot(p, sel, file, pad = 40, vpw) {
  const el = p.locator(sel).first();
  if (!(await el.count()) || !(await el.isVisible())) return false;
  await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(150);
  const b = await el.boundingBox();
  const x = Math.max(0, b.x - pad), y = Math.max(0, b.y - pad);
  await p.screenshot({ path: join(OUT, file), clip: { x, y, width: Math.min(vpw - x, b.width + 2 * pad), height: b.height + 2 * pad } });
  return true;
}

// ---- props, bands, sent
report.pages = [];
for (const scheme of ['dark', 'light']) {
  for (const vp of ['desktop', 'tablet', 'phone']) {
    for (const [name, path] of PAGES) {
      const { ctx, p, errors } = await newCtx(vp, scheme);
      await load(p, path);
      const tag = `${name}__${scheme}__${vp}`;
      const info = await p.evaluate(() => {
        const main = document.querySelector('main'); const foot = main && main.nextElementSibling;
        const kids = [...main.children].filter((c) => c.tagName !== 'SCRIPT' && getComputedStyle(c).display !== 'none');
        const last = kids.at(-1);
        const fl = foot && foot.querySelector('.floor');
        const q = (s) => { const e = document.querySelector(s); return e ? e.getBoundingClientRect() : null; };
        const r = (x) => x && { top: Math.round(x.top + scrollY), bottom: Math.round(x.bottom + scrollY), left: Math.round(x.left), right: Math.round(x.right), w: Math.round(x.width), h: Math.round(x.height) };
        return {
          hscroll: document.documentElement.scrollWidth - innerWidth,
          lastScene: last && last.className, lastBottom: last && Math.round(last.getBoundingClientRect().bottom + scrollY),
          footTop: foot && Math.round(foot.getBoundingClientRect().top + scrollY), footMargin: foot && getComputedStyle(foot).marginTop,
          footFloor: fl && getComputedStyle(fl).display, footBg: foot && getComputedStyle(foot).backgroundImage.slice(0, 60),
          docH: document.documentElement.scrollHeight,
          cpImg: r(q('.centerpiece-prop img')), cpTop: r(q('.centerpiece-steps .tier-top')), cpBase: r(q('.centerpiece-steps .tier-base')), cp: r(q('.centerpiece')),
          kioskStand: r(q('.kiosk-stand')), kioskProp: r(q('.kiosk-prop img')), kiosk: r(q('.kiosk')),
          icons: [...document.querySelectorAll('.desktop-icon')].map((e) => ({ vis: getComputedStyle(e).display !== 'none', ah: e.closest('[aria-hidden=true]') != null, tab: e.tabIndex })),
        };
      });
      info.errors = errors;
      report.pages.push({ tag, ...info });
      if (name === 'about') await shot(p, '.centerpiece', `cp__${tag}.png`, 50, VPS[vp].width);
      if (name === 'home') { await shot(p, '.kiosk', `kiosk__${tag}.png`, 40, VPS[vp].width); await shot(p, '.closer', `closer__${tag}.png`, 0, VPS[vp].width); }
      if (name === 'services') await shot(p, 'main > :last-of-type', `svc-end__${tag}.png`, 0, VPS[vp].width);
      if (vp !== 'tablet' && ['home', 'services', 'sent', 'about', 'contact'].includes(name)) {
        await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
        await p.waitForTimeout(250);
        await p.screenshot({ path: join(OUT, `bottom__${tag}.png`) });
      }
      if (name === 'sent' && vp === 'desktop') {
        await p.evaluate(() => scrollTo(0, 0));
        const icons = p.locator('.desktop-icons, .desktop-icon').first();
        if (await icons.count()) {
          const b = await p.locator('.desktop-icon').first().boundingBox();
          const b2 = await p.locator('.desktop-icon').last().boundingBox();
          await p.screenshot({ path: join(OUT, `sent-icons__${tag}.png`), clip: { x: Math.max(0, b.x - 20), y: Math.max(0, b.y - 20), width: b.width + 60, height: b2.y + b2.height - b.y + 40 } });
        }
      }
      if (name === 'contact' && vp === 'desktop') {
        const sel = '.screensaver-preview';
        const clipOf = async () => { const b = await p.locator(sel).boundingBox(); return { x: b.x, y: b.y, width: b.width, height: b.height }; };
        await p.locator(sel).scrollIntoViewIfNeeded(); await p.waitForTimeout(300);
        const res = [];
        for (const frac of [0, 0.6, 0.8, 0.95, 0.9946, 0.9971]) {
          const st = await p.evaluate((f) => {
            const el = document.querySelector('.screensaver-preview .vw-floor');
            const anims = el.getAnimations({ subtree: true });
            for (const a of anims) {
              a.pause();
              const d = a.effect.getComputedTiming().duration;
              a.currentTime = a.animationName === 'vw-floor-seam' ? f * 6400 : (f * 6400) % d;
            }
            const cs = getComputedStyle(el, '::before');
            return { n: anims.map((a) => a.animationName), translate: cs.translate, transform: cs.transform.slice(0, 40), bs: cs.backgroundSize, paused: el.classList.contains('vw-floor-paused') };
          }, frac);
          await p.waitForTimeout(120);
          await p.screenshot({ path: join(OUT, `ss-floor__${scheme}__${Math.round(frac * 10000)}.png`), clip: await clipOf() });
          res.push({ frac, ...st });
        }
        report[`ssFloor_${scheme}`] = res;
      }
      await ctx.close();
    }
  }
}

// ---- seam, two loads
const initGL = () => {
  window.__log = [];
  for (const P of [WebGLRenderingContext.prototype, window.WebGL2RenderingContext && WebGL2RenderingContext.prototype].filter(Boolean)) {
    const gul = P.getUniformLocation, u1 = P.uniform1f, da = P.drawArrays;
    P.getUniformLocation = function (prog, name) { const l = gul.call(this, prog, name); if (l) l.__n = name; return l; };
    P.uniform1f = function (l, v) { if (l && (l.__n === 'uSeam' || l.__n === 'uStripe')) (window.__cur ||= {})[l.__n] = v; return u1.call(this, l, v); };
    P.drawArrays = function (...a) { if (this.canvas && this.canvas.hasAttribute && this.canvas.hasAttribute('data-vw-horizon')) window.__log.push({ t: performance.now(), ...(window.__cur || {}) }); return da.apply(this, a); };
  }
};
report.seam = [];
for (const [li, scheme] of [[0, 'dark'], [1, 'light']]) {
  const { ctx, p } = await newCtx('desktop', scheme, 1, initGL);
  await p.goto(BASE + '/t/vaporwave/', { waitUntil: 'networkidle' });
  const renderer = await p.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl'); const e = gl.getExtension('WEBGL_debug_renderer_info'); return gl.getParameter(e.UNMASKED_RENDERER_WEBGL); });
  if (/swiftshader/i.test(renderer)) throw new Error('software renderer');
  const shots = [];
  if (li === 0) {
    for (const frac of [0, 0.6, 0.8, 0.95]) {
      const target = frac * 6.4; const t0 = Date.now();
      while (Date.now() - t0 < 8000) {
        const cp = await p.evaluate(() => { const l = window.__log.at(-1); return l && l.uStripe != null ? l.uStripe / 0.06 : -1; });
        if (cp >= target && cp < target + 0.12) break;
        await p.waitForTimeout(8);
      }
      const last = await p.evaluate(() => window.__log.at(-1));
      await p.locator('canvas[data-vw-horizon]').screenshot({ path: join(OUT, `hero__phase${Math.round(frac * 100)}.png`) });
      shots.push({ frac, cp: last.uStripe / 0.06, seam: last.uSeam });
    }
  }
  await p.evaluate(() => { window.__log = []; });
  await p.waitForTimeout(SECONDS * 1000);
  const log = await p.evaluate(() => window.__log);
  const cps = log.map((d) => ({ cp: d.uStripe / 0.06, seam: d.uSeam, t: d.t }));
  const wraps = [];
  for (let i = 1; i < cps.length - 2; i++) if (cps[i].cp < cps[i - 1].cp) wraps.push({ cp: +cps[i].cp.toFixed(4), s1: cps[i].seam, s2: cps[i + 1].seam, s3: cps[i + 2].seam });
  const nonzero = cps.filter((d) => d.seam !== 0).length;
  const gaps = cps.slice(1).map((d, i) => d.t - cps[i].t).sort((a, b) => a - b);
  // resume path: scroll away across a wrap, come back
  await p.evaluate(() => { window.__log = []; scrollTo(0, 3000); });
  await p.waitForTimeout(7000);
  await p.evaluate(() => scrollTo(0, 0));
  await p.waitForTimeout(1200);
  const resume = (await p.evaluate(() => window.__log)).slice(0, 4).map((d) => ({ cp: +(d.uStripe / 0.06).toFixed(3), seam: d.uSeam }));
  report.seam.push({ scheme, renderer, draws: log.length, fps: +(log.length / SECONDS).toFixed(2), medianGap: gaps[gaps.length >> 1], wraps, allOk: wraps.length > 0 && wraps.every((w) => w.s1 === 0.16 && Math.abs(w.s2 + 0.06) < 1e-6 && w.s3 === 0), seamDraws: nonzero, expectedSeamDraws: wraps.length * 2, shots, resume });
  await ctx.close();
}
await writeFile(join(OUT, 'report.json'), JSON.stringify(report, null, 1));
console.log(JSON.stringify({ seam: report.seam, ss: [report.ssFloor_dark, report.ssFloor_light], pages: report.pages.map((x) => ({ tag: x.tag, h: x.hscroll, last: x.lastScene, gap: x.footTop - x.lastBottom, fm: x.footMargin, ff: x.footFloor, err: x.errors.length, icons: x.icons.length ? x.icons.filter((i) => i.vis).length : undefined })) }, null, 0));
await browser.close();
