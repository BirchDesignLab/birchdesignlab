/** Stage 6 w1 t8: three key clicks 80ms apart, dispatched in-page (no playwright latency); the page must end on the third division. */
import { chromium } from 'playwright';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveProof } from '../proofs/stage6-swiss-p3/serve.mjs';
const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const server = await serveProof(4470, join(REPO, 'scripts', 'themes', '.out', 'snap-s6-w1-t8'));
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('http://127.0.0.1:4470/t/swiss/', { waitUntil: 'networkidle' });
await p.waitForFunction(() => window.__p3?.relay);
const out = await p.evaluate(async () => {
  const k = document.querySelector('.p3-key');
  const seen = [];
  for (let i = 0; i < 3; i++) { k.click(); seen.push(window.__p3.current); await new Promise((r) => setTimeout(r, 80)); }
  await new Promise((r) => setTimeout(r, 1000));
  return { seen, end: window.__p3.current, cols: window.__p3.cols(), clip: getComputedStyle(document.querySelector('main')).clipPath };
});
console.log(JSON.stringify(out));
await b.close(); server.close();
