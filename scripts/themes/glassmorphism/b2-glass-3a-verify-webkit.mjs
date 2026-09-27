/**
 * A Playwright WebKit run over the production lens (not the Tier A proof
 * page): confirms the lens renders in WebKit and that a mouse drag on it
 * selects no page text, the one fix the Tier A WebKit run
 * (proofs/lens.md, "WebKit run", item 6) called out for B2.
 *
 * Caveat carried over from that run, unchanged here: Playwright's WebKit on
 * Windows is Playwright's own build, not Apple Safari, so this bounds the
 * engine (CSS, WebGL shader support) but not Safari's real compositor or
 * iOS's scrolling; a synthetic touch-typed PointerEvent still cannot drive
 * this lens (setPointerCapture throws for an untracked pointerId), so this
 * uses a real (mouse-typed) Playwright pointer session, as the Tier A run's
 * item 6 fell back to as well.
 *
 * Usage: node scripts/themes/glassmorphism/b2-glass-3a-verify-webkit.mjs --base http://127.0.0.1:4471
 */
import { webkit } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', '.out', 'stage3-b2', 'glass-3a');

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const base = arg('base', 'http://127.0.0.1:4471');

const results = [];
function record(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` (${detail})` : ''}`);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await webkit.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto(`${base}/t/glassmorphism/`, { waitUntil: 'networkidle' });
  const mounted = await page.waitForFunction(() => {
    const canvas = document.querySelector('.lens-canvas');
    const poster = document.querySelector('.lens-poster');
    return !!canvas && poster && poster.style.display === 'none';
  }, { timeout: 10000 }).then(() => true).catch(() => false);
  record('the lens mounts in WebKit (poster hides)', mounted);

  const glInfo = await page.evaluate(() => {
    const canvas = document.querySelector('.lens-canvas');
    const gl = canvas?.getContext('webgl');
    if (!gl) return null;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return { renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER), isLost: gl.isContextLost() };
  });
  record('a live (non-lost) WebGL context backs the lens', !!glInfo && !glInfo.isLost, JSON.stringify(glInfo));

  if (mounted) {
    await page.screenshot({ path: join(OUT, 'webkit-lens-mounted.png') });

    // A mouse drag on the lens: must not select the header, heading or body
    // text (the exact regression proofs/lens.md's WebKit run found).
    const hit = await page.$('.lens-hit');
    const box = await hit.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    for (let i = 1; i <= 6; i++) {
      await page.mouse.move(box.x + box.width / 2 - i * 15, box.y + box.height / 2 - i * 40, { steps: 2 });
    }
    await page.mouse.up();
    const selection = await page.evaluate(() => window.getSelection()?.toString() ?? '');
    record('a mouse drag on the lens selects no text (WebKit)', selection === '', JSON.stringify(selection));
    await page.screenshot({ path: join(OUT, 'webkit-after-drag.png') });

    const moved = await page.evaluate(() => document.querySelector('.lens-canvas').style.transform);
    record('the drag actually moved the lens (WebKit)', !!moved, moved);
  }

  record('no page errors during the WebKit run', errors.length === 0, errors.slice(0, 5).join(' | '));

  await writeFile(join(OUT, 'webkit-results.json'), JSON.stringify({ base, glInfo, results }, null, 2));
  await browser.close();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} WebKit checks passed.`);
  if (failed.length) process.exitCode = 1;
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
