import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-angle=d3d11','--enable-gpu','--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.addInitScript(() => {
  window.__s = [];
  const orig = document.startViewTransition.bind(document);
  document.startViewTransition = (arg) => {
    const vt = orig(arg);
    const t0 = performance.now();
    vt.ready.then(() => {
      const tick = () => {
        const cs = (pe) => getComputedStyle(document.documentElement, pe);
        const anims = document.getAnimations().filter(a => a.effect?.pseudoElement?.includes('wordmark')).map(a => ({ pe: a.effect.pseudoElement, name: a.animationName, t: a.effect.getComputedTiming(), cur: a.currentTime }));
        window.__s.push({ t: performance.now() - t0, old: cs('::view-transition-old(wordmark)').opacity, nw: cs('::view-transition-new(wordmark)').opacity, oldDur: cs('::view-transition-old(wordmark)').animationDuration, grpDur: cs('::view-transition-group(wordmark)').animationDuration, anims });
        if (window.__done) return; requestAnimationFrame(tick);
      };
      tick();
    });
    vt.finished.finally(() => { window.__done = true; });
    return vt;
  };
});
await p.goto('http://127.0.0.1:8787/t/quiet/', { waitUntil: 'networkidle' });
await p.waitForTimeout(500);
await p.evaluate(() => { const a = document.createElement('a'); a.href = '/t/cottagecore/'; document.body.append(a); a.click(); });
await p.waitForTimeout(2000);
const s = await p.evaluate(() => window.__s);
console.log(s.length);
for (const x of s.slice(0,14)) console.log(JSON.stringify({ t: Math.round(x.t), old: x.old, nw: x.nw, oldDur: x.oldDur, grpDur: x.grpDur, anims: x.anims.map(a => `${a.name} p=${a.t.progress?.toFixed(2)} cur=${Math.round(a.cur)}`) }));
await b.close();
