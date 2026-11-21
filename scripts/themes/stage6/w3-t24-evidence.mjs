/**
 * Stage 6 wave 3, task 24: evidence for vaporwave's VCR remote and page-wide
 * window activation. GPU Chromium, reduced transparency forced to
 * no-preference, the portal prompt suppressed (w3-t24-lib.mjs). Run against a
 * built snapshot:
 *   node scripts/themes/snap.mjs --name t24-after --reuse --port 4470 -- node scripts/themes/stage6/w3-t24-evidence.mjs
 *   ONLY=remote,windows,swap SCHEMES=light,dark node ...
 *
 * remote   the remote at 1440 (mouse, keyboard) and 390 (touch), both schemes:
 *          pause, resume, hold FF, held arrows (REW, FF), Space, then on touch
 *          tap, tap off the button, long press, swipe FF and REW, a vertical
 *          swipe that scrolls. The WebGL calls are counted (an init-script
 *          hook on drawArrays and uniform1f), so the timeline shows the draws
 *          stopping on pause, uTime running 4x or backwards, the noise pass
 *          (a blended second draw) only while scanning, and the
 *          seam's two hiccup offsets on release. Also the loop stopping off
 *          screen.
 * windows  Contact, About and Services at 1440 (mouse) and 820 (touch), both
 *          schemes: whole-page sheets after pressing each window, then the
 *          tab walk (each change of active caption sheeted).
 * swap     1440 and 390: pause, in-school swap to Services and back through
 *          the header (PLAY on return, one mount: one tap pauses); pause,
 *          leave through the switcher to quiet and arrive back through it.
 * Output: scripts/themes/.out/stage6/w3/t24/.
 */
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { BASE, OUT, launch, open, startFilm, startSampler, stopSampler } from './w3-t24-lib.mjs';

const ONLY = (process.env.ONLY || 'remote,windows,swap').split(',');
const SCHEMES = (process.env.SCHEMES || 'light,dark').split(',');
const R = {};

const HOOK = `(() => {
  const P = WebGLRenderingContext.prototype;
  const names = new WeakMap();
  window.__u = {}; window.__draws = 0; window.__log = [];
  const gul = P.getUniformLocation;
  P.getUniformLocation = function (prog, name) { const l = gul.call(this, prog, name); if (l) names.set(l, name); return l; };
  const u1 = P.uniform1f;
  P.uniform1f = function (l, v) { const n = l && names.get(l); if (n) window.__u[n] = v; return u1.call(this, l, v); };
  const da = P.drawArrays;
  P.drawArrays = function (...a) {
    if (this.canvas && this.canvas.matches && this.canvas.matches('[data-vw-horizon]')) {
      // A blended draw is the FF/REW noise pass over the frame just drawn.
      if (this.isEnabled(this.BLEND)) { window.__noise = (window.__noise || 0) + 1; if (window.__log.length) window.__log[window.__log.length - 1].noise = true; }
      else {
        window.__draws++;
        window.__log.push({ t: Math.round(performance.now()), time: window.__u.uTime, seam: window.__u.uSeam });
      }
    }
    return da.apply(this, a);
  };
})();`;

/** A strip of labelled frames (each { data, label }), optionally cropped to a viewport box. */
async function labelledStrip(frames, file, title, { cols = 4, cellW = 360, box = null, vpWidth = 0 } = {}) {
  const images = await Promise.all(frames.map((f) => loadImage(Buffer.from(f.data, 'base64'))));
  const k = box ? images[0].width / vpWidth : 1;
  const src = box ? { x: box.x * k, y: box.y * k, w: box.w * k, h: box.h * k } : { x: 0, y: 0, w: images[0].width, h: images[0].height };
  const cellH = Math.round((src.h / src.w) * cellW);
  const PAD = 10, CAP = 24, HEAD = 30;
  const rows = Math.ceil(images.length / cols);
  const canvas = createCanvas(PAD + cols * (cellW + PAD), HEAD + PAD + rows * (cellH + CAP + PAD));
  const c = canvas.getContext('2d');
  c.fillStyle = '#1b1b1d'; c.fillRect(0, 0, canvas.width, canvas.height);
  c.font = '600 14px sans-serif'; c.textBaseline = 'middle'; c.fillStyle = '#e8e6e1';
  c.fillText(title, PAD, HEAD / 2 + 2);
  images.forEach((img, i) => {
    const x = PAD + (i % cols) * (cellW + PAD), y = HEAD + PAD + Math.floor(i / cols) * (cellH + CAP + PAD);
    c.drawImage(img, src.x, src.y, src.w, src.h, x, y, cellW, cellH);
    c.fillStyle = '#e8e6e1'; c.font = '600 12px sans-serif';
    c.fillText(frames[i].label, x, y + cellH + CAP / 2);
  });
  await writeFile(file, await canvas.encode('png'));
}

