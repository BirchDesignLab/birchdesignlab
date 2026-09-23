/**
 * The home page's "From the lab" lines, checked in a real browser.
 *
 * Written 09-23-26 when the lines went from two to three and each designation
 * became a link to its entry (PR #88). capture.mjs shoots whole pages; this
 * shoots only the section holding the lines, so three rows can be judged at
 * full size, and it drives the links:
 *
 *   1. Crops: the section on every home, per scheme and viewport, at rest.
 *   2. States (desktop): the first designation keyboard-focused and the
 *      second hovered, in one shot, so each school's link idiom is visible.
 *   3. Clicks: every designation on every home, reporting where it lands and
 *      whether it was a full load or a router swap inside the portal (a
 *      window marker survives a swap and dies with a load).
 *
 * Usage (a Worker or preview serving dist/):
 *   BDL_GPU=1 MSYS_NO_PATHCONV=1 node scripts/themes/check-from-the-lab.mjs \
 *     --base http://127.0.0.1:8787 [--label from-the-lab-sections]
 *
 * Output: scripts/themes/.out/<label>/ PNGs plus clicks.json. Exit 1 if a
 * click lands somewhere other than its href or a school's /lab/ link does not
 * reload (or its /t/ link does).
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suppressPrompt } from './lib/portal-prompt.mjs';
import { VIEWPORTS, slugFor } from './capture.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
};

const ROUTES = ['/', '/t/quiet/', '/t/bauhaus/', '/t/swiss/', '/t/vaporwave/', '/t/cottagecore/', '/t/grandmillennial/', '/t/glassmorphism/'];
const LINKS = 'ul[data-parity-skip] > li a[href]';

const base = arg('base', 'http://127.0.0.1:8787').replace(/\/$/, '');
const outDir = join(HERE, '.out', arg('label', 'from-the-lab-sections'));
await mkdir(outDir, { recursive: true });

const useGpu = process.env.BDL_GPU === '1';
const browser = await chromium.launch({
  args: ['--hide-scrollbars', ...(useGpu ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] : [])],
});

async function contextFor(scheme, vp) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.mobile ? 2 : 1,
    isMobile: !!vp.mobile,
    hasTouch: !!vp.mobile,
    colorScheme: scheme,
    reducedMotion: 'reduce',
  });
  await context.addInitScript((s) => {
    try { localStorage.setItem('scheme', s); localStorage.setItem('theme', s); } catch {}
  }, scheme);
  await suppressPrompt(context);
  await context.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => {
      const style = document.createElement('style');
      style.textContent = 'bdl-switcher { display: none !important; }';
      document.head.append(style);
    });
  });
  await context.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
  return context;
}

async function open(page, route) {
  await page.goto(base + route, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
}

const section = (page) => page.locator(LINKS).first().locator('xpath=ancestor::section[1]');

// 1 + 2: crops and states.
for (const scheme of ['dark', 'light']) {
  for (const vpName of ['desktop', 'mobile']) {
    const context = await contextFor(scheme, VIEWPORTS[vpName]);
    const page = await context.newPage();
    for (const route of ROUTES) {
      await open(page, route);
      const sec = section(page);
      await sec.scrollIntoViewIfNeeded();
      await sec.screenshot({ path: join(outDir, `${slugFor(route)}__${scheme}__${vpName}.png`) });
      if (vpName === 'desktop') {
        const links = page.locator(LINKS);
        await links.nth(0).focus();
        const visible = await links.nth(0).evaluate((a) => a.matches(':focus-visible'));
        await links.nth(1).hover();
        await sec.screenshot({ path: join(outDir, `${slugFor(route)}__${scheme}__states.png`) });
        if (!visible) console.log(`note: ${route} focus() did not match :focus-visible`);
        await page.mouse.move(0, 0);
      }
    }
    await context.close();
  }
}

// 3: clicks.
const clicks = [];
const failures = [];
{
  const context = await contextFor('dark', VIEWPORTS.desktop);
  const page = await context.newPage();
  for (const route of ROUTES) {
    await open(page, route);
    const count = await page.locator(LINKS).count();
    for (let i = 0; i < count; i++) {
      if (i > 0) await open(page, route);
      const a = page.locator(LINKS).nth(i);
      const href = await a.getAttribute('href');
      const reloadAttr = await a.evaluate((el) => el.hasAttribute('data-astro-reload'));
      const label = await a.getAttribute('aria-label');
      await page.evaluate(() => { window.__ftlMarker = true; });
      const want = href.endsWith('/') ? href : `${href}/`;
      // BDL-010 on /t/quiet/ links to the page it is on: nothing to wait for.
      if (want === route) await a.click();
      else await Promise.all([page.waitForURL((u) => u.pathname === want || u.pathname === href, { timeout: 15000 }), a.click()]);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(200);
      const landed = new URL(page.url()).pathname;
      const swapped = await page.evaluate(() => window.__ftlMarker === true);
      const row = { from: route, label, href, reloadAttr, landed, how: swapped ? 'router swap' : 'full load' };
      clicks.push(row);
      if (landed !== want && landed !== href) failures.push(`${route} ${label}: landed ${landed}, wanted ${href}`);
      if (route.startsWith('/t/')) {
        const intoPortal = href.startsWith('/t/');
        if (intoPortal && !swapped) failures.push(`${route} ${label}: portal link did a full load`);
        if (!intoPortal && swapped) failures.push(`${route} ${label}: Lab link stayed in the router`);
      }
    }
  }
  await context.close();
}
await browser.close();

await writeFile(join(outDir, 'clicks.json'), JSON.stringify({ base, clicks, failures }, null, 2));
for (const c of clicks) console.log(`${c.from.padEnd(20)} ${c.label.padEnd(24)} -> ${c.landed.padEnd(16)} ${c.how}`);
if (failures.length) {
  console.log(failures.join('\n'));
  process.exit(1);
}
console.log(`all clicks landed; shots in ${outDir}`);
