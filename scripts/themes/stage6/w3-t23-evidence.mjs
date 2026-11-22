/**
 * Stage 6 wave 3, task 23: evidence (sheets and timestamped film strips) for cottagecore's dandelion clock and
 * date stamp. Output: scripts/themes/.out/stage6/w3/t23/.
 *
 *   node scripts/themes/snap.mjs --name s6-w3-t23 --reuse --port 4470 -- node scripts/themes/stage6/w3-t23-evidence.mjs
 *   ONLY=sheets,clock,stamp,swipe,swap SIZES=1440,820,390 SCHEMES=light node ...
 *
 * sheets  Home, Contact and Sent whole-page at 1440, 1280, 1024, 820, 390 in both schemes.
 * clock   the clock tapped at 1440, 820 and 390: a timestamped strip of the clock and the cloth round it (seeds
 *         released, the bald patch, the refill to about 20 s) in light; in dark a firefly rising. Home and Sent.
 * stamp   the stamp pressed six times on Contact and once on Sent, at 1440 and 390, both schemes: a strip of the
 *         postcard (or envelope), plus the form typed into between presses.
 * swipe   a vertical swipe that starts on either toy scrolls on touch and fires nothing.
 * swap    in-school swap at 1440 mid-drift (the seeds are torn down and not doubled on return).
 */
import { join } from 'node:path';
import { launch, open, reach, centre, startFilm, pickAt, strip, boxOf, OUT } from './w3-t23-lib.mjs';

const ONLY = (process.env.ONLY || 'sheets,clock,stamp,swipe,swap').split(',');
const SCHEMES = (process.env.SCHEMES || 'light,dark').split(',');
const SIZES = (process.env.SIZES || '1440,1280,1024,820,390').split(',').map(Number);
const { browser } = await launch();
const HOME = '/t/cottagecore/';
const CONTACT = '/t/cottagecore/contact/';
const SENT = '/t/cottagecore/contact/sent/';

async function tap(page, mobile, x, y) { if (mobile) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); }

if (ONLY.includes('sheets')) {
  for (const scheme of SCHEMES) for (const width of SIZES) {
    for (const [name, path] of [['home', HOME], ['contact', CONTACT], ['sent', SENT]]) {
      const { ctx, page } = await open(browser, { path, width, scheme });
      await page.screenshot({ path: join(OUT, `sheet-${name}-${scheme}-${width}.png`), fullPage: true });
      await ctx.close();
    }
  }
}

if (ONLY.includes('clock')) {
  for (const scheme of SCHEMES) for (const width of [1440, 820, 390]) {
    for (const [name, path] of [['home', HOME], ['sent', SENT]]) {
      const { ctx, page, mobile } = await open(browser, { path, width, scheme, settle: 1500 });
      await reach(page, '[data-cc-toy="dandelion"]');
      const [x, y, , , w] = await centre(page, '[data-cc-toy="dandelion"] .dc-head');
      const box = await boxOf(page, '[data-cc-toy="dandelion"]', 150);
      const film = await startFilm(page);
      await tap(page, mobile, x, y);
      await page.waitForTimeout(scheme === 'light' ? 21000 : 4000);
      const frames = await film.stop();
      const times = scheme === 'light' ? [0, 150, 400, 900, 2000, 4000, 8000, 12000, 16000, 20000] : [0, 300, 800, 1400, 2200, 3200];
      await strip(pickAt(frames, times), join(OUT, `clock-${name}-${scheme}-${width}.png`), `clock ${name} ${scheme} ${width}`, { cols: 5, cellW: 320, box, vpWidth: width });
      await ctx.close();
    }
  }
}

