/**
 * Standalone runner for adversarial case 11: time-of-day swap under a
 * throttled network (Slow 3G emulation via CDP), watching for a blank or
 * mismatched wallpaper frame between the old and new file. Split out from
 * verify-b2-glass.mjs so the main run stays fast; same conventions (GPU
 * Chromium, forced prefers-reduced-transparency: no-preference).
 *
 * Usage: BDL_GPU=1 node scripts/themes/glassmorphism/verify-b2-case11-network.mjs --base http://127.0.0.1:4478
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..');
const OUT = join(REPO, 'scripts', 'themes', '.out', 'stage3-b2', 'glass-verify');

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const base = arg('base', 'http://127.0.0.1:4478');

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({
    args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'],
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }],
  });

  await page.goto(`${base}/t/glassmorphism/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(OUT, 'case11-00-before-throttle-day.png') });

  // Slow 3G-ish profile.
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 400,
    downloadThroughput: (500 * 1024) / 8,
    uploadThroughput: (500 * 1024) / 8,
  });

  const framesLog = [];
  const clickAt = Date.now();
  const dawnBtn = await page.$('.cc-seg[data-tod="dawn"]');
  await dawnBtn.click();

  // Sample the background-image + a screenshot every 200ms for 4s while throttled.
  for (let i = 0; i < 20; i++) {
    const bg = await page.evaluate(() => getComputedStyle(document.querySelector('main'), '::before').backgroundImage).catch(() => 'ERR');
    framesLog.push({ t: Date.now() - clickAt, bg: bg.slice(0, 100) });
    if (i % 4 === 0) {
      await page.screenshot({ path: join(OUT, `case11-frame-${String(i).padStart(2, '0')}.png`) }).catch(() => {});
    }
    await page.waitForTimeout(200);
  }

  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });

  // Determine: was there ever a moment with an empty/blank background-image ("none")
  // while a swap was in flight, and did it land on dawn without ever showing an
  // unrelated (non-day, non-dawn) file (a mismatched frame)?
  const blankFrames = framesLog.filter((f) => f.bg === 'none' || f.bg === '');
  const mismatched = framesLog.filter((f) => f.bg !== 'ERR' && !/day|dawn/i.test(f.bg));
  const landedDawn = /dawn/i.test(framesLog.at(-1)?.bg ?? '');

  await writeFile(join(OUT, 'case11-network-throttle.json'), JSON.stringify({ framesLog, blankFrames, mismatched, landedDawn }, null, 2));
  const result = (blankFrames.length === 0 && mismatched.length === 0 && landedDawn) ? 'pass' : 'fail';
  console.log(`${result.toUpperCase()} [11] time-of-day swap under Slow-3G throttle: no blank/mismatched frame -- blankFrames=${blankFrames.length} mismatched=${mismatched.length} landedDawn=${landedDawn}`);

  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
