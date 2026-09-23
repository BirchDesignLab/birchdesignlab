/**
 * Force a WebGL context loss on every WebGL canvas of a page, restore it, and
 * confirm each canvas draws again, cleanly, with no page errors.
 *
 * Written 09-22-26 (theme-schools build, F013): the bark renderer had no
 * context-loss handling, and the portal makes long-lived WebGL backgrounds
 * more common. A GPU reset cannot be triggered on demand, but
 * WEBGL_lose_context fires exactly the events a real one does.
 *
 * "Draws again" is measured, not eyeballed: an init script wraps the WebGL
 * draw calls and counts them per canvas. After the restore the canvas must
 * issue new draws and the context must report no GL error (a renderer that
 * kept using its dead programs or buffers would raise INVALID_OPERATION).
 * Reading pixels instead is unreliable here: a presented buffer reads blank
 * without preserveDrawingBuffer, and the bark loop draws at 30fps, so a given
 * animation frame may legitimately hold nothing.
 *
 * Usage: BDL_GPU=1 node scripts/themes/check-context-loss.mjs --base http://localhost:4400 --routes /,/about/
 * (Git Bash: prefix with MSYS_NO_PATHCONV=1.)
 */
import { chromium } from 'playwright';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}
const base = arg('base', 'http://localhost:4400').replace(/\/$/, '');
const routes = arg('routes', '/,/about/,/contact/').split(',');
const useGpu = process.env.BDL_GPU === '1';

const browser = await chromium.launch({
  args: useGpu ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] : [],
});
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
await context.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
await context.addInitScript(() => {
  for (const Ctx of [globalThis.WebGL2RenderingContext, globalThis.WebGLRenderingContext]) {
    if (!Ctx) continue;
    for (const m of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced']) {
      const orig = Ctx.prototype[m];
      if (!orig) continue;
      Ctx.prototype[m] = function (...args) {
        this.canvas.__draws = (this.canvas.__draws || 0) + 1;
        return orig.apply(this, args);
      };
    }
  }
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

let failures = 0;
for (const route of routes) {
  await page.goto(base + route, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const result = await page.evaluate(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const out = [];
    for (const canvas of document.querySelectorAll('canvas')) {
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!gl) continue;
      const ext = gl.getExtension('WEBGL_lose_context');
      if (!ext) { out.push({ id: canvas.className, skipped: 'no WEBGL_lose_context' }); continue; }
      const drawsBefore = canvas.__draws || 0;
      const lost = new Promise((r) => canvas.addEventListener('webglcontextlost', r, { once: true }));
      ext.loseContext();
      await lost;
      await wait(200);
      const drawsWhileLost = canvas.__draws || 0;
      // A page that never calls preventDefault on the loss event never gets a
      // restore event at all (the browser gives the context up), so wait with
      // a deadline rather than forever.
      const restored = new Promise((r) => canvas.addEventListener('webglcontextrestored', () => r(true), { once: true }));
      ext.restoreContext();
      if (!(await Promise.race([restored, wait(3000).then(() => false)]))) {
        out.push({ id: canvas.className, neverRestored: true, lostNow: gl.isContextLost() });
        continue;
      }
      canvas.__draws = 0;
      await wait(900);
      out.push({
        id: canvas.className,
        drawsBefore,
        drawsWhileLost: drawsWhileLost - drawsBefore,
        drawsAfterRestore: canvas.__draws || 0,
        glError: gl.getError(),
        lostNow: gl.isContextLost(),
      });
    }
    return out;
  });
  for (const r of result) {
    const ok = r.skipped || (!r.neverRestored && r.drawsAfterRestore > 0 && r.glError === 0 && !r.lostNow);
    if (!ok) failures++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${route} ${r.id} ${JSON.stringify(r)}`);
  }
  if (result.length === 0) console.log(`--   ${route} no WebGL canvases`);
}
await browser.close();
if (errors.length) {
  failures += errors.length;
  console.log('page errors:', errors);
}
process.exitCode = failures ? 2 : 0;
