/**
 * Check the portal's drawing ahead (runtime.ts) the way a visitor meets it:
 * that a copy on screen moves no pixel, loads nothing twice, logs nothing,
 * never takes focus, and is gone before a navigation captures the old page.
 *
 * Written 09-23-26 for Tier 3 stage 2 (the freeze investigation, agent D,
 * tier3-stage2/freeze-investigation.md). runtime.ts draws a script-less copy
 * of the page the visitor reaches for (a mouse resting on a link, a focus, a
 * press) over the current page at opacity 0.001, so the GPU compiles its
 * programs before the click. trace-arrival.mjs measures what that saves;
 * this checks that nobody can tell it happened. No init script runs in the
 * page (Playwright's run in every frame, and a sandboxed copy would report
 * each one as blocked script), so the console is the page's own.
 *
 * For each viewport, scheme and start page, under reduced motion and with
 * the page's transitions off (a still page, so any moved pixel is the
 * copy's doing):
 *   rows     open the switcher's dialog with a real click; rest the mouse on
 *            each other school's row in turn; screenshot while its copy is
 *            up and loaded, and again once it is down (the pointer left where
 *            it is): the two must be equal pixel for pixel. The focused
 *            control must not move, and no copy may be focused;
 *   sweep    move the mouse across every row, 30 ms each: no copy
 *            may go up;
 *   shuffle  rest on Shuffle (its pick drawn over the bare page), same rule;
 *   link     (changed 09-24-26: the page's own links are no longer drawn
 *            ahead) rest the mouse on the page's first link to another
 *            portal page, then focus it, 800 ms each: no copy may go up;
 *   keyboard (added 09-24-26) open the dialog, Tab down the rows at 250 ms
 *            a stop (a reading pace), then take the focus off the last stop:
 *            no copy may go up; then focus one row and leave it there: its
 *            copy goes up and is judged as a row's is;
 *   network  no URL reaches the network twice, and a copy's own requests
 *            all come from the HTTP cache;
 *   console  no console message and no page error at all;
 *   navigate rest on a row until its copy is up, then click it: at
 *            astro:after-preparation (before the view transition captures
 *            the old page) no copy may be in the document, none may appear
 *            after, and the swap must land.
 *
 * Changed 09-24-26 by the investigation's fixer: a copy judged while it
 * loads could come down (runtime.ts removes it 3 frames and 100 ms after its
 * first frame) before the screenshot landed, which left 12 copies unjudged,
 * 10 of them over glassmorphism. In the rows, shuffle and keyboard visits
 * the probe now holds every copy the runtime removes (Element.remove wrapped
 * in the page; nothing else of the page's script is touched), takes the
 * first shot then, with the copy fully drawn, and the second once it has let
 * it go. Every copy that goes up is judged; one that is not is a failure.
 * The navigate visit holds nothing.
 *
 * The network rule needs the live site's caching: snap.mjs's server sends no
 * Cache-Control, so every request would revalidate. --serve <snap name>
 * serves scripts/themes/.out/snap-<name>/ itself on --port (default 4492)
 * with the headers public/_headers gives /_astro/ (immutable, a year) and
 * HTML revalidating on every request, as the site's is.
 *
 * Usage:
 *   BDL_GPU=1 node scripts/themes/harness/draw-ahead-check.mjs --serve freeze-d2 [--port 4492] \
 *     [--from quiet,swiss,glassmorphism] [--viewports desktop,mobile] [--schemes dark,light] \
 *     [--label freeze-d2] [--parts rows,shuffle,keyboard,navigate]
 * Exit code 1 on any failure. Differing shots are written to
 * scripts/themes/.out/<label>/drawcheck-*.png.
 */
import { chromium } from 'playwright';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, normalize } from 'node:path';
import { VIEWPORTS } from '../capture.mjs';
import { TYPES } from '../lib/serve-dist.mjs';
import { PROMPT_KEY } from '../lib/portal-prompt.mjs';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}
const list = (name, fallback) => arg(name, fallback).split(',').filter(Boolean);
const serveName = arg('serve', '');
/** With --serve: every request the server answered, by path, since the
    last visit began (the ground truth for "reached the network"). */
