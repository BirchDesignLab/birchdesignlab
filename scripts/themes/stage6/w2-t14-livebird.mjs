/**
 * Stage 6 wave 2, task 14 (GM4): where can About's live bird (the phone layer, 820 and below) sit along
 * its limb (limb 2 of scene.json: y = 252 - 0.57 * (x - 273)) so that at each width it is clear of the
 * gilt oval (ellipse grown by 14px for the frame's rim), the second frame and the story card?
 * Moves the layer's `.wb` in the page and measures the perched bird's own box, so nothing is derived
 * from the wall's scale.
 *
 * Fix round 1 (critic C2): the perch must be ON a painted limb, never extrapolated into a trunk. The y at each x is
 * now read from the real centreline samples in scene.json (proofs/stage5-gm-chinoiserie), and x is clamped to the
 * limb's own extent. LIMB=2 (default) picks the limb by index; the first sample is the limb's root inside the
 * trunk, so a perch is only valid a little past it (the trunk T1 is centred near x=255 and about 80 wide).
 *
 *   [LIMB=2] SNAP_BASE=http://127.0.0.1:4470 node scripts/themes/stage6/w2-t14-livebird.mjs [x0,x1,step] [widths]
 */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const BASE = (process.env.SNAP_BASE || process.env.BASE || 'http://127.0.0.1:4470').replace(/\/$/, '');
const [x0, x1, step] = (process.argv[2] || '200,420,20').split(',').map(Number);
const widths = (process.argv[3] || '390,430,480,560,600,601,640,700,760,820').split(',').map(Number);
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const LIMB = Number(process.env.LIMB || 2);
const line = JSON.parse(readFileSync(new URL('../proofs/stage5-gm-chinoiserie/scene.json', import.meta.url), 'utf8')).limbs[LIMB];
/** y of the limb's centreline at x (linear between the samples); null off the limb. */
const yAt = (x) => { for (let i = 0; i < line.length - 1; i++) { const [ax, ay] = line[i], [bx, by] = line[i + 1]; if (x >= Math.min(ax, bx) && x <= Math.max(ax, bx)) return Math.round(ay + ((x - ax) / (bx - ax)) * (by - ay)); } return null; };
const table = {};
for (const w of widths) {
  const ctx = await browser.newContext({ viewport: { width: w, height: w < 700 ? 844 : 1180 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, colorScheme: 'light' });
  await suppressPrompt(ctx);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/t/grandmillennial/about/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const res = await page.evaluate(({ x0, x1, step, ys }) => {
    const wb = [...document.querySelectorAll('.wb')].find((e) => getComputedStyle(e.closest('svg')).display !== 'none');
    const body = wb.querySelector('.wb-body'), perch = wb.querySelector('.wb-perch');
    const sc = body.getAttribute('transform');
    const rect = (e) => { const b = e.getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom]; };
    const oval = [...document.querySelectorAll('.gilt-oval')].find((e) => getComputedStyle(e).display !== 'none');
    const cards = [...document.querySelectorAll('.story, .gm-frame2')].filter((e) => getComputedStyle(e).display !== 'none').map(rect);
    const o = rect(oval), cx = (o[0] + o[2]) / 2, cy = (o[1] + o[3]) / 2, rx = (o[2] - o[0]) / 2 + 14, ry = (o[3] - o[1]) / 2 + 14;
    const out = [];
    for (let x = x0; x <= x1; x += step) {
      const y = ys[x]; if (y == null) continue;
      wb.style.transform = `translate(${x}px, ${y}px)`;
      const b = rect(perch);
      let hit = 0, n = 0;
      for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) {
        const px = b[0] + ((i + 0.5) / 16) * (b[2] - b[0]), py = b[1] + ((j + 0.5) / 16) * (b[3] - b[1]);
        n++;
        if (((px - cx) / rx) ** 2 + ((py - cy) / ry) ** 2 <= 1 || cards.some((c) => px >= c[0] && px <= c[2] && py >= c[1] && py <= c[3])) hit++;
      }
      const vw = innerWidth, inView = b[2] > 0 && b[0] < vw;
      out.push({ x, y, covered: Math.round((hit / n) * 100), inView: inView && b[0] >= 0 && b[2] <= vw });
    }
    return out;
  }, { x0, x1, step, ys: Object.fromEntries(Array.from({ length: Math.floor((x1 - x0) / step) + 1 }, (_, i) => [x0 + i * step, yAt(x0 + i * step)])) });
  table[w] = res;
  await ctx.close();
}
await browser.close();
const xs = table[widths[0]].map((r) => r.x);
console.log('x (y)   ' + widths.map((w) => String(w).padStart(5)).join(''));
xs.forEach((x, i) => console.log(`${String(x).padStart(4)} (${table[widths[0]][i].y}) ` + widths.map((w) => { const r = table[w][i]; return String(r.inView ? r.covered + '%' : 'off').padStart(5); }).join('')));
