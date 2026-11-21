/**
 * Stage 6 wave 3, task 21: films (timestamped strips), stills and whole-page sheets.
 *
 *   node scripts/themes/snap.mjs --name s6-w3-t21 --reuse --port 4470 -- node scripts/themes/stage6/w3-t21-evidence.mjs
 *   ONLY=about,hold,stop,fields,sheets WIDTHS=1440,820,390 SCHEMES=light,dark node ...
 *
 * about   the spine (1440) and the title stack (820, 390) at five scroll offsets.
 * hold    a numeral held and released at 1440 (mouse) and 390 (touch): timed strips.
 * stop    the full stop dragged and let go at 1440 and 390: timed strips.
 * fields  each inverting field at rest and pressed, both schemes, 1440 and 390.
 * sheets  whole-page About, Services, Sent at every size, both schemes.
 * Output: scripts/themes/.out/stage6/w3/t21/{films,fields,sheets}/
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { launch, open, reach, centre, startFilm, pickAt, strip, boxOf, OUT } from './w3-t21-lib.mjs';

const ONLY = (process.env.ONLY || 'about,hold,stop,fields,sheets').split(',');
const WIDTHS = (process.env.WIDTHS || '1440,820,390').split(',').map(Number);
const SCHEMES = (process.env.SCHEMES || 'light,dark').split(',');
const { browser } = await launch();
const F = join(OUT, 'films'), FL = join(OUT, 'fields'), S = join(OUT, 'sheets');
for (const d of [F, FL, S]) await mkdir(d, { recursive: true });

/** Labelled stills laid in a row or grid. */
async function sheet(images, labels, file, title, { cols = 5, cellW = 300 } = {}) {
  const imgs = await Promise.all(images.map((b) => loadImage(b)));
  const cellH = Math.round((imgs[0].height / imgs[0].width) * cellW);
  const PAD = 10, CAP = 24, HEAD = 30;
  const rows = Math.ceil(imgs.length / cols);
  const cv = createCanvas(PAD + cols * (cellW + PAD), HEAD + PAD + rows * (cellH + CAP + PAD));
  const c = cv.getContext('2d');
  c.fillStyle = '#1b1b1d'; c.fillRect(0, 0, cv.width, cv.height);
  c.font = '600 14px sans-serif'; c.textBaseline = 'middle'; c.fillStyle = '#e8e6e1';
  c.fillText(title, PAD, HEAD / 2 + 2);
  imgs.forEach((img, i) => {
    const x = PAD + (i % cols) * (cellW + PAD), y = HEAD + PAD + Math.floor(i / cols) * (cellH + CAP + PAD);
    c.drawImage(img, x, y, cellW, cellH);
    c.fillText(labels[i], x, y + cellH + CAP / 2);
  });
  await writeFile(file, await cv.encode('png'));
}
const touch = async (page, steps) => {
  const cdp = await page.context().newCDPSession(page);
  for (const s of steps) {
    if (s.wait) { await page.waitForTimeout(s.wait); continue; }
    await cdp.send('Input.dispatchTouchEvent', { type: s.type, touchPoints: s.type === 'touchEnd' ? [] : [{ x: s.x, y: s.y, id: 1 }] });
  }
  await cdp.detach();
};

