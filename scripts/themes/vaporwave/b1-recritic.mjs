/** Opus re-critic probe (09-25-26, B1 vaporwave, after the fix round).
    Re-checks the six blockers against the fixer's snap and hunts regressions:
      kana  - computed family/weight + 2x element shots of every kana, and
              whether Dela Gothic One actually covers each string
      props - About centrepiece, Home kiosk, both lobbies (dark/light,
              desktop/phone), plus horizontal-scroll check
      foot  - Privacy link hit rect, footer crops
      seam  - WebGL uniform log by name (uSeam, uStripe) over ~5 cycles, and
              hero shots at 0/60/80/95% of the 6.4s cycle
    Usage: BDL_GPU=1 node scripts/themes/vaporwave/b1-recritic.mjs [base] [seconds]
    Output: scripts/themes/.out/b1-vw-recritic/ */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', '.out', 'b1-vw-recritic');
const BASE = process.argv[2] || 'http://127.0.0.1:4472';
const SECONDS = Number(process.argv[3] || 33);
await mkdir(OUT, { recursive: true });
const gpu = process.env.BDL_GPU === '1';
const browser = await chromium.launch({
  args: ['--hide-scrollbars', '--font-render-hinting=none', '--disable-lcd-text',
    ...(gpu ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] : [])],
});
const report = {};
const VPS = { desktop: { width: 1440, height: 900 }, phone: { width: 390, height: 844 } };

async function open(path, vp, scheme, dsf = 2) {
  const ctx = await browser.newContext({ viewport: VPS[vp], deviceScaleFactor: dsf, colorScheme: scheme });
  const p = await ctx.newPage();
  await p.goto(BASE + path, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  // lazy stills: scroll through so loading="lazy" fires
  await p.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 400) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); }
    scrollTo(0, 0);
  });
  await p.waitForLoadState('networkidle');
  await p.waitForTimeout(300);
  return { ctx, p };
}

// ---- kana + props + footer
report.kana = []; report.props = []; report.footer = [];
for (const scheme of ['dark', 'light']) {
  for (const vp of ['desktop', 'phone']) {
    for (const [name, path] of [['home', '/t/vaporwave/'], ['services', '/t/vaporwave/services/'], ['about', '/t/vaporwave/about/'], ['sent', '/t/vaporwave/contact/sent/']]) {
      const { ctx, p } = await open(path, vp, scheme);
      const tag = `${name}__${scheme}__${vp}`;
      const kana = await p.evaluate(() => [...document.querySelectorAll('.tray-kana, .opener-kana, .kiosk-kana, .intro-kana, .vw-kana')].map((el) => {
        const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
        return { cls: el.className, text: el.textContent.trim(), family: cs.fontFamily.slice(0, 40), weight: cs.fontWeight, size: cs.fontSize, synth: cs.fontSynthesisWeight,
          visible: r.width > 0 && cs.display !== 'none', dela: document.fonts.check(`400 ${cs.fontSize} "Dela Gothic One"`, el.textContent.trim()) };
      }));
      report.kana.push({ tag, kana });
      if (scheme === 'dark') {
        for (const sel of ['.tray-kana', '.opener-kana', '.kiosk-kana', '.intro-kana', '.vw-kana']) {
          const el = p.locator(sel).first();
          if (await el.count() && await el.isVisible()) {
            await el.scrollIntoViewIfNeeded();
            await el.screenshot({ path: join(OUT, `kana__${tag}__${sel.slice(1)}.png`) }).catch(() => {});
          }
        }
      }
      const hs = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      for (const sel of ['.centerpiece', '.kiosk', '.lobby, [class*=-lobby]']) {
        const el = p.locator(sel).first();
        if (!(await el.count()) || !(await el.isVisible())) continue;
        await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(200);
        const box = await el.boundingBox();
        const pad = 60;
        const clip = { x: Math.max(0, box.x - pad), y: Math.max(0, box.y - pad), width: Math.min(VPS[vp].width - Math.max(0, box.x - pad), box.width + 2 * pad), height: box.height + 2 * pad };
        await p.screenshot({ path: join(OUT, `prop__${tag}__${sel.split(/[ ,.]/)[1]}.png`), clip }).catch((e) => console.log('clip fail', tag, sel, e.message));
      }
      const geom = await p.evaluate(() => {
        const out = {};
        const cp = document.querySelector('.centerpiece-prop img'), st = document.querySelector('.centerpiece-steps');
        if (cp && st) out.centerpiece = { imgBottom: cp.getBoundingClientRect().bottom, stepsTop: st.getBoundingClientRect().top, complete: cp.complete, nat: cp.naturalWidth };
        const kp = document.querySelector('.kiosk-prop img'), k = document.querySelector('.kiosk');
        if (kp && k) out.kiosk = { imgBottom: kp.getBoundingClientRect().bottom, kioskBottom: k.getBoundingClientRect().bottom, display: getComputedStyle(kp.closest('picture')).display, complete: kp.complete };
        const pot = document.querySelector('.lobby-pot'); if (pot) out.pot = pot.getBoundingClientRect().height;
        return out;
      });
      report.props.push({ tag, hscroll: hs, geom });
      if (name === 'home') {
        const f = await p.evaluate(() => [...document.querySelectorAll('footer a')].map((a) => { const r = a.getBoundingClientRect(); return { t: a.textContent.trim(), w: Math.round(r.width), h: Math.round(r.height) }; }));
        report.footer.push({ tag, f });
        await p.locator('footer').first().scrollIntoViewIfNeeded();
        await p.locator('footer').first().screenshot({ path: join(OUT, `footer__${tag}.png`) });
      }
      await ctx.close();
    }
  }
}

