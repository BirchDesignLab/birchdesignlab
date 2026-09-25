/** Critic side probe (09-25-26, B1): which face each vaporwave kana selector
    actually renders with (document.fonts.check against Dela Gothic One for
    its own text), so E5's "Dela Gothic leads every kana stack" is measured. */
import { chromium } from 'playwright';
const base = process.argv[2] || 'http://127.0.0.1:4475';
const browser = await chromium.launch();
for (const path of ['/t/vaporwave/', '/t/vaporwave/contact/sent/', '/t/vaporwave/about/']) {
  const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto(base + path, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  const r = await p.evaluate(async () => {
    const out = [];
    for (const el of document.querySelectorAll('[class*=kana], .badge')) {
      const cs = getComputedStyle(el);
      out.push({ cls: el.className, text: el.textContent.trim().slice(0, 20), family: cs.fontFamily.slice(0, 60), size: cs.fontSize, weight: cs.fontWeight });
    }
    const loaded = [...document.fonts].filter((f) => /dela/i.test(f.family)).map((f) => `${f.family}:${f.status}:${f.unicodeRange.slice(0, 20)}`);
    return { out, loadedDela: loaded.filter((s) => s.includes('loaded')).length, totalDela: loaded.length };
  });
  console.log(path, JSON.stringify(r, null, 0));
  await p.close();
}
await browser.close();
