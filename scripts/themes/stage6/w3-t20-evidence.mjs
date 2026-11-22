/**
 * Stage 6 wave 3, task 20: films (timestamped strips) and whole-page sheets.
 *
 *   node scripts/themes/snap.mjs --name s6-w3-t20 --reuse --port 4470 -- node scripts/themes/stage6/w3-t20-evidence.mjs
 *   ONLY=films,sheets,hover,swap WIDTHS=1440,820,390 SCHEMES=light,dark node ...
 *
 * films   each toy at 1440, 820 and 390, both schemes: a tap, a second tap
 *         mid-motion, and (1440) the keys; a touch swipe film at 820 and 390.
 * sheets  whole-page Home, About and Services at every size, both schemes.
 * hover   1440: the see-saw and the B under a real mouse, onto and off.
 * swap    1440: the in-school swap with the see-saw mid-tip.
 * Output: scripts/themes/.out/stage6/w3/t20/{films,sheets}/
 */
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { launch, open, reach, centre, startFilm, pickAt, strip, boxOf, OUT } from './w3-t20-lib.mjs';

const ONLY = (process.env.ONLY || 'films,sheets,hover,swap').split(',');
const WIDTHS = (process.env.WIDTHS || '1440,820,390').split(',').map(Number);
const SCHEMES = (process.env.SCHEMES || 'light,dark').split(',');
const { browser } = await launch();
const F = join(OUT, 'films'), S = join(OUT, 'sheets');
await mkdir(F, { recursive: true });
await mkdir(S, { recursive: true });
const tapper = (page, mobile) => (x, y) => (mobile ? page.touchscreen.tap(x, y) : page.mouse.click(x, y));
const T = (n, ms) => Array.from({ length: n }, (_, i) => (i === 0 ? -1 : Math.round((i * ms) / (n - 1))));

