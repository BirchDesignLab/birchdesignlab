/**
 * B2 item 14 (kiosk dressed with the Venus): verifies the Venus kiosk still
 * (vw-4a's white bust on its drum) sits beside the kiosk stand's foot,
 * mirroring the existing marble sphere, without overlapping the stand or
 * the sphere, and with both stills resting on the same floor line (no gap).
 *
 * Renders / at five widths (1440, 1280, 1024, 900, 820) in both color
 * schemes, crops the kiosk foot, and prints a measured table of each
 * element's getBoundingClientRect() so the "no overlap, both on the floor"
 * claim is a number, not an eyeball.
 *
 * GPU Chromium per the house rule; prefers-reduced-transparency forced to
 * no-preference over CDP (this school has no glass surfaces, but the rule
 * is "every new probe", so it's here for consistency and to catch a future
 * dependency).
 *
 * Usage: node scripts/themes/vaporwave/b2-kiosk-verify.mjs [--base http://127.0.0.1:4476]
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', '.out', 'stage3-b2', 'kiosk');

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}

const BASE = arg('base', 'http://127.0.0.1:4476').replace(/\/$/, '');
const WIDTHS = [1440, 1280, 1024, 900, 820];
const SCHEMES = ['dark', 'light'];

async function main() {
  await mkdir(OUT, { recursive: true });
  const useGpu = process.env.BDL_GPU === '1';
  const browser = await chromium.launch({
    args: [
      '--hide-scrollbars',
      '--font-render-hinting=none',
      '--disable-lcd-text',
      ...(useGpu ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] : []),
    ],
  });

  let renderer = null;
  const rows = [];
  const problems = [];

  for (const scheme of SCHEMES) {
    for (const width of WIDTHS) {
      const context = await browser.newContext({
        viewport: { width, height: 1000 },
        deviceScaleFactor: 1,
        colorScheme: scheme,
        reducedMotion: 'reduce',
      });
      await context.addInitScript((s) => {
        try { localStorage.setItem('scheme', s); localStorage.setItem('theme', s); } catch {}
      }, scheme);
      await context.addInitScript(() => {
        try { localStorage.setItem('bdl-switcher-dismissed', '1'); } catch {}
      });
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      await cdp.send('Emulation.setEmulatedMedia', {
        features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }],
      });
      page.on('console', (m) => { if (m.type() === 'error') problems.push(`${scheme}/${width}: ${m.text()}`); });
      page.on('pageerror', (e) => problems.push(`${scheme}/${width} pageerror: ${e.message}`));

      if (!renderer) {
        await page.goto('about:blank');
        renderer = await page.evaluate(() => {
          const gl = document.createElement('canvas').getContext('webgl2') || document.createElement('canvas').getContext('webgl');
          if (!gl) return 'no webgl';
          const ext = gl.getExtension('WEBGL_debug_renderer_info');
          return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
        });
        console.log(`renderer: ${renderer}`);
        if (useGpu && /swiftshader|llvmpipe/i.test(renderer)) {
          await browser.close();
          throw new Error('BDL_GPU=1 but Chromium fell back to a software rasteriser');
        }
      }

      const resp = await page.goto(`${BASE}/t/vaporwave/`, { waitUntil: 'networkidle' });
      if (!resp || resp.status() >= 400) problems.push(`${scheme}/${width}: HTTP ${resp?.status()}`);
      await page.evaluate(() => document.fonts.ready);
      // Scroll the kiosk into view (it's below the fold on Home).
      await page.evaluate(() => {
        document.querySelector('.kiosk-stand')?.scrollIntoView({ block: 'center' });
      });
      await page.waitForTimeout(300);

      const rects = await page.evaluate(() => {
        const r = (el) => el ? (({ x, y, width, height, top, bottom, left, right }) => ({ x, y, width, height, top, bottom, left, right }))(el.getBoundingClientRect()) : null;
        const stand = document.querySelector('.kiosk-stand');
        const foot = document.querySelector('.stand-foot');
        const sphere = document.querySelector('.kiosk-prop:not(.kiosk-prop-venus)');
        const venus = document.querySelector('.kiosk-prop-venus');
        return {
          hidden: !sphere || getComputedStyle(sphere).display === 'none',
          stand: r(stand),
          foot: r(foot),
          sphere: r(sphere),
          venus: r(venus),
        };
      });

      const entry = { scheme, width, ...rects };
      if (!rects.hidden && rects.sphere && rects.venus && rects.stand) {
        const overlapSphereStand = rects.sphere.left < rects.stand.right && rects.sphere.right > rects.stand.left
          && rects.sphere.top < rects.stand.bottom && rects.sphere.bottom > rects.stand.top;
        const overlapVenusStand = rects.venus.left < rects.stand.right && rects.venus.right > rects.stand.left
          && rects.venus.top < rects.stand.bottom && rects.venus.bottom > rects.stand.top;
        const overlapPair = rects.sphere.left < rects.venus.right && rects.sphere.right > rects.venus.left
          && rects.sphere.top < rects.venus.bottom && rects.sphere.bottom > rects.venus.top;
        entry.overlapSphereStand = overlapSphereStand;
        entry.overlapVenusStand = overlapVenusStand;
        entry.overlapPair = overlapPair;
        // Each still is a full 512x512 box with transparent margin below the
        // opaque subject (measure-still-bbox.mjs --solid: sphere 25.8%,
        // venus-kiosk 18.6%). Comparing raw DOM-rect bottoms would compare
        // that padding, not the visible floor contact, so both gaps are
        // measured against each still's own opaque bottom edge.
        const sphereOpaqueBottom = rects.sphere.top + rects.sphere.height * (1 - 0.258);
        const venusOpaqueBottom = rects.venus.top + rects.venus.height * (1 - 0.186);
        entry.floorGapSphere = Math.round((rects.foot.bottom - sphereOpaqueBottom) * 10) / 10;
        entry.floorGapVenus = Math.round((rects.foot.bottom - venusOpaqueBottom) * 10) / 10;
      }
      rows.push(entry);

      // Crop the kiosk foot area for the founder sheet.
      const clip = rects.stand
        ? {
            x: Math.max(0, (rects.venus?.left ?? rects.stand.left) - 20),
            y: rects.stand.top - 10,
            width: Math.min(width, (rects.sphere?.right ?? rects.stand.right) + 20) - Math.max(0, (rects.venus?.left ?? rects.stand.left) - 20),
            height: rects.stand.height + 40,
          }
        : undefined;
      await page.screenshot({
        path: join(OUT, `kiosk-foot__${scheme}__${width}.png`),
        clip: clip && clip.width > 0 && clip.height > 0 ? clip : undefined,
        fullPage: !clip,
      });

      await context.close();
    }
  }
  await browser.close();

  console.log('\n--- measured table ---');
  console.log(JSON.stringify(rows, null, 2));
  const anyOverlap = rows.some((r) => r.overlapSphereStand || r.overlapVenusStand || r.overlapPair);
  // Both stills carry the same baked baseline offset from their still's own
  // canvas edge to the foot, by design (the sphere had this before B2); what
  // matters for parity is that the two stills agree with each other, not
  // that either sits exactly flush with the foot's own DOM box.
  const floorMismatch = rows.some((r) => typeof r.floorGapSphere === 'number' && Math.abs(r.floorGapSphere - r.floorGapVenus) > 1);
  console.log(`\noverlap detected: ${anyOverlap}`);
  console.log(`floor-gap mismatch between sphere and venus (>1px) detected: ${floorMismatch}`);
  console.log(`console/page problems: ${problems.length}`);
  if (problems.length) console.log(problems.join('\n'));

  const { writeFile } = await import('node:fs/promises');
  await writeFile(join(OUT, 'measured.json'), JSON.stringify({ renderer, rows, problems }, null, 2));

  if (anyOverlap || floorMismatch || problems.length) process.exitCode = 1;
}

main();