// ---- seam
const ctx = await browser.newContext({ viewport: VPS.desktop, deviceScaleFactor: 1, colorScheme: 'dark' });
await ctx.addInitScript(() => {
  window.__log = [];
  for (const P of [WebGLRenderingContext.prototype, window.WebGL2RenderingContext && WebGL2RenderingContext.prototype].filter(Boolean)) {
    const gul = P.getUniformLocation, u1 = P.uniform1f, da = P.drawArrays;
    P.getUniformLocation = function (prog, name) { const l = gul.call(this, prog, name); if (l) l.__n = name; return l; };
    P.uniform1f = function (l, v) { if (l && (l.__n === 'uSeam' || l.__n === 'uStripe')) (window.__cur ||= {})[l.__n] = v; return u1.call(this, l, v); };
    P.drawArrays = function (...a) { if (this.canvas && this.canvas.hasAttribute && this.canvas.hasAttribute('data-vw-horizon')) window.__log.push({ t: performance.now(), ...(window.__cur || {}) }); return da.apply(this, a); };
  }
});
const p = await ctx.newPage();
await p.goto(BASE + '/t/vaporwave/', { waitUntil: 'networkidle' });
report.renderer = await p.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl'); const e = gl.getExtension('WEBGL_debug_renderer_info'); return gl.getParameter(e.UNMASKED_RENDERER_WEBGL); });
console.log('renderer', report.renderer);
if (gpu && /swiftshader/i.test(report.renderer)) throw new Error('software renderer');
// phase shots: wait for cyclePos (uStripe/0.06) to hit each target
const shots = [];
for (const frac of [0, 0.6, 0.8, 0.95, 0.0]) {
  const target = frac * 6.4;
  const t0 = Date.now();
  while (Date.now() - t0 < 8000) {
    const cp = await p.evaluate(() => { const l = window.__log.at(-1); return l && l.uStripe != null ? l.uStripe / 0.06 : -1; });
    if (cp >= target && cp < target + 0.12) break;
    await p.waitForTimeout(8);
  }
  const before = await p.evaluate(() => window.__log.at(-1));
  await p.locator('canvas[data-vw-horizon]').screenshot({ path: join(OUT, `seam__phase${Math.round(frac * 100)}__${shots.length}.png`) });
  shots.push({ frac, cyclePos: before.uStripe / 0.06, seam: before.uSeam });
}
report.phaseShots = shots;
await p.evaluate(() => { window.__log = []; });
await p.waitForTimeout(SECONDS * 1000);
const log = await p.evaluate(() => window.__log);
const gaps = log.slice(1).map((d, i) => d.t - log[i].t).sort((a, b) => a - b);
const cps = log.map((d) => ({ t: d.t, cp: d.uStripe / 0.06, seam: d.uSeam }));
const wraps = []; for (let i = 1; i < cps.length; i++) if (cps[i].cp < cps[i - 1].cp) wraps.push({ i, cp: cps[i].cp, seam: cps[i].seam, next: cps[i + 1] && cps[i + 1].seam, prevCp: cps[i - 1].cp });
const seamDraws = cps.filter((d) => d.seam !== 0);
const strayseam = seamDraws.filter((d) => d.cp > 2 / 60 + 0.001 && !wraps.some((w) => cps[w.i] === d));
report.seam = { draws: log.length, fps: log.length / SECONDS, medianGap: gaps[gaps.length >> 1], p10: gaps[Math.floor(gaps.length * 0.1)], p90: gaps[Math.floor(gaps.length * 0.9)], maxGap: gaps.at(-1), wraps, seamDraws: seamDraws.length, strayseam };
// pause/resume: hide the hero (scroll away) past a wrap, then return
await p.evaluate(() => { window.__log = []; scrollTo(0, 3000); });
await p.waitForTimeout(7000);
await p.evaluate(() => scrollTo(0, 0));
await p.waitForTimeout(1500);
report.resume = (await p.evaluate(() => window.__log)).slice(0, 4).map((d) => ({ cp: d.uStripe / 0.06, seam: d.uSeam }));
await writeFile(join(OUT, 'report.json'), JSON.stringify(report, null, 1));
console.log(JSON.stringify({ seam: report.seam, phaseShots: shots, resume: report.resume }, null, 1));
await browser.close();
