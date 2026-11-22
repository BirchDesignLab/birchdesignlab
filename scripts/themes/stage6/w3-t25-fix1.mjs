/**
 * Stage 6 wave 3, task 25, fix round 1: the Sent icon row at every width.
 * Checks (1) all four icons sit in the layer, visible, with the icon itself
 * under the centre of its box (elementFromPoint), (2) no icon box overlaps the
 * message window, (3) an icon dragged along the row lands on a grid cell, and
 * (4) opened windows clear the icon row (phone) or the message window (tablet).
 * Stills go to scripts/themes/.out/stage6/w3/t25/fix1/, numbers to fix1.json.
 *   node scripts/themes/snap.mjs --name t25 --port 4470 -- node scripts/themes/stage6/w3-t25-fix1.mjs
 *   WIDTHS=360,390 SCHEMES=light ...
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { OUT, launch, open } from './w3-t25-lib.mjs';

const WIDTHS = (process.env.WIDTHS || '320,360,375,390,430,600,700,701,720,740,768,790,800,801,820,1024,1440').split(',').map(Number);
const SCHEMES = (process.env.SCHEMES || 'light,dark').split(',');
const D = join(OUT, 'fix1');
await mkdir(D, { recursive: true });
const { browser, renderer } = await launch();
const results = { renderer, cases: [] };

const rectOf = (r) => ({ l: +r.left.toFixed(1), t: +r.top.toFixed(1), r: +r.right.toFixed(1), b: +r.bottom.toFixed(1) });
const overlap = (a, b) => Math.max(0, Math.min(a.r, b.r) - Math.max(a.l, b.l)) * Math.max(0, Math.min(a.b, b.b) - Math.max(a.t, b.t));

for (const scheme of SCHEMES) {
  for (const width of WIDTHS) {
    const { ctx, page, errors } = await open(browser, { path: '/t/vaporwave/contact/sent/', width, scheme, settle: 600 });
    const tag = `${width}-${scheme}`;
    const rest = await page.evaluate(() => {
      const abs = (el) => { const r = el.getBoundingClientRect(); return { l: r.left + scrollX, t: r.top + scrollY, r: r.right + scrollX, b: r.bottom + scrollY }; };
      const dlg = abs(document.querySelector('.dialog'));
      const layer = abs(document.querySelector('[data-desk-icons]'));
      const icons = Array.from(document.querySelectorAll('[data-desk-icon]')).map((el) => {
        const r = el.getBoundingClientRect();
        const label = el.querySelector('.icon-label').getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const hit = document.elementFromPoint(cx, cy);
        const lhit = document.elementFromPoint(label.left + label.width / 2, label.top + label.height / 2);
        return { key: el.dataset.deskIcon, box: abs(el), hitIsIcon: !!hit && el.contains(hit), labelHitIsIcon: !!lhit && el.contains(lhit) };
      });
      return { dlg, layer, icons, overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
    const rows = new Set(rest.icons.map((i) => Math.round(i.box.t)));
    const inLayer = rest.icons.every((i) => i.box.l >= rest.layer.l - 0.6 && i.box.r <= rest.layer.r + 0.6 && i.box.t >= rest.layer.t - 0.6 && i.box.b <= rest.layer.b + 0.6);
    const overDlg = rest.icons.map((i) => Math.round(overlap(i.box, rest.dlg)));
    const c = { tag, rows: rows.size, inLayer, hit: rest.icons.map((i) => i.hitIsIcon && i.labelHitIsIcon), overDialogPx2: overDlg, overflowX: rest.overflowX, errors };
    await page.screenshot({ path: join(D, `rest-${tag}.png`), fullPage: true });

    // Drag the last icon to the first cell and the first to the last, then read the cells.
    const drag = await page.evaluate(async () => ({ w: document.querySelector('[data-desk-icon]').getBoundingClientRect().width }));
    if (width <= 800) {
      const a = await page.locator('[data-desk-icon="readme"]').boundingBox();
      const b = await page.locator('[data-desk-icon="computer"]').boundingBox();
      await page.mouse.move(a.x + a.width / 2, a.y + 20);
      await page.mouse.down();
      await page.mouse.move(b.x + b.width / 2 + 4, b.y + 22, { steps: 8 });
      await page.mouse.up();
      await page.waitForTimeout(300);
      const after = await page.evaluate(() => Array.from(document.querySelectorAll('[data-desk-icon]')).map((el) => ({ key: el.dataset.deskIcon, l: +el.getBoundingClientRect().left.toFixed(1), t: +el.getBoundingClientRect().top.toFixed(1) })));
      c.dragAfter = after;
      c.cellW = drag.w;
    }

    // Open all three windows by double-click and measure against the dialog and the icon row.
    for (const key of ['computer', 'bin', 'readme']) {
      await page.dblclick(`[data-desk-icon="${key}"]`);
      await page.waitForTimeout(150);
    }
    const wins = await page.evaluate(() => {
      const abs = (el) => { const r = el.getBoundingClientRect(); return { l: r.left + scrollX, t: r.top + scrollY, r: r.right + scrollX, b: r.bottom + scrollY }; };
      const layer = abs(document.querySelector('[data-desk-icons]'));
      const dlg = abs(document.querySelector('.dialog'));
      const iconsBox = Array.from(document.querySelectorAll('[data-desk-icon]')).map(abs);
      return Array.from(document.querySelectorAll('[data-desk-win]')).map((w) => {
        const r = abs(w);
        return { key: w.dataset.deskWin, box: r, belowLayer: r.t >= layer.b - 0.6, overIcons: iconsBox.reduce((s, i) => s + Math.max(0, Math.min(r.r, i.r) - Math.max(r.l, i.l)) * Math.max(0, Math.min(r.b, i.b) - Math.max(r.t, i.t)), 0), overDialog: Math.max(0, Math.min(r.r, dlg.r) - Math.max(r.l, dlg.l)) * Math.max(0, Math.min(r.b, dlg.b) - Math.max(r.t, dlg.t)) };
      });
    });
    c.wins = wins.map((w) => ({ key: w.key, t: +w.box.t.toFixed(1), l: +w.box.l.toFixed(1), belowLayer: w.belowLayer, overIconsPx2: Math.round(w.overIcons), overDialogPx2: Math.round(w.overDialog) }));
    await page.screenshot({ path: join(D, `open-${tag}.png`), fullPage: true });
    results.cases.push(c);
    console.log(JSON.stringify(c));
    await ctx.close();
  }
}
await browser.close();
await writeFile(join(D, 'fix1.json'), JSON.stringify(results, null, 1));
