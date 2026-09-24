/**
 * Named stubs for trace-arrival.mjs --stub: each takes one kind of layer out
 * of the destination school's page, so a re-measured arrival says how much of
 * the first-draw freeze that layer costs.
 *
 * Written 09-23-26 for Tier 3 stage 2 (the freeze investigation,
 * tier3-stage2/freeze-investigation.md). A diagnostic only: nothing here
 * ships, and a stubbed page is not what a visitor sees.
 *
 * Every rule is scoped to html:not([data-theme='quiet']), so quiet (the page
 * the arrival starts from) draws as it always does and only the destination
 * loses the layer. The CSS stubs hide by paint, not by layout
 * (visibility: hidden, none for a mask or filter), so the page's layout, and
 * with it the main thread's first render, stays as it is; what moves is what
 * the GPU has to draw. `js` runs before the page's own scripts.
 *
 * Usage:
 *   node scripts/themes/trace-arrival.mjs --schools grandmillennial --stub svg,mask ...
 */
const S = "html:not([data-theme='quiet'])";

export const STUBS = {
  // Every inline or referenced SVG picture (ornaments, specimens, patterns).
  svg: { css: `${S} svg, ${S} img[src$='.svg'] { visibility: hidden !important; }` },
  // CSS masks (grandmillennial's trellis and scallops, any other cut edge).
  mask: { css: `${S} *, ${S} *::before, ${S} *::after { -webkit-mask: none !important; mask: none !important; }` },
  // CSS filters and backdrop filters on the page (blur, glow, CRT).
  filter: { css: `${S} *, ${S} *::before, ${S} *::after { filter: none !important; backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }` },
  // Shadows, box and text.
  shadow: { css: `${S} *, ${S} *::before, ${S} *::after { box-shadow: none !important; text-shadow: none !important; }` },
  // Background images, gradients included.
  bgimage: { css: `${S} *, ${S} *::before, ${S} *::after { background-image: none !important; }` },
  // Blend modes.
  blend: { css: `${S} *, ${S} *::before, ${S} *::after { mix-blend-mode: normal !important; background-blend-mode: normal !important; }` },
  // Every canvas (fireflies, vaporwave's sunset) left undrawn.
  canvas: { css: `${S} canvas { visibility: hidden !important; }` },
  // Text: glyphs drawn transparent (layout and shaping unchanged).
  text: { css: `${S} *, ${S} *::before, ${S} *::after { color: transparent !important; -webkit-text-fill-color: transparent !important; -webkit-text-stroke: 0 !important; }` },
  // Effects on the view-transition snapshots themselves (the arrival's
  // choreography keeps its timing; only the snapshot filters go).
  vtfilter: {
    css: `${S}::view-transition-old(*), ${S}::view-transition-new(*), ${S}::view-transition-group(*), ${S}::view-transition-image-pair(*) { filter: none !important; backdrop-filter: none !important; mix-blend-mode: normal !important; }`,
  },
  // No 2D canvas context for a school's page (cottagecore's fireflies).
  // A script that assumes one may throw; the run's problems list says so.
  canvas2d: {
    js: () => {
      const get = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
        if (type === '2d' && document.documentElement.dataset.theme !== 'quiet') return null;
        return get.call(this, type, ...rest);
      };
    },
  },
  // What a school paints on the view-transition groups themselves (a table
  // or a lamp under the sheets), which the page at rest never draws.
  vtbg: {
    css: `${S}::view-transition-group(*), ${S}::view-transition-image-pair(*) { background: none !important; }`,
  },
  // Added 09-23-26 by agent L (cheaper first draw): not a stub but a
  // prototype. Every block of the page's main after the first skips its
  // layout and paint while off screen (content-visibility: auto), with a
  // placeholder height until it has been drawn once. Changes the page's
  // scroll length until then, so it only prices the idea.
  cvauto: {
    css: `${S} main > * + * { content-visibility: auto; contain-intrinsic-size: auto 600px; }`,
  },
  // No WebGL context for a school's page (the page must read fine without
  // it, README). Quiet's bark keeps its own.
  webgl: {
    js: () => {
      const get = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
        if (/webgl/i.test(type) && document.documentElement.dataset.theme !== 'quiet') return null;
        return get.call(this, type, ...rest);
      };
    },
  },
};

/* Added 09-24-26 by the investigation's fixer: a GPU that links vaporwave's
   sunset program slowly, as a phone or an older laptop may. vaporwave/fx.ts
   (agent L) polls KHR_parallel_shader_compile once a frame on an arrival
   from another school; this answers "not done yet" for `ms` after the first
   poll of each program, so a film shows what a visitor sees when the link
   outlasts the CRT beam line (about 190 ms). The real link still runs; only
   the answer is late. Script only (a string, so the delay travels with it). */
function slowLink(ms) {
  const body = (delay) => {
    const get = WebGLRenderingContext.prototype.getProgramParameter;
    const first = new WeakMap();
    WebGLRenderingContext.prototype.getProgramParameter = function (program, pname) {
      if (pname === 0x91b1) {
        // COMPLETION_STATUS_KHR
        if (!first.has(program)) first.set(program, performance.now());
        if (performance.now() - first.get(program) < delay) return false;
      }
      return get.call(this, program, pname);
    };
  };
  return { js: `(${body})(${ms});` };
}
STUBS.slowlink300 = slowLink(300);
STUBS.slowlink600 = slowLink(600);

/** The stubs named, in order; an unknown name is an error. */
export function pick(names) {
  return names.map((n) => {
    if (!STUBS[n]) throw new Error(`unknown stub ${n}; have ${Object.keys(STUBS).join(', ')}`);
    return STUBS[n];
  });
}
