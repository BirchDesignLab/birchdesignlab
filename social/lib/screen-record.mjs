/**
 * Real-time recorder plumbing for interactive pages (render/screens.mjs).
 *
 * This is the other half of the pipeline from lib/capture.mjs. capture() freezes
 * the page clock and steps it by hand so two runs are byte-comparable; these
 * clips cannot work that way. A view transition runs on the compositor, and a
 * click is a real input event, so the page has to run on its own clock and be
 * filmed as it goes. What this module owns is the three things that make that
 * honest:
 *
 *   - launching the same Chromium the loops use, on the GPU when BDL_GPU=1, and
 *     proving which rasteriser it got (SwiftShader is silent and slow);
 *   - a phone-shaped context set up the way scripts/themes/motion.mjs sets one
 *     up, so the portal sees what a visitor on a phone sees;
 *   - two recording backends behind one interface, so the choice between them
 *     was measured (scripts/measure-screen-recorders.mjs) rather than assumed.
 *
 * Backends return the same thing: timestamped frames on disk. `toFrames()` then
 * resamples them onto a constant 30fps grid by holding the newest frame at each
 * tick, which is exactly what a screen shows: a page that did not repaint did
 * not change.
 */
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { run } from './ffmpeg.mjs';

/** Same flags as lib/capture.mjs and scripts/themes/motion.mjs. */
export const GPU_ARGS = [
  '--use-angle=d3d11',
  '--enable-gpu',
  '--ignore-gpu-blocklist',
  '--enable-gpu-rasterization',
];

export const useGpu = () => process.env.BDL_GPU === '1';

/** The switcher remembers a dismissed first-load prompt under this sessionStorage key. */
const PROMPT_KEY = 'bdl-portal-prompt';

/**
 * `window` makes the phone real: a window of exactly that size with a real
 * device scale factor, rather than a viewport the DevTools emulation fakes one
 * onto. The difference is the whole recording. Under emulation the screencast
 * delivers CSS pixels (390x844 for a dPR-3 phone, measured by
 * scripts/probe-screencast-resolution.mjs), which is a 2.8x upscale at 1080
 * wide; under a real device scale factor it delivers device pixels (1170x2532),
 * and the text is sharp.
 */
export async function launch(window = null) {
  const args = ['--hide-scrollbars', ...(useGpu() ? GPU_ARGS : [])];
  if (window) args.push(`--window-size=${window.width},${window.height}`, `--force-device-scale-factor=${window.dpr}`);
  return chromium.launch({ args });
}

/**
 * A phone, the way motion.mjs builds one, plus the two things a recording needs
 * that a review strip does not: the scheme the clip is shot in, and the
 * switcher's first-load prompt marked dismissed (its fade-in and beacon would
 * otherwise sit in the first clip a fresh context films).
 */
export async function phoneContext(browser, { width, height, dpr = 3, scheme = 'dark', recordVideo, native = false } = {}) {
  // native: the browser was launched with the phone's window size and device
  // scale factor (see launch()), so the context takes the window as it is.
  const context = await browser.newContext({
    ...(native
      ? { viewport: null }
      : { viewport: { width, height }, deviceScaleFactor: dpr, isMobile: true, hasTouch: true }),
    colorScheme: scheme,
    reducedMotion: 'no-preference',
    ...(recordVideo ? { recordVideo } : {}),
  });
  await context.addInitScript(
    ([s, key]) => {
      try { localStorage.setItem('scheme', s); } catch {}
      try { sessionStorage.setItem(key, 'dismissed'); } catch {}
    },
    [scheme, PROMPT_KEY],
  );
  // Zaraz is the site's analytics; a recording never reports a visit.
  await context.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
  return context;
}

/**
 * Headless Chromium here reports prefers-reduced-transparency: reduce, which
 * pushes glassmorphism into its fallback. motion.mjs forces it back (see the
 * comment there); the clips must show the school a visitor sees.
 */
export async function normaliseMedia(context, page) {
  try {
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }],
    });
  } catch {
    /* older Chromium: the default stands */
  }
}

/** UNMASKED_RENDERER_WEBGL, read from a throwaway canvas on the live page. */
export async function rendererString(page) {
  return page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl');
    if (!gl) return null;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  });
}

export function assertGpu(renderer) {
  if (!renderer) throw new Error('no WebGL context: cannot tell which rasteriser this is');
  if (/swiftshader|llvmpipe|software/i.test(renderer)) {
    throw new Error(`rendering on the CPU, not the GPU: ${renderer}\nSet BDL_GPU=1.`);
  }
}

/** Width and height from a JPEG's SOF marker. The screencast does not report them. */
export function jpegSize(buf) {
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) { i++; continue; }
    const marker = buf[i + 1];
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return null;
}

/**
 * Backend 1: the Chrome DevTools screencast.
 *
 * Frames are written to disk as they arrive and acknowledged straight away: the
 * browser sends nothing more until it gets the ack, so every millisecond spent
 * between receipt and ack is a hole in the recording. `at` is the compositor's
 * own timestamp (seconds), not Node's clock, so a slow disk does not smear it.
 *
 * It sends a frame only when the page repaints. A static page yields none, and
 * toFrames() fills those ticks by holding the previous frame.
 */