/** Whole-page shots side by side, each scaled to cellW. */
async function sheet(shots, file, title, cellW = 300) {
  const images = await Promise.all(shots.map((s) => loadImage(s.buf)));
  const PAD = 10, CAP = 24, HEAD = 30;
  const cellHs = images.map((img) => Math.round((img.height / img.width) * cellW));
  const H = Math.max(...cellHs);
  const canvas = createCanvas(PAD + images.length * (cellW + PAD), HEAD + PAD + H + CAP + PAD);
  const c = canvas.getContext('2d');
  c.fillStyle = '#1b1b1d'; c.fillRect(0, 0, canvas.width, canvas.height);
  c.font = '600 14px sans-serif'; c.textBaseline = 'middle'; c.fillStyle = '#e8e6e1';
  c.fillText(title, PAD, HEAD / 2 + 2);
  images.forEach((img, i) => {
    const x = PAD + i * (cellW + PAD);
    c.drawImage(img, x, HEAD + PAD, cellW, cellHs[i]);
    c.fillStyle = '#e8e6e1'; c.font = '600 12px sans-serif';
    c.fillText(shots[i].label, x, HEAD + PAD + H + CAP / 2);
  });
  await writeFile(file, await canvas.encode('png'));
}

const deckState = (page) => page.evaluate(() => {
  const b = document.querySelector('button[data-deck]');
  return {
    word: document.querySelector('[data-deck-word]')?.textContent,
    aria: b?.getAttribute('aria-label'),
    pressed: b?.getAttribute('aria-pressed'),
    mode: document.querySelector('.hero')?.dataset.deckMode,
    counter: document.querySelector('[data-deck-counter]')?.textContent,
    draws: window.__draws,
    noisePasses: window.__noise || 0,
    scrollY: Math.round(scrollY),
  };
});

const sub = async (name) => { const d = join(OUT, name); await mkdir(d, { recursive: true }); return d; };
const { browser, renderer } = await launch();
R.renderer = renderer;

