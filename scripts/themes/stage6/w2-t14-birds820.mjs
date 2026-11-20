/**
 * Stage 6 wave 2, task 14 (GM4): where each painted bird of About's wall falls at a given width,
 * in CSS px, against the gilt oval's ellipse (grown by `--grow` px, default 14, for the frame's
 * rim and shadow). Complements scripts/themes/grandmillennial/b1-t6-birds.mjs, which counts the
 * oval's box only (no rim), and so reported nothing at 820 while the picture showed a bird
 * half under the frame.
 *
 *   BASE=http://127.0.0.1:4470 node scripts/themes/stage6/w2-t14-birds820.mjs [width=820] [--grow 14]
 */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const BASE = (process.env.BASE || process.env.SNAP_BASE || 'http://127.0.0.1:4470').replace(/\/$/, '');
const W = Number(process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 820);
const gi = process.argv.indexOf('--grow');
const GROW = gi < 0 ? 14 : Number(process.argv[gi + 1]);
const scene = JSON.parse(readFileSync(join(REPO, 'scripts/themes/proofs/stage5-gm-chinoiserie/scene.json'), 'utf8'));
const birds = [...scene.sceneG.matchAll(/<use href="#sc-(pb|fb)" transform="translate\(([-\d.]+) ([-\d.]+)\)(?: rotate\(([-\d.]+)\))? scale\(([-\d.]+) ([-\d.]+)\)" class="([\w-]+)"/g)]
  .map((m) => ({ kind: m[1], x: +m[2], y: +m[3], sx: +m[5], sy: +m[6], rot: +(m[4] || 0), cls: m[7] }));
const EXT = { pb: [-108, -57, 42, 40], fb: [-70, -40, 45, 44] };
const box = (b) => {
  const [x0, y0, x1, y1] = EXT[b.kind];
  const a = (b.rot * Math.PI) / 180, co = Math.cos(a), si = Math.sin(a);
  const pts = [[x0, y0], [x1, y0], [x0, y1], [x1, y1]].map(([px, py]) => { const lx = b.sx * px, ly = b.sy * py; return [b.x + lx * co - ly * si, b.y + lx * si + ly * co]; });
  return [Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))];
};
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: W, height: W < 700 ? 844 : W < 1100 ? 1180 : 900 }, colorScheme: 'light', isMobile: W < 900, hasTouch: W < 900 });
await suppressPrompt(ctx);
const page = await ctx.newPage();
await page.goto(`${BASE}/t/grandmillennial/about/`, { waitUntil: 'networkidle' });
const m = await page.evaluate(() => {
  const r = (e) => { const b = e.getBoundingClientRect(); return [b.left, b.top + scrollY, b.right, b.bottom + scrollY]; };
  const oval = [...document.querySelectorAll('.gilt-oval')].find((e) => getComputedStyle(e).display !== 'none');
  return { parts: [...document.querySelectorAll('.scene-part')].map(r), oval: r(oval) };
});
const phone = W <= 820;
const [ox0, oy0, ox1, oy1] = m.oval;
const cx = (ox0 + ox1) / 2, cy = (oy0 + oy1) / 2, rx = (ox1 - ox0) / 2 + GROW, ry = (oy1 - oy0) / 2 + GROW;
console.log(`width ${W}: oval css box ${m.oval.map(Math.round)} (ellipse grown ${GROW}px)`);
m.parts.forEach((p, i) => {
  const Wd = p[2] - p[0], H = p[3] - p[1], s = Math.max(Wd / 1600, H / 1300);
  const ox = p[0] + (i === 0 && phone ? 0 : (Wd - 1600 * s) / 2), oy = i === 0 ? p[1] : p[3] - 1300 * s;
  birds.forEach((b, k) => {
    const [x0, y0, x1, y1] = box(b);
    const bb = [ox + x0 * s, oy + y0 * s, ox + x1 * s, oy + y1 * s];
    if (bb[2] < p[0] || bb[0] > p[2] || bb[3] < p[1] || bb[1] > p[3]) return;
    let inside = 0;
    for (let i2 = 0; i2 < 20; i2++) for (let j = 0; j < 20; j++) {
      const px = bb[0] + ((i2 + 0.5) / 20) * (bb[2] - bb[0]), py = bb[1] + ((j + 0.5) / 20) * (bb[3] - bb[1]);
      if (((px - cx) / rx) ** 2 + ((py - cy) / ry) ** 2 <= 1) inside++;
    }
    console.log(`  room ${'ab'[i]} bird#${k} ${b.kind} ${b.cls} at ${b.x},${b.y} css box ${bb.map(Math.round)} under the oval ${Math.round(inside / 4)}%`);
  });
});
await browser.close();