const served = new Map();
const port = Number(arg('port', '4492'));
let base = (process.env.SNAP_BASE || arg('base', `http://127.0.0.1:${port}`)).replace(/\/$/, '');
let server = null;
if (serveName) {
  const dist = join(dirname(fileURLToPath(import.meta.url)), '..', '.out', `snap-${serveName}`);
  server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    served.set(path, (served.get(path) ?? 0) + 1);
    let file = normalize(join(dist, path));
    if (!file.startsWith(dist)) return void res.writeHead(403).end();
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    const found = existsSync(file);
    if (!found) file = join(dist, '404.html');
    const headers = { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' };
    if (path.startsWith('/_astro/')) headers['cache-control'] = 'public, max-age=31536000, immutable';
    else if (extname(file) === '.html') headers['cache-control'] = 'public, max-age=0, must-revalidate';
    res.writeHead(found ? 200 : 404, headers).end(readFileSync(file));
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  base = `http://127.0.0.1:${port}`;
}
const froms = list('from', 'quiet,swiss,glassmorphism');
/* --parts (09-24-26): which visits to run, all by default. */
const parts = list('parts', 'rows,shuffle,keyboard,navigate');
const viewports = list('viewports', 'desktop,mobile');
const schemes = list('schemes', 'dark,light');
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', '.out', arg('label', 'freeze-d2'));
const COPY = 'iframe[aria-hidden="true"][sandbox]';
const useGpu = process.env.BDL_GPU === '1';
const browser = await chromium.launch({
  args: ['--hide-scrollbars', ...(useGpu ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] : [])],
});
await mkdir(OUT, { recursive: true });

const failures = [];
const fail = (msg) => { failures.push(msg); console.log(`  FAIL ${msg}`); };
let copiesJudged = 0;

async function px(buf) {
  const img = await loadImage(buf);
  const c = createCanvas(img.width, img.height);
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, img.width, img.height).data;
}
function changed(a, b) {
  let n = 0;
  let max = 0;
  for (let i = 0; i < a.length; i += 4) {
    const d = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]));
    if (d) n++;
    if (d > max) max = d;
  }
  return { n, max };
}

/** A fresh visitor on `from` in `scheme`, with no init script: the scheme
    goes into storage and the page is loaded again, as a return visit is. */
async function visit(vp, scheme, from) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.mobile ? 2 : 1,
    isMobile: !!vp.mobile, hasTouch: !!vp.mobile, colorScheme: scheme, reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  // Analytics blocked through CDP: a Playwright route would turn the HTTP
  // cache off for the whole context, and the network rule depends on it.
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setBlockedURLs', { urls: ['*/cdn-cgi/zaraz/*'] });
  const logs = [];
  const clearServed = () => served.clear();
  page.on('console', (m) => logs.push(`console ${m.type()}: ${m.text()}`));
  page.on('pageerror', (e) => logs.push(`pageerror: ${e.message}`));
  await page.goto(`${base}/t/${from}/`, { waitUntil: 'networkidle' });
  // The scheme, and the switcher's first-load prompt marked dismissed (its
  // fade and beacon would otherwise move pixels on their own).
  await page.evaluate(([s, key]) => { localStorage.setItem('scheme', s); sessionStorage.setItem(key, 'dismissed'); }, [scheme, PROMPT_KEY]);
  await page.reload({ waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  // The page's own transitions off (the page only, never the copy): a link's
  // hover colour still fading when a copy goes up would read as the copy's
  // doing (measured with draw-ahead-fetch-debug.mjs --shots on freeze-d0:
  // the same 211 px, 10 levels, with no copy at all).
  await page.addStyleTag({ content: '*,*::before,*::after{transition:none!important}' });
  await page.waitForTimeout(600);
  // Every request from here on, by URL, and whether the network answered it.
  const reqs = new Map();
  cdp.on('Network.requestWillBeSent', (e) => reqs.set(e.requestId, {
    url: e.request.url, frame: e.frameId, cached: false,
    by: `${e.initiator?.type}${e.initiator?.url ? ` ${e.initiator.url}` : ''}${e.initiator?.stack?.callFrames?.[0] ? ` ${e.initiator.stack.callFrames[0].functionName}@${e.initiator.stack.callFrames[0].lineNumber}` : ''}`,
  }));
  cdp.on('Network.requestServedFromCache', (e) => { const r = reqs.get(e.requestId); if (r) r.cached = true; });
  cdp.on('Network.responseReceived', (e) => {
    const r = reqs.get(e.requestId);
    if (r && (e.response.fromDiskCache || e.response.fromPrefetchCache || e.response.fromServiceWorker)) r.cached = true;
  });
  const main = (await cdp.send('Page.getFrameTree')).frameTree.frame.id;
  await page.evaluate((sel) => {
    window.__copiesSeen = 0;
    new MutationObserver((rs) => { for (const r of rs) for (const n of r.addedNodes) if (n.matches?.(sel)) window.__copiesSeen++; })
      .observe(document.documentElement, { childList: true, subtree: true });
  }, COPY);
  clearServed();
  return { context, page, logs, reqs, main };
}

const focusOf = (page) => page.evaluate(() => {
  const sr = document.querySelector('bdl-switcher')?.shadowRoot;
  const el = sr?.activeElement ?? document.activeElement;
  return el ? `${el.tagName}.${el.className}[${el.getAttribute('data-school') ?? el.getAttribute('href') ?? ''}]` : null;
});

/** Hold every copy the runtime takes down until the probe lets it go
    (header comment): Element.remove is wrapped for the copy only. */
