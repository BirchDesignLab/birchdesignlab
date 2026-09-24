import { loadImage, createCanvas } from '@napi-rs/canvas';
import { readFile } from 'node:fs/promises';

async function measure(sheetPath, manifestPath, key, cellW, cellH, cols) {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const entry = manifest.made.find((x) => x.file === key);
  const frameMs = entry.dense.frameMs;
  const img = await loadImage(sheetPath);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const PAD = 12, CAP = 26, HEAD = CAP + PAD;
  const results = [];
  for (let i = 0; i < frameMs.length; i++) {
    const x = PAD + (i % cols) * (cellW + PAD);
    const y = HEAD + PAD + Math.floor(i / cols) * (cellH + CAP + PAD);
    const data = ctx.getImageData(x, y, cellW, cellH).data;
    let sum = 0, white = 0, n = data.length / 4;
    for (let p = 0; p < data.length; p += 4) {
      const lum = (0.2126 * data[p] + 0.7152 * data[p + 1] + 0.0722 * data[p + 2]) / 255;
      sum += lum;
      if (lum >= 0.96) white++;
    }
    results.push({ ms: frameMs[i], mean: +(sum / n).toFixed(3), whitePct: +((white / n) * 100).toFixed(1) });
  }
  return results;
}

const cellW = 480, cellH = 300, cols = 4;

const waveA = await measure(
  'scripts/themes/.out/stage2-vaporwave-full/vaporwave__arrive__light__desktop.png',
  'scripts/themes/.out/stage2-vaporwave-full/manifest.json',
  'vaporwave__arrive__light__desktop.png', cellW, cellH, cols
);
console.log('WAVE A (before):');
for (const r of waveA) console.log(`  +${r.ms}ms  mean=${r.mean}  white%=${r.whitePct}`);
const peakA = waveA.reduce((a, b) => (b.whitePct > a.whitePct ? b : a));
console.log('peak white% (wave A):', peakA);

const now = await measure(
  'scripts/themes/.out/stage2-vaporwave-fu-verify-full/vaporwave__arrive__from-quiet__light__desktop.png',
  'scripts/themes/.out/stage2-vaporwave-fu-verify-full/manifest.json',
  'vaporwave__arrive__from-quiet__light__desktop.png', cellW, cellH, cols
);
console.log('NOW (independent re-film):');
for (const r of now) console.log(`  +${r.ms}ms  mean=${r.mean}  white%=${r.whitePct}`);
const peakNow = now.reduce((a, b) => (b.whitePct > a.whitePct ? b : a));
console.log('peak white% (now):', peakNow);