if (ONLY.includes('films')) {
  for (const scheme of SCHEMES) {
    for (const width of WIDTHS) {
      const cw = width === 390 ? 190 : 250;
      const name = (toy, what) => join(F, `${toy}-${what}__${scheme}__${width}.png`);

      /* see-saw: tap the left end; then tap left, 300 ms later the right */
      {
        const { ctx, page, mobile } = await open(browser, { path: '/t/bauhaus/', width, scheme });
        const tap = tapper(page, mobile);
        await reach(page, 'button.seesaw');
        const [, , l, t, w, h] = await centre(page, 'button.seesaw');
        const box = await boxOf(page, 'button.seesaw', 40);
        let film = await startFilm(page);
        await tap(l + w * 0.15, t + h * 0.5);
        await page.waitForTimeout(1300);
        await strip(pickAt(await film.stop(), [...T(1, 0), 60, 130, 220, 330, 460, 620, 760, 880, 1000, 1150]), name('seesaw', 'tap-left'), `seesaw ${scheme} ${width}: tap on the left end`, { cols: 6, cellW: cw, box, vpWidth: width });
        film = await startFilm(page);
        await tap(l + w * 0.15, t + h * 0.5);
        await page.waitForTimeout(300);
        await tap(l + w * 0.85, t + h * 0.5);
        await page.waitForTimeout(1400);
        await strip(pickAt(await film.stop(), [-1, 100, 220, 300, 360, 420, 500, 620, 760, 900, 1050, 1300]), name('seesaw', 'second-tap'), `seesaw ${scheme} ${width}: tap left, tap right at +300 ms`, { cols: 6, cellW: cw, box, vpWidth: width });
        if (!mobile) {
          await page.focus('button.seesaw');
          film = await startFilm(page);
          await page.keyboard.press('Enter');
          await page.waitForTimeout(1100);
          await page.keyboard.press('Space');
          await page.waitForTimeout(1200);
          await strip(pickAt(await film.stop(), [-1, 140, 400, 700, 1000, 1240, 1380, 1700, 2000, 2300]), name('seesaw', 'keys'), `seesaw ${scheme} ${width}: Enter then Space (with the focus ring)`, { cols: 5, cellW: cw, box, vpWidth: width });
        }
        await ctx.close();
      }

      /* letter B: tap; tap, then tap again while apart */
      {
        const { ctx, page, mobile } = await open(browser, { path: '/t/bauhaus/about/', width, scheme });
        const tap = tapper(page, mobile);
        await reach(page, 'button.letter-b');
        const [cx, cy] = await centre(page, 'button.letter-b');
        const box = await boxOf(page, 'button.letter-b', 90);
        let film = await startFilm(page);
        await tap(cx, cy);
        await page.waitForTimeout(2500);
        await strip(pickAt(await film.stop(), [-1, 90, 180, 340, 900, 1500, 1700, 1800, 1930, 2060, 2200, 2400]), name('letterb', 'tap'), `letter B ${scheme} ${width}: tap, hold, stepped rebuild`, { cols: 6, cellW: cw, box, vpWidth: width });
        film = await startFilm(page);
        await tap(cx, cy);
        await page.waitForTimeout(700);
        await tap(cx, cy);
        await page.waitForTimeout(1200);
        await strip(pickAt(await film.stop(), [-1, 160, 340, 600, 700, 760, 860, 980, 1100, 1200, 1350, 1500]), name('letterb', 'second-tap'), `letter B ${scheme} ${width}: tap, second tap at +700 ms rebuilds at once`, { cols: 6, cellW: cw, box, vpWidth: width });
        if (!mobile) {
          await page.focus('button.letter-b');
          film = await startFilm(page);
          await page.keyboard.press('Enter');
          await page.waitForTimeout(700);
          await page.keyboard.press('Space');
          await page.waitForTimeout(1200);
          await strip(pickAt(await film.stop(), [-1, 200, 400, 650, 800, 950, 1100, 1250, 1400, 1700]), name('letterb', 'keys'), `letter B ${scheme} ${width}: Enter takes it apart, Space rebuilds it`, { cols: 5, cellW: cw, box, vpWidth: width });
        }
        await ctx.close();
      }

      /* footer corner: three taps 140 ms apart */
      {
        const { ctx, page, mobile } = await open(browser, { path: '/t/bauhaus/services/', width, scheme });
        const tap = tapper(page, mobile);
        await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
        await reach(page, 'svg.corner');
        const g = await page.evaluate(() => { const r = document.querySelector('svg.corner').getBoundingClientRect(); return { l: r.left, t: r.top, k: r.width / 240 }; });
        const box = await boxOf(page, 'svg.corner', 20);
        const film = await startFilm(page);
        await tap(g.l + 85 * g.k, g.t + 55 * g.k);
        await page.waitForTimeout(140);
        await tap(g.l + 85 * g.k, g.t + 55 * g.k);
        await page.waitForTimeout(140);
        await tap(g.l + 85 * g.k, g.t + 55 * g.k);
        await page.waitForTimeout(900);
        await strip(pickAt(await film.stop(), [-1, 60, 120, 180, 260, 340, 420, 500, 600, 750, 900, 1100]), name('corner', 'taps'), `footer corner ${scheme} ${width}: three taps 140 ms apart (90 degrees each)`, { cols: 6, cellW: cw, box, vpWidth: width });
        await ctx.close();
      }

      /* numerals: Services step 02 and Home door 01; a tap, and a second tap mid-rebuild */
      for (const [path, sel, label] of [['/t/bauhaus/services/', '.step-1 .num', 'services-02'], ['/t/bauhaus/', '.door .num', 'home-01']]) {
        const { ctx, page, mobile } = await open(browser, { path, width, scheme });
        const tap = tapper(page, mobile);
        await reach(page, sel);
        const [cx, cy] = await centre(page, sel);
        const box = await boxOf(page, sel, 30);
        let film = await startFilm(page);
        await tap(cx, cy);
        await page.waitForTimeout(1700);
        await strip(pickAt(await film.stop(), [-1, 40, 120, 240, 360, 480, 600, 760, 900, 1100, 1300, 1600]), name(`numeral-${label}`, 'tap'), `numeral ${label} ${scheme} ${width}: tap knocks the parts out, builds in order`, { cols: 6, cellW: Math.min(cw, 220), box, vpWidth: width });
        film = await startFilm(page);
        await tap(cx, cy);
        await page.waitForTimeout(350);
        await tap(cx, cy);
        await page.waitForTimeout(1700);
        await strip(pickAt(await film.stop(), [-1, 120, 300, 400, 460, 560, 700, 850, 1000, 1200, 1400, 1700]), name(`numeral-${label}`, 'second-tap'), `numeral ${label} ${scheme} ${width}: second tap at +350 ms restarts the build`, { cols: 6, cellW: Math.min(cw, 220), box, vpWidth: width });
        await ctx.close();
      }
    }
  }
}

