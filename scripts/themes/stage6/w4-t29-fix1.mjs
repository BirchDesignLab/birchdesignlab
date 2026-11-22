/**
 * Stage 6 wave 4, task 29, fix round 1: the two swiss findings, measured.
 *
 *   C1  Contact's pressed red address at 1024 and 1440, both schemes: the pixel
 *       column across the field's left side (the edge is the field's rest red,
 *       or black on a dark sheet; the page beside it is the form), and a crop.
 *   C2  About's Birch spine hovered at 1280 and 1440, both schemes: the section's
 *       rule row from the frame's left edge across the spine is unbroken (every
 *       pixel is the rule's ink, none is paper), and the block's top, read down
 *       the middle of the word, has no paper strip above it. Crops saved.
 *
 *   node scripts/themes/snap.mjs --name s6-w4-t29 --port 4470 -- node scripts/themes/stage6/w4-t29-fix1.mjs
 * Output: .out/stage6/w4/t29/fix1/ (gitignored scratch). Exit 1 on any FAIL.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { launch, open, OUT, pixelReader, hex } from './w4-t29-lib.mjs';

const D = join(OUT, 'fix1');
await mkdir(D, { recursive: true });
const { browser, renderer } = await launch();
const R = { renderer, c1: {}, c2: {} };
const fails = [];
const check = (name, ok, detail) => {
  if (!ok) fails.push(`${name} ${JSON.stringify(detail)}`);
  console.log(ok ? 'ok  ' : 'FAIL', name, detail === undefined ? '' : JSON.stringify(detail));
};
const rgbOf = (c) => c.match(/[0-9a-f]{2}/g).map((h) => parseInt(h, 16));
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/* ---------------------------------------------------------------------- C1 */
for (const width of [1024, 1440]) {
  for (const scheme of ['light', 'dark']) {
    const key = `contact-direct-${width}-${scheme}`;
    const { ctx, page } = await open(browser, { path: '/t/swiss/contact/', width, scheme, height: 900 });
    await page.evaluate(() => document.querySelector('aside.direct').scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(500);
    const rect = await page.evaluate(() => { const r = document.querySelector('aside.direct').getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom]; });
    await page.mouse.move(rect[0] + 3, rect[1] + 4);
    await page.mouse.down();
    await page.waitForTimeout(150);
    const edgeCol = await page.evaluate(() => getComputedStyle(document.querySelector('aside.direct')).getPropertyValue('--flip-edge').trim());
    const edgeRgb = await page.evaluate((c) => { const d = document.createElement('i'); d.style.color = c; document.body.append(d); const v = getComputedStyle(d).color.match(/\d+/g).slice(0, 3).map(Number); d.remove(); return v; }, edgeCol);
    const png = await page.screenshot();
    await writeFile(join(D, `${key}.png`), png);
    const img = await pixelReader(png);
    const y = Math.round((rect[1] + rect[3]) / 2);
    const x0 = Math.round(rect[0]);
    const cols = [];
    for (let dx = -3; dx <= 3; dx++) cols.push([dx, hex(img.at(x0 + dx, y))]);
    const fill = rgbOf(cols[cols.length - 1][1]);
    const beside = rgbOf(cols[0][1]);
    // The box edge falls on a fractional pixel at 1440, so the 1px line can be anti-aliased: a column counts as the edge when it is nearer the edge colour than both the page beside it and the fill.
    const hit = cols.find(([, c]) => { const v = rgbOf(c); return dist(v, edgeRgb) < dist(v, fill) && dist(v, edgeRgb) < dist(v, beside); });
    R.c1[key] = { rect, edge: edgeCol, cols: cols.map((q) => q[1]).join(' '), edgeCol: hit ? hit[0] : null };
    const wide = width >= 1024;
    check(`${key}: the left side has a 1px edge in the rest colour, distinct from the page beside it`, wide && !!hit && hit[0] >= -1 && hit[0] <= 1, R.c1[key]);
    await page.mouse.up();
    await ctx.close();
  }
}

