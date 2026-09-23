// Stage 1 founder shots (Tier 3, 09-23-26): the switcher's new pieces as a
// visitor sees them on the running Worker. For each viewport it captures the
// first-load prompt (a fresh session, so the prompt shows), the bar at rest in
// quiet and in grandmillennial (the bar now keeps one width), the busy cue
// on Shuffle (staged: the attribute set by hand, so the shot never races the
// swap), and the dialog open on its list (no placard since the founder's
// 09-23-26 decisions). Real build, real GPU when BDL_GPU=1.
//
// Usage: BDL_GPU=1 MSYS_NO_PATHCONV=1 node scripts/themes/harness/stage1-founder-shots.mjs \
//          [--base http://127.0.0.1:8787] [--school vaporwave] [--schemes dark,light]
// Output: scripts/themes/.out/stage1-founder/<shot>__<scheme>__<viewport>.png
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VIEWPORTS } from '../capture.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}
const base = arg('base', 'http://127.0.0.1:8787').replace(/\/$/, '');
const school = arg('school', 'vaporwave');
const schemes = arg('schemes', 'dark,light').split(',');
const OUT = join(HERE, '..', '.out', 'stage1-founder');
await mkdir(OUT, { recursive: true });

const useGpu = process.env.BDL_GPU === '1';
const browser = await chromium.launch({
  args: ['--hide-scrollbars', ...(useGpu ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] : [])],
});
const problems = [];

/** The bottom band of the viewport, where the bar and the prompt live. */
function bottomBand(vp, h) {
  return { x: 0, y: vp.height - h, width: vp.width, height: h };
}

for (const scheme of schemes) {
  for (const vpName of ['desktop', 'mobile']) {
    const vp = VIEWPORTS[vpName];
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: vp.mobile ? 2 : 1,
      isMobile: !!vp.mobile,
      hasTouch: !!vp.mobile,
      colorScheme: scheme,
    });
    await context.addInitScript((s) => {
      try { localStorage.setItem('scheme', s); } catch {}
    }, scheme);
    await context.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
    const page = await context.newPage();
    page.on('pageerror', (e) => problems.push(`${page.url()} pageerror: ${e.message}`));
    const shot = (name, clip) => page.screenshot({ path: join(OUT, `${name}__${scheme}__${vpName}.png`), clip });
    const band = bottomBand(vp, vpName === 'mobile' ? 190 : 170);

    // 1. First portal load of the session: the prompt rises above the bar
    //    (1000ms after the page lands, 560ms to arrive).
    await page.goto(`${base}/t/${school}/`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(2400);
    await shot('prompt', band);

    // 2. Dismiss it, then the bar at rest in two schools: the longest and the
    //    shortest names, so the fixed width shows.
    await page.evaluate(() => document.querySelector('bdl-switcher')?.shadowRoot?.querySelector('.prompt .dismiss')?.click());
    for (const id of ['quiet', 'grandmillennial']) {
      await page.goto(`${base}/t/${id}/`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(700);
      await shot(`bar-${id}`, bottomBand(vp, 90));
    }

    // 2b. The busy cue, staged on Shuffle.
    await page.evaluate(() => document.querySelector('bdl-switcher').shadowRoot.querySelector('.shuffle').setAttribute('aria-busy', 'true'));
    await page.waitForTimeout(300);
    await shot('busy', bottomBand(vp, 90));
    await page.evaluate(() => document.querySelector('bdl-switcher').shadowRoot.querySelector('.shuffle').removeAttribute('aria-busy'));

    // 3. The dialog, open on its list, from the school under review.
    await page.goto(`${base}/t/${school}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(700);
    await page.evaluate(() => document.querySelector('bdl-switcher').shadowRoot.querySelector('.open').click());
    await page.waitForTimeout(600);
    await page.screenshot({ path: join(OUT, `dialog__${scheme}__${vpName}.png`) });
    await context.close();
  }
}
await browser.close();
console.log(`shots -> ${OUT}`);
if (problems.length) {
  for (const p of problems) console.log(`  ${p}`);
  process.exitCode = 2;
}