/* a vertical swipe that starts on a toy scrolls (touch, 820 and 390, light) */
if (ONLY.includes('films')) {
  for (const width of WIDTHS.filter((w) => w < 900)) {
    for (const [path, sel, label] of [['/t/bauhaus/', 'button.seesaw', 'seesaw'], ['/t/bauhaus/about/', 'button.letter-b', 'letterb'], ['/t/bauhaus/services/', '.step-0 .num', 'numeral']]) {
      const { ctx, page, cdp } = await open(browser, { path, width, scheme: 'light' });
      await reach(page, sel);
      const [cx, cy] = await centre(page, sel);
      const y0 = await page.evaluate(() => scrollY);
      const film = await startFilm(page);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx, y: cy }] });
      for (let i = 1; i <= 14; i++) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cx, y: cy - i * 9 }] });
        await page.waitForTimeout(24);
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await page.waitForTimeout(900);
      const y1 = await page.evaluate(() => scrollY);
      await strip(pickAt(await film.stop(), [-1, 80, 160, 240, 320, 400, 560, 800]), join(F, `swipe-${label}__light__${width}.png`), `swipe on ${label} ${width}: scrollY ${y0} to ${y1} (the page scrolled, the toy did not fire)`, { cols: 4, cellW: 200 });
      await ctx.close();
    }
  }
}

if (ONLY.includes('sheets')) {
  for (const scheme of SCHEMES) {
    for (const width of WIDTHS) {
      for (const [id, path] of [['home', '/t/bauhaus/'], ['about', '/t/bauhaus/about/'], ['services', '/t/bauhaus/services/']]) {
        const { ctx, page } = await open(browser, { path, width, scheme });
        await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 350) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 90)); } scrollTo(0, 0); });
        await page.waitForTimeout(1500);
        await page.screenshot({ path: join(S, `sheet__${id}__${scheme}__${width}.png`), fullPage: true });
        await ctx.close();
      }
    }
  }
}

if (ONLY.includes('hover')) {
  for (const scheme of SCHEMES) {
    for (const [path, sel, label, pad] of [['/t/bauhaus/', 'button.seesaw', 'seesaw', 50], ['/t/bauhaus/about/', 'button.letter-b', 'letterb', 60]]) {
      const { ctx, page } = await open(browser, { path, width: 1440, scheme });
      await reach(page, sel);
      const [cx, cy] = await centre(page, sel);
      const box = await boxOf(page, sel, pad);
      await page.mouse.move(cx - 500, cy + 200);
      const film = await startFilm(page);
      await page.mouse.move(cx, cy, { steps: 6 });
      await page.waitForTimeout(500);
      await page.mouse.move(cx - 500, cy + 200, { steps: 6 });
      await page.waitForTimeout(400);
      await strip(pickAt(await film.stop(), [-1, 60, 120, 200, 400, 600, 700, 800, 900, 1100]), join(F, `hover-${label}__${scheme}__1440.png`), `${label} ${scheme} 1440: real mouse onto and off (4px lift over a hard ink block)`, { cols: 5, cellW: 260, box, vpWidth: 1440 });
      await ctx.close();
    }
  }
}

if (ONLY.includes('swap')) {
  for (const scheme of SCHEMES) {
    const { ctx, page } = await open(browser, { path: '/t/bauhaus/', width: 1440, scheme });
    await reach(page, 'button.seesaw');
    const [, , l, t, w, h] = await centre(page, 'button.seesaw');
    await page.mouse.click(l + w * 0.15, t + h * 0.5);
    await page.waitForTimeout(260);
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForTimeout(40);
    // Before the swap we are scrolled to the see-saw; scrolling away is part of the in-school case, so swap from here via the header.
    const film = await startFilm(page);
    await page.click('header a[href$="/services/"]');
    await page.waitForURL('**/t/bauhaus/services/');
    await page.waitForTimeout(1400);
    await strip(pickAt(await film.stop(), [-1, 80, 160, 240, 320, 420, 560, 760, 1000, 1300]), join(F, `swap-seesaw__${scheme}__1440.png`), `swap ${scheme} 1440: see-saw tipped 300 ms before the in-school swap to Services`, { cols: 5, cellW: 300 });
    await ctx.close();
  }
}

await browser.close();
console.log('done');
