/**
 * The looping Portal animation in the README ("The Portal: design schools"):
 * the home page changing school to school through the switcher's real view
 * transitions, so a visitor sees BDL-010 without leaving GitHub.
 *
 * Nothing is faked. Each change goes through the switcher's own school row
 * (its click handler calls navigate(), which runs the cross-document view
 * transition), and the page is filmed in real time with the DevTools
 * screencast. The row is activated without opening the dialog, so the clip
 * shows the transition rather than a menu over it.
 *
 * The clip starts on the first school's settled frame and ends the moment the
 * last switch has landed back on it, so the WebP loops without a seam.
 *
 * Filmed in light mode, all seven schools.
 *
 * Serve a build first (npm run build; npm run preview -- --port 4400).
 * Usage: BDL_GPU=1 node scripts/readme/portal-loop.mjs [--base http://localhost:4400]
 *          [--hold 1.5] [--width 880] [--fps 15] [--quality 80]
 * Output: assets/readme/portal-loop.webp, plus one settled frame per school in
 *         scripts/readme/.out/ (gitignored) for review.
 */
import { chromium } from 'playwright';
import { mkdir, rm, writeFile, stat, copyFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suppressPrompt } from '../themes/lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
};
const base = arg('base', 'http://localhost:4400').replace(/\/$/, '');
const hold = Number(arg('hold', '1.5'));
const width = Number(arg('width', '880'));
const fps = Number(arg('fps', '15'));
const quality = Number(arg('quality', '80'));

// All seven schools, in the switcher's order (meta.ts `order`). The clip
// returns to the first at the end.
const schools = ['quiet', 'bauhaus', 'swiss', 'vaporwave', 'cottagecore', 'grandmillennial', 'glassmorphism'];
const VIEWPORT = { width: 1280, height: 800 };

const OUT = join(HERE, '.out');
const RAW = join(OUT, 'raw');
const TARGET = join(ROOT, 'assets', 'readme', 'portal-loop.webp');

if (process.env.BDL_GPU !== '1') throw new Error('set BDL_GPU=1: the README clip is filmed on the GPU, never SwiftShader');

const browser = await chromium.launch({
  args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'],
});
const context = await browser.newContext({
  viewport: VIEWPORT,
  deviceScaleFactor: 1,
  colorScheme: 'light',
  reducedMotion: 'no-preference',
});
await context.addInitScript(() => { try { localStorage.setItem('scheme', 'light'); } catch {} });
await suppressPrompt(context);
// Zaraz is the site's analytics and its consent modal; a recording never reports a visit.
await context.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
const page = await context.newPage();
const cdp = await context.newCDPSession(page);
// Headless Chromium reports prefers-reduced-transparency: reduce by default,
// which would put glassmorphism in its fallback (see scripts/themes/capture.mjs).
await cdp.send('Emulation.setEmulatedMedia', {
  features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }],
});
const problems = [];
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));

const renderer = await page.evaluate(() => {
  const gl = document.createElement('canvas').getContext('webgl');
  if (!gl) return null;
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
});
console.log(`renderer: ${renderer}`);
if (!renderer || /swiftshader|llvmpipe|software|basic render|warp/i.test(renderer)) {
  await browser.close();
  throw new Error(`not on the GPU: ${renderer}`);
}

/** Wait for the page to be on a school and settled: fonts loaded, no transition running. */
async function settle(id) {
  await page.waitForURL(`**/t/${id}/`, { timeout: 15000 });
  await page.waitForLoadState('load');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => !document.getAnimations().some((a) => a.effect?.pseudoElement?.startsWith('::view-transition')));
  // WebGL schools draw their first frames after load; give them a beat.
  await page.waitForTimeout(400);
}

/** Change school the way the switcher's dialog row does. */
async function switchTo(id) {
  await page.evaluate((school) => {
    const row = document.querySelector('bdl-switcher')?.shadowRoot?.querySelector(`a[data-school="${school}"]`);
    if (!row) throw new Error(`no switcher row for ${school}`);
    row.click();
  }, id);
}

