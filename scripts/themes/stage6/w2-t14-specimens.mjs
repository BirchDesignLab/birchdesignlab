/**
 * Stage 6 wave 2, task 14: the lone third specimen card on Home (ledger B1 T3 N2).
 * Reports, at each width, the specimens' box, the cards' rows and per-row counts,
 * and whether a lone card is centred. Writes a whole-band shot per width.
 *
 *   BASE=http://127.0.0.1:4470 node scripts/themes/stage6/w2-t14-specimens.mjs [shotDir]
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const BASE = (process.env.BASE || process.env.SNAP_BASE || 'http://127.0.0.1:4470').replace(/\/$/, '');
const OUT = process.argv[2] || join(dirname(fileURLToPath(import.meta.url)), '..', '.out', 'stage6', 'w2', 't14', 'specimens');
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
let bad = 0;
for (const w of [390, 480, 560, 561, 600, 650, 695, 696, 699, 761, 820, 861, 900, 956, 957, 960, 999, 1100, 1280, 1440]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, colorScheme: 'light' });
  await suppressPrompt(ctx);
  await ctx.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
  await page.goto(`${BASE}/t/grandmillennial/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const r = await page.evaluate(() => {
    const ul = document.querySelector('.specimens');
    const u = ul.getBoundingClientRect();
    const lis = [...ul.children].map((l) => { const b = l.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y + scrollY), w: Math.round(b.width) }; });
    const rows = {};
    for (const l of lis) (rows[l.y] ||= []).push(l);
    return { ul: { x: Math.round(u.x), w: Math.round(u.width) }, rows: Object.values(rows) };
  });
  const lone = r.rows.filter((row) => row.length === 1 && r.rows.length > 1);
  const centred = lone.every((row) => Math.abs(row[0].x + row[0].w / 2 - (r.ul.x + r.ul.w / 2)) <= 2);
  const widths = r.rows.map((row) => row.length).join('+');
  console.log(String(w).padStart(5), 'ul', r.ul.w, 'rows', widths, 'card w', r.rows[0][0].w, lone.length ? (centred ? 'lone card centred' : 'LONE CARD OFF CENTRE') : '');
  if (lone.length && !centred) bad++;
  await page.locator('.lab .band').screenshot({ path: join(OUT, `specimens-${w}.png`) }).catch(() => {});
  await ctx.close();
}
await browser.close();
process.exit(bad ? 1 : 0);
