/**
 * Stage 6 Tier A0: the boundary sheets. The three confusable pairs of
 * schools (portal.md section 1) side by side at thumbnail scale, so the set
 * critic can check that no two rooms blur together where a visitor would
 * actually compare them: small, in dark, and on phones.
 *
 * Written 11-19-26 for the Stage 6 set re-review. Reads a capture.mjs run
 * (manifest.json) and crops each page to its first screen (what a visitor
 * sees before scrolling), then lays the pair out: one row per page, school A
 * left, school B right.
 *
 * Usage: node scripts/themes/stage6/a0-boundary-sheets.mjs --label stage6-a0-captures
 *          [--width 320] [--quality 86]
 * Output: scripts/themes/.out/<label>/boundary/<a>-vs-<b>__<scheme>__<viewport>.jpg
 */
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
};
const label = arg('label');
if (!label) {
  console.error('usage: node scripts/themes/stage6/a0-boundary-sheets.mjs --label <capture label>');
  process.exit(1);
}
const thumbW = Number(arg('width', 320));
const quality = Number(arg('quality', 86));
const dir = join(HERE, '..', '.out', label);
const { shots } = JSON.parse(await readFile(join(dir, 'manifest.json'), 'utf8'));

const PAIRS = [
  ['swiss', 'bauhaus'],
  ['glassmorphism', 'vaporwave'],
  ['grandmillennial', 'cottagecore'],
];
const PAGES = ['', 'about', 'services', 'contact', 'contact/sent'];
const FIRST_SCREEN = { desktop: 900 / 1440, tablet: 1180 / 820, mobile: 844 / 390 }; // height / width
const pageOf = (route) => route.split('/').slice(3).filter(Boolean).join('/');
const schoolOf = (route) => route.split('/')[2];
const find = (school, page, scheme, vp) =>
  shots.find((s) => schoolOf(s.route) === school && pageOf(s.route) === page && s.scheme === scheme && s.vpName === vp);

const GUTTER = 16;
const HEAD = 40;
await mkdir(join(dir, 'boundary'), { recursive: true });

for (const [a, b] of PAIRS) {
  for (const scheme of ['dark', 'light']) {
    for (const vp of Object.keys(FIRST_SCREEN)) {
      const rows = PAGES.map((p) => [find(a, p, scheme, vp), find(b, p, scheme, vp)]).filter(([x, y]) => x && y);
      if (!rows.length) continue;
      const thumbH = Math.round(thumbW * FIRST_SCREEN[vp]);
      const width = GUTTER * 3 + thumbW * 2;
      const height = HEAD + rows.length * (thumbH + GUTTER + 20) + GUTTER;
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#1b1b1d';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#e8e6e1';
      ctx.font = '600 16px sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${a}  vs  ${b} · ${scheme} · ${vp} · first screen`, GUTTER, HEAD / 2);
      let y = HEAD;
      for (const pair of rows) {
        const imgs = await Promise.all(pair.map((s) => loadImage(join(dir, s.file))));
        ctx.font = '13px sans-serif';
        ctx.fillText(pageOf(pair[0].route) || 'home', GUTTER, y + 10);
        imgs.forEach((img, k) => {
          const srcH = Math.min(img.height, Math.round(img.width * FIRST_SCREEN[vp]));
          ctx.drawImage(img, 0, 0, img.width, srcH, GUTTER + k * (thumbW + GUTTER), y + 20, thumbW, Math.round((thumbW * srcH) / img.width));
        });
        y += thumbH + GUTTER + 20;
      }
      const out = join(dir, 'boundary', `${a}-vs-${b}__${scheme}__${vp}.jpg`);
      await writeFile(out, await canvas.encode('jpeg', quality));
      console.log(`${a} vs ${b} ${scheme} ${vp}: ${rows.length} rows -> ${out}`);
    }
  }
}
