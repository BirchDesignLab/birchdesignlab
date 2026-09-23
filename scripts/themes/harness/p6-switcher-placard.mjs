// HISTORICAL: the placard this shoots was removed by the founder's 09-23-26
// decisions (the lessons wait for the BDL-011 case study), and the prompt now
// lives until a tap. Kept as the record of how P6 was checked; its placard
// shots no longer apply. stage1-founder-shots.mjs shows the current switcher.
//
// P6 switcher harness (Tier 3 stage 1, B2; kept in the repo 09-23-26 per the scripts rule): bundles switcher.ts with a stubbed router, serves it
// through Playwright request interception (no server, no dist), and screenshots
// the prompt and the placard at phone, desktop and landscape sizes.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = 'C:/git/birchdesignlab';
const require = createRequire(`${REPO}/package.json`);
const esbuild = require('esbuild');
const { chromium } = require('playwright');
const OUT = join(import.meta.dirname, '..', '.out', 'harness-p6');
mkdirSync(OUT, { recursive: true });

const stubs = {
  name: 'stubs',
  setup(b) {
    b.onResolve({ filter: /^astro:transitions\/client$/ }, () => ({ path: 'astro-client', namespace: 'stub' }));
    b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({
      contents: 'export function navigate(href){ window.__navigated = href; }',
      loader: 'js',
    }));
    b.onResolve({ filter: /\?url$/ }, (a) => ({ path: a.path, namespace: 'url' }));
    b.onLoad({ filter: /.*/, namespace: 'url' }, (a) => ({ contents: `export default ${JSON.stringify('/fonts/' + a.path.split('/').pop().replace('?url', ''))}`, loader: 'js' }));
  },
};

// The data, exactly as PortalLayout builds it.
const metas = ['quiet', 'bauhaus', 'swiss', 'vaporwave', 'cottagecore', 'grandmillennial', 'glassmorphism'];
const dataSrc = `
${metas.map((m, i) => `import { meta as m${i} } from '${REPO}/src/themes/${m}/meta.ts';`).join('\n')}
import { serializePortalData } from '${REPO}/src/themes/portal/schools.ts';
const THEMES = [${metas.map((_, i) => `m${i}`).join(',')}].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
const data = { schools: THEMES.map((t) => ({ id: t.id, name: t.name, era: t.era, signature: t.signature, lesson: t.lesson, nativeScheme: t.nativeScheme, preload: t.fonts.flatMap((f) => f.preload ?? []) })), aboutHref: '/lab/bdl-011/' };
console.log(serializePortalData(data));
`;
const dataBundle = await esbuild.build({ stdin: { contents: dataSrc, resolveDir: REPO, loader: 'ts' }, bundle: true, write: false, format: 'esm', platform: 'node', plugins: [stubs] });
const dataFile = join(OUT, 'data.mjs');
writeFileSync(dataFile, dataBundle.outputFiles[0].text);
const { execFileSync } = await import('node:child_process');
const json = execFileSync(process.execPath, [dataFile]).toString().trim();

const sw = await esbuild.build({ entryPoints: [`${REPO}/src/themes/portal/switcher.ts`], bundle: true, write: false, format: 'esm', platform: 'browser', plugins: [stubs] });
const swJs = sw.outputFiles[0].text;

const page = (id, dark) => `<!doctype html><html lang="en" data-theme="${id}" data-scheme="${dark ? 'dark' : 'light'}"><head><meta name="viewport" content="width=device-width, initial-scale=1">
<script type="application/json" id="bdl-schools">${json}</script>
<style>body{margin:0;font:18px/1.6 Georgia,serif;background:${dark ? '#12100d' : '#f3ede0'};color:${dark ? '#eee' : '#222'}} main{padding:40px 24px;max-width:70ch} h1{font-size:56px;line-height:1;margin:0 0 24px}</style></head>
<body><main><h1>Build it right once.</h1>${'<p>We design and build websites for small businesses that want to look like they mean it. Every page is hand made, fast, and ready to grow with you.</p>'.repeat(8)}</main>
<bdl-switcher></bdl-switcher><script type="module" src="/sw.js"></script></body></html>`;

const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const results = {};