export async function startScreencast(page, { dir, width, height, quality = 92 }) {
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  const pending = [];
  cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
    const n = frames.length;
    const file = path.join(dir, `${String(n).padStart(6, '0')}.jpg`);
    frames.push({ file, at: metadata.timestamp });
    const buf = Buffer.from(data, 'base64');
    pending.push(writeFile(file, buf));
    cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', {
    format: 'jpeg',
    quality,
    maxWidth: width,
    maxHeight: height,
    everyNthFrame: 1,
  });
  // A page with nothing to repaint sends no frame, and a clip needs a picture
  // for its first tick. A screenshot stands in, at the same device size.
  await new Promise((r) => setTimeout(r, 300));
  if (!frames.length) {
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality });
    const file = path.join(dir, `${String(frames.length).padStart(6, '0')}.jpg`);
    frames.push({ file, at: Date.now() / 1000 - 0.001, screenshot: true });
    pending.push(writeFile(file, Buffer.from(data, 'base64')));
  }
  return {
    frames,
    async stop() {
      const endAt = Date.now() / 1000;
      await cdp.send('Page.stopScreencast').catch(() => {});
      await cdp.detach().catch(() => {});
      await Promise.all(pending);
      return { frames, endAt };
    },
  };
}

/**
 * Resample timestamped frames onto a constant grid and write them as the PNG
 * sequence encode() and contactSheet() read.
 *
 * ffmpeg's concat demuxer takes a duration per file, and `fps` then samples that
 * timeline at 30Hz holding the newest frame, which is what the screen showed.
 * `vf` carries any scaling or compositing so the PNGs written are the final
 * 1080x1920 pixels, with no second resample on the way to the encoder.
 *
 * @param {{file:string,at:number}[]} frames
 * @param {number} t0       compositor timestamp of the clip's first tick
 * @param {number} seconds  length of the clip
 */
export async function toFrames({ frames, t0, seconds, fps = 30, outDir, vf = null, filterComplex = null }) {
  if (!frames.length) throw new Error('toFrames: the recorder produced no frames');
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  // The newest frame at or before t0 is what was on screen at the first tick.
  let first = 0;
  for (let i = 0; i < frames.length; i++) if (frames[i].at <= t0) first = i;
  const used = frames.slice(first);
  const end = t0 + seconds;

  const lines = ['ffconcat version 1.0'];
  for (let i = 0; i < used.length; i++) {
    const from = Math.max(used[i].at, t0);
    const to = Math.min(i + 1 < used.length ? used[i + 1].at : end, end);
    if (to <= from && i + 1 < used.length) continue;
    // A frame stamped after the clip ends contributes nothing.
    if (from >= end) break;
    lines.push(`file '${used[i].file.replace(/\\/g, '/')}'`);
    lines.push(`duration ${Math.max(to - from, 0.001).toFixed(6)}`);
  }
  // concat ignores the last duration unless the file is repeated.
  const lastFile = lines.filter((l) => l.startsWith('file ')).pop();
  lines.push(lastFile);

  const list = path.join(outDir, '..', `${path.basename(outDir)}.concat.txt`);
  await writeFile(list, lines.join('\n'), 'utf8');

  // `fps` first, in both shapes: it is what turns the timestamped frames into
  // a constant grid, and everything after it works on the final tick sequence.
  const grid = `fps=${fps}:start_time=0`;
  const graph = filterComplex
    ? ['-filter_complex', filterComplex.replace('[0:v]', `[0:v]${grid},`), '-map', '[out]']
    : ['-vf', [grid, vf].filter(Boolean).join(',')];
  await run('ffmpeg', [
    '-hide_banner', '-y',
    '-f', 'concat', '-safe', '0', '-i', list,
    ...graph,
    '-frames:v', String(Math.round(seconds * fps)),
    '-start_number', '0',
    path.join(outDir, '%06d.png'),
  ]);
  await rm(list, { force: true });
  return Math.round(seconds * fps);
}

/** Interval statistics for a list of timestamps in seconds. */
export function pacing(times) {
  const gaps = [];
  for (let i = 1; i < times.length; i++) gaps.push((times[i] - times[i - 1]) * 1000);
  if (!gaps.length) return null;
  const sorted = [...gaps].sort((a, b) => a - b);
  const q = (p) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
  const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  const sd = Math.sqrt(gaps.reduce((a, b) => a + (b - mean) ** 2, 0) / gaps.length);
  return {
    frames: times.length,
    meanMs: +mean.toFixed(2),
    sdMs: +sd.toFixed(2),
    p50Ms: +q(0.5).toFixed(2),
    p95Ms: +q(0.95).toFixed(2),
    maxMs: +sorted[sorted.length - 1].toFixed(2),
    over50ms: gaps.filter((g) => g > 50).length,
    over100ms: gaps.filter((g) => g > 100).length,
  };
}

export async function readText(file) {
  return readFile(file, 'utf8');
}
