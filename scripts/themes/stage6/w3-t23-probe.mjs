/**
 * Stage 6 wave 3, task 23: numbers for cottagecore's dandelion clock and date stamp. Prints JSON.
 *
 *   node scripts/themes/snap.mjs --name s6-w3-t23 --reuse --port 4470 -- node scripts/themes/stage6/w3-t23-probe.mjs
 *   ONLY=clock,stamp,swipe,swap,layout SIZES=1440,820,390 node ...
 *
 * clock   light: three taps in a row on the head at each size, per tap the seeds the clock sent (the event's n),
 *         the seeds that came to the canvas near the head in the first frames (counted by wrapping drawImage on the
 *         seed sprite), the toy's seeds that are mid-refill, and how many are whole again 21 s after the first tap.
 *         dark: the tap's mote (a flash of the halo sprite above the head).
 * stamp   forty presses at each size: every fresh mark's ring against every line of text on the postcard (and on
 *         the form, which it must never reach); how many marks show after six presses; the oldest fading.
 * swipe   touch: a vertical swipe starting on each toy scrolls the page and fires nothing.
 * swap    in-school swap at 1440 mid-drift, and back: one listener, one canvas, never doubled seeds.
 * layout  no horizontal overflow, the toys clear of text, at 1440, 1280, 1024, 820, 390.
 */
import { launch, reach, centre } from './w3-t23-lib.mjs';

const ONLY = (process.env.ONLY || 'clock,stamp,swipe,swap,layout,form').split(',');
const SIZES = (process.env.SIZES || '1440,820,390').split(',').map(Number);
const HOME = '/t/cottagecore/';
const CONTACT = '/t/cottagecore/contact/';
const SENT = '/t/cottagecore/contact/sent/';
const { browser } = await launch();
const out = {};

/** Counts what the seed canvas draws: a frame starts at its clearRect; a seed is a 256 px sprite, a halo a 128 px one. */
const INSTRUMENT = () => {
  window.__frames = [];
  window.__blows = [];
  window.__blowListeners = 0;
  const frames = window.__frames;
  const clear = CanvasRenderingContext2D.prototype.clearRect;
  CanvasRenderingContext2D.prototype.clearRect = function (...a) {
    if (this.canvas && this.canvas.hasAttribute('data-cc-motes')) frames.push({ t: performance.now(), seeds: [], halos: [] });
    return clear.apply(this, a);
  };
  const draw = CanvasRenderingContext2D.prototype.drawImage;
  CanvasRenderingContext2D.prototype.drawImage = function (img, ...a) {
    if (this.canvas && this.canvas.hasAttribute('data-cc-motes') && frames.length) {
      const f = frames[frames.length - 1];
      const m = this.getTransform();
      if (img.width === 256) f.seeds.push({ x: m.e, y: m.f, a: this.globalAlpha });
      else if (img.width === 128) f.halos.push({ x: a[0] + a[2] / 2, y: a[1] + a[3] / 2, r: a[2] / 2, a: this.globalAlpha });
    }
    return draw.call(this, img, ...a);
  };
  const add = window.addEventListener;
  const remove = window.removeEventListener;
  window.addEventListener = function (type, ...rest) { if (type === 'cc:blow') window.__blowListeners++; return add.call(this, type, ...rest); };
  window.removeEventListener = function (type, ...rest) { if (type === 'cc:blow') window.__blowListeners--; return remove.call(this, type, ...rest); };
  add.call(window, 'cc:blow', (e) => window.__blows.push({ t: performance.now(), n: e.detail.n, x: e.detail.x, y: e.detail.y, r: e.detail.r }));
};

async function openInstrumented({ path, width, scheme, touch }) {
  const mobile = touch ?? width < 900;
  const height = width < 700 ? 844 : width < 1100 ? 1180 : 900;
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile, colorScheme: scheme, reducedMotion: 'no-preference' });
  const { suppressPrompt } = await import('../lib/portal-prompt.mjs');
  await suppressPrompt(ctx);
  await ctx.addInitScript((s) => { try { localStorage.setItem('scheme', s); } catch {} }, scheme);
  await ctx.addInitScript(INSTRUMENT);
  await ctx.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
  await page.goto(`http://127.0.0.1:4470${path}`, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: 'bdl-switcher{display:none!important}' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(2500);
  return { ctx, page, cdp, errors, mobile };
}

async function tap(page, mobile, x, y) { if (mobile) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); }

