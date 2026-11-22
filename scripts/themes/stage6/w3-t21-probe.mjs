/**
 * Stage 6 wave 3, task 21: behaviour probes (numbers).
 *
 *   node scripts/themes/snap.mjs --name s6-w3-t21 --reuse --port 4470 -- node scripts/themes/stage6/w3-t21-probe.mjs
 *   ONLY=about,hold,stop,fields,swap WIDTHS=1440,820,390 node ...
 *
 * about   the spine's width at five scroll offsets (1440 to 1024) and the
 *         title stack's under 1024; the spine's ink against the section's
 *         edges at its widest; no style writes while the section is off screen.
 * hold    a numeral pressed: the weight sampled each frame (step to 100, the
 *         rise, the plateau at 900), release (hold, constant-speed return);
 *         on touch the 200 ms gate and a vertical swipe that scrolls.
 * stop    the full stop dragged to both ends of the measure and let go: the
 *         clamp, the return speed; on touch the press gate, a horizontal
 *         swipe, a vertical swipe that scrolls.
 * fields  every red, black and white field pressed in both schemes: the
 *         colours while held and after release; a press on a link inside a
 *         field is the link's; a press in the bleed.
 * swap    listener counts after in-school swaps against a direct load.
 */
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { launch, open, reach, centre, OUT } from './w3-t21-lib.mjs';

const ONLY = (process.env.ONLY || 'about,hold,stop,fields,swap').split(',');
const WIDTHS = (process.env.WIDTHS || '1440,1280,1024,820,390').split(',').map(Number);
const { browser } = await launch();
const log = [];
const say = (...a) => { const s = a.join(' '); console.log(s); log.push(s); };

/** A touch, by hand: start, optional moves with waits, end (CDP). */
async function touch(page, steps) {
  const cdp = await page.context().newCDPSession(page);
  for (const s of steps) {
    if (s.wait) { await page.waitForTimeout(s.wait); continue; }
    await cdp.send('Input.dispatchTouchEvent', { type: s.type, touchPoints: s.type === 'touchEnd' ? [] : [{ x: s.x, y: s.y, id: 1 }] });
  }
  await cdp.detach();
}
async function sample(page, fnSrc, ms) {
  await page.evaluate(({ fnSrc, ms }) => new Promise((done) => {
    const read = new Function(`return (${fnSrc})`)();
    const t0 = performance.now();
    const rows = [];
    const tick = () => {
      const t = Math.round(performance.now() - t0);
      rows.push({ t, ...read() });
      if (t < ms) requestAnimationFrame(tick); else { window.__rows = rows; done(); }
    };
    requestAnimationFrame(tick);
  }), { fnSrc: fnSrc.toString(), ms });
}
const rows = (page) => page.evaluate(() => window.__rows);