if (ONLY.includes('about')) {
  for (const scheme of SCHEMES) {
    for (const width of WIDTHS) {
      const { ctx, page } = await open(browser, { path: '/t/swiss/about/', width, scheme });
      const info = await page.evaluate(() => { const r = document.querySelector('.founder').getBoundingClientRect(); return { top: r.top + scrollY, h: r.height, vh: innerHeight, docH: document.documentElement.scrollHeight }; });
      const maxY = info.docH - info.vh;
      const offs = width >= 1024
        ? [0.05, 0.3, 0.5, 0.7, 0.95].map((p) => Math.round(info.top + info.h * (1 - p) - info.vh * p))
        : [0, 100, 200, 330, 500];
      const shots = [], labels = [];
      for (const y of offs) {
        const yy = Math.min(Math.max(0, y), maxY);
        await page.evaluate((y) => window.scrollTo(0, y), yy);
        await page.waitForTimeout(200);
        const read = await page.evaluate(() => {
          const b = document.querySelector('.sw-birch'); const cs = getComputedStyle(b);
          return cs.display !== 'none' ? `spine ${parseFloat(cs.getPropertyValue('--sw-bwdth')).toFixed(0)}` : '';
        });
        const lines = await page.evaluate(() => `title ${parseFloat(getComputedStyle(document.querySelector('.title .ln')).getPropertyValue('--sw-d')).toFixed(0)}`);
        shots.push(await page.screenshot());
        labels.push(`scrollY ${yy}  ${width >= 1024 ? read : lines}`);
      }
      await sheet(shots, labels, join(F, `about-sweep__${scheme}__${width}.png`), `About ${scheme} ${width}: ${width >= 1024 ? 'the spine at five scroll offsets of the founder section' : 'the title stack at five scroll offsets (the spine has no travel, or does not exist)'}`, { cols: 5, cellW: width < 700 ? 200 : 300 });
      await ctx.close();
    }
  }
}

if (ONLY.includes('hold')) {
  for (const scheme of SCHEMES) {
    for (const width of [1440, 390]) {
      const { ctx, page, mobile } = await open(browser, { path: '/t/swiss/services/', width, scheme });
      await reach(page, '.step:nth-child(2) .num');
      const g = await page.evaluate(() => { const n = document.querySelector('.step:nth-child(2)'); const r = n.getBoundingClientRect(); const nn = n.querySelector('.num'); const rg = document.createRange(); rg.selectNodeContents(nn); const q = rg.getBoundingClientRect(); return { cx: q.left + q.width / 2, cy: q.top + q.height / 2 }; });
      const box = await boxOf(page, '.step:nth-child(2)', 20);
      const film = await startFilm(page);
      if (mobile) await touch(page, [{ type: 'touchStart', x: g.cx, y: g.cy }, { wait: 1250 }, { type: 'touchEnd' }]);
      else { await page.mouse.move(g.cx, g.cy); await page.mouse.down(); await page.waitForTimeout(1250); await page.mouse.up(); }
      await page.waitForTimeout(900);
      const frames = await film.stop();
      await strip(pickAt(frames, [-1, 100, 250, 400, 600, 800, 1000, 1200, 1300, 1360, 1420, 1500]), join(F, `hold__${scheme}__${width}.png`), `Services ${scheme} ${width}: hold numeral 2 for 1250 ms (${mobile ? 'touch, 200 ms gate' : 'mouse'}), release at +1250`, { cols: 4, cellW: width === 390 ? 220 : 400, box, vpWidth: width });
      await ctx.close();
    }
  }
}

if (ONLY.includes('stop')) {
  for (const scheme of SCHEMES) {
    for (const width of [1440, 390]) {
      const { ctx, page, mobile } = await open(browser, { path: '/t/swiss/contact/sent/', width, scheme });
      const dot = await page.evaluate(() => { const r = document.querySelector('.sent .stop').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * 0.84 }; });
      const box = await boxOf(page, '.sent .title', 20);
      const film = await startFilm(page);
      const toX = width === 1440 ? 330 : 120;
      if (mobile) await touch(page, [{ type: 'touchStart', x: dot.x, y: dot.y }, { wait: 260 }, ...Array.from({ length: 6 }, (_, i) => ({ type: 'touchMove', x: dot.x + (toX - dot.x) * ((i + 1) / 6), y: dot.y })).flatMap((m) => [m, { wait: 40 }]), { wait: 300 }, { type: 'touchEnd' }]);
      else { await page.mouse.move(dot.x, dot.y); await page.mouse.down(); await page.mouse.move(toX, dot.y, { steps: 10 }); await page.waitForTimeout(500); await page.mouse.up(); }
      await page.waitForTimeout(900);
      const frames = await film.stop();
      const t = mobile ? [-1, 300, 450, 600, 700, 850, 1000, 1100, 1150, 1200, 1250, 1350] : [-1, 80, 200, 400, 600, 700, 760, 800, 850, 900, 980, 1100];
      await strip(pickAt(frames, t), join(F, `stop__${scheme}__${width}.png`), `Sent ${scheme} ${width}: drag the full stop (${mobile ? 'touch, press 260 ms then left' : 'mouse'}), release, constant-speed return`, { cols: 4, cellW: width === 390 ? 220 : 400, box, vpWidth: width });
      await ctx.close();
    }
  }
}

