/** Critic side probe (09-25-26, B1): the raw rAF cadence in the same GPU
    Chromium b1-critic.mjs uses, so the hero's measured draw gap can be read
    against it (is 50ms the throttle, or the browser?). */
import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const p = await browser.newPage();
await p.goto(process.argv[2] || 'http://127.0.0.1:4475/t/vaporwave/');
const r = await p.evaluate(() => new Promise((res) => { const ts = []; const f = (t) => { ts.push(t); if (ts.length < 181) requestAnimationFrame(f); else { const g = ts.slice(1).map((t, i) => t - ts[i]); g.sort((a, b) => a - b); const budget = 1000 / 30; let last = 0, drawn = 0; for (const t of ts) if (t - last >= budget) { last = t; drawn++; } res({ median: g[90], min: g[0], max: g[179], under33: g.filter((x) => x * 2 < budget).length, simDrawnOf180: drawn, secs: (ts[180] - ts[0]) / 1000 }); } }; requestAnimationFrame(f); }));
console.log(r);
await browser.close();