if (ONLY.includes('clock')) {
  out.clock = {};
  for (const width of SIZES) for (const [name, path] of [['home', HOME], ['sent', SENT]]) {
    const { ctx, page, mobile, errors } = await openInstrumented({ path, width, scheme: 'light' });
    await reach(page, '[data-cc-toy="dandelion"]');
    const [x, y] = await centre(page, '[data-cc-toy="dandelion"] .dc-head');
    const taps = [];
    const t0 = Date.now();
    for (let i = 0; i < 3; i++) {
      const before = await page.evaluate(() => window.__frames.length);
      await tap(page, mobile, x, y);
      await page.waitForTimeout(450);
      const r = await page.evaluate(() => {
        const blow = window.__blows[window.__blows.length - 1];
        const frames = window.__frames;
        const last = frames[frames.length - 1];
        const dpr = document.querySelector('[data-cc-motes]').width / innerWidth;
        const near = last.seeds.filter((s) => Math.hypot(s.x / dpr - blow.x, s.y / dpr - blow.y) < blow.r * 3 && s.a > 0.05).length;
        const away = [...document.querySelectorAll('[data-cc-toy="dandelion"] .sd')].filter((s) => s.getAnimations().length).length;
        return { sent: blow.n, nearHeadAfter450ms: near, seedsOnCanvas: last.seeds.filter((s) => s.a > 0.05).length, gone: away };
      });
      taps.push({ at: Date.now() - t0, ...r, framesBefore: before });
      await page.waitForTimeout(500);
    }
    await page.waitForTimeout(21500 - (Date.now() - t0));
    const whole = await page.evaluate(() => [...document.querySelectorAll('[data-cc-toy="dandelion"] .sd')].filter((s) => s.getAnimations().length).length);
    out.clock[`${name}-${width}`] = { taps, stillMidRefill21s: whole, errors };
    await ctx.close();
  }
  out.clockDark = {};
  for (const width of SIZES) for (const [name, path] of [['home', HOME], ['sent', SENT]]) {
    const { ctx, page, mobile, errors } = await openInstrumented({ path, width, scheme: 'dark' });
    await reach(page, '[data-cc-toy="dandelion"]');
    const [x, y] = await centre(page, '[data-cc-toy="dandelion"] .dc-head');
    await page.evaluate(() => { window.__frames.length = 0; });
    await tap(page, mobile, x, y);
    await page.waitForTimeout(3200);
    const r = await page.evaluate(() => {
      const blow = window.__blows[window.__blows.length - 1];
      // a halo that comes within 80px of the blow point and then goes up: the rising mote
      const track = window.__frames.map((f) => f.halos.filter((h) => h.a > 0.2 && Math.hypot(h.x - blow.x, h.y - blow.y) < 220)).filter((h) => h.length);
      const ys = track.map((h) => Math.min(...h.map((q) => q.y)));
      return { blow: { x: Math.round(blow.x), y: Math.round(blow.y) }, framesWithMoteNear: track.length, topY: ys.length ? Math.round(Math.min(...ys)) : null, firstY: ys.length ? Math.round(ys[0]) : null, lastY: ys.length ? Math.round(ys[ys.length - 1]) : null, seedsDrawn: Math.max(...window.__frames.map((f) => f.seeds.length)), bald: [...document.querySelectorAll('[data-cc-toy="dandelion"] .sd')].filter((s) => s.getAnimations().length).length };
    });
    out.clockDark[`${name}-${width}`] = { ...r, errors };
    await ctx.close();
  }
}

