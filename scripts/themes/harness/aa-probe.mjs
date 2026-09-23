/**
 * Does a style change the switcher snapshot's text anti-aliasing during a
 * glassmorphism in-school swap? Screenshots the switcher before a swap and
 * again with the transition paused mid-flight, once per CSS variant.
 *
 * Written 09-23-26 for Tier 3 stage 2 (the wave A follow-up). Naming glass's
 * header showed that a backdrop-filter on a captured element, or anywhere in
 * the ::view-transition pseudo-elements, makes Chrome draw every snapshot's
 * text without subpixel anti-aliasing, the switcher's included, which fails
 * hold-still on a 1x desktop (src/themes/README.md, "View-transition names").
 * Compare each variant's -before.png with its -mid.png.
 *
 * Usage (serve a build first; snap.mjs sets SNAP_BASE):
 *   node scripts/themes/harness/aa-probe.mjs <base> <outDir> '<json {variant: css}>'
 *   e.g. '{"as-is":"","no-blur":"html .bar{backdrop-filter:none!important}"}'
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { PROMPT_KEY } from '../lib/portal-prompt.mjs';

const base = (process.argv[2] || process.env.SNAP_BASE || '').replace(/\/$/, '');
const out = process.argv[3];
const variants = JSON.parse(process.argv[4] || '{"as-is":""}');
if (!base || !out) {
  console.error("usage: node scripts/themes/harness/aa-probe.mjs <base> <outDir> '<json {variant: css}>'");
  process.exit(1);
}
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] });
for (const [name, css] of Object.entries(variants)) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
  await ctx.addInitScript((key) => { try { sessionStorage.setItem(key, 'dismissed'); } catch {} }, PROMPT_KEY);
  const page = await ctx.newPage();
  await page.goto(base + '/t/glassmorphism/', { waitUntil: 'networkidle' });
  if (css) await page.addStyleTag({ content: css });
  await page.waitForTimeout(800);
  const sw = await page.locator('bdl-switcher').boundingBox();
  const clip = { x: Math.floor(sw.x), y: Math.floor(sw.y), width: Math.ceil(sw.width), height: Math.ceil(sw.height) };
  writeFileSync(`${out}/${name}-before.png`, await page.screenshot({ clip }));
  await page.locator('header nav a[href*="about"]').first().click();
  await page.waitForFunction(() => document.getAnimations().some((a) => String(a.effect?.pseudoElement ?? '').startsWith('::view-transition')), null, { timeout: 5000 });
  await page.waitForTimeout(30);
  const pseudos = await page.evaluate(() => {
    const anims = document.getAnimations().filter((a) => String(a.effect?.pseudoElement ?? '').startsWith('::view-transition'));
    anims.forEach((a) => a.pause());
    return anims.map((a) => a.effect.pseudoElement);
  });
  writeFileSync(`${out}/${name}-mid.png`, await page.screenshot({ clip }));
  console.log(name, [...new Set(pseudos)].join(' '));
  await ctx.close();
}
await browser.close();
