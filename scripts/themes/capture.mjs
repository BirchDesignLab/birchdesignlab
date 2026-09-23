/**
 * Render a set of routes to PNG, for eyeballing and for pixel diffs.
 *
 * Written 09-22-26 for the theme-schools build. It is the review artifact for
 * three jobs: proving a dependency major did not move pixels on the root and
 * Lab pages, proving PR 0 left the root pages untouched, and judging each
 * school against its signature sentence in both schemes and at two widths.
 *
 * Deterministic by default: reduced motion is emulated, so the bark fields
 * render one still frame and the reveal gate never hides content, and the
 * scheme is seeded into localStorage before any page script runs (both the
 * current `scheme` key and the legacy `theme` key, so it works on either side
 * of the attribute migration).
 *
 * GPU: BDL_GPU=1 launches Chromium on the real GPU (see social/README.md and
 * the house rule on software rasterisers). The renderer string is printed,
 * and with BDL_GPU=1 a SwiftShader renderer is a hard failure rather than a
 * silent slowdown. Never mix GPU and software captures in one comparison.
 *
 * Usage (serve dist first, e.g. the "preview" launch config on :4400):
 *   BDL_GPU=1 node scripts/themes/capture.mjs --base http://localhost:4400 \
 *     --set root,lab --label astro5
 *   node scripts/themes/capture.mjs --routes /t/quiet/,/t/quiet/about/ --label quiet
 *   --schemes dark,light   --viewports desktop,phone   --full-page
 *   --motion               (do NOT emulate reduced motion; for looking at fx)
 *   --wait 600             (ms to settle after fonts, default 500)
 *
 * Git Bash mangles leading-slash args into Windows paths; prefix the command
 * with MSYS_NO_PATHCONV=1 when passing --routes from it.
 *
 * Output: scripts/themes/.out/<label>/<slug>__<scheme>__<viewport>.png plus an
 * index.html contact sheet. .out/ is gitignored; captures are regenerable.
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}
const flag = (name) => process.argv.includes(`--${name}`);

export const SETS = {
  root: ['/', '/about/', '/services/', '/contact/', '/contact/sent/', '/404.html', '/privacy/'],
  lab: ['/lab/', '/lab/bdl-001/', '/lab/bdl-002/', '/lab/bdl-005/', '/lab/bdl-006/', '/lab/bdl-007/', '/lab/bdl-008/', '/styleguide/', '/hello/'],
};

export const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  phone: { width: 390, height: 844 },
};

export function slugFor(route) {
  const s = route.replace(/^\/+|\/+$/g, '').replace(/[^a-z0-9]+/gi, '-');
  return s || 'home';
}

async function main() {
  const base = arg('base', 'http://localhost:4400').replace(/\/$/, '');
  const label = arg('label', 'capture');
  const schemes = arg('schemes', 'dark,light').split(',');
  const viewports = arg('viewports', 'desktop,phone').split(',');
  const wait = Number(arg('wait', 500));
  const fullPage = flag('full-page');
  const motion = flag('motion');

  const routes = [];
  for (const name of (arg('set', '') || '').split(',').filter(Boolean)) {
    if (!SETS[name]) throw new Error(`unknown set ${name}; known: ${Object.keys(SETS).join(', ')}`);
    routes.push(...SETS[name]);
  }
  routes.push(...(arg('routes', '') || '').split(',').filter(Boolean));
  if (routes.length === 0) throw new Error('nothing to capture: pass --set and/or --routes');

  const useGpu = process.env.BDL_GPU === '1';
  const browser = await chromium.launch({
    args: [
      '--hide-scrollbars',
      '--font-render-hinting=none',
      '--disable-lcd-text',
      ...(useGpu ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] : []),
    ],
  });

  const outDir = join(HERE, '.out', label);
  await mkdir(outDir, { recursive: true });
  const shots = [];
  const problems = [];
  let renderer = null;

  for (const scheme of schemes) {
    for (const vpName of viewports) {
      const viewport = VIEWPORTS[vpName];
      if (!viewport) throw new Error(`unknown viewport ${vpName}`);
      const context = await browser.newContext({
        viewport,
        deviceScaleFactor: 1,
        colorScheme: scheme,
        reducedMotion: motion ? 'no-preference' : 'reduce',
      });
      await context.addInitScript((s) => {
        try { localStorage.setItem('scheme', s); localStorage.setItem('theme', s); } catch {}
      }, scheme);
      // Production injects Zaraz at the edge; its consent modal would sit in
      // every shot. Blocking the loader keeps prod captures comparable to
      // local ones (the modal is not ours to diff).
      await context.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
      const page = await context.newPage();
      page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('net::ERR_FAILED')) problems.push(`${page.url()} console: ${m.text()}`); });
      page.on('pageerror', (e) => problems.push(`${page.url()} pageerror: ${e.message}`));
      page.on('requestfailed', (r) => {
        if (r.url().includes('/cdn-cgi/zaraz/')) return;
        problems.push(`${page.url()} requestfailed: ${r.url()} ${r.failure()?.errorText}`);
      });

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

      for (const route of routes) {
        const url = base + route;
        const resp = await page.goto(url, { waitUntil: 'networkidle' });
        if (!resp || resp.status() >= 400) {
          if (!route.includes('404')) problems.push(`${url} HTTP ${resp?.status()}`);
        }
        await page.evaluate(() => document.fonts.ready);
        if (fullPage && !motion) {
          // Walk the page so IntersectionObserver-gated content has fired.
          await page.evaluate(async () => {
            const step = innerHeight * 0.8;
            for (let y = 0; y < document.body.scrollHeight; y += step) {
              scrollTo({ top: y, behavior: 'instant' });
              await new Promise((r) => setTimeout(r, 60));
            }
            scrollTo({ top: 0, behavior: 'instant' });
          });
        }
        await page.waitForTimeout(wait);
        const file = `${slugFor(route)}__${scheme}__${vpName}.png`;
        await page.screenshot({ path: join(outDir, file), fullPage });
        shots.push({ route, scheme, vpName, file });
      }
      await context.close();
    }
  }
  await browser.close();

  const rows = shots
    .map((s) => `<figure><img src="${s.file}" loading="lazy"><figcaption>${s.route} · ${s.scheme} · ${s.vpName}</figcaption></figure>`)
    .join('\n');
  await writeFile(
    join(outDir, 'index.html'),
    `<!doctype html><meta charset="utf-8"><title>${label}</title><style>body{font:14px system-ui;background:#222;color:#eee;display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:12px;padding:12px}img{width:100%;border:1px solid #444}</style>\n<p>renderer: ${renderer}</p>\n${rows}`,
  );
  await writeFile(join(outDir, 'manifest.json'), JSON.stringify({ base, renderer, shots, problems }, null, 2));

  console.log(`${shots.length} captures -> ${outDir}`);
  if (problems.length) {
    console.log(`${problems.length} problems:`);
    for (const p of problems) console.log(`  ${p}`);
    process.exitCode = 2;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