/* ------------------------------------------------------------ remote */
if (ONLY.includes('remote')) {
  const D = await sub('remote');
  R.remote = {};
  for (const scheme of SCHEMES) {
    for (const width of [1440, 390]) {
      const touch = width < 900;
      const { ctx, page, errors, cdp } = await open(browser, { path: '/t/vaporwave/', width, scheme, settle: 1200, init: HOOK });
      const vp = page.viewportSize();
      const hero = await page.evaluate(() => { const r = document.querySelector('.hero').getBoundingClientRect(); return { x: 0, y: Math.max(0, r.top), w: innerWidth, h: Math.min(innerHeight, r.bottom) - Math.max(0, r.top) }; });
      const btn = await page.evaluate(() => { const r = document.querySelector('button[data-deck]').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }; });
      const marks = [];
      const mark = async (label, shot = false) => marks.push({ label, at: Date.now() / 1000, state: await deckState(page), shot: shot ? (await page.screenshot({ type: 'jpeg', quality: 85 })).toString('base64') : null });
      await startSampler(page, () => ({ word: document.querySelector('[data-deck-word]').textContent, counter: document.querySelector('[data-deck-counter]').textContent, draws: window.__draws, time: window.__u.uTime, noisePasses: window.__noise || 0, seam: window.__u.uSeam }));
      const film = await startFilm(page);
      await mark('start, PLAY');
      await page.waitForTimeout(500);
      const touchAt = async (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
      const swipe = async (x0, y0, x1, y1, hold = 0, steps = 12, midLabel = '') => {
        await touchAt('touchStart', x0, y0);
        for (let i = 1; i <= steps; i++) { await touchAt('touchMove', x0 + ((x1 - x0) * i) / steps, y0 + ((y1 - y0) * i) / steps); await page.waitForTimeout(20); }
        if (midLabel) await mark(midLabel);
        if (hold) await page.waitForTimeout(hold);
        await touchAt('touchEnd');
      };
      if (!touch) {
        await page.mouse.click(btn.x, btn.y);
        await mark('click: PAUSE'); await page.waitForTimeout(700); await mark('paused +700'); await page.waitForTimeout(800); await mark('paused +1500');
        await page.mouse.click(btn.x, btn.y);
        await mark('click: PLAY (hiccup)'); await page.waitForTimeout(700);
        await page.mouse.move(btn.x, btn.y); await page.mouse.down();
        await page.waitForTimeout(700); await mark('hold +700: FF'); await page.waitForTimeout(800); await mark('hold +1500: FF');
        await page.mouse.up(); await mark('release: PLAY'); await page.waitForTimeout(700);
        await page.focus('button[data-deck]');
        await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(700); await mark('ArrowLeft held: REW'); await page.waitForTimeout(800); await mark('ArrowLeft +1500');
        await page.keyboard.up('ArrowLeft'); await mark('ArrowLeft up: PLAY'); await page.waitForTimeout(700);
        await page.keyboard.down('ArrowRight'); await page.waitForTimeout(700); await mark('ArrowRight held: FF');
        await page.keyboard.up('ArrowRight'); await mark('ArrowRight up: PLAY'); await page.waitForTimeout(700);
        await page.keyboard.press('Space'); await mark('Space: PAUSE'); await page.waitForTimeout(700);
        await page.keyboard.press('Enter'); await mark('Enter: PLAY'); await page.waitForTimeout(600);
        // A mouse held on the button and dragged left: REW, released off the hero.
        await page.mouse.move(btn.x, btn.y); await page.mouse.down();
        for (let i = 1; i <= 8; i++) { await page.mouse.move(btn.x + 4 * i, btn.y + 2 * i); await page.waitForTimeout(16); }
        await page.waitForTimeout(300); await mark('mouse drag right: FF');
        await page.mouse.move(btn.x + 400, vp.height - 4); await page.mouse.up(); await mark('released off the hero'); await page.waitForTimeout(500); await mark('+500: PLAY'); await page.waitForTimeout(300);
      } else {
        await page.touchscreen.tap(btn.x, btn.y);
        await mark('tap button: PAUSE'); await page.waitForTimeout(700); await mark('paused +700'); await page.waitForTimeout(800); await mark('paused +1500');
        await page.touchscreen.tap(vp.width / 2, hero.y + hero.h * 0.55);
        await mark('tap hero: PLAY (hiccup)'); await page.waitForTimeout(700);
        await touchAt('touchStart', btn.x, btn.y); await page.waitForTimeout(800); await mark('long press: FF'); await page.waitForTimeout(600);
        await touchAt('touchEnd'); await mark('lift: PLAY'); await page.waitForTimeout(700);
        await swipe(vp.width * 0.2, hero.y + hero.h * 0.6, vp.width * 0.75, hero.y + hero.h * 0.62, 700, 12, 'swipe right, held: FF');
        await mark('swipe right, lift: PLAY'); await page.waitForTimeout(800);
        await swipe(vp.width * 0.8, hero.y + hero.h * 0.6, vp.width * 0.25, hero.y + hero.h * 0.58, 700, 12, 'swipe left, held: REW');
        await mark('swipe left, lift: PLAY'); await page.waitForTimeout(800);
        // A quick flick: FF shows for the 600 ms minimum, then PLAY.
        await swipe(vp.width * 0.3, hero.y + hero.h * 0.6, vp.width * 0.7, hero.y + hero.h * 0.6, 0, 4);
        await mark('quick flick right, lifted'); await page.waitForTimeout(300); await mark('flick +300: FF'); await page.waitForTimeout(500); await mark('flick +800: PLAY'); await page.waitForTimeout(400);
        await swipe(vp.width * 0.5, hero.y + hero.h * 0.8, vp.width * 0.52, hero.y + hero.h * 0.3, 0, 10);
        await page.waitForTimeout(500); await mark('vertical swipe: page scrolled (screenshot)', true);
        await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(400);
      }
      const frames = await film.stop();
      const samples = await stopSampler(page);
      const log = await page.evaluate(() => window.__log);
      // One frame per mark: the last frame the screencast sent by 150 ms after it
      // (the screencast sends a frame only when the screen changes, so the
      // last one sent is what was on screen).
      const picks = marks.map((m, i) => {
        if (m.shot) return { data: m.shot, label: `+${Math.round((m.at - film.t0) * 1000)} ms ${m.label}` };
        const until = Math.min(m.at + 0.15, (marks[i + 1]?.at ?? Infinity) - 0.005);
        const f = frames.filter((fr) => fr.at <= until).pop() ?? frames[0];
        return { data: f.data, label: `+${Math.round((m.at - film.t0) * 1000)} ms ${m.label} (frame +${Math.round((f.at - film.t0) * 1000)})` };
      });
      // The release hiccup: every frame from 60 ms before the first return to PLAY after a hold to 300 ms after it, floor crop.
      const rel = marks.find((m) => /^(release|lift): PLAY/.test(m.label));
      if (rel) {
        const win = frames.filter((fr) => fr.at >= rel.at - 0.06 && fr.at <= rel.at + 0.3);
        const floor = { x: 0, y: hero.y + hero.h * 0.55, w: vp.width, h: hero.h * 0.45 };
        await labelledStrip(win.map((f) => ({ data: f.data, label: `+${Math.round((f.at - rel.at) * 1000)} ms from release` })), join(D, `hiccup-${width}-${scheme}.png`), `vaporwave release hiccup, ${width} ${scheme}: every screencast frame around the return to PLAY (floor crop)`, { cols: 4, cellW: touch ? 220 : 380, box: floor, vpWidth: vp.width });
      }
      const tag = `${width}-${scheme}`;
      await labelledStrip(picks, join(D, `remote-${tag}.png`), `vaporwave remote, ${width} ${touch ? 'touch' : 'mouse + keyboard'}, ${scheme} (hero crop)`, { cols: 4, cellW: touch ? 220 : 380, box: hero, vpWidth: vp.width });
      // Release hiccup: the uSeam values drawn right after each return to PLAY.
      const seams = log.filter((e) => e.seam).map((e) => ({ t: e.t, seam: e.seam }));
      // Off screen: scroll the hero away, count draws over a second.
      await page.evaluate(() => scrollTo(0, document.querySelector('.doors').offsetTop));
      await page.waitForTimeout(400);
      const d0 = await page.evaluate(() => window.__draws); await page.waitForTimeout(1000);
      const d1 = await page.evaluate(() => window.__draws);
      await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(600);
      // Paused: no draws for a second.
      await page.click('button[data-deck]').catch(async () => page.touchscreen.tap(btn.x, btn.y));
      await page.waitForTimeout(300);
      const p0 = await page.evaluate(() => window.__draws); await page.waitForTimeout(1000);
      const p1 = await page.evaluate(() => window.__draws);
      R.remote[tag] = {
        marks: marks.map((m) => ({ label: m.label, ms: Math.round((m.at - film.t0) * 1000), ...m.state })),
        seamDraws: seams,
        drawsOffScreen1s: d1 - d0,
        drawsPaused1s: p1 - p0,
        samples: samples.filter((_, i) => i % 6 === 0),
        errors,
      };
      console.log('remote', tag, 'offscreen draws/s', d1 - d0, 'paused draws/s', p1 - p0, 'seams', seams.length, 'errors', errors.length);
      await ctx.close();
    }
  }
}

