/* Preview a pressed specimen (or the hoop's sprig and maker's line) without a site
   build: runs the component's own frontmatter, so what you see is what the build
   writes. Reusable for any cottagecore drawing; B2 task 6 used it for the magnolia
   and the hoop.

   node scripts/themes/cottagecore/preview-pressed.mjs <out.png> <spec> [<spec> ...]
   spec = kind[:seed[:short]]   e.g. magnolia:71   daisy:11:short   hoop
   `hoop` renders the Sampler and Signature components on the hoop cloth.
   Each spec is shown on the light paper and on the dark board, 2x. */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const [out, ...specs] = process.argv.slice(2);
const ROOT = new URL('../../../src/themes/cottagecore/', import.meta.url);

/** Run an .astro file's frontmatter and hand back what `set:html` or the template would get. */
function frontmatter(file, props) {
  const src = readFileSync(new URL(file, ROOT), 'utf8').replace(/\r\n/g, '\n');
  const code = src.slice(src.indexOf('---\n') + 4, src.indexOf('\n---\n', 4));
  const js = ts.transpileModule(code.replace(/^\s*import .*$/gm, '').replace(/^\s*export .*$/gm, ''), { compilerOptions: { target: 'ES2022' } }).outputText;
  const fn = new Function('Astro', `${js}\nreturn { markup: typeof markup === 'undefined' ? null : markup, viewBox: typeof viewBox === 'undefined' ? null : viewBox, strokes: typeof strokes === 'undefined' ? null : strokes, dots: typeof dots === 'undefined' ? null : dots, width: typeof width === 'undefined' ? null : width, stitches: typeof stitches === 'undefined' ? null : stitches, CHART: typeof CHART === 'undefined' ? null : CHART };`);
  return fn({ props });
}

const css = readFileSync(new URL('theme.css', ROOT), 'utf8');
const tokens = (scheme) => {
  // the two token blocks and the .pressed rules, with the selector reduced to a class
  const light = css.match(/:root\[data-theme='cottagecore'\] \{[\s\S]*?\n\}/)[0].replace(/:root\[data-theme='cottagecore'\]/, '.scheme-light');
  const dark = css.match(/:root\[data-theme='cottagecore'\]\[data-scheme='dark'\] \{[\s\S]*?\n\}/)[0].replace(/:root\[data-theme='cottagecore'\]\[data-scheme='dark'\]/, '.scheme-dark');
  const pressed = [...css.matchAll(/\[data-theme='cottagecore'\] \.(?:pressed|cc-sampler|cc-signature)[^{]*\{[^}]*\}/g)].map((m) => m[0].replace(/\[data-theme='cottagecore'\] /g, '')).join('\n');
  return { light, dark, pressed };
};
const t = tokens();

const cells = [];
for (const spec of specs) {
  const [kind, seed = '1', flag] = spec.split(':');
  if (kind === 'hoop') {
    const sampler = frontmatter('assets/Sampler.astro', {});
    const sig = frontmatter('assets/Signature.astro', { seed: 923 });
    cells.push({ spec, hoop: { sampler, sig } });
  } else {
    const r = frontmatter('assets/Pressed.astro', { kind, seed: +seed, short: flag === 'short' });
    cells.push({ spec, svg: `<svg class="pressed pressed--${kind}" viewBox="${r.viewBox}" aria-hidden="true">${r.markup}</svg>` });
  }
}

const html = `<style>
${t.light}
${t.dark}
${t.pressed}
.pressed { overflow: visible; filter: var(--press-shadow-mounted); }
.pressed path { stroke-linejoin: round; stroke-linecap: round; }
body { margin: 0; display: grid; grid-template-columns: 1fr 1fr; font: 12px sans-serif; }
.scheme-light, .scheme-dark { padding: 14px; }
.scheme-light { background: var(--cc-paper); color: #333; }
.scheme-dark { background: #cfc1a1; color: #333; }
.row { display: flex; gap: 26px; align-items: flex-start; }
.cell { width: 330px; }
.cell svg.pressed { width: 100%; height: auto; display: block; }
.hoop { width: 330px; height: 330px; border-radius: 50%; background: var(--hoop-cloth); display: grid; place-items: center; align-content: center; gap: 10px; box-shadow: 0 0 0 10px var(--wood); }
.hoop svg.cc-sampler { width: 120px; height: auto; }
.hoop svg.cc-signature { width: 160px; height: auto; }


</style>
${['light', 'dark'].map((scheme) => `<div class="scheme-${scheme}"><div class="row">${cells.map((c) => `<div class="cell">${c.svg ?? ''}${c.hoop ? `<div class="hoop"><svg class="cc-sampler" viewBox="0 0 100 90">${c.hoop.sampler.markup}</svg><svg class="cc-signature" viewBox="0 -2 ${c.hoop.sig.width} 23">${c.hoop.sig.markup}</svg></div>` : ''}<div>${c.spec} (${scheme})</div></div>`).join('')}</div></div>`).join('')}`;

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 760 + 340 * (specs.length - 1) * 2 / 2, height: 800 }, deviceScaleFactor: 2 });
await p.setContent(html);
await p.waitForTimeout(200);
await p.screenshot({ path: out, fullPage: true });
await b.close();
