/**
 * Stage 6 wave 3, task 19 (vaporwave C2): one press never leaves two active
 * captions. At 1440 with a mouse, press every window's caption on Contact,
 * Services, About and Home, one after another, and after each press count the
 * windows whose caption is active (no .inactive). A window outside a cascade
 * (.door-grid, .apps) must keep its inactive caption; a window inside one
 * wakes and hands its sibling's caption back to inactive.
 *
 *   node scripts/themes/stage6/w3-t19-c2.mjs
 */
import { launch, open } from './w3-t19-lib.mjs';

const browser = await launch();
let bad = 0;
for (const path of ['/t/vaporwave/contact/', '/t/vaporwave/services/', '/t/vaporwave/about/', '/t/vaporwave/']) {
  const { ctx, page } = await open(browser, { path, width: 1440, scheme: 'dark', touch: false, settle: 300 });
  const state = () => page.evaluate(() => [...document.querySelectorAll('.vw-win')].map((w) => {
    const bar = w.querySelector('.vw-win-bar');
    return `${bar.querySelector('.vw-win-title, span')?.textContent?.trim().slice(0, 22) ?? '?'}${bar.classList.contains('inactive') ? '(i)' : '(A)'}`;
  }));
  const before = await state();
  const count = await page.locator('.vw-win').count();
  const trace = [];
  for (let i = 0; i < count; i++) {
    const bar = page.locator('.vw-win').nth(i).locator('.vw-win-bar').first();
    await bar.scrollIntoViewIfNeeded();
    const box = await bar.boundingBox();
    // Press near the bar's left (the title), clear of the caption buttons at the right.
    await page.mouse.move(box.x + 40, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.up();
    const after = await page.evaluate(() => [...document.querySelectorAll('.vw-win-bar')].filter((b) => !b.classList.contains('inactive')).length);
    trace.push(after);
  }
  const grouped = await page.evaluate(() => [...document.querySelectorAll('.door-grid, .apps')].map((g) => ({ cls: g.className.split(' ')[0], active: [...g.querySelectorAll('.vw-win-bar')].filter((b) => !b.classList.contains('inactive')).length })));
  console.log(path, 'before', before.join(' '), '| active count after each press', trace.join(','), '| cascade groups', JSON.stringify(grouped));
  for (const g of grouped) if (g.active !== 1) { bad++; console.log('  PROBLEM: cascade group with', g.active, 'active captions'); }
  await ctx.close();
}
await browser.close();
process.exit(bad ? 1 : 0);
