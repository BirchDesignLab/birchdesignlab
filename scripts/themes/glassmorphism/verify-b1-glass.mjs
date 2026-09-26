// Ad-hoc verifier script for wave B1 glass verification. Not committed (scratch, in .out/).
import { chromium, webkit } from 'playwright';

const BASE = 'http://127.0.0.1:4474';
const PAGES = ['/t/glassmorphism/', '/t/glassmorphism/services/', '/t/glassmorphism/about/', '/t/glassmorphism/contact/', '/t/glassmorphism/sent/'];
const results = {};

function log(name, val) { results[name] = val; console.log(name, JSON.stringify(val)); }

async function withScheme(browser, scheme, fn) {
  const ctx = await browser.newContext({ colorScheme: scheme });
  const page = await ctx.newPage();
  await fn(page, ctx);
  await ctx.close();
}

(async () => {
  const browser = await chromium.launch();

  // Case 4: network 404 check + wallpaper hashed URLs
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const reqs = [];
    page.on('response', r => reqs.push({ url: r.url(), status: r.status() }));
    await page.goto(BASE + '/t/glassmorphism/', { waitUntil: 'networkidle' });
    const bg = await page.evaluate(() => getComputedStyle(document.querySelector('main'), '::before').backgroundImage);
    log('case4_bg_before', bg);
    const bad = reqs.filter(r => r.status === 404);
    log('case4_404s', bad);
    await ctx.close();
  }

  // Case 9: overflow check across viewports and pages
  {
    const vw = [390, 820, 1024, 1280, 1440];
    const overflow = [];
    for (const w of vw) {
      const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
      const page = await ctx.newPage();
      for (const p of PAGES) {
        await page.goto(BASE + p, { waitUntil: 'networkidle' });
        const r = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
        if (r.sw > r.iw) overflow.push({ w, p, ...r });
      }
      await ctx.close();
    }
    log('case9_overflow_violations', overflow);
  }

  // Case 12: touch targets phone 390
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    const small = [];
    for (const p of PAGES) {
      await page.goto(BASE + p, { waitUntil: 'networkidle' });
      const els = await page.$$eval('header a, header button, footer a, footer button', nodes =>
        nodes.map(n => { const r = n.getBoundingClientRect(); return { tag: n.tagName, text: n.textContent.trim().slice(0,20), w: r.width, h: r.height }; })
      );
      for (const e of els) {
        if (e.w < 44 || e.h < 44) small.push({ p, ...e });
      }
    }
    log('case12_small_targets', small);
    await ctx.close();
  }

  // Case 10: font check
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const fontReqs = [];
    page.on('request', r => { if (/\.woff2?$/.test(r.url())) fontReqs.push(r.url()); });
    await page.goto(BASE + '/t/glassmorphism/', { waitUntil: 'networkidle' });
    const h = await page.$('h1, h2');
    const style = await page.evaluate(() => {
      const el = document.querySelector('h1') || document.querySelector('h2');
      const cs = getComputedStyle(el);
      return { family: cs.fontFamily, weight: cs.fontWeight, ls: cs.letterSpacing, fvs: cs.fontVariationSettings, size: cs.fontSize };
    });
    log('case10_heading_style', style);
    log('case10_font_requests', fontReqs);
    await ctx.close();
  }

  // Case 2: bare-wallpaper text check — sample pixel under text nodes at 3 viewports x 2 schemes
  {
    const viewports = { desktop: 1440, tablet: 820, phone: 390 };
    const flagged = [];
    for (const scheme of ['light', 'dark']) {
      for (const [vname, w] of Object.entries(viewports)) {
        const ctx = await browser.newContext({ viewport: { width: w, height: 1000 }, colorScheme: scheme });
        const page = await ctx.newPage();
        await page.goto(BASE + '/t/glassmorphism/', { waitUntil: 'networkidle' });
        // find text nodes not inside a pane-like ancestor (.glass, .glass-strong, .surface-solid, .chip, .btn*)
        const info = await page.evaluate(() => {
          const sels = ['.kicker', '.designation', 'a[href*="#how"]', '.chip'];
          const found = [];
          for (const s of sels) {
            document.querySelectorAll(s).forEach(el => {
              const r = el.getBoundingClientRect();
              if (r.width === 0) return;
              const cx = Math.round(r.left + r.width/2), cy = Math.round(r.top + r.height/2);
              found.push({ sel: s, text: el.textContent.trim().slice(0,30), cx, cy });
            });
          }
          return found;
        });
        for (const item of info) {
          flagged.push({ scheme, vname, ...item, note: 'candidate text node found (manual pixel check needed)' });
        }
        await page.goto(BASE + '/t/glassmorphism/services/', { waitUntil: 'networkidle' });
        const info2 = await page.evaluate(() => {
          const h = document.querySelector('h2, .process-head, [class*="how-a-project"]');
          const results = [];
          document.querySelectorAll('h1,h2,h3').forEach(el => {
            if (/how a project runs/i.test(el.textContent)) {
              const r = el.getBoundingClientRect();
              results.push({ text: el.textContent.trim(), x: r.x, y: r.y, w: r.width, h: r.height,
                parentClass: el.closest('[class]')?.className || '', selfClass: el.className });
            }
          });
          return results;
        });
        flagged.push({ scheme, vname, page: 'services', headings: info2 });
        await ctx.close();
      }
    }
    log('case2_text_candidates', flagged);
  }

  // Case 6: warm overlap chroma sample on Home light desktop
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
    const page = await ctx.newPage();
    await page.goto(BASE + '/t/glassmorphism/', { waitUntil: 'networkidle' });
    // sample a grid of points in the hero area, compute chroma via simple RGB->OKLCH approx using canvas
    const samples = await page.evaluate(async () => {
      const main = document.querySelector('main');
      const rect = main.getBoundingClientRect();
      // Render wallpaper element to canvas via html2canvas not available; instead read background pixel via getComputedStyle won't give pixel color.
      return { note: 'pixel sampling requires canvas capture, done via screenshot analysis outside browser' };
    });
    log('case6_note', samples);
    await ctx.close();
  }

  await browser.close();
})();
