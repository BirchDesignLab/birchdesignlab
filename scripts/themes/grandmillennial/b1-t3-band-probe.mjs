/** Probe: Home Lab band at widths 480..1100: specimen list stays inside the viewport, jars keep a floor.
    node scripts/themes/grandmillennial/b1-t3-band-probe.mjs http://127.0.0.1:4460 */
import { chromium } from 'playwright';
const base = (process.argv[2] || '').replace(/\/$/, '');
const b = await chromium.launch();
let bad = 0;
for (const w of [390, 480, 561, 640, 665, 700, 760, 820, 860, 861, 900, 1000, 1024, 1280]) {
  const p = await b.newPage({ viewport: { width: w, height: 900 } });
  await p.goto(`${base}/t/grandmillennial/`, { waitUntil: 'networkidle' });
  const r = await p.evaluate(() => {
    const l = document.querySelector('.specimens').getBoundingClientRect();
    const lis = [...document.querySelectorAll('.specimens li')].map((e) => e.getBoundingClientRect());
    const j = document.querySelector('.band .jar'); const jr = j && getComputedStyle(j).display !== 'none' ? j.getBoundingClientRect().width : null;
    return { l: Math.round(l.left), r: Math.round(l.right), cols: new Set(lis.map((x) => Math.round(x.left))).size, jar: jr && Math.round(jr), vw: innerWidth };
  });
  const ok = r.l >= 0 && r.r <= r.vw && (r.jar === null || r.jar >= 80);
  if (!ok) bad++;
  console.log(w, JSON.stringify(r), ok ? 'ok' : 'BAD');
  await p.close();
}
await b.close();
process.exit(bad ? 1 : 0);
