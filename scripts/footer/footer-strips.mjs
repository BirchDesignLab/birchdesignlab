/**
 * Look at the footer of every school, phone and desktop, dark and light, as one
 * sheet. Written for the social-links footer change (a built-page test proves
 * the words and links are the same everywhere; it cannot say whether three new
 * links sit well in seven different footers).
 *
 * Serve a build first (npm run build; npm run preview -- --port 4400).
 * Usage: node scripts/footer/footer-strips.mjs [--base http://localhost:4400]
 * Output: scripts/footer/.out/footers.png (gitignored with the rest of .out)
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const i = process.argv.indexOf('--base');
const base = (i > -1 ? process.argv[i + 1] : 'http://localhost:4400').replace(/\/$/, '');
const schools = ['quiet', 'swiss', 'bauhaus', 'vaporwave', 'glassmorphism', 'grandmillennial', 'cottagecore'];
const views = [
  { name: 'phone-dark', width: 390, height: 800, scheme: 'dark', dpr: 2 },
  { name: 'phone-light', width: 390, height: 800, scheme: 'light', dpr: 2 },
  { name: 'desktop-dark', width: 1280, height: 800, scheme: 'dark', dpr: 1 },
];
const out = join(HERE, '.out', 'strips');
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ args: ['--hide-scrollbars'] });
for (const v of views) {
  const ctx = await browser.newContext({ viewport: { width: v.width, height: v.height }, deviceScaleFactor: v.dpr, colorScheme: v.scheme, reducedMotion: 'reduce' });
  await ctx.addInitScript(([s]) => { try { localStorage.setItem('scheme', s); sessionStorage.setItem('bdl-portal-prompt', 'dismissed'); } catch {} }, [v.scheme]);
  await ctx.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
  const page = await ctx.newPage();
  for (const id of schools) {
    await page.goto(`${base}/t/${id}/`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const footer = page.locator('footer').last();
    await footer.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    const links = await footer.locator('a[href^="https://www."]').evaluateAll((as) => as.map((a) => a.textContent));
    await footer.screenshot({ path: join(out, `${id}__${v.name}.png`) });
    console.log(`${id.padEnd(16)} ${v.name.padEnd(13)} external links: ${links.join(', ')}`);
  }
  await ctx.close();
}
await browser.close();
