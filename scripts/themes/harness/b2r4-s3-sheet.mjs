/**
 * Stage 3 wave B2 round 4: the S3 side by side. Glass and vaporwave on the
 * same page, same scheme, same viewport, one row each, so the founder can
 * check the S3 boundary (glass dark and vaporwave dark must not read alike)
 * and both schools' finished B2 look in one glance.
 *
 * Captures come from capture.mjs, run first against a served build, e.g.:
 *   MSYS_NO_PATHCONV=1 BDL_GPU=1 node scripts/themes/capture.mjs \
 *     --base http://127.0.0.1:8787 --label stage3-b2-s3 --motion --wait 2500 \
 *     --viewports desktop,mobile --schemes dark,light \
 *     --routes /t/glassmorphism/,/t/vaporwave/,/t/glassmorphism/about/,/t/vaporwave/about/,/t/glassmorphism/contact/,/t/vaporwave/contact/
 *
 * Usage: node scripts/themes/harness/b2r4-s3-sheet.mjs [--label stage3-b2-s3]
 * Output: scripts/themes/.out/<label>/s3-side-by-side__<viewport>.jpg
 */
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const i = process.argv.indexOf('--label');
const label = i === -1 ? 'stage3-b2-s3' : process.argv[i + 1];
const DIR = join(HERE, '..', '.out', label);

const PAGES = [['', 'Home'], ['about', 'About'], ['contact', 'Contact']];
const SCHEMES = ['dark', 'light'];
const SCHOOLS = [['glassmorphism', 'Glassmorphism', '#a3bd8f'], ['vaporwave', 'Vaporwave', '#c084fc']];
const VIEWS = { desktop: [1440, 900, 480], mobile: [780, 1688, 240] };

for (const [vp, [w, h, thumbW]] of Object.entries(VIEWS)) {
  const thumbH = Math.round((h / w) * thumbW);
  const PAD = 16, LABEL_H = 30, TITLE_H = 40;
  const cols = SCHOOLS.length * SCHEMES.length;
  const rows = PAGES.length;
  const width = PAD + cols * (thumbW + PAD);
  const height = PAD + TITLE_H + rows * (LABEL_H + thumbH + PAD);
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#111113';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#f4f0e6';
  ctx.font = '600 24px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText(`Stage 3 B2 round 4, S3 side by side (${vp}): glass beside vaporwave, dark then light`, PAD, PAD + 14);

  let missing = 0;
  for (let r = 0; r < rows; r++) {
    const [slug, pageName] = PAGES[r];
    let c = 0;
    for (const scheme of SCHEMES) {
      for (const [school, schoolName, tint] of SCHOOLS) {
        const x = PAD + c * (thumbW + PAD);
        const y = PAD + TITLE_H + r * (LABEL_H + thumbH + PAD);
        ctx.fillStyle = tint;
        ctx.fillRect(x, y + 5, 6, LABEL_H - 10);
        ctx.fillStyle = '#f4f0e6';
        ctx.font = '600 20px sans-serif';
        ctx.fillText(`${schoolName} ${pageName}, ${scheme}`, x + 14, y + LABEL_H / 2);
        const file = join(DIR, `t-${school}${slug ? '-' + slug : ''}__${scheme}__${vp}.png`);
        if (existsSync(file)) {
          const img = await loadImage(file);
          ctx.drawImage(img, 0, 0, img.width, Math.min(img.height, Math.round(img.width * h / w)), x, y + LABEL_H, thumbW, thumbH);
        } else {
          missing++;
          ctx.fillStyle = '#552222';
          ctx.fillRect(x, y + LABEL_H, thumbW, thumbH);
        }
        ctx.strokeStyle = 'rgba(244,240,230,0.25)';
        ctx.strokeRect(x, y + LABEL_H, thumbW, thumbH);
        c++;
      }
    }
  }
  const out = join(DIR, `s3-side-by-side__${vp}.jpg`);
  await writeFile(out, await canvas.encode('jpeg', 92));
  console.log(out, missing ? `(${missing} captures missing)` : '');
}
