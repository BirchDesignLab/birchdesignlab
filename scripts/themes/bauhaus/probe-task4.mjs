/** Probe: bauhaus B2 task 4 (assembly switch, press states, see-saw, Sent roll,
    loose shapes). Port 4460, GPU Chromium. Needs a fresh dist/.
    Output: console JSON plus timestamped strips in scripts/themes/.out/stage4/task-4/. */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveDist } from '../lib/serve-dist.mjs';
import { suppressPrompt } from '../lib/portal-prompt.mjs';
const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const OUT = join(REPO, 'scripts', 'themes', '.out', 'stage4', 'task-4');
mkdirSync(OUT, { recursive: true });
const server = await serveDist(4460, join(REPO, 'dist'));
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const B = 'http://127.0.0.1:4460/t/bauhaus/';
const log = (k, v) => console.log(k, JSON.stringify(v));
const mk = async (w, h, mobile = false) => {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile, reducedMotion: 'no-preference' });
  await suppressPrompt(ctx);
  const p = await ctx.newPage();
  await p.emulateMedia({ reducedTransparency: 'no-preference', reducedMotion: 'no-preference' });
  return { ctx, p };
};
const attr = (p) => p.evaluate(() => document.documentElement.getAttribute('data-bh-assembly'));
const only = process.argv[2] ? process.argv[2].split(',') : null;
const want = (n) => !only || only.includes(n);
try {
  {
    const { ctx, p } = await mk(1440, 900);
    log('renderer', await p.evaluate(() => { const c = document.createElement('canvas'); const g = c.getContext('webgl'); const x = g && g.getExtension('WEBGL_debug_renderer_info'); return x ? g.getParameter(x.UNMASKED_RENDERER_WEBGL).slice(0, 70) : 'n/a'; }));
    await ctx.close();
  }
  if (want('switch')) {
    const { ctx, p } = await mk(1440, 900);
    await p.goto(B, { waitUntil: 'networkidle' });
    log('default attr', await attr(p));
    const dur = await p.evaluate(() => getComputedStyle(document.querySelector('.poster .asm')).animationName + ' ' + getComputedStyle(document.querySelector('.poster .asm')).animationDuration);
    log('default anim', dur);
    await p.goto(B + '?bh-assembly=b', { waitUntil: 'networkidle' });
    log('?b attr', await attr(p));
    log('?b anim', await p.evaluate(() => getComputedStyle(document.querySelector('.poster .asm')).animationName + ' ' + getComputedStyle(document.querySelector('.poster .asm')).animationDuration));
    // attribute before first paint: check via an early init script on a fresh page
    await p.goto(B + 'about/', { waitUntil: 'networkidle' });
    log('remembered on hard load (no param)', await attr(p));
    // in-school swap through the nav
    await p.goto(B, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.documentElement.setAttribute('data-probe', '1'));
    await p.click('header nav a[href*="services"]');
    await p.waitForURL(/services/);
    await p.waitForTimeout(800);
    log('after in-school swap', { attr: await attr(p), probe: await p.evaluate(() => document.documentElement.getAttribute('data-probe')) });
    await p.goto(B + '?bh-assembly=c', { waitUntil: 'networkidle' });
    log('?c attr', await attr(p));
    await p.goto(B + '?bh-assembly=a', { waitUntil: 'networkidle' });
    log('?a clears', await attr(p));
    await p.goto(B + 'about/', { waitUntil: 'networkidle' });
    log('a stays cleared', await attr(p));
    // arrival from quiet through the real switcher, with c remembered
    await p.goto(B + '?bh-assembly=c', { waitUntil: 'networkidle' });
    await p.goto('http://127.0.0.1:4460/t/quiet/', { waitUntil: 'networkidle' });
    log('on quiet', await attr(p));
    await p.evaluate(() => document.querySelector('bdl-switcher').shadowRoot.querySelector('.open').click());
    await p.waitForTimeout(300);
    await p.evaluate(() => document.querySelector('bdl-switcher').shadowRoot.querySelector('a[data-school="bauhaus"]').click());
    await p.waitForURL(/bauhaus/);
    await p.waitForTimeout(1500);
    log('arrival from quiet, c remembered', { attr: await attr(p), anim: await p.evaluate(() => getComputedStyle(document.querySelector('.poster .asm')).animationName) });
    await ctx.close();
  }
  if (want('press')) {
    const { ctx, p } = await mk(1440, 900);
    await p.goto(B, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.querySelectorAll('[data-reveal]').forEach((e) => e.classList.add('is-settled')));
    const btn = p.locator('.closer .btn');
    await btn.scrollIntoViewIfNeeded();
    const bb = await btn.boundingBox();
    await p.mouse.move(bb.x + 20, bb.y + 20);
    await p.mouse.down();
    await p.waitForTimeout(50);
    log('btn pressed', await p.evaluate(() => { const b = document.querySelector('.closer .btn'); return { t: getComputedStyle(b).transform, r: getComputedStyle(b, '::after').borderRadius }; }));
    await p.mouse.move(5, 5);
    await p.mouse.up();
    const nav = p.locator('header nav a').nth(2);
    await p.evaluate(() => scrollTo(0, 0)); const nb = await nav.boundingBox();
    await p.mouse.move(nb.x + 10, nb.y + 10);
    await p.mouse.down();
    await p.waitForTimeout(30);
    log('nav pressed', await nav.evaluate((e) => getComputedStyle(e).backgroundColor));
    await p.mouse.move(5, 5);
    await p.mouse.up();
    const more = p.locator('.doors .more');
    await more.scrollIntoViewIfNeeded();
    const mb = await more.boundingBox();
    await p.mouse.move(mb.x + 10, mb.y + 10);
    await p.mouse.down();
    await p.waitForTimeout(400);
    log('more pressed', await more.evaluate((e) => getComputedStyle(e, '::after').transform));
    await p.mouse.move(5, 5);
    await p.mouse.up();
    await ctx.close();
    // hover gating: a touch device never matches the fenced rules
    const t = await mk(390, 844, true);
    await t.p.goto(B, { waitUntil: 'networkidle' });
    log('touch hover media', await t.p.evaluate(() => matchMedia('(hover: hover) and (pointer: fine)').matches));
    await t.ctx.close();
  }
  if (want('seesaw')) {
    for (const mode of ['a', 'b', 'c']) {
      const { ctx, p } = await mk(1440, 900);
      await p.goto(B + '?bh-assembly=' + mode, { waitUntil: 'commit' });
      await p.waitForSelector('.seesaw');
      // park the closer in view without settling the gate: scroll, then let the observer settle it
      await p.evaluate(() => document.querySelector('.seesaw').scrollIntoView({ block: 'center' }));
      const samples = await p.evaluate(async () => {
        const out = [];
        const beam = document.querySelector('.seesaw .beam');
        const t0 = performance.now();
        while (performance.now() - t0 < 3000) {
          out.push([Math.round(performance.now() - t0), getComputedStyle(beam).rotate, document.querySelector('.seesaw').classList.contains('is-settled') ? 1 : 0]);
          await new Promise((r) => requestAnimationFrame(r));
        }
        return out;
      });
      const changes = samples.filter((s, i) => i === 0 || s[1] !== samples[i - 1][1]);
      const first = changes.slice(0, 12);
      const tipped = samples.filter((s) => s[1] !== 'none' && s[1] !== '0deg');
      log('seesaw ' + mode, { distinct: new Set(samples.map((s) => s[1])).size, firstTip: tipped[0], lastTip: tipped[tipped.length - 1], min: samples.reduce((m, s) => Math.min(m, parseFloat(s[1]) || 0), 0), final: samples[samples.length - 1], sampleChanges: first });
      await ctx.close();
    }
  }
  if (want('seesawfilm')) {
    // Deterministic frames: pause every animation in the closer and seek it, so each frame is exact.
    const { ctx, p } = await mk(1440, 900);
    await p.goto(B, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.querySelectorAll('[data-reveal]').forEach((e) => e.classList.add('is-settled')));
    await p.locator('.seesaw').scrollIntoViewIfNeeded();
    const times = [600, 660, 700, 740, 780, 820, 860, 900, 940, 980, 1020, 1100];
    for (let i = 0; i < times.length; i++) {
      await p.evaluate((t) => document.querySelector('.seesaw').getAnimations({ subtree: true }).forEach((a) => { a.pause(); a.currentTime = t; }), times[i]);
      const bb = await p.locator('.seesaw').boundingBox();
      await p.screenshot({ path: join(OUT, `seesaw-a-${String(i).padStart(2, '0')}.png`), clip: { x: bb.x - 10, y: bb.y - 10, width: bb.width + 20, height: bb.height + 20 } });
    }
    log('seesaw film times', times);
    await ctx.close();
  }
  if (want('roll')) {
    for (const mode of ['a', 'b']) {
      const { ctx, p } = await mk(1440, 900);
      await p.goto(B + 'contact/sent/?bh-assembly=' + mode, { waitUntil: 'commit' });
      await p.waitForSelector('.landed');
      const t0 = Date.now();
      let n = 0;
      const stamps = [];
      while (Date.now() - t0 < 3200 && n < 40) {
        const t = Date.now() - t0;
        if (n % 1 === 0) stamps.push(t);
        const clip = await p.locator('.landed').boundingBox();
        await p.screenshot({ path: join(OUT, `roll-${mode}-${String(n).padStart(2, '0')}.png`), clip: { x: clip.x - 20, y: clip.y - 20, width: clip.width + 40, height: clip.height + 40 } });
        n++;
        await p.waitForTimeout(40);
      }
      log('roll frames ' + mode, stamps);
      await ctx.close();
    }
  }
  if (want('drag')) {
    for (const [w, h, mob] of [[1440, 900, false], [390, 844, true]]) {
      const { ctx, p } = await mk(w, h, mob);
      await p.goto(B, { waitUntil: 'networkidle' });
      await p.waitForTimeout(2200);
      const sh = p.locator('svg.poster [data-loose]').first();
      const bb = await sh.boundingBox();
      const cx = bb.x + bb.width / 2, cy = bb.y + bb.height / 2;
      const tr = async () => sh.evaluate((e) => ({ t: e.style.translate, held: e.hasAttribute('data-held') }));
      if (!mob) {
        await p.mouse.move(cx, cy);
        await p.mouse.down();
        await p.mouse.move(cx - 120, cy + 80, { steps: 8 });
        log(`drag mouse ${w} mid`, await tr());
        await p.screenshot({ path: join(OUT, `drag-held-${w}.png`) });
        await p.mouse.up();
        await p.waitForTimeout(150);
        log(`drag mouse ${w} falling`, await tr());
        await p.waitForTimeout(500);
        log(`drag mouse ${w} home`, await tr());
      } else {
        // touch drag via CDP, then a vertical swipe starting off a shape must scroll
        const cdp = await ctx.newCDPSession(p);
        const ev = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
        await ev('touchStart', cx, cy);
        for (let i = 1; i <= 8; i++) await ev('touchMove', cx - i * 8, cy + i * 6);
        log('drag touch mid', await tr());
        await ev('touchEnd');
        await p.waitForTimeout(700);
        log('drag touch home', await tr());
        const y0 = await p.evaluate(() => scrollY);
        await ev('touchStart', 20, 700);
        for (let i = 1; i <= 10; i++) await ev('touchMove', 20, 700 - i * 30);
        await ev('touchEnd');
        await p.waitForTimeout(400);
        log('swipe off a shape scrolls', { before: y0, after: await p.evaluate(() => scrollY) });
      }
      // keyboard
      await sh.focus();
      await p.keyboard.press('ArrowRight');
      await p.keyboard.press('ArrowDown');
      log(`key lift ${w}`, await tr());
      await p.keyboard.press('Enter');
      await p.waitForTimeout(600);
      log(`key drop ${w}`, await tr());
      // protected build order: a press before the build ends does nothing
      await p.goto(B, { waitUntil: 'commit' });
      await p.waitForSelector('svg.poster [data-loose]');
      const early = p.locator('svg.poster [data-loose]').first();
      await early.dispatchEvent('pointerdown', { pointerId: 9, pointerType: 'mouse', button: 0, clientX: 100, clientY: 100, bubbles: true });
      log(`early press ignored ${w}`, await early.evaluate((e) => e.hasAttribute('data-held')));
      await ctx.close();
    }
  }
  if (want('shots')) {
    for (const [w, h, mob] of [[1440, 900, false], [390, 844, true]]) {
      for (const scheme of ['light', 'dark']) {
        const { ctx, p } = await mk(w, h, mob);
        await p.emulateMedia({ colorScheme: scheme, reducedTransparency: 'no-preference', reducedMotion: 'no-preference' });
        for (const [name, path] of [['home', ''], ['sent', 'contact/sent/']]) {
          await p.goto(B + path, { waitUntil: 'networkidle' });
          await p.evaluate((s) => document.documentElement.setAttribute('data-scheme', s), scheme);
          await p.evaluate(() => document.querySelectorAll('[data-reveal]').forEach((e) => e.classList.add('is-settled')));
          await p.waitForTimeout(3200);
          await p.screenshot({ path: join(OUT, `${name}-${scheme}-${w}.png`), fullPage: true });
        }
        await ctx.close();
      }
    }
  }
} finally { await browser.close(); server.close?.(); }
