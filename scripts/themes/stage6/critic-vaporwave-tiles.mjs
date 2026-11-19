// Stage 6 vaporwave critic: tile the a0 whole-page captures into dark|light
// side-by-side slices small enough to read. Read-only toward the captures.
// Usage: node scripts/themes/stage6/critic-vaporwave-tiles.mjs [page...] [--size desktop|tablet|mobile]
import { createCanvas, loadImage } from '@napi-rs/canvas';
import fs from 'node:fs';
import path from 'node:path';

const SRC = 'scripts/themes/.out/stage6-a0-captures';
const OUT = 'scripts/themes/.out/stage6-critic-vaporwave/tiles';
fs.mkdirSync(OUT, { recursive: true });

const args = process.argv.slice(2);
const sizeArg = args.includes('--size') ? args[args.indexOf('--size') + 1] : null;
const pages = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--size');
const PAGES = pages.length ? pages : ['t-vaporwave', 't-vaporwave-services', 't-vaporwave-about', 't-vaporwave-contact', 't-vaporwave-contact-sent'];
const SIZES = { desktop: { w: 960, h: 1100 }, tablet: { w: 820, h: 1300 }, mobile: { w: 390, h: 1500 } };

for (const page of PAGES) {
  for (const [size, cfg] of Object.entries(SIZES)) {
    if (sizeArg && size !== sizeArg) continue;
    const dark = await loadImage(path.join(SRC, `${page}__dark__${size}.png`));
    const light = await loadImage(path.join(SRC, `${page}__light__${size}.png`));
    const s = cfg.w / dark.width;
    const fullH = Math.round(dark.height * s);
    const n = Math.ceil(fullH / cfg.h);
    for (let i = 0; i < n; i++) {
      const y0 = i * cfg.h;
      const h = Math.min(cfg.h, fullH - y0);
      const c = createCanvas(cfg.w * 2 + 10, h);
      const g = c.getContext('2d');
      g.fillStyle = '#f0f'; g.fillRect(0, 0, c.width, h);
      g.drawImage(dark, 0, y0 / s, dark.width, h / s, 0, 0, cfg.w, h);
      g.drawImage(light, 0, y0 / s, light.width, h / s, cfg.w + 10, 0, cfg.w, h);
      const f = path.join(OUT, `${page}__${size}__${i}.jpg`);
      fs.writeFileSync(f, await c.encode('jpeg', 85));
      console.log(f, `css y ${Math.round(y0 / s / (dark.width / ({ desktop: 1440, tablet: 820, mobile: 390 })[size]))}`);
    }
  }
}