const holdCopies = (page) => page.evaluate((sel) => {
  window.__held = [];
  const remove = Element.prototype.remove;
  window.__release = () => { for (const f of window.__held.splice(0)) remove.call(f); };
  Element.prototype.remove = function () {
    if (this.matches?.(sel)) return void window.__held.push(this);
    return remove.call(this);
  };
}, COPY);

/** With the pointer resting where it is: wait for a copy to be drawn and
    let go by the runtime (held by the probe), screenshot, release it,
    screenshot again, compare. */
async function judgeCopy(page, where) {
  const focus0 = await focusOf(page);
  const up = await page.waitForFunction((sel) => {
    const f = window.__held[0];
    if (!f || !f.isConnected || !f.matches(sel)) return false;
    f.dataset.probe = '1';
    return true;
  }, COPY, { timeout: 8000, polling: 'raf' }).then(() => true, () => false);
  if (!up) return fail(`${where}: no copy went up`);
  await page.waitForTimeout(50);
  const during = await page.screenshot();
  const state = await page.evaluate((sel) => {
    const f = document.querySelector(sel);
    if (!f || f.dataset.probe !== '1') return null;
    const cs = getComputedStyle(f);
    return {
      school: f.contentDocument?.documentElement?.dataset.theme,
      attrs: { aria: f.getAttribute('aria-hidden'), inert: f.inert, tab: f.tabIndex, pe: cs.pointerEvents, op: cs.opacity },
      copyFocused: document.activeElement === f,
    };
  }, COPY);
  const still = !!state;
  const focus1 = await focusOf(page);
  await page.evaluate(() => window.__release());
  await page.waitForFunction((sel) => !document.querySelector(sel), COPY, { timeout: 8000 }).catch(() => fail(`${where}: copy never came down`));
  await page.waitForTimeout(150);
  const after = await page.screenshot();
  if (!state || !still) return fail(`${where}: copy came down before the shot, not judged`);
  copiesJudged++;
  const d = changed(await px(during), await px(after));
  const a = state.attrs;
  const attrsOk = a.aria === 'true' && a.inert === true && a.tab === -1 && a.pe === 'none' && Number(a.op) <= 0.001;
  console.log(`  ${where} copy ${state.school}: ${d.n} px changed (max ${d.max}); focus ${focus0 === focus1 ? 'kept' : `MOVED ${focus0} -> ${focus1}`}; attrs ${attrsOk ? 'ok' : JSON.stringify(a)}`);
  if (d.n) {
    fail(`${where} copy ${state.school}: ${d.n} px changed (max ${d.max})`);
    const stem = join(OUT, `drawcheck-${where.replace(/\W+/g, '-')}-${state.school}`);
    await writeFile(`${stem}-during.png`, during);
    await writeFile(`${stem}-after.png`, after);
  }
  if (focus0 !== focus1) fail(`${where}: focus moved while ${state.school} was drawn`);
  if (state.copyFocused) fail(`${where}: the copy took focus`);
  if (!attrsOk) fail(`${where}: copy attributes ${JSON.stringify(a)}`);
}

function network(where, reqs, main) {
  const byUrl = new Map();
  let fromCopies = 0;
  for (const r of reqs.values()) {
    if (r.url.startsWith('data:') || r.url.includes('/cdn-cgi/')) continue;
    const e = byUrl.get(r.url) ?? { net: 0, copyNet: 0 };
    if (!r.cached) e.net++;
    if (r.frame !== main) fromCopies++;
    if (!r.cached && r.frame !== main) e.copyNet++;
    byUrl.set(r.url, e);
  }
  const doubled = [...byUrl].filter(([, e]) => e.net > 1);
  const copyNet = [...byUrl].filter(([, e]) => e.copyNet > 0);
  console.log(`  ${where} network (browser's view): ${reqs.size} requests, ${fromCopies} from copies, ${doubled.length} URLs not from cache twice, ${copyNet.length} copy requests not marked from cache`);
  if (serveName) {
    // The server's own count decides: what reached it twice.
    const twice = [...served].filter(([, n]) => n > 1);
    console.log(`  ${where} network (server's count): ${[...served.values()].reduce((a, b) => a + b, 0)} requests, ${twice.length} paths served twice${twice.length ? `: ${twice.map(([p, n]) => `${p} x${n}`).join(', ')}` : ''}`);
    for (const [p, n] of twice) {
      const who = [...reqs.values()].filter((r) => new URL(r.url).pathname === p).map((r) => `${r.frame === main ? 'page' : 'copy'} ${r.by}${r.cached ? ' (cache)' : ''}`);
      fail(`${where}: ${p} reached the server ${n} times; asked by ${who.join(' | ')}`);
    }
  } else {
    for (const [u] of doubled) fail(`${where}: ${u} reached the network twice`);
    for (const [u] of copyNet) fail(`${where}: a copy fetched ${u} from the network`);
  }
}

