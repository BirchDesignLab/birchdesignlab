/** Contact sheet of numbered frames: node strip-sheet.mjs <dir> <prefix> <count> <ms,ms,...> <out.png> [cols]
    Frames are <dir>/<prefix>-NN.png; each cell is labelled with its timestamp. */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const [dir, prefix, count, stamps, out, colsArg] = process.argv.slice(2);
const cols = Number(colsArg || 5);
const ms = stamps.split(',');
const cells = Array.from({ length: Number(count) }, (_, i) => {
  const b = readFileSync(join(dir, `${prefix}-${String(i).padStart(2, '0')}.png`)).toString('base64');
  return `<figure><img src="data:image/png;base64,${b}"><figcaption>${ms[i] ?? ''} ms</figcaption></figure>`;
}).join('');
const browser = await chromium.launch();
const p = await browser.newPage({ viewport: { width: 1600, height: 400 } });
await p.setContent(`<style>body{margin:0;background:#fff;font:14px sans-serif}div{display:grid;grid-template-columns:repeat(${cols},1fr);gap:4px}figure{margin:0;position:relative}img{width:100%;display:block}figcaption{position:absolute;left:4px;top:2px;color:#c00;font-weight:700}</style><div>${cells}</div>`);
await p.screenshot({ path: out, fullPage: true });
await browser.close();