if (ONLY.includes('about')) {
  for (const width of WIDTHS) {
    const { ctx, page, errors } = await open(browser, { path: '/t/swiss/about/', width });
    const info = await page.evaluate(() => {
      const sec = document.querySelector('.founder');
      const r = sec.getBoundingClientRect();
      return { top: r.top + scrollY, h: r.height, vh: innerHeight, docH: document.documentElement.scrollHeight };
    });
    const read = () => page.evaluate(() => {
      const b = document.querySelector('.sw-birch');
      const cs = getComputedStyle(b);
      const sec = document.querySelector('.founder').getBoundingClientRect();
      return {
        y: Math.round(scrollY), p: +((innerHeight - sec.top) / (innerHeight + sec.height)).toFixed(2),
        spine: cs.display === 'none' ? null : { w: +parseFloat(cs.getPropertyValue('--sw-bwdth')).toFixed(1), fs: Math.round(parseFloat(cs.fontSize)), inline: b.getAttribute('style') ? 'inline' : 'rest' },
        lines: [...document.querySelectorAll('.title .ln')].map((l) => +parseFloat(getComputedStyle(l).getPropertyValue('--sw-d')).toFixed(1)),
      };
    });
    say(`\nABOUT ${width}: section top ${Math.round(info.top)} h ${Math.round(info.h)} vh ${info.vh}`);
    const maxY = info.docH - info.vh;
    // Five offsets across the section's passage (p = 0.05, 0.3, 0.5, 0.7, 0.95), and the title's (0, 100, 200, 300).
    const offsets = width >= 1024
      ? [0.05, 0.3, 0.5, 0.7, 0.95].map((p) => Math.round(info.top + info.h * (1 - p) - info.vh * p + 0))
      : [0, 100, 200, 330, 500];
    for (const y of offsets) {
      await page.evaluate((y) => window.scrollTo(0, y), Math.min(Math.max(0, y), maxY));
      await page.waitForTimeout(160);
      say('  ', JSON.stringify(await read()));
    }
    if (width >= 1024) {
      // The ink against the section at the widest: pixel rows of the spine's column.
      await page.evaluate((y) => window.scrollTo(0, y), Math.round(info.top + info.h / 2 - info.vh / 2));
      await page.waitForTimeout(200);
      const box = await page.evaluate(() => {
        const b = document.querySelector('.sw-birch').getBoundingClientRect();
        const s = document.querySelector('.founder').getBoundingClientRect();
        return { sx: s.left, sy: s.top, sh: s.height, bx: b.left, bw: b.width, by: b.top };
      });
      const shot = await page.screenshot({ clip: { x: Math.max(0, box.bx - 10), y: Math.max(0, box.sy - 40), width: box.bw + 20, height: box.sh + 80 } });
      const img = await loadImage(shot);
      const cv = createCanvas(img.width, img.height); const c = cv.getContext('2d'); c.drawImage(img, 0, 0);
      const d = c.getImageData(0, 0, img.width, img.height).data;
      let top = -1, bot = -1;
      for (let y = 0; y < img.height; y++) { let dark = 0; for (let x = 0; x < img.width; x++) { const i = (y * img.width + x) * 4; if (d[i] < 90 && d[i + 1] < 90 && d[i + 2] < 90) dark++; } if (dark > 3) { if (top < 0) top = y; bot = y; } }
      const scale = img.height / (box.sh + 80);
      say(`   widest ink rows ${top / scale - 40} to ${bot / scale - 40} against the section 0 to ${box.sh} (css px from the section's top)`);
      // Off screen: no writes to the spine's style.
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(250);
      const writes = await page.evaluate(() => new Promise((done) => {
        const b = document.querySelector('.sw-birch'); let n = 0;
        const mo = new MutationObserver((m) => { n += m.length; }); mo.observe(b, { attributes: true });
        window.scrollTo(0, 5); setTimeout(() => window.scrollTo(0, 0), 60);
        setTimeout(() => { mo.disconnect(); done(n); }, 400);
      }));
      say(`   style writes while the section is off screen: ${writes} (scrollY 0 to 5 and back)`);
    }
    if (errors.length) say('  page errors', errors.join(' | '));
    await ctx.close();
  }
}

