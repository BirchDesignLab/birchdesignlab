import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-angle=d3d11','--enable-gpu','--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.addInitScript(() => {
  const orig = Document.prototype.startViewTransition;
  Document.prototype.startViewTransition = function (...a) {
    const vt = orig.apply(this, a);
    vt.ready.then(() => requestAnimationFrame(() => requestAnimationFrame(() => {
      window.__k = document.getAnimations().filter(x => x.effect?.pseudoElement).map(x => ({ pe: x.effect.pseudoElement, name: x.animationName, start: x.startTime, kf: x.effect.getKeyframes(), timing: x.effect.getTiming(), css: ['opacity','animationDuration','animationTimingFunction','animationDelay','animationFillMode','mixBlendMode'].map(k => k + '=' + getComputedStyle(document.documentElement, x.effect.pseudoElement)[k]).join(' ') }));
    })));
    return vt;
  };
});
await p.goto('http://127.0.0.1:8787/t/quiet/', { waitUntil: 'networkidle' });
await p.waitForTimeout(500);
await p.evaluate(() => { const a = document.createElement('a'); a.href = '/t/swiss/'; document.body.append(a); a.click(); });
await p.waitForTimeout(2000);
for (const k of await p.evaluate(() => window.__k)) if (k.pe.includes('wordmark')) console.log(JSON.stringify(k));
console.log(await p.evaluate(() => typeof Document.prototype.startViewTransition));
await b.close();
