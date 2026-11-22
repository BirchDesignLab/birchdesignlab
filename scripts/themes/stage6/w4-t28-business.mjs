/**
 * Stage 6 wave 4, task 28 (critique A3): the business Lab's hovers, before
 * and after. Run once against each build (LABEL names the folder):
 *
 *   LABEL=before node scripts/themes/snap.mjs --name stage6-w3 --reuse --port 4470 -- node scripts/themes/stage6/w4-t28-business.mjs
 *   LABEL=after  node scripts/themes/snap.mjs --name s6-w4-t28  --reuse --port 4470 -- node scripts/themes/stage6/w4-t28-business.mjs
 *   COMPARE=before,after node scripts/themes/stage6/w4-t28-business.mjs
 *
 * Per page (/lab/, /lab/experiments/, /lab/studies/, /lab/bdl-002/ as the
 * experiment, /lab/bdl-008/ as the study, plus bdl-012, bdl-006, bdl-001 and
 * /styleguide/ for the experiments' own rules), both schemes:
 *   static   whole-page screenshot at 1440 and 390 (switcher hidden);
 *   mouse    1440: the mouse parked over each hover target; computed rest
 *            and hovered values are recorded, plus a clip of the target;
 *   tap      390 on touch: a tap on each target (the click's default is
 *            prevented so a link does not navigate); the computed values
 *            after the tap are compared with rest: a stuck hover shows.
 * COMPARE diffs the static pairs (share of differing pixels) and the mouse
 * values (must be identical: no visual change on a mouse).
 * Output: .out/stage6/w4/t28/business/<LABEL>/
 */