/* ----------------------------------------------------------- windows */
if (ONLY.includes('windows')) {
  const D = await sub('windows');
  R.windows = {};
  const bars = (page) => page.evaluate(() => Array.from(document.querySelectorAll('.vw-win')).map((w) => ({
    title: w.querySelector('.vw-win-title')?.textContent,
    active: !w.querySelector('.vw-win-bar').classList.contains('inactive'),
    z: w.style.zIndex,
  })));
  for (const scheme of SCHEMES) {
    for (const width of [1440, 820]) {
      for (const slug of ['contact', 'about', 'services']) {
        const { ctx, page, errors } = await open(browser, { path: `/t/vaporwave/${slug}/`, width, scheme, settle: 900 });
        const touch = width < 900;
        const shots = [{ label: 'as loaded', buf: await page.screenshot({ fullPage: true }) }];
        const rec = { initial: await bars(page), presses: [], tabs: [] };
        const count = await page.evaluate(() => document.querySelectorAll('.vw-win').length);
        // Press each window in body padding near its lower-left corner (no link or field there), then the first again.
        for (const i of [...Array(count).keys(), 0]) {
          const pt = await page.evaluate((i) => {
            const w = document.querySelectorAll('.vw-win')[i];
            w.scrollIntoView({ block: 'center' });
            const r = w.getBoundingClientRect();
            return { x: r.left + 8, y: r.bottom - 8, title: w.querySelector('.vw-win-title').textContent };
          }, i);
          await page.waitForTimeout(250);
          if (touch) await page.touchscreen.tap(pt.x, pt.y); else await page.mouse.click(pt.x, pt.y);
          await page.waitForTimeout(250);
          const state = await bars(page);
          rec.presses.push({ pressed: pt.title, state, activeCount: state.filter((b) => b.active).length });
          shots.push({ label: `${touch ? 'tap' : 'press'} ${pt.title}`, buf: await page.screenshot({ fullPage: true }) });
        }
        await sheet(shots, join(D, `press-${slug}-${width}-${scheme}.png`), `vaporwave ${slug}, ${width} ${touch ? 'touch' : 'mouse'}, ${scheme}: press each window, then the first again`, width > 900 ? 300 : 240);
        // Tab walk from the top.
        await page.evaluate(() => { scrollTo(0, 0); document.activeElement?.blur(); });
        const tabShots = [];
        let lastActive = '';
        for (let k = 0; k < 40; k++) {
          await page.keyboard.press('Tab');
          await page.waitForTimeout(60);
          const f = await page.evaluate(() => {
            const el = document.activeElement;
            const win = el?.closest('.vw-win');
            const act = Array.from(document.querySelectorAll('.vw-win')).filter((w) => !w.querySelector('.vw-win-bar').classList.contains('inactive')).map((w) => w.querySelector('.vw-win-title').textContent);
            return { el: el ? `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''} ${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 40)}` : null, inWindow: win?.querySelector('.vw-win-title')?.textContent ?? null, active: act };
          });
          rec.tabs.push(f);
          const key = f.active.join('|');
          if (f.inWindow && key !== lastActive) {
            lastActive = key;
            tabShots.push({ label: `Tab ${k + 1}: ${f.inWindow}`, buf: await page.screenshot({ fullPage: true }) });
          }
        }
        if (tabShots.length) await sheet(tabShots, join(D, `tab-${slug}-${width}-${scheme}.png`), `vaporwave ${slug}, ${width}, ${scheme}: tab walk, a sheet at each change of active caption`, width > 900 ? 300 : 240);
        rec.errors = errors;
        R.windows[`${slug}-${width}-${scheme}`] = rec;
        console.log('windows', slug, width, scheme, 'presses', rec.presses.map((p) => p.activeCount).join(','), 'tab windows', tabShots.length);
        await ctx.close();
      }
    }
  }
}

