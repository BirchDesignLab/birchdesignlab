import { chromium } from 'playwright';
const BASE = 'http://127.0.0.1:4474';
const PAGES = ['/t/glassmorphism/', '/t/glassmorphism/services/', '/t/glassmorphism/about/', '/t/glassmorphism/contact/', '/t/glassmorphism/sent/'];

(async () => {
  const browser = await chromium.launch();

  // Case 3: JS disabled
  {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    const out = [];
    for (const p of PAGES) {
      await page.goto(BASE + p, { waitUntil: 'load' });
      const r = await page.evaluate(() => {
        const main = document.querySelector('main');
        const bg = main ? getComputedStyle(main, '::before').backgroundImage : 'NO MAIN';
        const orbs = document.querySelectorAll('.orb').length;
        return { bg: bg.slice(0, 60), orbCount: orbs };
      }).catch(e => ({ error: String(e) }));
      out.push({ p, ...r });
    }
    console.log('CASE3_JS_DISABLED', JSON.stringify(out, null, 1));
    await ctx.close();
  }

  // Case 14: view-transition-name uniqueness
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const out = [];
    for (const p of PAGES) {
      await page.goto(BASE + p, { waitUntil: 'networkidle' });
      const r = await page.evaluate(() => {
        const names = {};
        document.querySelectorAll('*').forEach(el => {
          const vtn = getComputedStyle(el).viewTransitionName;
          if (vtn && vtn !== 'none') {
            names[vtn] = (names[vtn] || 0) + 1;
          }
        });
        return names;
      });
      out.push({ p, names: r });
    }
    console.log('CASE14_VTN', JSON.stringify(out, null, 1));
    await ctx.close();
  }

  // Case 13: lens placeholder disc position/z-index on Home
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(BASE + '/t/glassmorphism/', { waitUntil: 'networkidle' });
    const r = await page.evaluate(() => {
      const candidates = [...document.querySelectorAll('[class*="lens"],[class*="disc"]')];
      return candidates.map(el => {
        const cs = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return { cls: el.className, position: cs.position, zIndex: cs.zIndex, rect };
      });
    });
    console.log('CASE13_LENS', JSON.stringify(r, null, 1));
    await ctx.close();
  }

  // Case 8: media feature emulation
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const client = await ctx.newCDPSession(page);
    await client.send('Emulation.setEmulatedMedia', { features: [
      { name: 'prefers-contrast', value: 'more' },
      { name: 'prefers-reduced-transparency', value: 'reduce' },
    ]});
    await page.goto(BASE + '/t/glassmorphism/', { waitUntil: 'networkidle' });
    const r1 = await page.evaluate(() => {
      const glass = document.querySelector('.glass, .glass-strong, header');
      const cs = glass ? getComputedStyle(glass) : null;
      return cs ? { backdropFilter: cs.backdropFilter, background: cs.backgroundColor } : 'NO GLASS FOUND';
    });
    console.log('CASE8_reduced_transparency', JSON.stringify(r1));
    await client.send('Emulation.setEmulatedMedia', { features: [
      { name: 'forced-colors', value: 'active' },
    ]});
    await page.reload({ waitUntil: 'networkidle' });
    const r2 = await page.evaluate(() => {
      const glass = document.querySelector('.glass, .glass-strong, header');
      const cs = glass ? getComputedStyle(glass) : null;
      return cs ? { backdropFilter: cs.backdropFilter, background: cs.backgroundColor, border: cs.borderColor } : 'NO GLASS FOUND';
    });
    console.log('CASE8_forced_colors', JSON.stringify(r2));
    await ctx.close();
  }

  await browser.close();
})();
