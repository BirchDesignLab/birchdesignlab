/**
 * Stage 6 wave 4, task 28: the welcome prompt's box after the founder's
 * closing sentence. At 1440, 820, 390 and 360, both schemes, on a fresh visit
 * (the prompt is NOT suppressed here): the prompt's rect against the switcher
 * bar's and the viewport's. It must not cover the bar, push it off screen, or
 * leave the viewport.
 *
 *   node scripts/themes/snap.mjs --name s6-w4-t28 --reuse --port 4470 -- node scripts/themes/stage6/w4-t28-prompt.mjs
 *
 * Output: .out/stage6/w4/t28/prompt/ (a viewport shot per size and scheme,
 * and prompt.json with the rects and the verdicts).
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { launch, open, OUT } from './w4-t28-lib.mjs';

const D = join(OUT, 'prompt');
await mkdir(D, { recursive: true });
const { browser } = await launch();
const rows = [];
const fails = [];
const PATHS = (process.env.PATHS || '/t/quiet/,/t/bauhaus/').split(',');
for (const path of PATHS) {
  for (const scheme of ['light', 'dark']) {
    for (const width of [1440, 820, 390, 360]) {
      const { ctx, page } = await open(browser, { path, width, scheme, prompt: true, hideSwitcher: false, settle: 3600 });
      const r = await page.evaluate(() => {
        const host = document.querySelector('bdl-switcher');
        const root = host?.shadowRoot;
        const box = (el) => { if (!el) return null; const q = el.getBoundingClientRect(); return { l: Math.round(q.left), t: Math.round(q.top), r: Math.round(q.right), b: Math.round(q.bottom), w: Math.round(q.width), h: Math.round(q.height) }; };
        const prompt = root?.querySelector('.prompt');
        const bar = root?.querySelector('.bar, nav, .wrap, .switcher') ?? host;
        const text = root?.querySelector('.prompt .text');
        return { prompt: box(prompt), text: text?.textContent, bar: box(host), vw: innerWidth, vh: innerHeight, hidden: prompt?.hidden, lines: text ? Math.round(text.getBoundingClientRect().height / parseFloat(getComputedStyle(text).lineHeight)) : 0 };
      });
      const p = r.prompt, b = r.bar;
      const verdict = {
        shown: !!p && !r.hidden && p.w > 0,
        inViewport: !!p && p.l >= 0 && p.r <= r.vw && p.t >= 0 && p.b <= r.vh,
        clearOfBar: !!p && !!b && p.b <= b.t + 1,
        barOnScreen: !!b && b.l >= 0 && b.r <= r.vw && b.b <= r.vh && b.t >= 0,
        endsWithSentence: !!r.text && r.text.endsWith('Tap around, too: every school hides a few things that answer back.'),
      };
      const tag = `${path.replace(/\W+/g, '')}__${scheme}__${width}`;
      rows.push({ tag, ...r, verdict });
      for (const [k, v] of Object.entries(verdict)) if (!v) fails.push(`${tag}: ${k}`);
      console.log(tag, JSON.stringify({ prompt: p, bar: b, lines: r.lines, verdict }));
      await page.screenshot({ path: join(D, `${tag}.png`) });
      await ctx.close();
    }
  }
}
await writeFile(join(D, 'prompt.json'), JSON.stringify({ rows, fails }, null, 1));
console.log(fails.length ? `FAIL ${fails.join('; ')}` : 'PASS: the prompt is shown, in the viewport, clear of the bar, bar on screen, at every size');
await browser.close();
