/**
 * What does <html data-theme> read on each school? render/screen-takes.mjs
 * waits on it to know a school change has landed, and quiet turned out not to
 * set it. Usage: BDL_BASE=http://localhost:4400 node scripts/probe-theme-attr.mjs
 */
import { chromium } from 'playwright';
import { siteUrl } from '../lib/devserver.mjs';

const browser = await chromium.launch();
const page = await browser.newPage();
for (const id of ['quiet', 'swiss', 'bauhaus', 'vaporwave', 'glassmorphism', 'grandmillennial', 'cottagecore']) {
  await page.goto(siteUrl(`/t/${id}/`), { waitUntil: 'domcontentloaded' });
  const attrs = await page.evaluate(() => ({ theme: document.documentElement.dataset.theme ?? null, transition: document.documentElement.hasAttribute('data-astro-transition') }));
  console.log(id.padEnd(16), JSON.stringify(attrs));
}
await browser.close();