// Warm every school once so the clip films cached pages, not first loads.
for (const id of schools) {
  await page.goto(`${base}/t/${id}/`, { waitUntil: 'networkidle' });
}
await page.goto(`${base}/t/${schools[0]}/`, { waitUntil: 'networkidle' });
await settle(schools[0]);

await rm(RAW, { recursive: true, force: true });
await mkdir(RAW, { recursive: true });

// The screencast stays on the page's target across cross-document navigations.
const frames = [];
const writes = [];
cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
  const file = join(RAW, `${String(frames.length).padStart(6, '0')}.jpg`);
  frames.push({ file, at: metadata.timestamp });
  writes.push(writeFile(file, Buffer.from(data, 'base64')));
  cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
});
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 95, maxWidth: VIEWPORT.width, maxHeight: VIEWPORT.height, everyNthFrame: 1 });
// Nudge a repaint so the first tick has a frame even on a static page.
await page.mouse.move(VIEWPORT.width - 2, VIEWPORT.height / 2);
await page.waitForTimeout(150);

// Marks in Node time; frames carry compositor time. Both are wall-clock seconds.
const now = () => Date.now() / 1000;
const marks = [{ id: schools[0], at: now() }];
const leaves = [];
await page.waitForTimeout(hold * 1000);
for (const id of [...schools.slice(1), schools[0]]) {
  leaves.push(now());
  await switchTo(id);
  await settle(id);
  marks.push({ id, at: now() });
  if (marks.length <= schools.length) await page.waitForTimeout(hold * 1000);
}
await cdp.send('Page.stopScreencast');
await Promise.all(writes);
await browser.close();

const t0 = marks[0].at;
const t1 = marks[marks.length - 1].at;
const seconds = t1 - t0;
console.log(`frames: ${frames.length}, clip: ${seconds.toFixed(2)} s`);
if (frames.length < 10) throw new Error('the screencast delivered almost no frames');

// One concat entry per output tick: the newest frame at or before that tick.
const ordered = [...frames].sort((a, b) => a.at - b.at);
const total = Math.round(seconds * fps);
const lines = ['ffconcat version 1.0'];
let k = 0;
let last = null;
for (let n = 0; n < total; n++) {
  const t = t0 + n / fps;
  while (k + 1 < ordered.length && ordered[k + 1].at <= t) k++;
  last = ordered[k].file.replace(/\\/g, '/');
  lines.push(`file '${last}'`, `duration ${(1 / fps).toFixed(6)}`);
}
lines.push(`file '${last}'`);
const list = join(OUT, 'frames.concat.txt');
await writeFile(list, lines.join('\n'), 'utf8');

await mkdir(dirname(TARGET), { recursive: true });
const ff = spawnSync('ffmpeg', [
  '-hide_banner', '-loglevel', 'error', '-y',
  '-f', 'concat', '-safe', '0', '-i', list,
  '-vf', `fps=${fps},scale=${width}:-2:flags=lanczos`,
  '-frames:v', String(total),
  '-c:v', 'libwebp_anim', '-lossless', '0', '-quality', String(quality), '-compression_level', '6',
  '-loop', '0',
  TARGET,
], { stdio: 'inherit' });
if (ff.status !== 0) throw new Error('ffmpeg failed to encode the WebP');

// One settled frame per school (the last frame before it is left) for review.
for (let i = 0; i < schools.length; i++) {
  const before = leaves[i] - 0.02;
  const f = ordered.filter((x) => x.at <= before).pop();
  if (f) await copyFile(f.file, join(OUT, `${String(i + 1)}-${schools[i]}.jpg`));
}

const bytes = (await stat(TARGET)).size;
console.log(`wrote ${TARGET} (${(bytes / 1048576).toFixed(2)} MB, ${total} frames at ${fps} fps)`);
for (const m of marks) console.log(`  ${(m.at - t0).toFixed(2).padStart(6)} s  ${m.id}`);
if (problems.length) console.log(problems.join('\n'));
if (bytes > 4 * 1048576) console.log('WARNING: over the 4 MB budget; lower --quality or --fps');