if (ONLY.includes('hold')) {
  for (const width of [1440, 390]) {
    const mobile = width < 900;
    const { ctx, page, errors } = await open(browser, { path: '/t/swiss/services/', width });
    await reach(page, '.step:nth-child(2) .num');
    const [, , l, t, w, h] = await centre(page, '.step:nth-child(2) .num');
    const g = await page.evaluate(() => { const n = document.querySelector('.step:nth-child(2) .num'); const rg = document.createRange(); rg.selectNodeContents(n); const r = rg.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
    const reader = () => ({ w: Math.round(parseFloat(getComputedStyle(document.querySelector('.step:nth-child(2) .num')).fontWeight) * 10) / 10 });
    say(`\nHOLD ${width} (${mobile ? 'touch' : 'mouse'}): glyph centre ${g.map(Math.round)}; box ${Math.round(l)},${Math.round(t)} ${Math.round(w)}x${Math.round(h)}`);
    if (!mobile) {
      await page.mouse.move(g[0], g[1]);
      const run = sample(page, reader, 2400);
      await page.waitForTimeout(40);
      await page.mouse.down();
      await page.waitForTimeout(1250);
      await page.mouse.up();
      await run;
      const r = await rows(page);
      const first = r.find((x) => x.w !== 700);
      const peak = r.reduce((a, x) => (x.w > a.w ? x : a), r[0]);
      const upAt = r.find((x) => x.t > 1250 && x.t < 1400) ?? null;
      const back = r.filter((x) => x.t > 1290 && x.w !== 700);
      const restAt = r.find((x) => x.t > 1300 && x.w === 700);
      say(`  mouse: first change at ${first?.t} ms to ${first?.w}; 900 reached ${r.find((x) => x.w >= 899.9)?.t} ms; peak ${peak.w}; released ~1290; hold then return finished at ${restAt?.t} ms; samples while returning ${back.length}`);
      const ret = r.filter((x) => x.t >= 1290 && x.t <= (restAt?.t ?? 9999));
      say('  return samples', ret.map((x) => `${x.t}:${x.w}`).join(' '));
      // A quick click, a press that never reaches 900, released at 300 ms.
      const run2 = sample(page, reader, 1200);
      await page.waitForTimeout(40);
      await page.mouse.down(); await page.waitForTimeout(300); await page.mouse.up();
      await run2;
      const r2 = await rows(page);
      say(`  300 ms press: peak ${r2.reduce((a, x) => Math.max(a, x.w), 0)}; rest after ${r2.find((x) => x.t > 400 && x.w === 700)?.t} ms`);
      // A press beside the digit (in the numeral's box, off the glyph) does nothing.
      const miss = await page.evaluate(() => { const n = document.querySelector('.step:nth-child(2) .num'); const b = n.getBoundingClientRect(); const rg = document.createRange(); rg.selectNodeContents(n); const r = rg.getBoundingClientRect(); return [Math.min(b.right - 4, r.right + 60), r.top + r.height / 2]; });
      await page.mouse.move(miss[0], miss[1]);
      const run3 = sample(page, reader, 500);
      await page.mouse.down(); await page.waitForTimeout(300); await page.mouse.up();
      await run3;
      say(`  press off the glyph (${Math.round(miss[0])},${Math.round(miss[1])}): peak ${(await rows(page)).reduce((a, x) => Math.max(a, x.w), 0)}`);
    } else {
      const run = sample(page, reader, 2400);
      await page.waitForTimeout(40);
      await touch(page, [{ type: 'touchStart', x: g[0], y: g[1] }, { wait: 1250 }, { type: 'touchEnd' }]);
      await run;
      const r = await rows(page);
      const restAt = r.find((x) => x.t > 1300 && x.w === 700);
      say(`  touch hold 1250 ms: first change ${r.find((x) => x.w !== 700)?.t} ms (gate 200); 900 at ${r.find((x) => x.w >= 899.9)?.t}; back at rest ${restAt?.t} ms`);
      // A vertical swipe that starts on the numeral scrolls and never changes the weight.
      const y0 = await page.evaluate(() => scrollY);
      const run2 = sample(page, reader, 900);
      await page.waitForTimeout(40);
      await touch(page, [{ type: 'touchStart', x: g[0], y: g[1] }, { wait: 30 }, ...Array.from({ length: 8 }, (_, i) => ({ type: 'touchMove', x: g[0], y: g[1] - (i + 1) * 30 })).flatMap((m) => [m, { wait: 16 }]), { type: 'touchEnd' }]);
      await run2;
      const r2 = await rows(page);
      say(`  vertical swipe: scrolled ${(await page.evaluate(() => scrollY)) - y0}px; peak weight ${r2.reduce((a, x) => Math.max(a, x.w), 0)}`);
    }
    if (errors.length) say('  page errors', errors.join(' | '));
    await ctx.close();
  }
}

if (ONLY.includes('stop')) {
  for (const width of [1440, 390]) {
    const mobile = width < 900;
    const { ctx, page, errors } = await open(browser, { path: '/t/swiss/contact/sent/', width });
    const geo = await page.evaluate(() => {
      const s = document.querySelector('.sent .stop'); const f = document.querySelector('.sent').getBoundingClientRect(); const r = s.getBoundingClientRect();
      return { sx: r.left, sy: r.top, sw: r.width, sh: r.height, fl: f.left, fr: f.right };
    });
    // The dot: its pixel centre is found by the red pixels.
    const dot = await page.evaluate(() => {
      const s = document.querySelector('.sent .stop'); const r = s.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * 0.84 };
    });
    const reader = () => ({ x: Math.round(document.querySelector('.sent .stop').getBoundingClientRect().left * 10) / 10 });
    say(`\nSTOP ${width} (${mobile ? 'touch' : 'mouse'}): box ${Math.round(geo.sx)},${Math.round(geo.sy)} ${Math.round(geo.sw)}x${Math.round(geo.sh)}; frame ${Math.round(geo.fl)} to ${Math.round(geo.fr)}`);
    if (!mobile) {
      for (const [label, toX] of [['left end', geo.fl - 200], ['right end', geo.fr + 300], ['a third left', geo.sx - 300]]) {
        await page.mouse.move(dot.x, dot.y);
        const run = sample(page, reader, 1500);
        await page.waitForTimeout(40);
        await page.mouse.down(); await page.mouse.move((dot.x + toX) / 2, dot.y, { steps: 4 }); await page.mouse.move(toX, dot.y, { steps: 4 });
        await page.waitForTimeout(250);
        const held = await page.evaluate(reader);
        await page.mouse.up();
        await run;
        const r = await rows(page);
        const restAt = r.find((x) => x.t > 400 && Math.abs(x.x - geo.sx) < 0.2);
        const back = r.filter((x) => x.t > 380 && x.x !== geo.sx && Math.abs(x.x - held.x) > 0.5);
        const sp = back.length > 3 ? ((back[0].x - back[back.length - 1].x) / (back[back.length - 1].t - back[0].t)).toFixed(2) : 'n/a';
        say(`  drag to the ${label}: held at ${held.x} (rest ${Math.round(geo.sx)}, offset ${Math.round(held.x - geo.sx)}); back at rest ${restAt?.t} ms; return speed ${sp} px/ms (frame ${Math.round(geo.fr - geo.fl)}px / 252 ms = ${((geo.fr - geo.fl) / 252).toFixed(2)})`);
      }
      const hits = await page.evaluate(({ x, y }) => ({ el: document.elementFromPoint(x, y)?.className, topleft: (() => { const s = document.querySelector('.sent .stop'); const r = s.getBoundingClientRect(); return document.elementFromPoint(r.left + r.width / 2, r.top + 20)?.tagName; })() }), dot);
      say('  element under the dot', JSON.stringify(hits));
    } else {
      const run = sample(page, reader, 1800);
      await page.waitForTimeout(40);
      // A long press, then a move left.
      await touch(page, [{ type: 'touchStart', x: dot.x, y: dot.y }, { wait: 260 }, ...[1, 2, 3, 4, 5, 6].flatMap((i) => [{ type: 'touchMove', x: dot.x - i * 30, y: dot.y }, { wait: 16 }]), { wait: 120 }, { type: 'touchEnd' }]);
      await run;
      const r = await rows(page);
      say(`  long press then left: min x ${Math.min(...r.map((x) => x.x))} (rest ${Math.round(geo.sx)}, frame left ${Math.round(geo.fl)}); back at rest ${r.find((x) => x.t > 600 && Math.abs(x.x - geo.sx) < 0.2)?.t} ms`);
      // A quick horizontal swipe.
      const run2 = sample(page, reader, 1200);
      await page.waitForTimeout(40);
      await touch(page, [{ type: 'touchStart', x: dot.x, y: dot.y }, ...[1, 2, 3, 4].flatMap((i) => [{ type: 'touchMove', x: dot.x - i * 25, y: dot.y }, { wait: 16 }]), { wait: 80 }, { type: 'touchEnd' }]);
      await run2;
      say(`  horizontal swipe: min x ${Math.min(...(await rows(page)).map((x) => x.x))}`);
      // A vertical swipe scrolls and leaves the stop.
      const y0 = await page.evaluate(() => scrollY);
      const run3 = sample(page, reader, 700);
      await page.waitForTimeout(40);
      await touch(page, [{ type: 'touchStart', x: dot.x, y: dot.y }, { wait: 30 }, ...Array.from({ length: 8 }, (_, i) => ({ type: 'touchMove', x: dot.x, y: dot.y - (i + 1) * 30 })).flatMap((m) => [m, { wait: 16 }]), { type: 'touchEnd' }]);
      await run3;
      say(`  vertical swipe: scrolled ${(await page.evaluate(() => scrollY)) - y0}px; stop moved ${Math.max(...(await rows(page)).map((x) => Math.abs(x.x - geo.sx))).toFixed(1)}px sideways`);
    }
    say(`  page scrollWidth ${await page.evaluate(() => document.documentElement.scrollWidth)} / ${width}`);
    if (errors.length) say('  page errors', errors.join(' | '));
    await ctx.close();
  }
}

if (ONLY.includes('fields')) {
  const FIELDS = [
    { path: '/t/swiss/', sel: '.lab', name: 'Home lab band' },
    { path: '/t/swiss/', sel: '.closer', name: 'Home red close' },
    { path: '/t/swiss/services/', sel: '.close', name: 'Services red close' },
    { path: '/t/swiss/about/', sel: '.manifesto', name: 'About red field' },
    { path: '/t/swiss/contact/', sel: '.hero.sw-black', name: 'Contact black hero' },
    { path: '/t/swiss/contact/', sel: '.direct', name: 'Contact red address' },
  ];
  for (const scheme of ['light', 'dark']) {
    for (const width of [1440, 390]) {
      const mobile = width < 900;
      for (const f of FIELDS) {
        const { ctx, page, errors } = await open(browser, { path: f.path, width, scheme });
        await reach(page, f.sel);
        const colours = () => page.evaluate((sel) => { const e = document.querySelector(sel); const cs = getComputedStyle(e); const bleed = getComputedStyle(e).boxShadow; return { flip: e.hasAttribute('data-sw-flip'), bg: cs.backgroundColor, fg: cs.color, shadow: bleed.slice(0, 40) }; }, f.sel);
        const spot = await page.evaluate((sel) => {
          const e = document.querySelector(sel); const r = e.getBoundingClientRect();
          // A point on plain field: not on a link or a control, not on the photograph's text.
          for (const fy of [0.5, 0.35, 0.65, 0.2, 0.8]) for (const fx of [0.6, 0.4, 0.8, 0.25]) {
            const x = r.left + r.width * fx, y = r.top + r.height * fy;
            const t = document.elementFromPoint(x, y);
            if (t && e.contains(t) && !t.closest('a, button, input, textarea, label')) return [x, y, t.tagName + '.' + t.className];
          }
          return null;
        }, f.sel);
        if (!spot) { say(`FIELD ${scheme} ${width} ${f.name}: no plain spot`); await ctx.close(); continue; }
        const before = await colours();
        let during;
        if (mobile) {
          const cdp = await ctx.newCDPSession(page);
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: spot[0], y: spot[1], id: 1 }] });
          await page.waitForTimeout(80); const early = await colours();
          await page.waitForTimeout(300); during = await colours();
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
          await page.waitForTimeout(60);
          const after = await colours();
          say(`FIELD ${scheme} ${width} ${f.name}: rest ${before.bg}/${before.fg}; at 80 ms ${early.flip ? 'FLIPPED' : 'still'}; held ${during.flip ? during.bg + '/' + during.fg : 'NOT FLIPPED'}; released ${after.flip ? 'STUCK' : after.bg}`);
        } else {
          await page.mouse.move(spot[0], spot[1]);
          await page.mouse.down(); await page.waitForTimeout(60); during = await colours();
          await page.mouse.up(); await page.waitForTimeout(40);
          const after = await colours();
          say(`FIELD ${scheme} ${width} ${f.name}: rest ${before.bg}/${before.fg}; held ${during.flip ? during.bg + '/' + during.fg : 'NOT FLIPPED'}; released ${after.flip ? 'STUCK' : after.bg}`);
        }
        if (errors.length) say('  page errors', errors.join(' | '));
        await ctx.close();
      }
    }
  }
  // A press on a link inside a field is the link's: the field does not flip, the link navigates.
  {
    const { ctx, page } = await open(browser, { path: '/t/swiss/services/', width: 1440 });
    await reach(page, '.close .cta');
    const [x, y] = await centre(page, '.close .cta');
    await page.mouse.move(x, y); await page.mouse.down(); await page.waitForTimeout(60);
    const flipped = await page.evaluate(() => document.querySelector('.close').hasAttribute('data-sw-flip'));
    await page.mouse.up();
    await page.waitForFunction(() => location.pathname.includes('/contact'), null, { timeout: 8000 }).catch(() => {});
    say(`LINK in the red close: field flipped on press ${flipped}; navigated to ${await page.evaluate(() => location.pathname)}`);
    await ctx.close();
  }
  // A press in the bleed (the sheet's margin, outside the frame).
  {
    const { ctx, page } = await open(browser, { path: '/t/swiss/services/', width: 1440 });
    await reach(page, '.close');
    const y = await page.evaluate(() => { const r = document.querySelector('.close').getBoundingClientRect(); return r.top + r.height / 2; });
    for (const x of [10, 1430]) {
      await page.mouse.move(x, y); await page.mouse.down(); await page.waitForTimeout(60);
      say(`BLEED press at x=${x}: ${(await page.evaluate(() => document.querySelector('.close').hasAttribute('data-sw-flip'))) ? 'flipped' : 'not flipped'}`);
      await page.mouse.up();
    }
    await ctx.close();
  }
  // Contact's address at 1440: the fill bleeds right only; a press left of it (the page) is not the field's.
  {
    const { ctx, page } = await open(browser, { path: '/t/swiss/contact/', width: 1440 });
    await reach(page, '.direct');
    const g = await page.evaluate(() => { const r = document.querySelector('.direct').getBoundingClientRect(); return { l: r.left, r: r.right, y: r.top + r.height / 2 }; });
    for (const x of [g.l - 30, g.r + 20, 1435]) {
      await page.mouse.move(x, g.y); await page.mouse.down(); await page.waitForTimeout(60);
      say(`CONTACT address press at x=${Math.round(x)} (field ${Math.round(g.l)} to ${Math.round(g.r)}): ${(await page.evaluate(() => document.querySelector('.direct').hasAttribute('data-sw-flip'))) ? 'flipped' : 'not flipped'}`);
      await page.mouse.up();
    }
    await ctx.close();
  }
}