async function run(label, viewport, { id = 'bauhaus', dark = false, blockStorage = false } = {}) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  if (blockStorage) await ctx.addInitScript(() => Object.defineProperty(window, 'sessionStorage', { get() { throw new DOMException('blocked', 'SecurityError'); } }));
  await ctx.route('http://portal.test/**', (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/sw.js') return route.fulfill({ contentType: 'text/javascript', body: swJs });
    const m = url.pathname.match(/^\/t\/([a-z]+)\//);
    return route.fulfill({ contentType: 'text/html', body: page(m ? m[1] : id, dark) });
  });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(String(e)));
  await p.goto(`http://portal.test/t/${id}/`);
  await p.waitForTimeout(1400);
  await p.screenshot({ path: join(OUT, `${label}-1-prompt.png`) });
  const geo = await p.evaluate(() => {
    const r = document.querySelector('bdl-switcher').shadowRoot;
    const box = (el) => { const b = el.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height), right: Math.round(b.right), bottom: Math.round(b.bottom) }; };
    return { prompt: box(r.querySelector('.prompt')), bar: box(r.querySelector('.bar')), vw: innerWidth, vh: innerHeight, hostW: document.querySelector('bdl-switcher').getBoundingClientRect().width };
  });
  // Open via the prompt.
  await p.evaluate(() => document.querySelector('bdl-switcher').shadowRoot.querySelector('.prompt .go').click());
  await p.waitForTimeout(200);
  await p.screenshot({ path: join(OUT, `${label}-2-dialog.png`) });
  const dlg = await p.evaluate(() => {
    const host = document.querySelector('bdl-switcher');
    const r = host.shadowRoot;
    const box = (el) => { const b = el.getBoundingClientRect(); return { y: Math.round(b.y), h: Math.round(b.height), bottom: Math.round(b.bottom) }; };
    const ul = r.querySelector('ul');
    const pl = r.querySelector('.placard');
    return {
      promptHidden: r.querySelector('.prompt').hidden,
      dialog: box(r.querySelector('dialog')), head: box(r.querySelector('.head')), placard: box(pl), placardScrolls: pl.scrollHeight > pl.clientHeight + 1,
      ul: box(ul), ulScrolls: ul.scrollHeight > ul.clientHeight, foot: box(r.querySelector('.foot')),
      focused: r.activeElement?.getAttribute('data-school') ?? r.activeElement?.className,
      placardText: pl.innerText, storage: (() => { try { return sessionStorage.getItem('bdl-portal-prompt'); } catch { return 'throws'; } })(),
    };
  });
  // Scroll the list to its end.
  await p.evaluate(() => { const ul = document.querySelector('bdl-switcher').shadowRoot.querySelector('ul'); ul.scrollTop = ul.scrollHeight; });
  await p.screenshot({ path: join(OUT, `${label}-3-dialog-scrolled.png`) });
  // Close: focus should return to the open button.
  await p.keyboard.press('Escape');
  const afterClose = await p.evaluate(() => document.querySelector('bdl-switcher').shadowRoot.activeElement?.className ?? null);
  // Reload: prompt should stay gone when storage works.
  await p.reload();
  await p.waitForTimeout(1400);
  const afterReload = await p.evaluate(() => !document.querySelector('bdl-switcher').shadowRoot.querySelector('.prompt').hidden);
  results[label] = { geo, dlg, afterClose, promptAfterReload: afterReload, errors };
  await ctx.close();
}

async function runDismiss(label, viewport) {
  const ctx = await browser.newContext({ viewport });
  await ctx.route('http://portal.test/**', (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/sw.js') return route.fulfill({ contentType: 'text/javascript', body: swJs });
    return route.fulfill({ contentType: 'text/html', body: page('swiss', true) });
  });
  const p = await ctx.newPage();
  await p.goto('http://portal.test/t/swiss/');
  await p.waitForTimeout(300);
  await p.screenshot({ path: join(OUT, `${label}-arriving.png`) });
  await p.waitForTimeout(1100);
  await p.screenshot({ path: join(OUT, `${label}-arrived.png`) });
  // Keyboard: Tab to the dismiss button and press Enter.
  const barBefore = await p.evaluate(() => { const b = document.querySelector('bdl-switcher').getBoundingClientRect(); return [b.x, b.y, b.width, b.height]; });
  await p.evaluate(() => document.querySelector('bdl-switcher').shadowRoot.querySelector('.prompt .dismiss').focus());
  await p.keyboard.press('Enter');
  const after = await p.evaluate(() => {
    const host = document.querySelector('bdl-switcher');
    const b = host.getBoundingClientRect();
    return { hidden: host.shadowRoot.querySelector('.prompt').hidden, focus: host.shadowRoot.activeElement?.className, box: [b.x, b.y, b.width, b.height], storage: sessionStorage.getItem('bdl-portal-prompt') };
  });
  // Shuffle-style control click on a fresh session dismisses too.
  const p2 = await (await browser.newContext({ viewport })).newPage();
  await p2.route('http://portal.test/**', (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/sw.js') return route.fulfill({ contentType: 'text/javascript', body: swJs });
    return route.fulfill({ contentType: 'text/html', body: page('quiet', true) });
  });
  await p2.goto('http://portal.test/t/quiet/');
  await p2.waitForTimeout(200);
  await p2.evaluate(() => document.querySelector('bdl-switcher').shadowRoot.querySelector('.scheme').click());
  const viaControl = await p2.evaluate(() => ({ hidden: document.querySelector('bdl-switcher').shadowRoot.querySelector('.prompt').hidden, storage: sessionStorage.getItem('bdl-portal-prompt') }));
  // Router navigation event dismisses.
  const p3 = await (await browser.newContext({ viewport })).newPage();
  await p3.route('http://portal.test/**', (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/sw.js') return route.fulfill({ contentType: 'text/javascript', body: swJs });
    return route.fulfill({ contentType: 'text/html', body: page('quiet', true) });
  });
  await p3.goto('http://portal.test/t/quiet/');
  await p3.waitForTimeout(200);
  await p3.evaluate(() => document.dispatchEvent(new Event('astro:before-preparation')));
  const viaNav = await p3.evaluate(() => ({ hidden: document.querySelector('bdl-switcher').shadowRoot.querySelector('.prompt').hidden, storage: sessionStorage.getItem('bdl-portal-prompt') }));
  // A second, throwaway <bdl-switcher> connected while the live one is connected stays inert.
  const inert = await p3.evaluate(() => { const t = document.createElement('bdl-switcher'); document.body.append(t); const r = !t.shadowRoot; t.remove(); return r; });
  results[label] = { barBefore, after, viaControl, viaNav, throwawayInert: inert };
}

await run('phone', { width: 390, height: 844 }, { id: 'vaporwave' });
await run('desktop', { width: 1440, height: 900 }, { id: 'vaporwave', dark: true });
await run('landscape', { width: 844, height: 390 }, { id: 'vaporwave' });
await run('phone-nostorage', { width: 390, height: 844 }, { id: 'cottagecore', blockStorage: true });
await run('phone320', { width: 320, height: 640 }, { id: 'glassmorphism' });
await run('se', { width: 375, height: 667 }, { id: 'vaporwave' });
await runDismiss('dismiss-desktop', { width: 1440, height: 900 });
await browser.close();
console.log(JSON.stringify(results, null, 1));
