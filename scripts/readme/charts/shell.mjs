// The card around a showpiece: background, caption, metadata and
// the SVG root. Same look as the generated charts (render.mjs), for pieces that
// are drawn in absolute coordinates rather than from a Mermaid layout.
import { MAX_MOTION, fitMotion } from './motion.mjs';
import { BUILDER_VERSION, FONT_STACK, paletteHash } from './theme.mjs';
import { CANVAS_W, CAP_SIZE, MARGIN_X } from './render.mjs';
import { esc, f1 } from './geometry.mjs';

/** The glyphs the caption draws ("FIG. n" and the title, upper-cased): add them to the display face's glyph set. */
export const captionGlyphs = (chart) => `FIG. ${chart.n} ${chart.caption.toUpperCase()}`;

export function shell({ chart, scheme, t, W, H, css, body, sourceHash, duration, variant, palette = paletteHash() }) {
  const width = variant === 'phone' ? W : CANVAS_W;
  const height = Math.round((H * width) / W);
  const capTitle = chart.caption.toUpperCase();
  const cap =
    `<text class="cap" x="${variant === 'phone' ? 20 : MARGIN_X}" y="38"><tspan class="capn">FIG. ${chart.n}</tspan>` +
    `<tspan dx="16">${esc(capTitle)}</tspan></text>`;
  const base = [
    `.card{fill:${t.field};stroke:${t.line};stroke-width:1}`,
    `.cap{font:${CAP_SIZE}px ${FONT_STACK.display};letter-spacing:${variant === 'phone' ? '.08em' : '.2em'};fill:${t.muted}}.capn{fill:${t.accentStrong}}`,
  ].join('\n');
  const svg0 =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${width}" height="${height}" role="img" aria-labelledby="t d">` +
    `<title id="t">${esc(chart.title)}</title><desc id="d">${esc(chart.alt)}</desc>` +
    `<metadata data-chart="${chart.n}" data-scheme="${scheme}" data-variant="${variant}" data-source-hash="${sourceHash}" data-builder-version="${BUILDER_VERSION}" data-palette-hash="${palette}" data-motion-s="${f1(Math.min(duration ?? 0, MAX_MOTION))}"></metadata>` +
    `<style>${css}\n${base}\n@media (prefers-reduced-motion:reduce){*{animation:none!important}.tv{display:none}}</style>` +
    `<rect class="card" x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="22"/>` +
    cap +
    body +
    '</svg>\n';
  const { svg } = fitMotion(svg0, duration ?? 0);
  return { svg, minCap: CAP_SIZE };
}
