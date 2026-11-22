/**
 * Stage 6 wave 2, task 17 fix 2: no stuck hover on a tap in the quiet school.
 *
 *   node scripts/themes/stage6/w2-t17-quiet-touch.mjs [port=4470]
 *
 * Serves dist/ on the port, opens each /t/quiet/ page (home, about, services, contact, sent) in dark
 * and light, once in a touch context (390 x 844, hover: none) and once in a mouse context (control).
 * Every link and button on the page is forced into :hover through CDP (CSS.forcePseudoState) and its
 * computed color, opacity, border and background compared with the same element unforced. On touch
 * nothing may change; on the mouse the control count of changed elements must stay above zero, so the
 * gate is shown to be switched off only on touch. Also prints the media-query state of each context.
 * Exits 1 on any touch change or a mouse control of zero. GPU Chromium, renderer checked, reduced
 * transparency forced to no-preference, portal prompt suppressed.
 */
import { chromium } from 'playwright';
import { serveDist, waitForServer } from '../lib/serve-dist.mjs';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const PORT = Number(process.argv[2] || 4470);
const BASE = `http://127.0.0.1:${PORT}`;
const PAGES = ['', 'about/', 'services/', 'contact/', 'contact/sent/'];
const PROPS = ['color', 'opacity', 'borderTopColor', 'backgroundColor', 'textDecorationColor'];

const server = await serveDist(PORT);
await waitForServer(BASE + '/', 5000);
const browser = await chromium.launch({
  headless: true,
  args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--enable-gpu-rasterization', '--ignore-gpu-blocklist'],
});
let failed = false;
try {
  {
    const p = await browser.newPage();
    const r = await p.evaluate(() => {
      const gl = document.createElement('canvas').getContext('webgl');
      return gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL);
    });
    await p.close();
    console.log('renderer:', r);
    if (/swiftshader|llvmpipe/i.test(r)) throw new Error('software renderer: evidence invalid');
  }

  for (const kind of ['touch', 'mouse']) {
    for (const scheme of ['dark', 'light']) {
      const ctx = await browser.newContext(
        kind === 'touch'
          ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }
          : { viewport: { width: 1280, height: 800 } },
      );
      await suppressPrompt(ctx);
      await ctx.addInitScript((s) => { try { localStorage.setItem('scheme', s); } catch {} }, scheme);
      let changedTotal = 0;
      let seen = 0;
      const lines = [];
      for (const path of PAGES) {
        const page = await ctx.newPage();
        const cdp = await ctx.newCDPSession(page);
        await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
        await page.goto(`${BASE}/t/quiet/${path}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(400);
        if (path === '') {
          const mq = await page.evaluate(() => ({
            hoverNone: matchMedia('(hover: none)').matches,
            hoverHover: matchMedia('(hover: hover)').matches,
            fine: matchMedia('(pointer: fine)').matches,
            scheme: document.documentElement.getAttribute('data-scheme'),
          }));
          lines.push(`  media ${JSON.stringify(mq)}`);
        }
        await cdp.send('DOM.enable');
        await cdp.send('CSS.enable');
        const n = await page.evaluate(() => {
          document.querySelectorAll('a, button').forEach((e, i) => e.setAttribute('data-probe', String(i)));
          return document.querySelectorAll('[data-probe]').length;
        });
        const read = (i) =>
          page.evaluate(
            ({ i, PROPS }) => {
              const e = document.querySelector(`[data-probe="${i}"]`);
              const cs = getComputedStyle(e);
              const r = e.getBoundingClientRect();
              const o = {};
              for (const k of PROPS) o[k] = cs[k];
              return { vis: r.width > 0 && r.height > 0, label: (e.textContent || e.getAttribute('aria-label') || e.id || '').trim().slice(0, 28), cls: e.className, o };
            },
            { i, PROPS },
          );
        const { root } = await cdp.send('DOM.getDocument', { depth: 0 });
        for (let i = 0; i < n; i++) {
          const before = await read(i);
          if (!before.vis) continue;
          const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: `[data-probe="${i}"]` });
          await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: ['hover'] });
          await page.waitForTimeout(450); // longest transition in play is var(--dur-2)
          const after = await read(i);
          await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [] });
          seen++;
          const diff = PROPS.filter((k) => before.o[k] !== after.o[k]);
          if (diff.length) {
            changedTotal++;
            lines.push(`  /t/quiet/${path} [${before.label}] .${String(before.cls).split(' ').join('.')} ` + diff.map((k) => `${k} ${before.o[k]} -> ${after.o[k]}`).join('; '));
          }
        }
        await page.close();
      }
      console.log(`${kind} ${scheme}: ${seen} visible links/buttons, ${changedTotal} change on forced :hover`);
      for (const l of lines) console.log(l);
      if (kind === 'touch' && changedTotal > 0) failed = true;
      if (kind === 'mouse' && changedTotal === 0) { console.log('  control failed: nothing changed under a mouse'); failed = true; }
      await ctx.close();
    }
  }
} finally {
  await browser.close();
  server.close();
}
console.log(failed ? 'FAIL' : 'PASS');
process.exit(failed ? 1 : 0);