if (ONLY.includes('stamp')) {
  out.stamp = {};
  for (const width of [1440, 1024, 820, 390]) {
    const { ctx, page, mobile, errors } = await openInstrumented({ path: CONTACT, width, scheme: 'light' });
    await reach(page, '[data-cc-toy="stamp"]');
    const [x, y] = await centre(page, '[data-cc-toy="stamp"]');
    const hits = { postcardText: 0, form: 0, address: 0 };
    let worst = { postcardText: 0 };
    const shown = [];
    for (let i = 0; i < 40; i++) {
      await tap(page, mobile, x, y);
      await page.waitForTimeout(260);
      const r = await page.evaluate(() => {
        const slots = [...document.querySelectorAll('#cc-pad-contact .cm')];
        // the slot that is newest: the highest base opacity change is not readable, so use the one whose animation just ran
        const rects = [];
        for (const s of slots) {
          const b = s.getBoundingClientRect();
          const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
          const size = s.getBoundingClientRect(); void size;
          const cs = getComputedStyle(s);
          rects.push({ cx, cy, rad: (parseFloat(cs.width) * 33) / 70, op: Number(cs.opacity) });
        }
        const text = [];
        const walker = document.createTreeWalker(document.querySelector('.postcard'), NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.nodeValue.trim() && !n.parentElement.closest('svg, [aria-hidden="true"]') ? 1 : 3) });
        const range = document.createRange();
        for (let n = walker.nextNode(); n; n = walker.nextNode()) { range.selectNodeContents(n); for (const q of range.getClientRects()) if (q.width > 1) text.push(q); }
        const form = [...document.querySelectorAll('.stationery')].map((e) => e.getBoundingClientRect());
        const hit = (c, q) => { const nx = Math.max(q.left, Math.min(c.cx, q.right)), ny = Math.max(q.top, Math.min(c.cy, q.bottom)); return Math.hypot(nx - c.cx, ny - c.cy) < c.rad; };
        let t = 0, f = 0;
        for (const c of rects) { if (c.op < 0.05) continue; if (text.some((q) => hit(c, q))) t++; if (form.some((q) => hit(c, q))) f++; }
        return { visible: rects.filter((c) => c.op > 0.04).length, t, f };
      });
      if (i < 8) shown.push(r.visible);
      hits.postcardText += r.t;
      hits.form += r.f;
      worst.postcardText = Math.max(worst.postcardText, r.t);
    }
    const reach2 = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    out.stamp[width] = { markCountAfterEachOfFirst8Presses: shown, marksOverPostcardTextSummedOver40Presses: hits.postcardText, marksOverForm: hits.form, worstMarksOverTextAtOnce: worst.postcardText, horizontalOverflowPx: reach2, errors };
    await ctx.close();
  }
  for (const width of [1440, 390]) {
    const { ctx, page, mobile } = await openInstrumented({ path: SENT, width, scheme: 'light' });
    await reach(page, '[data-cc-toy="stamp"]');
    const [x, y] = await centre(page, '[data-cc-toy="stamp"]');
    const seen = [];
    for (let i = 0; i < 4; i++) {
      await tap(page, mobile, x, y);
      await page.waitForTimeout(500);
      seen.push(await page.evaluate(() => { const s = document.querySelector('#cc-pad-sent .cm'); const cs = getComputedStyle(s); return { opacity: Number(Number(cs.opacity).toFixed(2)), rot: s.style.getPropertyValue('--rot'), dx: s.style.getPropertyValue('--dx'), count: document.querySelectorAll('#cc-pad-sent .cm').length }; }));
    }
    out.stamp[`sent-${width}`] = seen;
    await ctx.close();
  }
}

if (ONLY.includes('swipe')) {
  out.swipe = {};
  const width = 390;
  for (const [name, path, sel, scheme] of [['clock', HOME, '[data-cc-toy="dandelion"]', 'light'], ['stamp', CONTACT, '[data-cc-toy="stamp"]', 'light'], ['stampSent', SENT, '[data-cc-toy="stamp"]', 'light'], ['clockSent', SENT, '[data-cc-toy="dandelion"]', 'light']]) {
    const { ctx, page, cdp } = await openInstrumented({ path, width, scheme });
    await page.evaluate((sel) => { const e = document.querySelector(sel); const r = e.getBoundingClientRect(); window.scrollBy(0, r.top - 600); }, sel);
    await page.waitForTimeout(500);
    const [x, y] = await centre(page, sel);
    const y0 = await page.evaluate(() => scrollY);
    const blowsBefore = await page.evaluate(() => window.__blows.length);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let i = 1; i <= 12; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - i * 12 }] }); await page.waitForTimeout(16); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(600);
    const r = await page.evaluate(({ sel, blowsBefore }) => {
      const el = document.querySelector(sel);
      return { scrolled: scrollY, blows: window.__blows.length - blowsBefore, seedsGone: [...el.querySelectorAll('.sd')].filter((s) => s.getAnimations().length).length, marks: [...document.querySelectorAll('.cm')].filter((m) => Number(getComputedStyle(m).opacity) > 0.02).length };
    }, { sel, blowsBefore });
    out.swipe[name] = { startY: y0, ...r };
    await ctx.close();
  }
}

