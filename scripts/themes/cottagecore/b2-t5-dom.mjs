/* B2 task 5 recon: what covers the cloth on cottagecore Home / About, at 390
   and 1440. Lists main's descendants down two levels with their rects and
   whether they paint a background. Usage: node scripts/themes/cottagecore/b2-t5-dom.mjs [base] */
import { chromium } from 'playwright';

const base = (process.argv[2] || 'http://127.0.0.1:4460').replace(/\/$/, '');
const browser = await chromium.launch();
for (const [w, h] of [[390, 844], [1440, 900]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto(`${base}/t/cottagecore/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const rows = await page.evaluate(() => {
    const out = [];
    const walk = (el, depth) => {
      if (depth > 3) return;
      for (const c of el.children) {
        const r = c.getBoundingClientRect();
        const cs = getComputedStyle(c);
        const bg = cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || cs.backgroundImage !== 'none';
        out.push(`${'  '.repeat(depth)}${c.tagName.toLowerCase()}.${c.className && c.className.baseVal === undefined ? c.className : ''} y=${Math.round(r.top + scrollY)}..${Math.round(r.bottom + scrollY)} x=${Math.round(r.left)}..${Math.round(r.right)} bg=${bg} z=${cs.zIndex} pos=${cs.position}`);
        walk(c, depth + 1);
      }
    };
    walk(document.querySelector('main'), 0);
    return out;
  });
  console.log(`--- ${w}`);
  console.log(rows.slice(0, 70).join('\n'));
  await page.close();
}
await browser.close();