if (ONLY.includes('fields')) {
  const FIELDS = [
    { path: '/t/swiss/', sel: '.lab', name: 'home-lab' },
    { path: '/t/swiss/', sel: '.closer', name: 'home-close' },
    { path: '/t/swiss/services/', sel: '.close', name: 'services-close' },
    { path: '/t/swiss/about/', sel: '.manifesto', name: 'about-red' },
    { path: '/t/swiss/contact/', sel: '.hero.sw-black', name: 'contact-black' },
    { path: '/t/swiss/contact/', sel: '.direct', name: 'contact-red' },
  ];
  for (const scheme of SCHEMES) {
    for (const width of [1440, 390]) {
      const shots = [], labels = [];
      for (const f of FIELDS) {
        const { ctx, page, mobile } = await open(browser, { path: f.path, width, scheme });
        await reach(page, f.sel);
        const spot = await page.evaluate((sel) => {
          const e = document.querySelector(sel); const r = e.getBoundingClientRect();
          for (const fy of [0.5, 0.35, 0.65, 0.2, 0.8]) for (const fx of [0.6, 0.4, 0.8, 0.25]) {
            const x = r.left + r.width * fx, y = r.top + r.height * fy;
            const t = document.elementFromPoint(x, y);
            if (t && e.contains(t) && !t.closest('a, button, input, textarea, label')) return [x, y];
          }
          return null;
        }, f.sel);
        const clip = await page.evaluate((sel) => { const r = document.querySelector(sel).getBoundingClientRect(); const y = Math.max(0, r.top - 20); return { x: 0, y, width: innerWidth, height: Math.min(innerHeight - y, r.height + 40) }; }, f.sel);
        shots.push(await page.screenshot({ clip })); labels.push(`${f.name}  rest`);
        if (mobile) {
          const cdp = await ctx.newCDPSession(page);
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: spot[0], y: spot[1], id: 1 }] });
          await page.waitForTimeout(450);
          shots.push(await page.screenshot({ clip })); labels.push(`${f.name}  pressed (held)`);
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        } else {
          await page.mouse.move(spot[0], spot[1]); await page.mouse.down(); await page.waitForTimeout(200);
          shots.push(await page.screenshot({ clip })); labels.push(`${f.name}  pressed (held)`);
          await page.mouse.up();
        }
        await page.waitForTimeout(120);
        shots.push(await page.screenshot({ clip })); labels.push(`${f.name}  released`);
        await ctx.close();
      }
      await sheet(shots, labels, join(FL, `fields__${scheme}__${width}.png`), `Fields ${scheme} ${width}: rest, pressed, released`, { cols: 3, cellW: width === 390 ? 260 : 480 });
    }
  }
}

if (ONLY.includes('sheets')) {
  const PAGES = [['about', '/t/swiss/about/'], ['services', '/t/swiss/services/'], ['sent', '/t/swiss/contact/sent/']];
  for (const scheme of SCHEMES) {
    for (const width of [1440, 1280, 1024, 820, 640, 390]) {
      for (const [name, path] of PAGES) {
        const { ctx, page } = await open(browser, { path, width, scheme });
        // Whole page: every reveal parked below the fold is let through first.
        await page.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 400) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } scrollTo(0, 0); });
        await page.waitForTimeout(900);
        const sw = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
        await page.screenshot({ path: join(S, `${name}__${scheme}__${width}.png`), fullPage: true });
        if (sw[0] > sw[1]) console.log(`SIDEWAYS SCROLL ${name} ${scheme} ${width}: ${sw[0]} > ${sw[1]}`);
        await ctx.close();
      }
    }
  }
}
await browser.close();
console.log('done');