/* -------------------------------------------------------------- swap */
if (ONLY.includes('swap')) {
  const D = await sub('swap');
  R.swap = {};
  for (const width of [1440, 390]) {
    const touch = width < 900;
    const scheme = 'dark';
    const tapDeck = async (page) => {
      const b = await page.evaluate(() => { const r = document.querySelector('button[data-deck]').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
      if (touch) await page.touchscreen.tap(b.x, b.y); else await page.mouse.click(b.x, b.y);
      await page.waitForTimeout(300);
    };
    // In-school swap: pause, Services through the header, Home through the header.
    {
      const { ctx, page, errors } = await open(browser, { path: '/t/vaporwave/', width, scheme, settle: 1200, init: HOOK });
      await tapDeck(page);
      const paused = await deckState(page);
      const film = await startFilm(page);
      const marks = [];
      const mark = (label) => marks.push({ label, at: Date.now() / 1000 });
      mark('paused, before the swap');
      await page.locator('a[href$="/t/vaporwave/services/"]:visible').first().click();
      mark('Services clicked'); await page.waitForTimeout(400); mark('+400'); await page.waitForTimeout(1100);
      mark('on Services');
      await page.locator('a[href$="/t/vaporwave/"]:visible').first().click();
      mark('Home clicked'); await page.waitForTimeout(400); mark('+400'); await page.waitForTimeout(1300);
      mark('back on Home');
      const back = await deckState(page);
      const d0 = await page.evaluate(() => window.__draws); await page.waitForTimeout(1000); const d1 = await page.evaluate(() => window.__draws);
      await tapDeck(page);
      const afterOneTap = await deckState(page);
      mark('one tap after return');
      await page.waitForTimeout(400);
      const frames = await film.stop();
      const picks = marks.map((m) => { const f = frames.find((fr) => fr.at >= m.at + 0.08) ?? frames[frames.length - 1]; return { data: f.data, label: `+${Math.round((f.at - film.t0) * 1000)} ms ${m.label}` }; });
      await labelledStrip(picks, join(D, `swap-in-school-${width}.png`), `vaporwave in-school swap with the deck paused, ${width} ${scheme}: Home, Services, Home (PLAY on return; one tap pauses)`, { cols: 4, cellW: touch ? 200 : 360 });
      R.swap[`in-school-${width}`] = { paused, back, drawsPerSecondOnReturn: d1 - d0, afterOneTap, errors };
      console.log('swap in-school', width, back.word, back.pressed, 'draws/s', d1 - d0, 'after one tap', afterOneTap.word);
      await ctx.close();
    }
    // Arrival through the switcher: pause, leave for quiet, come back to vaporwave.
    {
      const { ctx, page, errors } = await open(browser, { path: '/t/vaporwave/', width, scheme, settle: 1200, hideSwitcher: false, init: HOOK });
      await tapDeck(page);
      const paused = await deckState(page);
      const sw = async (school) => {
        await page.evaluate(() => document.querySelector('bdl-switcher').shadowRoot.querySelector('.open').click());
        await page.waitForTimeout(700);
        await page.evaluate((s) => document.querySelector('bdl-switcher').shadowRoot.querySelector(`a[data-school="${s}"]`).click(), school);
      };
      await sw('quiet');
      await page.waitForTimeout(2200);
      const film = await startFilm(page);
      const t0 = Date.now() / 1000;
      await sw('vaporwave');
      await page.waitForTimeout(2400);
      const frames = await film.stop();
      const back = await deckState(page);
      const d0 = await page.evaluate(() => window.__draws); await page.waitForTimeout(1000); const d1 = await page.evaluate(() => window.__draws);
      await tapDeck(page);
      const afterOneTap = await deckState(page);
      const picks = [0, 120, 240, 400, 700, 1000, 1500, 2300].map((ms) => { const f = frames.find((fr) => fr.at >= t0 + 0.7 + ms / 1000) ?? frames[frames.length - 1]; return { data: f.data, label: `+${Math.round((f.at - t0) * 1000)} ms` }; });
      await labelledStrip(picks, join(D, `arrival-${width}.png`), `vaporwave arrival from quiet through the switcher, deck paused before leaving, ${width} ${scheme} (times from the switcher open)`, { cols: 4, cellW: touch ? 200 : 360 });
      R.swap[`arrival-${width}`] = { paused, back, drawsPerSecondOnReturn: d1 - d0, afterOneTap, errors };
      console.log('swap arrival', width, back.word, back.pressed, 'draws/s', d1 - d0, 'after one tap', afterOneTap.word);
      await ctx.close();
    }
  }
}

await writeFile(join(OUT, `evidence-${ONLY.join('-')}.json`), JSON.stringify(R, null, 2));
await browser.close();
console.log('base', BASE, 'out', OUT);