import { mkdir, writeFile, readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { launch, open, OUT } from './w4-t28-lib.mjs';

const PAGES = [
  ['lab', '/lab/', ['.card', 'h2 a, h3 a', '.filter a:not([aria-current="true"])', '.catalog summary, summary']],
  ['experiments', '/lab/experiments/', ['.kicker a', '.card', 'h2 a, h3 a']],
  ['studies', '/lab/studies/', ['.kicker a', '.card', 'h2 a, h3 a']],
  ['bdl-002', '/lab/bdl-002/', ['.hatch', '.ghost', '.opts button:not([aria-pressed="true"])', 'summary']],
  ['bdl-008', '/lab/bdl-008/', ['.hatch', 'summary']],
  ['bdl-012', '/lab/bdl-012/', ['.tour button', '.mode button:not([aria-pressed="true"])', '.dr-lines button', '.m-row', '.close .next a', '.close .next a.primary']],
  ['bdl-006', '/lab/bdl-006/', ['.engraved']],
  ['bdl-001', '/lab/bdl-001/', ['button']],
  ['bdl-003', '/lab/bdl-003/', ['.fragment', '.back']],
  ['styleguide', '/styleguide/', ['#copy-tokens', '.opts button:not([aria-pressed="true"])']],
];
const PROPS = ['color', 'backgroundColor', 'borderTopColor', 'textDecorationLine', 'textDecorationColor', 'transform', 'opacity', 'boxShadow'];
const SCHEMES = (process.env.SCHEMES || 'light,dark').split(',');
const ONLY = (process.env.ONLY || 'static,mouse,tap').split(',');

async function sideBySide(pa, pb, out, cwMax = 520) {
  const [ma, mb] = await Promise.all([sharp(pa).metadata(), sharp(pb).metadata()]);
  const cw = Math.min(ma.width, cwMax);
  const ha = Math.round((ma.height / ma.width) * cw), hb = Math.round((mb.height / mb.width) * cw);
  const [ta, tb] = await Promise.all([sharp(pa).resize(cw, ha).toBuffer(), sharp(pb).resize(cw, hb).toBuffer()]);
  await sharp({ create: { width: cw * 2 + 36, height: Math.max(ha, hb) + 24, channels: 3, background: '#1b1b1d' } })
    .composite([{ input: ta, left: 12, top: 12 }, { input: tb, left: cw + 24, top: 12 }]).png().toFile(out);
}
async function pixelDiff(pa, pb) {
  const [a, b] = await Promise.all([sharp(pa).raw().toBuffer({ resolveWithObject: true }), sharp(pb).raw().toBuffer({ resolveWithObject: true })]);
  if (a.info.width !== b.info.width || a.info.height !== b.info.height) return { size: `${a.info.width}x${a.info.height} vs ${b.info.width}x${b.info.height}` };
  let n = 0;
  const ch = a.info.channels;
  for (let i = 0; i < a.data.length; i += ch) {
    if (Math.abs(a.data[i] - b.data[i]) > 8 || Math.abs(a.data[i + 1] - b.data[i + 1]) > 8 || Math.abs(a.data[i + 2] - b.data[i + 2]) > 8) n++;
  }
  return { share: +(n / (a.data.length / ch)).toFixed(6) };
}

const ROOT = join(OUT, 'business');
if (process.env.COMPARE) {
  const [A, B] = process.env.COMPARE.split(',');
  const out = join(ROOT, `${A}-vs-${B}`);
  await mkdir(out, { recursive: true });
  const report = { static: {}, mouse: {}, tap: {} };
  const dA = join(ROOT, A), dB = join(ROOT, B);
  for (const f of (await readdir(dA)).filter((x) => x.startsWith('static__') && x.endsWith('.png'))) {
    if (!existsSync(join(dB, f))) continue;
    report.static[f] = await pixelDiff(join(dA, f), join(dB, f));
    if (report.static[f].share !== 0) await sideBySide(join(dA, f), join(dB, f), join(out, f));
  }
  const [ja, jb] = await Promise.all([readFile(join(dA, 'hover.json'), 'utf8'), readFile(join(dB, 'hover.json'), 'utf8')]).then((r) => r.map((x) => JSON.parse(x)));
  for (const k of Object.keys(ja.mouse)) report.mouse[k] = { same: JSON.stringify(ja.mouse[k]) === JSON.stringify(jb.mouse[k]), hovered: Object.keys(ja.mouse[k].hover || {}).length };
  for (const k of Object.keys(ja.tap)) report.tap[k] = { before: ja.tap[k].stuck, after: jb.tap[k]?.stuck };
  const bad = [
    ...Object.entries(report.static).filter(([, v]) => v.share !== 0).map(([k, v]) => `static ${k} ${JSON.stringify(v)}`),
    ...Object.entries(report.mouse).filter(([, v]) => !v.same).map(([k]) => `mouse differs ${k}`),
    ...Object.entries(report.tap).filter(([, v]) => v.after && v.after.length).map(([k, v]) => `tap stuck after ${k} ${JSON.stringify(v.after)}`),
  ];
  report.problems = bad;
  await writeFile(join(out, 'compare.json'), JSON.stringify(report, null, 1));
  console.log(JSON.stringify(report, null, 1));
  process.exit(0);
}

const LABEL = process.env.LABEL || 'head';
const D = join(ROOT, LABEL);
await mkdir(D, { recursive: true });
const { browser } = await launch();
const R = { label: LABEL, mouse: {}, tap: {} };

const read = (page, sel, nth = 0) => page.evaluate(({ sel, nth, PROPS }) => {
  const els = [...document.querySelectorAll(sel)].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 4 && r.height > 4; });
  const el = els[nth];
  if (!el) return null;
  const cs = getComputedStyle(el);
  const o = {};
  for (const p of PROPS) o[p] = cs[p];
  // children that carry the hover (a row's strip, a fragment's shape)
  const kid = el.querySelector('.strip img, .frag-shape');
  if (kid) { const k = getComputedStyle(kid); o.kidTransform = k.transform; o.kidBorder = k.borderTopColor; }
  return o;
}, { sel, nth, PROPS });
const centreOf = async (page, sel) => {
  const found = await page.evaluate((sel) => {
    const el = [...document.querySelectorAll(sel)].find((e) => { const r = e.getBoundingClientRect(); return r.width > 4 && r.height > 4; });
    if (!el) return false;
    el.scrollIntoView({ block: 'center', behavior: 'instant' });
    return true;
  }, sel);
  if (!found) return null;
  await page.waitForTimeout(500);
  return page.evaluate((sel) => {
    const el = [...document.querySelectorAll(sel)].find((e) => { const r = e.getBoundingClientRect(); return r.width > 4 && r.height > 4; });
    const r = el.getBoundingClientRect();
    return [r.left + Math.min(r.width / 2, 40), r.top + r.height / 2, r.left, r.top, r.width, r.height];
  }, sel);
};

