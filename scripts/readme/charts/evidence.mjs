// Evidence for the README charts. Writes to scripts/readme/.out/charts/ (gitignored):
//   stills/<n>-<name>.<scheme>.<830|360>.png   each SVG as an <img> on GitHub's page colours
//   film/<n>-<name>.<scheme>.png               8 frames across the motion, 830 wide
//   contact-sheet.png                          everything on one page
//
//   node scripts/readme/charts/evidence.mjs [--only 1]
//
// Stills load the SVG through <img> exactly as GitHub does. Filmstrip frames use
// the SVG inline so the CSS animations (Web Animations API) and the SMIL
// travellers (setCurrentTime) can be paused at a chosen time.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { REPO, registry, svgPath } from './source.mjs';

const require = createRequire(resolve(REPO, 'package.json'));
const { chromium } = require('playwright');
const onlyIdx = process.argv.indexOf('--only');
const only = onlyIdx >= 0 ? Number(process.argv[onlyIdx + 1]) : null;
const charts = registry.charts.filter((c) => c.built && (only == null || c.n === only));
const out = resolve(REPO, 'scripts/readme/.out/charts');
mkdirSync(resolve(out, 'stills'), { recursive: true });
mkdirSync(resolve(out, 'film'), { recursive: true });
const BG = { light: '#ffffff', dark: '#0d1117' };
const FRAMES = 8;

const browser = await chromium.launch();
const sheet = [];
try {
  for (const chart of charts) {
    for (const scheme of ['light', 'dark']) {
      const file = svgPath(chart, scheme);
      const svg = readFileSync(file, 'utf8');
      const dur = Number(svg.match(/data-motion-s="([\d.]+)"/)?.[1] ?? 0);
      const base = `${chart.n}-${chart.name}.${scheme}`;
      for (const width of [830, 360]) {
        const page = await browser.newPage({ viewport: { width: width + 40, height: 600 }, deviceScaleFactor: 1 });
        await page.setContent(
          `<body style="margin:0;padding:20px;background:${BG[scheme]}"><img id="i" src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}" style="display:block;max-width:100%;width:${width}px"></body>`,
        );
        await page.waitForFunction(() => document.getElementById('i').complete);
        // let the one-shot motion finish so the still is the settled frame
        await page.waitForTimeout(Math.ceil((dur + 1.2) * 1000));
        const p = resolve(out, 'stills', `${base}.${width}.png`);
        await page.screenshot({ path: p, fullPage: true });
        sheet.push({ kind: 'still', chart, scheme, width, p });
        await page.close();
      }
      // filmstrip
      const page = await browser.newPage({ viewport: { width: 870, height: 600 }, deviceScaleFactor: 1 });
      const frames = [];
      for (let k = 0; k < FRAMES; k++) {
        const time = dur > 0 ? (dur * k) / (FRAMES - 1) : 0;
        await page.setContent(`<body style="margin:0;padding:20px;background:${BG[scheme]}">${svg}</body>`);
        await page.evaluate((tm) => {
          const el = document.querySelector('svg');
          el.pauseAnimations?.();
          el.setCurrentTime?.(tm);
          for (const a of document.getAnimations()) {
            a.pause();
            a.currentTime = tm * 1000;
          }
        }, time);
        await page.waitForTimeout(60);
        const buf = await page.screenshot({ fullPage: true });
        frames.push(buf.toString('base64'));
      }
      await page.close();
      const strip = await browser.newPage({ viewport: { width: 2000, height: 800 } });
      await strip.setContent(
        `<body style="margin:0;background:${BG[scheme]};display:grid;grid-template-columns:repeat(4,1fr);gap:6px">${frames
          .map((b, k) => `<figure style="margin:0;position:relative"><img style="width:100%;display:block" src="data:image/png;base64,${b}"><figcaption style="position:absolute;left:8px;top:6px;font:12px monospace;color:#888">${((dur * k) / (FRAMES - 1)).toFixed(1)}s</figcaption></figure>`)
          .join('')}</body>`,
      );
      await strip.waitForTimeout(150);
      const fp = resolve(out, 'film', `${base}.png`);
      await strip.screenshot({ path: fp, fullPage: true });
      await strip.close();
      sheet.push({ kind: 'film', chart, scheme, p: fp });
    }
  }
  // contact sheet
  const cell = (s) =>
    `<figure style="margin:0 0 10px"><figcaption style="font:12px monospace;color:#999;margin:0 0 4px">${s.kind} ${s.chart.n}-${s.chart.name} ${s.scheme}${s.width ? ' ' + s.width : ''}</figcaption><img style="width:100%;display:block;border:1px solid #8884" src="data:image/png;base64,${readFileSync(s.p).toString('base64')}"></figure>`;
  const rows = charts
    .map((c) => {
      const mine = sheet.filter((s) => s.chart === c);
      const g = (kind, scheme, w) => mine.find((s) => s.kind === kind && s.scheme === scheme && (w ? s.width === w : true));
      return `<section style="display:grid;grid-template-columns:2fr 2fr 1fr 1fr;gap:12px;margin:0 0 28px">${[g('still', 'light', 830), g('still', 'dark', 830), g('still', 'light', 360), g('still', 'dark', 360)].map(cell).join('')}<div style="grid-column:1/3">${cell(g('film', 'light'))}</div><div style="grid-column:3/5">${cell(g('film', 'dark'))}</div></section>`;
    })
    .join('');
  const page = await browser.newPage({ viewport: { width: 2400, height: 1000 } });
  await page.setContent(`<body style="margin:0;padding:20px;background:#555;color:#ddd;font-family:sans-serif">${rows}</body>`);
  await page.waitForTimeout(300);
  await page.screenshot({ path: resolve(out, 'contact-sheet.png'), fullPage: true });
  await page.close();
  writeFileSync(resolve(out, 'evidence-index.json'), JSON.stringify(sheet.map((s) => s.p.replace(REPO, '')), null, 1));
} finally {
  await browser.close();
}
console.log('evidence written to', out);