/* ---------------------------------------------------------------------- C2 */
for (const width of [1280, 1440]) {
  for (const scheme of ['light', 'dark']) {
    const key = `birch-${width}-${scheme}`;
    const { ctx, page } = await open(browser, { path: '/t/swiss/about/', width, scheme, height: 900 });
    const sec = await page.evaluate(() => { const s = document.querySelector('section.founder').getBoundingClientRect(); return { top: s.top + scrollY, h: s.height }; });
    await page.evaluate((y) => scrollTo(0, y), Math.round(sec.top - 200));
    await page.waitForTimeout(500);
    const geo = await page.evaluate(() => {
      const b = document.querySelector('.sw-birch').getBoundingClientRect();
      const s = document.querySelector('section.founder').getBoundingClientRect();
      const cs = getComputedStyle(document.querySelector('.sw-birch'));
      return { box: [b.left, b.top, b.right, b.bottom], sec: [s.left, s.top, s.right, s.bottom], ty: cs.getPropertyValue('--sw-ty'), fs: cs.fontSize, mark: cs.color, live: document.querySelector('.sw-birch').hasAttribute('data-live') };
    });
    const shot = async (name) => { const png = await page.screenshot(); await writeFile(join(D, `${key}-${name}.png`), png); return pixelReader(png); };
    const rest = await shot('rest');
    await page.mouse.move((geo.box[0] + geo.box[2]) / 2, (geo.box[1] + geo.box[3]) / 2);
    await page.waitForTimeout(150);
    const hov = await shot('hover');
    const ruleY = Math.round(geo.sec[1]);
    // The rule row (and the row either side, which may be the rule's other pixel row): the rule's ink read at x = 300 (clear of the spine).
    const rowsAt = (img, x) => { const o = []; for (let dy = -2; dy <= 3; dy++) o.push([dy, hex(img.at(x, ruleY + dy))]); return o; };
    const ruleRef = rowsAt(rest, 300);
    const ruleDy = ruleRef.find(([, c]) => dist(rgbOf(c), rgbOf(ruleRef[0][1])) > 60)?.[0];
    const ink = rgbOf(ruleRef.find(([dy]) => dy === ruleDy)[1]);
    // Across the spine's columns on that row, hovered: any pixel that is not the rule's ink is a break.
    const xs = []; for (let x = Math.round(geo.sec[0]); x <= Math.round(geo.box[2]) + 12; x++) xs.push(x);
    const broken = xs.filter((x) => dist(rgbOf(hex(hov.at(x, ruleY + ruleDy))), ink) > 40);
    const brokenRest = xs.filter((x) => dist(rgbOf(hex(rest.at(x, ruleY + ruleDy))), ink) > 40);
    // The block's top: down the word's middle column, the rows from the rule to 30px below; hovered, no row is the page's paper before the block starts.
    const mx = Math.round((geo.box[0] + geo.box[2]) / 2);
    const col = []; for (let dy = ruleDy; dy <= ruleDy + 30; dy++) col.push(hex(hov.at(mx, ruleY + dy)));
    // Paper strips above the block. The scan starts BELOW the rule: the rule's own rows are always ink, so a scan
    // that starts on them can never fail (the first version did; Stage 6 ledger, task 29 minor N1). The rule's last
    // row is read at rest at x = 300, clear of the spine.
    let ruleEnd = ruleDy;
    while (ruleEnd < ruleDy + 6 && dist(rgbOf(hex(rest.at(300, ruleY + ruleEnd + 1))), ink) < 40) ruleEnd++;
    // The hover inverts what the block covers (ink ground, the word in the field's colour), so every covered pixel
    // changes between rest and hover, and a strip of page the block missed does not. Per row across the box's x
    // range: the share of pixels that changed. (Counting ink would not do: the word's inverted letters are paper.)
    const changed = (dy) => {
      let n = 0, t = 0;
      for (let x = Math.round(geo.box[0]) + 2; x <= Math.round(geo.box[2]) - 2; x++) {
        t++;
        if (dist(rgbOf(hex(hov.at(x, ruleY + dy))), rgbOf(hex(rest.at(x, ruleY + dy)))) > 60) n++;
      }
      return +(n / t).toFixed(3);
    };
    const covered = (rows) => rows.every((c) => c > 0.9);
    const STRIP = 3;
    const under = []; for (let dy = ruleEnd + 1; dy <= ruleEnd + STRIP; dy++) under.push(changed(dy));
    // The negative control: the page just above the rule, where the block must not reach, so the same test must fail.
    const above = []; for (let dy = ruleDy - STRIP; dy <= ruleDy - 1; dy++) above.push(changed(dy));
    R.c2[key] = { geo, ruleY, ruleDy, ruleEnd, ink: hex(ink), broken: broken.length, brokenRest: brokenRest.length, under, above, col: col.join(' ') };
    check(`${key}: the section rule is unbroken across the spine while hovered (${brokenRest.length} at rest)`, geo.live && broken.length === 0, { ruleY, ruleDy, broken: broken.slice(0, 8), brokenRest: brokenRest.slice(0, 8) });
    check(`${key}: the ink block starts on the rule, no paper strip above it`, covered(under), { ruleDy, ruleEnd, under });
    check(`${key}: the strip test fails on the page above the rule (negative control)`, !covered(above), { above });
    await ctx.close();
  }
}

await writeFile(join(D, 'fix1.json'), JSON.stringify(R, null, 1));
await browser.close();
if (fails.length) {
  console.log(`\n${fails.length} FAIL`);
  process.exit(1);
}
console.log('\nall ok');
