/**
 * Stage 6 wave 3, task 22: behaviour probes (numbers) for grandmillennial's sampler (About)
 * and envelope (Contact).
 *
 *   node scripts/themes/snap.mjs --name s6-w3-t22 --reuse --port 4470 -- node scripts/themes/stage6/w3-t22-probe.mjs
 *   ONLY=sampler,envelope,swap WIDTHS=1440,820,390 node ...
 *
 * sampler   per width and scheme: the 26 buttons' boxes (size, hit area tiling, rows), tab stops, the
 *           colour of one letter's crosses each frame through a tap (the run length), the thread order
 *           over four taps, Enter and Space on a focused letter, the arrows, a vertical swipe on touch
 *           that scrolls and re-stitches nothing.
 * envelope  per width and scheme: the seal's size; open by tap and close by seal and by card; aria
 *           state; the folded flap's box against the intro's text and the form's boxes; what is under
 *           the submit button and the textarea with the envelope open (it must be the form).
 * swap      one tap after in-school swaps changes the toy once (two instances would change it twice).
 */
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { launch, open, reach } from './w3-t22-lib.mjs';

const ONLY = (process.env.ONLY || 'sampler,envelope,swap').split(',');
const WIDTHS = (process.env.WIDTHS || '1440,1024,820,600,390,360').split(',').map(Number);
const SCHEMES = (process.env.SCHEMES || 'light,dark').split(',');
const { browser } = await launch();
const log = [];
const say = (...a) => { const s = a.join(' '); console.log(s); log.push(s); };
const ABOUT = '/t/grandmillennial/about/';
const CONTACT = '/t/grandmillennial/contact/';

