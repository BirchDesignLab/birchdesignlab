/**
 * What drawing ahead costs a visitor who is only browsing the switcher's
 * dialog: how many copies go up, and how long the page underneath holds
 * still (its longest gap between animation frames) while they do.
 *
 * Written 09-24-26 for Tier 3 stage 2 by the freeze investigation's fixer
 * (tier3-stage2/freeze-investigation.md, "Fixer"). The review found that a
 * keyboard focus drew a copy after the same 100 ms dwell as a mouse, so
 * tabbing down the rows at a reading pace would draw one at almost every
 * stop, each holding the page for up to about 250 ms; only a 30 ms mouse
 * sweep had been checked. runtime.ts now waits 500 ms on a focus
 * (FOCUS_DWELL_MS). This times each way of browsing against any snapshot, so
 * the old dwell (freeze-d3) and the new (freeze-fix) can be compared, and
 * HEAD (freeze-d0, nothing drawn) gives the floor.
 *
 * Each run is a fresh browser (so every copy pays its first compile, as a
 * visitor's first visit does) on --from, the dialog opened with a real
 * click and its warm-up let finish (1500 ms), then:
 *   tab    Tab pressed once per row, --pace ms apart;
 *   mouse  the mouse moved onto each row in turn, --pace ms apart;
 *   rest   the mouse rested on one row (the first other school) 1500 ms:
 *          what a visitor who reaches for one row pays for its copy;
 * then 1500 ms more. Recorded from the first key or move to the end: copies
 * that went up (school, time up), and the longest animation-frame gap.
 *
 * Usage:
 *   BDL_GPU=1 node scripts/themes/snap.mjs --name freeze-fix --reuse --port 4495 -- \
 *     node scripts/themes/harness/draw-ahead-browse.mjs --modes tab,mouse,rest [--pace 250] \
 *     [--runs 5] [--from quiet] [--viewport desktop] [--scheme dark] --label freeze-fix [--tag browse]
 * Output: scripts/themes/.out/<label>/<tag>-<viewport>-<scheme>.json, and a
 * table on stdout.
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VIEWPORTS } from '../capture.mjs';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}
const base = arg('base', process.env.SNAP_BASE || 'http://127.0.0.1:4495').replace(/\/$/, '');
const modes = arg('modes', 'tab,mouse,rest').split(',').filter(Boolean);
const paces = arg('paces', arg('pace', '250')).split(',').filter(Boolean).map(Number);
const runs = Number(arg('runs', '5'));
const from = arg('from', 'quiet');
const vpName = arg('viewport', 'desktop');
const scheme = arg('scheme', 'dark');
const label = arg('label', 'freeze-fix');
const tag = arg('tag', 'browse');
const vp = VIEWPORTS[vpName];
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', '.out', label);
const useGpu = process.env.BDL_GPU === '1';
const COPY = 'iframe[aria-hidden="true"][sandbox]';

async function one(mode, pace) {
  const browser = await chromium.launch({
    args: ['--hide-scrollbars', ...(useGpu ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] : [])],
  });
  try {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.mobile ? 2 : 1,
      isMobile: !!vp.mobile, hasTouch: !!vp.mobile, colorScheme: scheme, reducedMotion: 'no-preference',
    });
    await context.addInitScript((s) => { try { localStorage.setItem('scheme', s); } catch {} }, scheme);
    await suppressPrompt(context);
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.setBlockedURLs', { urls: ['*/cdn-cgi/zaraz/*'] });
    await page.goto(`${base}/t/${from}/`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const renderer = await page.evaluate(() => {
      const gl = document.createElement('canvas').getContext('webgl');
      const x = gl && gl.getExtension('WEBGL_debug_renderer_info');
      return x ? gl.getParameter(x.UNMASKED_RENDERER_WEBGL) : 'unknown';
    });
    await page.waitForTimeout(600);
    await page.evaluate((sel) => {
      const w = (window.__browse = { copies: [], start: null, maxGap: 0, last: null });
      new MutationObserver((rs) => {
        for (const r of rs) for (const n of r.addedNodes) if (n.matches?.(sel)) {
          w.copies.push({ up: performance.now(), school: (n.srcdoc.match(/data-theme="([^"]+)"/) || [])[1] });
        }
      }).observe(document.documentElement, { childList: true, subtree: true });
      const tick = (t) => {
        if (w.start != null && w.last != null && t > w.start) w.maxGap = Math.max(w.maxGap, t - w.last);
        w.last = t;
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, COPY);
    await page.locator('bdl-switcher .open').click();
    await page.waitForTimeout(1500);
    const rows = await page.evaluate(() => [...document.querySelector('bdl-switcher').shadowRoot.querySelectorAll('a[data-school]')]
      .map((a) => ({ id: a.dataset.school, current: a.getAttribute('aria-current') === 'page' })));
    const box = (id) => page.evaluate((id) => {
      const a = document.querySelector('bdl-switcher').shadowRoot.querySelector(`a[data-school="${id}"]`);
      a.scrollIntoView({ block: 'nearest' });
      const r = a.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }, id);
    await page.evaluate(() => { window.__browse.start = performance.now(); });
    if (mode === 'tab') {
      for (let i = 0; i < rows.length; i++) { await page.keyboard.press('Tab'); await page.waitForTimeout(pace); }
    } else if (mode === 'mouse') {
      for (const r of rows) { const b = await box(r.id); await page.mouse.move(b.x, b.y); await page.waitForTimeout(pace); }
      await page.mouse.move(vp.width - 2, 2);
    } else if (mode === 'drift') {
      const id = rows.find((r) => !r.current).id;
      const spots = await page.evaluate((id) => {
        const a = document.querySelector('bdl-switcher').shadowRoot.querySelector(`a[data-school="${id}"]`);
        a.scrollIntoView({ block: 'nearest' });
        const r = a.getBoundingClientRect();
        const pad = { x: r.left + 3, y: r.top + r.height / 2 };
        const parts = [...a.querySelectorAll('span')].map((s) => s.getBoundingClientRect()).filter((b) => b.width && b.height)
          .map((b) => ({ x: b.left + Math.min(b.width / 2, 20), y: b.top + b.height / 2 }));
        return [pad, ...parts, pad];
      }, id);
      await page.evaluate(() => { window.__browse.arrived = performance.now(); });
      for (let t = 0, i = 0; t < 1500; t += 60, i++) { await page.mouse.move(spots[i % spots.length].x, spots[i % spots.length].y); await page.waitForTimeout(60); }
    } else if (mode === 'rest') {
      const b = await box(rows.find((r) => !r.current).id);
      await page.mouse.move(b.x, b.y);
    } else throw new Error(`unknown mode ${mode}`);
    await page.waitForTimeout(1500);
    const got = await page.evaluate(() => {
      const w = window.__browse;
      const from = w.arrived ?? w.start;
      return { maxGap: Math.round(w.maxGap), copies: w.copies.map((c) => ({ school: c.school, up: Math.round(c.up - from) })) };
    });
    return { mode, pace: mode === 'tab' || mode === 'mouse' ? pace : null, renderer, ...got };
  } finally {
    await browser.close();
  }
}

const med = (xs) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
await mkdir(OUT, { recursive: true });
const all = [];
const lines = [`| mode (${vpName} ${scheme}, from ${from}) | pace | copies | longest animation-frame gap | first copy up (ms after the first move, or the arrival for drift) |`, '|---|---|---|---|---|'];
const span = (xs) => (xs.length ? `${med(xs)} (${Math.min(...xs)} to ${Math.max(...xs)})` : 'none');
for (const mode of modes) {
  for (const pace of mode === 'tab' || mode === 'mouse' ? paces : [null]) {
    const rs = [];
    for (let i = 0; i < runs; i++) {
      const r = await one(mode, pace);
      console.log(`${mode}${pace ? ` ${pace} ms` : ''} run ${i + 1}: gap ${r.maxGap} ms, copies ${r.copies.map((c) => `${c.school}@${c.up}`).join(' ') || 'none'} (${r.renderer})`);
      rs.push(r);
    }
    all.push(...rs);
    const firsts = rs.filter((r) => r.copies.length).map((r) => r.copies[0].up);
    lines.push(`| ${mode} | ${pace ?? '-'} | ${span(rs.map((r) => r.copies.length))} | ${span(rs.map((r) => r.maxGap))} | ${span(firsts)} |`);
  }
}
await writeFile(join(OUT, `${tag}-${vpName}-${scheme}.json`), JSON.stringify({ base, from, paces, runs, all }, null, 2));
console.log(`\n${lines.join('\n')}`);
