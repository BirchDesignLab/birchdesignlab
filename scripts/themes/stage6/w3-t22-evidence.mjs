/**
 * Stage 6 wave 3, task 22: evidence (sheets and timestamped film strips) for grandmillennial's
 * sampler and envelope. Output: scripts/themes/.out/stage6/w3/t22/.
 *
 *   node scripts/themes/snap.mjs --name s6-w3-t22 --reuse --port 4470 -- node scripts/themes/stage6/w3-t22-evidence.mjs
 *   ONLY=sheets,sampler,envelope,swap WIDTHS=1440,820,390 SCHEMES=light node ...
 *
 * sheets    About and Contact whole-page at 1440, 1280, 1024, 820, 390 in both schemes, the envelope
 *           closed and open (Contact).
 * sampler   spelling three letters (B, D, L) by tap and then by keyboard (Enter), a film strip of the
 *           band, at 1440, 820 and 390, both schemes.
 * envelope  the envelope open and close at 1440, 1024, 820 and 390, both schemes: a film strip of the
 *           envelope and what is around it, plus whole-page stills open.
 * swap      Contact with the envelope open, swapped to Services and back: the return is closed.
 */
import { join } from 'node:path';
import { launch, open, reach, centre, startFilm, pickAt, strip, boxOf, OUT } from './w3-t22-lib.mjs';

const ONLY = (process.env.ONLY || 'sheets,sampler,envelope,swap').split(',');
const SCHEMES = (process.env.SCHEMES || 'light,dark').split(',');
const SIZES = (process.env.SIZES || '1440,1280,1024,820,390').split(',').map(Number);
const { browser } = await launch();
const ABOUT = '/t/grandmillennial/about/';
const CONTACT = '/t/grandmillennial/contact/';

async function tap(page, mobile, x, y) { if (mobile) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); }

if (ONLY.includes('sheets')) {
  for (const scheme of SCHEMES) for (const width of SIZES) {
    for (const [name, path] of [['about', ABOUT], ['contact', CONTACT]]) {
      const { ctx, page } = await open(browser, { path, width, scheme });
      await page.screenshot({ path: join(OUT, `sheet-${name}-${scheme}-${width}.png`), fullPage: true });
      if (name === 'contact') {
        await reach(page, '.seal-btn');
        const [x, y] = await centre(page, '.seal-btn');
        await tap(page, width < 900, x, y);
        await page.waitForTimeout(700);
        await page.screenshot({ path: join(OUT, `sheet-contact-open-${scheme}-${width}.png`), fullPage: true });
      }
      await ctx.close();
    }
  }
}

if (ONLY.includes('sampler')) {
  for (const scheme of SCHEMES) for (const width of [1440, 820, 390]) {
    const { ctx, page, mobile } = await open(browser, { path: ABOUT, width, scheme });
    await reach(page, '.abc');
    const box = await boxOf(page, '.abc', 30);
    // the hit boxes of B, D, L (letters 2, 4, 12): tap each in turn
    const pts = [];
    for (const n of [1, 3, 11]) pts.push(await page.evaluate((n) => { const r = document.querySelectorAll('.abc-in button.ltr')[n].getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, n));
    const film = await startFilm(page);
    const t0 = Date.now();
    for (const [x, y] of pts) { await tap(page, mobile, x, y); await page.waitForTimeout(650); }
    await page.focus('.abc-in button.ltr:nth-child(1)');
    for (const n of [1, 3, 11]) {
      await page.focus(`.abc-in button.ltr:nth-child(${n + 1})`);
      await page.keyboard.press('Enter'); await page.waitForTimeout(650);
    }
    const frames = await film.stop();
    // a frame every ~120 ms across the first tap, then one settled frame after each later tap
    const want = [-1, 0, 100, 200, 300, 400, 520, 650, 1300, 1950, 2600, 3250, 3900, 4550];
    const picked = pickAt(frames, want);
    await strip(picked, join(OUT, `film-sampler-${scheme}-${width}.png`), `sampler ${scheme} ${width}: tap B, D, L, then Enter on B, D, L (timestamps from the first tap)`, { cols: 4, cellW: width < 700 ? 300 : 360, box, vpWidth: width });
    await ctx.close();
  }
}

if (ONLY.includes('envelope')) {
  for (const scheme of SCHEMES) for (const width of [1440, 1024, 820, 390]) {
    const { ctx, page, mobile } = await open(browser, { path: CONTACT, width, scheme });
    await reach(page, 'section.envelope');
    // the envelope with a margin that shows the form above it on one column and the intro above it on two
    const box = await boxOf(page, 'section.envelope', width < 900 ? 150 : 120);
    const [x, y] = await centre(page, '.seal-btn');
    const film = await startFilm(page);
    await page.waitForTimeout(250);
    const tOpen = Date.now();
    await tap(page, mobile, x, y);
    await page.waitForTimeout(900);
    const tClose = Date.now();
    await tap(page, mobile, x, y);
    await page.waitForTimeout(900);
    const frames = await film.stop();
    const base = frames.find((f) => f.ms >= 250)?.ms ?? 250;
    const dOpen = tOpen - (film.t0 * 1000);
    void base; void dOpen;
    const rel = (ms) => ms; // film ms counts from the film start
    const openAt = 250, closeAt = 250 + 900 + 2; // the taps' times, from the film's start
    const times = [-1, openAt, openAt + 60, openAt + 120, openAt + 180, openAt + 240, openAt + 300, openAt + 420, openAt + 700, closeAt + 20, closeAt + 100, closeAt + 180, closeAt + 260, closeAt + 360, closeAt + 480, closeAt + 800];
    const picked = pickAt(frames, times.map(rel));
    await strip(picked, join(OUT, `film-envelope-${scheme}-${width}.png`), `envelope ${scheme} ${width}: open (tap at +${openAt}) and close (tap at about +${closeAt}), ms from the film start`, { cols: width < 900 ? 4 : 4, cellW: width < 900 ? 300 : 340, box, vpWidth: width });
    await ctx.close();
  }
}

if (ONLY.includes('swap')) {
  for (const width of [1440, 390]) {
    const { ctx, page, mobile } = await open(browser, { path: CONTACT, width });
    await reach(page, 'section.envelope');
    const [x, y] = await centre(page, '.seal-btn');
    await tap(page, mobile, x, y);
    await page.waitForTimeout(600);
    await page.screenshot({ path: join(OUT, `swap-1-open-${width}.png`) });
    await page.evaluate(() => { [...document.querySelectorAll('header nav a')].find((l) => l.getAttribute('href').includes('/services')).click(); });
    await page.waitForTimeout(1600);
    await page.evaluate(() => { [...document.querySelectorAll('header nav a')].find((l) => l.getAttribute('href').includes('/contact')).click(); });
    await page.waitForTimeout(1600);
    await reach(page, 'section.envelope');
    await page.screenshot({ path: join(OUT, `swap-2-return-${width}.png`) });
    await ctx.close();
  }
}
await browser.close();