async function touch(page, steps) {
  const cdp = await page.context().newCDPSession(page);
  for (const s of steps) {
    if (s.wait) { await page.waitForTimeout(s.wait); continue; }
    await cdp.send('Input.dispatchTouchEvent', { type: s.type, touchPoints: s.type === 'touchEnd' ? [] : [{ x: s.x, y: s.y, id: 1 }] });
  }
  await cdp.detach();
}
const centreOf = (page, sel, nth = 0) => page.evaluate(({ sel, nth }) => { const r = document.querySelectorAll(sel)[nth].getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, { sel, nth });

if (ONLY.includes('sampler')) {
  for (const scheme of SCHEMES) for (const width of WIDTHS) {
    const { ctx, page, mobile, errors } = await open(browser, { path: ABOUT, width, scheme });
    await reach(page, '.abc-in');
    say(`\nSAMPLER ${scheme} ${width}${mobile ? ' (touch)' : ''}`);
    const geo = await page.evaluate(() => {
      const b = [...document.querySelectorAll('.abc-in button.ltr')];
      const rects = b.map((x) => x.getBoundingClientRect());
      const rows = [...new Set(rects.map((r) => Math.round(r.top)))];
      const perRow = rows.map((y) => rects.filter((r) => Math.round(r.top) === y).length);
      const a = rects[0];
      // hit area = the ::before box: reach it by elementFromPoint at the corners just outside the glyph box
      const probe = (x, y) => document.elementFromPoint(x, y)?.closest('button.ltr')?.getAttribute('aria-label') ?? null;
      const gapX = rects[1].left - a.right;
      return {
        count: b.length, glyph: [+a.width.toFixed(1), +a.height.toFixed(1)], gapX: +gapX.toFixed(1), perRow,
        tabStops: b.filter((x) => x.tabIndex === 0).length,
        hitInGap: probe(a.right + gapX / 2 - 1.5, a.top + a.height / 2), hitPastGap: probe(a.right + gapX / 2 + 1.5, a.top + a.height / 2),
        labels: [b[0].getAttribute('aria-label'), b[25].getAttribute('aria-label')],
        overflowX: document.documentElement.scrollWidth > innerWidth,
      };
    });
    say(' ', JSON.stringify(geo));
    // a tap on A, sampling the colour of A's first and last cross each frame
    const run = async (doTap) => {
      await page.evaluate(() => {
        const a = document.querySelector('.abc-in button.ltr');
        const xs = [...a.querySelectorAll('.x')];
        window.__rows = [];
        const t0 = performance.now();
        const tick = () => {
          const t = Math.round(performance.now() - t0);
          window.__rows.push({ t, go: a.classList.contains('go'), first: getComputedStyle(xs[0]).strokeDashoffset, last: getComputedStyle(xs[xs.length - 1]).strokeDashoffset, now: getComputedStyle(xs[0]).stroke, under: getComputedStyle(a.querySelector('.u')).display });
          if (t < 900) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
      await doTap();
      await page.waitForTimeout(950);
      return page.evaluate(() => window.__rows);
    };
    const [ax, ay] = await centreOf(page, '.abc-in button.ltr', 0);
    const tapA = async () => { if (mobile) await page.touchscreen.tap(ax, ay); else await page.mouse.click(ax, ay); };
    const rows = await run(tapA);
    const goOn = rows.filter((r) => r.go);
    const lastStart = rows.find((r) => r.last !== '2px' && r.go);
    say('  tap A: go from', goOn[0]?.t, 'to', goOn[goOn.length - 1]?.t, 'ms; first colour', rows.at(-1).now, '; samples', rows.length);
    const dash = rows.filter((r) => r.go).filter((_, i) => i % 6 === 0).map((r) => `${r.t}:${r.first}/${r.last}`).join(' ');
    say('  dashoffset first/last cross:', dash);
    const state = () => page.evaluate(() => { const a = document.querySelector('.abc-in button.ltr'); return `${a.dataset.p}>${a.dataset.t}`; });
    const seq = [await state()];
    for (let i = 0; i < 3; i++) { await tapA(); await page.waitForTimeout(700); seq.push(await state()); }
    say('  thread index per tap (p>t):', seq.join('  '), '| computed stroke now:', await page.evaluate(() => getComputedStyle(document.querySelector('.abc-in button.ltr .x')).stroke));
    // the three threads' colours
    const cols = await page.evaluate(async () => {
      const a = document.querySelector('.abc-in button.ltr');
      const out = [];
      for (const t of [0, 1, 2]) { a.dataset.t = String(t); out.push(getComputedStyle(a.querySelector('.x')).stroke); }
      a.dataset.t = '0';
      return out;
    });
    say('  threads:', cols.join(' | '));
    // keyboard: focus a letter by Tab, Enter, Space, arrows
    await page.evaluate(() => { document.activeElement?.blur?.(); window.scrollTo(window.scrollX, window.scrollY); });
    await page.focus('.abc-in button.ltr:nth-child(1)');
    const k = [];
    await page.keyboard.press('Enter'); await page.waitForTimeout(700); k.push(await state());
    await page.keyboard.press('Space'); await page.waitForTimeout(700); k.push(await state());
    const focused = () => page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
    await page.keyboard.press('ArrowRight'); k.push(await focused());
    await page.keyboard.press('ArrowDown'); k.push(await focused());
    await page.keyboard.press('ArrowLeft'); k.push(await focused());
    await page.keyboard.press('ArrowUp'); k.push(await focused());
    await page.keyboard.press('End'); k.push(await focused());
    await page.keyboard.press('Home'); k.push(await focused());
    say('  keys: Enter, Space ->', k.slice(0, 2).join(' / '), '| arrows R,D,L,U,End,Home ->', k.slice(2).join(' / '));
    // tab order: one stop in the band
    const tabs = await page.evaluate(() => [...document.querySelectorAll('.abc-in button.ltr')].filter((x) => x.tabIndex >= 0).length);
    say('  tab stops in the band:', tabs);
    if (mobile) {
      // a vertical swipe starting on a letter scrolls the page and re-stitches nothing
      await page.evaluate(() => { document.querySelectorAll('.abc-in button.ltr').forEach((b) => { b.dataset.t = '0'; b.dataset.p = '0'; b.classList.remove('go'); }); });
      const [bx, by] = await centreOf(page, '.abc-in button.ltr', 9);
      const y0 = await page.evaluate(() => scrollY);
      await touch(page, [{ type: 'touchStart', x: bx, y: by }, { wait: 30 }, ...[1, 2, 3, 4, 5, 6, 7, 8].map((i) => ({ type: 'touchMove', x: bx, y: by - i * 14, })).flatMap((s) => [s, { wait: 16 }]), { type: 'touchEnd' }, { wait: 400 }]);
      const after = await page.evaluate(() => ({ y: scrollY, t: [...document.querySelectorAll('.abc-in button.ltr')].map((b) => b.dataset.t).join('') }));
      say('  swipe up from letter J: scrollY', y0, '->', after.y, '| thread indexes after (all 0 = nothing stitched):', after.t === '0'.repeat(26) ? 'all 0' : after.t);
    }
    if (errors.length) say('  PAGE ERRORS', errors.join(' | '));
    await ctx.close();
  }
}

if (ONLY.includes('envelope')) {
  for (const scheme of SCHEMES) for (const width of WIDTHS) {
    const { ctx, page, mobile, errors } = await open(browser, { path: CONTACT, width, scheme });
    await reach(page, 'section.envelope');
    say(`\nENVELOPE ${scheme} ${width}${mobile ? ' (touch)' : ''}`);
    const closed = await page.evaluate(() => {
      const s = document.querySelector('.seal-btn').getBoundingClientRect();
      const env = document.querySelector('section.envelope');
      return { seal: [+s.width.toFixed(1), +s.height.toFixed(1)], label: document.querySelector('.seal-btn').getAttribute('aria-label'), expanded: document.querySelector('.seal-btn').getAttribute('aria-expanded'), open: env.dataset.open, tag: document.querySelector('.seal-btn').tagName };
    });
    say('  closed:', JSON.stringify(closed));
    const tapSeal = async () => { await page.evaluate(() => document.querySelector('.seal-btn').scrollIntoView({ block: 'center' })); await page.waitForTimeout(60); const [x, y] = await centreOf(page, '.seal-btn'); if (mobile) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
    // sample the lid and card each frame through an open
    await page.evaluate(() => {
      const lid = document.querySelector('.lid'), card = document.querySelector('.card'), li = document.querySelector('.lining');
      window.__rows = [];
      const t0 = performance.now();
      const tick = () => {
        const t = Math.round(performance.now() - t0);
        const m = new DOMMatrix(getComputedStyle(lid).transform);
        const ang = Math.round(Math.atan2(m.m23 || 0, m.m22) * 180 / Math.PI);
        window.__rows.push({ t, ang, card: Math.round(new DOMMatrix(getComputedStyle(card).transform).m42 * 10) / 10, lin: +(+getComputedStyle(li).opacity).toFixed(2), z: getComputedStyle(lid).zIndex, cardTop: Math.round(card.getBoundingClientRect().top) });
        if (t < 800) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await page.waitForTimeout(60);
    await tapSeal();
    await page.waitForTimeout(850);
    const rows = await page.evaluate(() => window.__rows);
    say('  open run (t:flap angle / card ty px / lining / lid z):', rows.filter((_, i) => i % 3 === 0).slice(0, 14).map((r) => `${r.t}:${r.ang}/${r.card}/${r.lin}/${r.z}`).join('  '));
    const last = rows.at(-1);
    say('  settled: angle', last.ang, 'card translate-y', last.card, '(card shifts 24px: top moved', rows[0].cardTop - last.cardTop, 'px)');
    const state = await page.evaluate(() => ({ label: document.querySelector('.seal-btn').getAttribute('aria-label'), expanded: document.querySelector('.seal-btn').getAttribute('aria-expanded'), open: document.querySelector('section.envelope').dataset.open }));
    say('  open state:', JSON.stringify(state));
    // geometry with the envelope open
    const g = await page.evaluate(() => {
      const R = (e) => { const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; };
      const lid = R(document.querySelector('.lid')), card = R(document.querySelector('.card')), env = R(document.querySelector('section.envelope'));
      const hit = (a, b) => Math.max(0, Math.min(a.r, b.r) - Math.max(a.l, b.l)) * Math.max(0, Math.min(a.b, b.b) - Math.max(a.t, b.t));
      const targets = {};
      for (const [name, sel] of [['kicker', '.intro .gm-kicker'], ['h1', '.intro h1'], ['subline', '.intro .subline'], ['stationery', '.stationery'], ['letterhead', '.letterhead'], ['labels', 'label'], ['inputs', 'input:not([tabindex="-1"]), textarea'], ['submit', 'form button[type=submit]']]) {
        const els = [...document.querySelectorAll(sel)].filter((e) => e.offsetParent !== null && getComputedStyle(e).visibility !== 'hidden');
        targets[name] = Math.round(els.reduce((m, e) => Math.max(m, hit(lid, R(e)), hit(card, R(e))), 0));
      }
      // what the user would hit at the form's controls, envelope open
      const under = {};
      for (const [name, sel] of [['submit', 'form button[type=submit]'], ['textarea', 'textarea'], ['name', '#cf-name'], ['email', '#cf-email']]) {
        const r = document.querySelector(sel).getBoundingClientRect();
        const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        under[name] = el && (el === document.querySelector(sel) || el.closest('form')) ? 'form' : (el?.className || el?.tagName);
      }
      const intro = R(document.querySelector('.intro')), form = R(document.querySelector('.stationery'));
      return { lid: Object.values(lid).map(Math.round), card: Object.values(card).map(Math.round), env: Object.values(env).map(Math.round), overlapPx2: targets, hitUnderControls: under, lidAboveEnvelope: Math.round(env.t - lid.t), formBottomToEnvTop: Math.round(env.t - form.b), introBottomToLidTop: Math.round(lid.t - intro.b) };
    });
    say('  geometry (open):', JSON.stringify(g));
    // the form stays usable: type in a field and tab to it with the envelope open
    await page.fill('#cf-name', 'Test'); await page.fill('#cf-email', 'a@b.co'); await page.fill('#cf-message', 'hello');
    const vals = await page.evaluate(() => [document.querySelector('#cf-name').value, document.querySelector('#cf-email').value, document.querySelector('#cf-message').value].join('|'));
    say('  form usable while open (typed values):', vals);
    // close: by the card, then open and close by the seal; then keyboard
    const [cx, cy] = await page.evaluate(() => { const r = document.querySelector('.card').getBoundingClientRect(); const s = document.querySelector('.seal-btn').getBoundingClientRect(); const x = r.left + r.width / 2; /* card centre above the seal */ return [x, r.top + 40]; });
    await page.evaluate(({ cx, cy }) => window.scrollTo(0, scrollY), { cx, cy });
    const [cx2, cy2] = await centreOf(page, '.card');
    const topEl = await page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e?.className?.baseVal ?? e?.className ?? e?.tagName; }, [cx2, cy2 - 30]);
    say('  element at the card (30px above its centre):', topEl);
    const tapAt = async (x, y) => { if (mobile) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
    await tapAt(cx2, cy2 - 30);
    await page.waitForTimeout(700);
    say('  after a tap on the card:', await page.evaluate(() => `${document.querySelector('section.envelope').dataset.open} ${document.querySelector('.seal-btn').getAttribute('aria-label')}`));
    await tapSeal(); await page.waitForTimeout(500);
    const was = await page.evaluate(() => document.querySelector('section.envelope').dataset.open);
    await tapSeal(); await page.waitForTimeout(700);
    say('  seal tap open then close:', was, '->', await page.evaluate(() => document.querySelector('section.envelope').dataset.open));
    await page.focus('.seal-btn'); await page.keyboard.press('Enter'); await page.waitForTimeout(500);
    const ek = await page.evaluate(() => document.querySelector('section.envelope').dataset.open);
    await page.keyboard.press('Space'); await page.waitForTimeout(500);
    say('  keyboard Enter then Space:', ek, '->', await page.evaluate(() => document.querySelector('section.envelope').dataset.open));
    if (errors.length) say('  PAGE ERRORS', errors.join(' | '));
    await ctx.close();
  }
}

if (ONLY.includes('swap')) {
  const go = async (page, label) => {
    await page.evaluate((label) => { const a = [...document.querySelectorAll('header nav a')].find((l) => l.getAttribute('href').includes('/' + label)) || document.querySelector('header .wordmark'); a.click(); }, label);
    await page.waitForTimeout(1600);
  };
  for (const width of [1440, 390]) {
    const { ctx, page, mobile } = await open(browser, { path: '/t/grandmillennial/', width });
    say(`\nSWAP ${width}`);
    // Home > About > Contact (open the envelope) > Services > About > Contact > About
    await go(page, 'about');
    await go(page, 'contact');
    await reach(page, 'section.envelope');
    const [sx, sy] = await centreOf(page, '.seal-btn');
    if (mobile) await page.touchscreen.tap(sx, sy); else await page.mouse.click(sx, sy);
    await page.waitForTimeout(500);
    say(' contact after a swap, one tap:', await page.evaluate(() => document.querySelector('section.envelope').dataset.open), '(open = one instance)');
    await go(page, 'services');
    await go(page, 'contact');
    say(' returned to contact (was left open):', await page.evaluate(() => `${document.querySelector('section.envelope').dataset.open} ${document.querySelector('.seal-btn').getAttribute('aria-label')}`), '(closed on return)');
    await reach(page, 'section.envelope');
    const [tx, ty] = await centreOf(page, '.seal-btn');
    if (mobile) await page.touchscreen.tap(tx, ty); else await page.mouse.click(tx, ty);
    await page.waitForTimeout(500);
    say(' second visit, one tap:', await page.evaluate(() => document.querySelector('section.envelope').dataset.open));
    await go(page, 'about');
    await reach(page, '.abc-in');
    const [ax, ay] = await centreOf(page, '.abc-in button.ltr', 0);
    if (mobile) await page.touchscreen.tap(ax, ay); else await page.mouse.click(ax, ay);
    await page.waitForTimeout(700);
    say(' about after swaps, one tap on A: thread index', await page.evaluate(() => document.querySelector('.abc-in button.ltr').dataset.t), '(1 = one instance)');
    await go(page, 'services');
    await go(page, 'about');
    await reach(page, '.abc-in');
    say(' about again: A thread index', await page.evaluate(() => document.querySelector('.abc-in button.ltr').dataset.t), '(0 = fresh visit)');
    // leave the school and come back: no toy runs on other pages
    await ctx.close();
  }
}

await writeFile(join(process.cwd(), 'scripts', 'themes', '.out', 'stage6', 'w3', 't22', 'probe-log.txt'), log.join('\n'));
await browser.close();
