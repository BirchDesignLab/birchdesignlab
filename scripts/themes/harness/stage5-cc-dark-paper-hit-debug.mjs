/* Probe for proofs/stage5-cc-dark-paper: mounts the strips in a given scheme
   (SCHEME=light|dark) at a width (W) and prints each strip's rendered width,
   and the topmost sprig element under its centre. Used to check that the strip
   geometry rule is scheme-agnostic. */
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
const base = (process.env.SNAP_BASE || '').replace(/\/$/, '');
const mount = await readFile(new URL('../proofs/stage5-cc-dark-paper/mount.js', import.meta.url), 'utf8');
const shared = await readFile(new URL('../proofs/stage5-cc-dark-paper/shared.css', import.meta.url), 'utf8');
const w = Number(process.env.W || 1440);
const scheme = process.env.SCHEME || 'light';
const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu'] });
const p = await b.newPage({ viewport: { width: w, height: 900 }, colorScheme: scheme });
await p.goto(`${base}/t/cottagecore/`, { waitUntil: 'networkidle' });
await p.addStyleTag({ content: shared });
await p.addScriptTag({ content: mount });
console.log(JSON.stringify(await p.evaluate(() => {
  const sc = document.documentElement.dataset.scheme;
  const sheet = document.querySelector('.hero .sheet');
  const t = window.__ccMount({});
  return { scheme: sc, sheetW: Math.round(sheet.offsetWidth), strips: [...sheet.querySelectorAll('.gum')].map((g) => Math.round(g.getBoundingClientRect().width)), placed: t.length };
})));
await b.close();