for (const scheme of SCHEMES) {
  /* static: whole page at 1440 and 390 */
  if (ONLY.includes('static')) {
    for (const width of [1440, 390]) {
      for (const [name, path] of PAGES.slice(0, 5)) {
        const { ctx, page } = await open(browser, { path, width, scheme });
        // Scroll the page through once so reveal-on-scroll content settles, then back.
        await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } scrollTo(0, 0); });
        await page.waitForTimeout(600);
        await page.mouse.move(0, 0);
        await page.screenshot({ path: join(D, `static__${name}__${scheme}__${width}.png`), fullPage: true });
        await ctx.close();
      }
    }
  }
  /* mouse: forced hover at 1440 */
  if (ONLY.includes('mouse')) {
    for (const [name, path, sels] of PAGES) {
      const { ctx, page } = await open(browser, { path, width: 1440, scheme });
      for (const sel of sels) {
        const c = await centreOf(page, sel);
        const key = `${name}__${scheme}__${sel}`;
        if (!c) { R.mouse[key] = { missing: true }; continue; }
        await page.mouse.move(0, 0);
        await page.waitForTimeout(450);
        const rest = await read(page, sel);
        await page.mouse.move(c[0], c[1]);
        await page.waitForTimeout(450);
        const hover = await read(page, sel);
        const changed = {};
        for (const k of Object.keys(rest)) if (rest[k] !== hover[k]) changed[k] = [rest[k], hover[k]];
        R.mouse[key] = { rest, hover: changed };
        const safe = sel.replace(/[^a-z0-9]+/gi, '_').slice(0, 30);
        const vp = page.viewportSize();
        const x = Math.max(0, c[2] - 20), y = Math.max(0, c[3] - 20);
        const w = Math.min(vp.width - x, c[4] + 40), h = Math.min(vp.height - y, c[5] + 40);
        if (w > 0 && h > 0) await page.screenshot({ path: join(D, `mouse__${name}__${scheme}__${safe}.png`), clip: { x, y, width: w, height: h } });
      }
      await ctx.close();
    }
  }
  /* tap: 390 on touch */
  if (ONLY.includes('tap')) {
    for (const [name, path, sels] of PAGES) {
      const { ctx, page } = await open(browser, { path, width: 390, scheme });
      await page.evaluate(() => document.addEventListener('click', (e) => { if (e.target.closest('a')) e.preventDefault(); }, true));
      for (const sel of sels) {
        const c = await centreOf(page, sel);
        const key = `${name}__${scheme}__${sel}`;
        if (!c) { R.tap[key] = { missing: true }; continue; }
        await page.waitForTimeout(300);
        const rest = await read(page, sel);
        await page.touchscreen.tap(c[0], c[1]);
        await page.waitForTimeout(600);
        const after = await read(page, sel);
        // Aria-pressed or open state can legitimately change a button; compare against the rest values of a state the tap does not change.
        const stuck = [];
        for (const k of Object.keys(rest)) if (rest[k] !== (after || {})[k]) stuck.push(`${k}: ${rest[k]} -> ${after?.[k]}`);
        R.tap[key] = { rest, stuck };
      }
      await ctx.close();
    }
  }
}
await writeFile(join(D, 'hover.json'), JSON.stringify(R, null, 1));
const stuckTotal = Object.values(R.tap).reduce((n, v) => n + (v.stuck?.length || 0), 0);
console.log(`${LABEL}: ${Object.keys(R.mouse).length} mouse targets, ${Object.keys(R.tap).length} tap targets, ${stuckTotal} stuck properties`);
for (const [k, v] of Object.entries(R.tap)) if (v.stuck?.length) console.log('  stuck', k, v.stuck.join(' | '));
await browser.close();