if (ONLY.includes('stamp')) {
  for (const scheme of SCHEMES) for (const width of [1440, 390]) {
    for (const [name, path, presses] of [['contact', CONTACT, 6], ['sent', SENT, 1]]) {
      const { ctx, page, mobile } = await open(browser, { path, width, scheme, settle: 1200 });
      await reach(page, '[data-cc-toy="stamp"]');
      const [x, y] = await centre(page, '[data-cc-toy="stamp"]');
      // the postcard (or envelope) and the stamp that cancels it, in one frame
      const box = await page.evaluate((card) => {
        const a = document.querySelector(card).getBoundingClientRect(), b = document.querySelector('[data-cc-toy="stamp"]').getBoundingClientRect();
        const l = Math.max(0, Math.min(a.left, b.left) - 40), tp = Math.max(0, Math.min(a.top, b.top) - 40), r = Math.min(innerWidth, Math.max(a.right, b.right) + 40), bt = Math.min(innerHeight, Math.max(a.bottom, b.bottom) + 40);
        return { x: l, y: tp, w: r - l, h: bt - tp };
      }, name === 'contact' ? '.postcard' : '.envelope');
      const film = await startFilm(page);
      const shots = [];
      for (let i = 0; i < presses; i++) { await tap(page, mobile, x, y); await page.waitForTimeout(700); }
      const frames = await film.stop();
      const times = presses === 1 ? [0, 60, 120, 200, 320, 700] : [0, 700, 1400, 2100, 2800, 3500, 4200, 4900];
      await strip(pickAt(frames, times), join(OUT, `stamp-${name}-${scheme}-${width}.png`), `stamp ${name} ${scheme} ${width}`, { cols: 4, cellW: 360, box, vpWidth: width });
      await page.screenshot({ path: join(OUT, `stamp-${name}-${scheme}-${width}-after.png`), fullPage: true });
      await ctx.close();
    }
  }
}

if (ONLY.includes('swipe')) {
  // A vertical swipe that starts on a toy scrolls the page and fires nothing: a film of the viewport at 390.
  for (const [name, path, sel] of [['clock-home', HOME, '[data-cc-toy="dandelion"]'], ['stamp-contact', CONTACT, '[data-cc-toy="stamp"]'], ['clock-sent', SENT, '[data-cc-toy="dandelion"]'], ['stamp-sent', SENT, '[data-cc-toy="stamp"]']]) {
    const { ctx, page } = await open(browser, { path, width: 390, scheme: 'light', settle: 1200 });
    const cdp = await ctx.newCDPSession(page);
    await page.evaluate((sel) => { const r = document.querySelector(sel).getBoundingClientRect(); window.scrollBy(0, r.top - 560); }, sel);
    await page.waitForTimeout(500);
    const [x, y] = await centre(page, sel);
    const film = await startFilm(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let i = 1; i <= 14; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - i * 14 }] }); await page.waitForTimeout(16); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(1200);
    const frames = await film.stop();
    await strip(pickAt(frames, [0, 120, 240, 380, 520, 760, 1100, 1500]), join(OUT, `swipe-${name}.png`), `swipe from the ${name} toy at 390: the page scrolls, nothing fires`, { cols: 4, cellW: 260 });
    await ctx.close();
  }
}

if (ONLY.includes('swap')) {
  // In-school swap at 1440 mid-drift: tap the clock, go to Contact through the header, come back, tap again.
  for (const scheme of SCHEMES) {
    const { ctx, page } = await open(browser, { path: HOME, width: 1440, scheme, settle: 1500 });
    await reach(page, '[data-cc-toy="dandelion"]');
    const [x, y] = await centre(page, '[data-cc-toy="dandelion"] .dc-head');
    const film = await startFilm(page);
    await page.mouse.click(x, y);
    await page.waitForTimeout(900);
    await page.click('nav a[href*="contact"]');
    await page.waitForURL('**/contact/**');
    await page.waitForTimeout(2200);
    await page.click('header a[href="/t/cottagecore/"]');
    await page.waitForURL((u) => u.pathname === '/t/cottagecore/');
    await page.waitForTimeout(2600);
    await reach(page, '[data-cc-toy="dandelion"]');
    const [x2, y2] = await centre(page, '[data-cc-toy="dandelion"] .dc-head');
    await page.mouse.click(x2, y2);
    await page.waitForTimeout(1500);
    const frames = await film.stop();
    const end = frames[frames.length - 1].ms;
    const picks = [0, 300, 900, 1500, 2300, 3200, 4200, 5200, 6200, 7200, 8200, Math.max(0, end - 300)];
    await strip(pickAt(frames, picks), join(OUT, `swap-${scheme}.png`), `in-school swap at 1440, ${scheme}: tap, Contact, Home, tap`, { cols: 4, cellW: 360 });
    await ctx.close();
  }
}

await browser.close();
