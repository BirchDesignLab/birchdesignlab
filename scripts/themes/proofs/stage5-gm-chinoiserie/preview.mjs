// Quick look at the scene and the birch on plain pages (not a deliverable).
// node preview.mjs <outdir> [scheme=light|dark] [w=1440] [h=1300]
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const [outdir, scheme = 'light', w = 1440, h = 1300] = [process.argv[2], process.argv[3], Number(process.argv[4] || 1440), Number(process.argv[5] || 1300)];
mkdirSync(outdir, { recursive: true });
const css = readFileSync(join(HERE, 'proof.css'), 'utf8');
const scene = readFileSync(join(HERE, 'scene-defs.svg.html'), 'utf8');
const birch = readFileSync(join(HERE, 'birch.svg.html'), 'utf8');
const theme = readFileSync(join(HERE, '..', '..', '..', '..', 'src', 'themes', 'grandmillennial', 'theme.css'), 'utf8');
const page = (body) => `<!doctype html><html data-theme="grandmillennial" data-scheme="${scheme}"><meta charset="utf-8"><style>${theme}${css}
body{margin:0;background:var(--sc-ground)}.box{position:relative;width:${w}px;height:${h}px;overflow:hidden;isolation:isolate}</style><body>${body}</body></html>`;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: w, height: h } });
await p.setContent(page(`${scene}<div class="box">${scene.match(/<svg class="gm-scene-art wide"[\s\S]*?<\/svg>/)[0]}</div>`));
await p.screenshot({ path: join(outdir, `scene-${scheme}-${w}.png`) });
await p.setContent(page(`<div style="width:600px;height:750px;background:var(--oval);margin:20px">${birch.replace('class="gm-birch"', 'class="gm-birch" style="width:600px;height:750px"')}</div>`));
await p.screenshot({ path: join(outdir, `birch-${scheme}.png`), clip: { x: 0, y: 0, width: 660, height: 800 } });
await b.close();