if (ONLY.includes('swap')) {
  const counter = () => {
    const add = EventTarget.prototype.addEventListener;
    const rem = EventTarget.prototype.removeEventListener;
    window.__net = {};
    const key = (t, type) => `${t === document ? 'document' : t === window ? 'window' : t?.nodeType === 1 ? 'el:' + (t.className || t.tagName) : 'other'}.${type}`;
    EventTarget.prototype.addEventListener = function (type, fn, o) {
      if (/^(pointer|astro:|visibilitychange$|blur$|focus$|scroll$|resize$|change$|contextmenu$)/.test(type)) { const k = key(this, type); window.__net[k] = (window.__net[k] || 0) + 1; if (o && o.signal) o.signal.addEventListener('abort', () => { window.__net[k]--; }); }
      return add.call(this, type, fn, o);
    };
    EventTarget.prototype.removeEventListener = function (type, fn, o) {
      if (/^(pointer|astro:|visibilitychange$|blur$|focus$|scroll$|resize$|change$|contextmenu$)/.test(type)) { const k = key(this, type); window.__net[k] = (window.__net[k] || 0) - 1; }
      return rem.call(this, type, fn, o);
    };
  };
  const nets = async (page) => page.evaluate(() => Object.fromEntries(Object.entries(window.__net).filter(([k, v]) => v !== 0 && !k.startsWith('el:')).sort()));
  const go = async (page, label) => {
    await page.evaluate((label) => { const a = [...document.querySelectorAll('header nav a')].find((l) => (label === 'home' ? l.getAttribute('href') === '/t/swiss/' : l.getAttribute('href').includes('/' + label))) || document.querySelector('header .wordmark'); a.click(); }, label);
    await page.waitForTimeout(1500);
  };
  const { ctx, page } = await open(browser, { path: '/t/swiss/', width: 1440 });
  await ctx.addInitScript(counter);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  say('\nSWAP: net listeners on document and window');
  say(' home direct   ', JSON.stringify(await nets(page)));
  for (const label of ['services', 'about', 'home', 'services']) { await go(page, label); }
  const chain = await nets(page);
  const stuff = await page.evaluate(() => ({ path: location.pathname, live: document.querySelectorAll('.num[data-live]').length }));
  say(' after home>services>about>home>services', JSON.stringify(stuff), JSON.stringify(chain));
  const base = await open(browser, { path: '/t/swiss/services/', width: 1440 });
  await base.ctx.addInitScript(counter);
  await base.page.reload({ waitUntil: 'networkidle' });
  await base.page.waitForTimeout(600);
  say(' services direct', JSON.stringify(await nets(base.page)));
  // One press on the swapped Services page: the weight rises once, one flip.
  await reach(page, '.step:nth-child(2) .num');
  const g = await page.evaluate(() => { const n = document.querySelector('.step:nth-child(2) .num'); const rg = document.createRange(); rg.selectNodeContents(n); const r = rg.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  await page.mouse.move(g[0], g[1]); await page.mouse.down(); await page.waitForTimeout(500);
  say(' held 500 ms on the swapped page: weight', await page.evaluate(() => getComputedStyle(document.querySelector('.step:nth-child(2) .num')).fontWeight));
  await page.mouse.up();
  await go(page, 'about'); await go(page, 'home');
  say(' to a school without toys: data-theme', await page.evaluate(() => document.documentElement.dataset.theme));
  await base.ctx.close();
  await ctx.close();
}

await writeFile(join(OUT, 'probe-log.txt'), log.join('\n'));
await browser.close();