if (ONLY.includes('swap')) {
  out.swap = {};
  const { ctx, page, mobile, errors } = await openInstrumented({ path: HOME, width: 1440, scheme: 'light' });
  await reach(page, '[data-cc-toy="dandelion"]');
  const [x, y] = await centre(page, '[data-cc-toy="dandelion"] .dc-head');
  await tap(page, mobile, x, y);
  await page.waitForTimeout(700);
  const mid = await page.evaluate(() => ({ listeners: window.__blowListeners, canvases: document.querySelectorAll('[data-cc-motes]').length, seeds: window.__frames[window.__frames.length - 1].seeds.filter((s) => s.a > 0.02).length }));
  // the real in-school swap: header nav, Contact, then Home again
  await page.click('nav a[href*="contact"]');
  await page.waitForURL('**/contact/**');
  await page.waitForTimeout(1800);
  const away = await page.evaluate(() => ({ listeners: window.__blowListeners, canvases: document.querySelectorAll('[data-cc-motes]').length, toys: document.querySelectorAll('[data-cc-toy]').length }));
  await page.click('.cc-header a[href="/t/cottagecore/"], header a[href="/t/cottagecore/"]');
  await page.waitForURL((u) => u.pathname === '/t/cottagecore/');
  await page.waitForTimeout(2600);
  await reach(page, '[data-cc-toy="dandelion"]');
  const back = await page.evaluate(() => ({ listeners: window.__blowListeners, canvases: document.querySelectorAll('[data-cc-motes]').length, toys: document.querySelectorAll('[data-cc-toy]').length, gone: [...document.querySelectorAll('.sd')].filter((s) => s.getAnimations().length).length, seedsMax: Math.max(...window.__frames.slice(-90).map((f) => f.seeds.filter((s) => s.a > 0.02).length)) }));
  const [x2, y2] = await centre(page, '[data-cc-toy="dandelion"] .dc-head');
  const nBefore = await page.evaluate(() => window.__blows.length);
  await tap(page, mobile, x2, y2);
  await page.waitForTimeout(450);
  const again = await page.evaluate((nBefore) => ({ blowEvents: window.__blows.length - nBefore, sent: window.__blows[window.__blows.length - 1].n, seedsOnCanvas: window.__frames[window.__frames.length - 1].seeds.filter((s) => s.a > 0.02).length }), nBefore);
  out.swap = { mid, away, back, again, errors };
  await ctx.close();
}

if (ONLY.includes('form')) {
  out.form = {};
  for (const width of [1440, 390]) {
    const { ctx, page, mobile, errors } = await openInstrumented({ path: CONTACT, width, scheme: 'light' });
    await page.fill('#cf-name', 'Ada');
    await page.focus('#cf-message');
    await page.keyboard.type('Hello, ');
    await reach(page, '[data-cc-toy="stamp"]');
    await page.evaluate(() => document.querySelector('#cf-message').focus());
    for (let i = 0; i < 6; i++) {
      // typing scrolls the caret into view, so the stamp is found again each time
      await reach(page, '[data-cc-toy="stamp"]');
      const [x, y] = await centre(page, '[data-cc-toy="stamp"]');
      await page.evaluate(() => document.querySelector('#cf-message').focus({ preventScroll: true }));
      await tap(page, mobile, x, y);
      await page.keyboard.type('x');
      await page.waitForTimeout(120);
    }
    const r = await page.evaluate(() => ({ active: document.activeElement && document.activeElement.id, name: document.querySelector('#cf-name').value, message: document.querySelector('#cf-message').value, selection: String(getSelection()) }));
    await page.click('#cf-email');
    await page.keyboard.type('a@b.co');
    const email = await page.evaluate(() => document.querySelector('#cf-email').value);
    out.form[width] = { ...r, email, errors };
    await ctx.close();
  }
}

if (ONLY.includes('layout')) {
  out.layout = {};
  for (const scheme of ['light', 'dark']) for (const width of [1440, 1280, 1024, 820, 390]) for (const [name, path] of [['home', HOME], ['contact', CONTACT], ['sent', SENT]]) {
    const { ctx, page, errors } = await openInstrumented({ path, width, scheme });
    const r = await page.evaluate(() => {
      const toys = [...document.querySelectorAll('[data-cc-toy]')];
      const text = [];
      const range = document.createRange();
      const walker = document.createTreeWalker(document.querySelector('main'), NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.nodeValue.trim() && !n.parentElement.closest('svg, [aria-hidden="true"]') ? 1 : 3) });
      for (let n = walker.nextNode(); n; n = walker.nextNode()) { range.selectNodeContents(n); for (const q of range.getClientRects()) if (q.width > 1) text.push(q); }
      const hits = [];
      for (const t of toys) {
        const b = t.getBoundingClientRect();
        const over = text.filter((q) => q.left < b.right && q.right > b.left && q.top < b.bottom && q.bottom > b.top).length;
        hits.push({ toy: t.dataset.ccToy, w: Math.round(b.width), h: Math.round(b.height), overText: over });
      }
      const wide = [...document.querySelectorAll('[data-cc-toy]')].map((t) => Math.round(t.getBoundingClientRect().right));
      return { toys: hits, overflowPx: document.documentElement.scrollWidth - innerWidth, rights: wide, aria: toys.every((t) => t.getAttribute('aria-hidden') === 'true') };
    });
    out.layout[`${scheme}-${name}-${width}`] = { ...r, errors };
    await ctx.close();
  }
}

console.log(JSON.stringify(out, null, 1));
await browser.close();