const rowBox = (page, id) => page.evaluate((id) => {
  const a = document.querySelector('bdl-switcher').shadowRoot.querySelector(`a[data-school="${id}"]`);
  a.scrollIntoView({ block: 'nearest' });
  const r = a.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}, id);

for (const vpName of viewports) {
  const vp = VIEWPORTS[vpName];
  for (const scheme of schemes) {
    for (const from of froms) {
      const where = `${vpName} ${scheme} ${from}`;
      console.log(where);
      // Rows of the dialog, then a sweep, then the network and console.
      if (parts.includes('rows')) {
        const v = await visit(vp, scheme, from);
        await holdCopies(v.page);
        await v.page.locator('bdl-switcher .open').click();
        await v.page.waitForTimeout(400);
        const ids = await v.page.evaluate(() => [...document.querySelector('bdl-switcher').shadowRoot.querySelectorAll('a[data-school]')]
          .filter((a) => a.getAttribute('aria-current') !== 'page').map((a) => a.dataset.school));
        if (await v.page.evaluate(() => window.__copiesSeen)) fail(`${where}: opening the dialog drew a copy`);
        // The sweep first (nothing drawn yet): 30 ms a row, under the dwell.
        const boxes = [];
        for (const id of ids) boxes.push(await rowBox(v.page, id));
        for (const b of boxes) { await v.page.mouse.move(b.x, b.y); await v.page.waitForTimeout(30); }
        await v.page.mouse.move(vp.width - 2, 2);
        await v.page.waitForTimeout(400);
        const swept = await v.page.evaluate(() => window.__copiesSeen);
        console.log(`  ${where} sweep across ${ids.length} rows: ${swept} copies`);
        if (swept) fail(`${where}: a sweep across the rows drew ${swept} copies`);
        for (const id of ids) {
          const b = await rowBox(v.page, id);
          await v.page.mouse.move(b.x, b.y);
          await judgeCopy(v.page, `${where} row ${id}`);
        }
        network(`${where} rows`, v.reqs, v.main);
        if (v.logs.length) fail(`${where} rows: ${v.logs.join(' | ')}`);
        await v.context.close();
      }
      // Shuffle and the page's own link, over the bare page.
      if (parts.includes('shuffle')) {
        const v = await visit(vp, scheme, from);
        await holdCopies(v.page);
        await v.page.locator('bdl-switcher .shuffle').hover();
        await judgeCopy(v.page, `${where} shuffle`);
        await v.page.mouse.move(2, 2);
        await v.page.waitForTimeout(300);
        const link = await v.page.evaluate(() => {
          const here = location.pathname;
          const a = [...document.querySelectorAll('a[href^="/t/"]')].find((x) => {
            const r = x.getBoundingClientRect();
            return new URL(x.href).pathname !== here && r.width && r.top >= 0 && r.bottom <= innerHeight;
          });
          if (!a) return null;
          const r = a.getBoundingClientRect();
          return { x: r.left + r.width / 2, y: r.top + r.height / 2, href: a.getAttribute('href') };
        });
        if (link) {
          // Not drawn ahead any more (header comment): neither a mouse
          // resting on it nor a focus staying on it may put a copy up.
          const seen0 = await v.page.evaluate(() => window.__copiesSeen);
          await v.page.mouse.move(link.x, link.y);
          await v.page.waitForTimeout(800);
          await v.page.evaluate((href) => document.querySelector(`a[href="${href}"]`)?.focus(), link.href);
          await v.page.waitForTimeout(800);
          const drew = (await v.page.evaluate(() => window.__copiesSeen)) - seen0;
          console.log(`  ${where} link ${link.href}: ${drew} copies from a resting mouse and a focus`);
          if (drew) fail(`${where} link ${link.href}: a page link drew ${drew} copies`);
        } else console.log(`  ${where}: no portal link in view`);
        network(`${where} shuffle+link`, v.reqs, v.main);
        if (v.logs.length) fail(`${where} shuffle+link: ${v.logs.join(' | ')}`);
        await v.context.close();
      }
      // Keyboard: tabbing down the rows at a reading pace draws nothing; a
      // focus that stays draws its row, judged like a row the mouse rests on.
      if (parts.includes('keyboard')) {
        const v = await visit(vp, scheme, from);
        await holdCopies(v.page);
        await v.page.locator('bdl-switcher .open').click();
        await v.page.waitForTimeout(400);
        const n = await v.page.evaluate(() => document.querySelector('bdl-switcher').shadowRoot.querySelectorAll('a[data-school]').length);
        const path = [];
        for (let i = 0; i < n; i++) {
          await v.page.keyboard.press('Tab');
          path.push((await focusOf(v.page))?.match(/\[(.*)\]$/)?.[1] ?? '?');
          await v.page.waitForTimeout(250);
        }
        // Tabbing ends here: the focus leaves the last stop, so staying on it
        // is not counted as tabbing (a first run left it there 850 ms).
        await v.page.evaluate(() => document.querySelector('bdl-switcher').shadowRoot.activeElement?.blur());
        await v.page.waitForTimeout(600);
        const tabbed = await v.page.evaluate(() => window.__copiesSeen);
        console.log(`  ${where} Tab at 250 ms a stop through ${path.join(' ')}: ${tabbed} copies`);
        if (tabbed) fail(`${where}: tabbing through the dialog at 250 ms a stop drew ${tabbed} copies`);
        const row = await v.page.evaluate(() => {
          const a = [...document.querySelector('bdl-switcher').shadowRoot.querySelectorAll('a[data-school]')]
            .find((x) => x.getAttribute('aria-current') !== 'page');
          a.focus();
          return a.dataset.school;
        });
        await judgeCopy(v.page, `${where} focus ${row}`);
        if (v.logs.length) fail(`${where} keyboard: ${v.logs.join(' | ')}`);
        await v.context.close();
      }
      // A navigation while a copy is up takes it down before the capture.
      if (parts.includes('navigate')) {
        const v = await visit(vp, scheme, from);
        await v.page.evaluate((sel) => {
          window.__probe = [];
          document.addEventListener('astro:after-preparation', () => window.__probe.push(!!document.querySelector(sel)));
        }, COPY);
        await v.page.locator('bdl-switcher .open').click();
        await v.page.waitForTimeout(400);
        const to = await v.page.evaluate(() => [...document.querySelector('bdl-switcher').shadowRoot.querySelectorAll('a[data-school]')]
          .find((a) => a.getAttribute('aria-current') !== 'page' && a.dataset.school !== 'quiet').dataset.school);
        const b = await rowBox(v.page, to);
        await v.page.mouse.move(b.x, b.y);
        await v.page.waitForSelector(COPY, { state: 'attached', timeout: 8000 }).catch(() => fail(`${where} navigate: no copy went up`));
        await v.page.mouse.down();
        await v.page.mouse.up();
        // Off every link, so nothing on the arriving page is reached for.
        await v.page.mouse.move(vp.width - 2, Math.round(vp.height * 0.6));
        await v.page.waitForURL(`**/t/${to}/`, { timeout: 10000 }).catch(() => fail(`${where} navigate: never landed on ${to}`));
        const seen0 = await v.page.evaluate(() => window.__copiesSeen);
        await v.page.waitForTimeout(1500);
        const probe = await v.page.evaluate(() => window.__probe);
        const later = (await v.page.evaluate(() => window.__copiesSeen)) - seen0;
        const left = await v.page.evaluate((sel) => !!document.querySelector(sel), COPY);
        console.log(`  ${where} navigate to ${to}: copy at after-preparation ${JSON.stringify(probe)}, copies after landing ${later}, one left ${left}`);
        if (!probe?.length || probe.some(Boolean)) fail(`${where} navigate: a copy was in the document at after-preparation (${JSON.stringify(probe)})`);
        if (left || later) fail(`${where} navigate: a copy was drawn during or after the arrival`);
        if (v.logs.length) fail(`${where} navigate: ${v.logs.join(' | ')}`);
        await v.context.close();
      }
    }
  }
}
await browser.close();
server?.close();
console.log(`\n${copiesJudged} copies judged; ${failures.length ? `${failures.length} failure(s)` : 'all clean'}`);
process.exitCode = failures.length ? 1 : 0;
