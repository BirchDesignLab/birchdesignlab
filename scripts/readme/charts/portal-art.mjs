// One signature detail per school for the Portal panels, drawn in plain SVG from the
// school's own tokens (resolved by portal.mjs from its theme.css). Calm, not a
// caricature: each is a single quiet idea the school actually owns, kept to the
// panel's foot (or, for glassmorphism, its field) so the wordmark and sentence stay
// clean and legible.
import { f1, rng } from './geometry.mjs';
import { contrast, mix } from './theme.mjs';

const clipId = (id) => `pc-${id}`;

/**
 * @returns {{defs:string, under:string, over:string, pairs:object[], textBg?:string}}
 *  defs: clipPath etc; under: drawn right after the panel field, before text;
 *  over: drawn after the text (frames); pairs: contrast pairs to report.
 */
export function signature(kind, { sl, k, sig, phone, id, scheme }) {
  const fh = phone ? 30 : 54; // the foot band
  const by = sl.y + sl.h - fh;
  const defs = `<clipPath id="${clipId(id)}"><rect x="${f1(sl.x)}" y="${f1(sl.y)}" width="${sl.w}" height="${sl.h}" rx="12"/></clipPath>`;
  const wrap = (inner) => `<g clip-path="url(#${clipId(id)})">${inner}</g>`;
  const r = rng(id.length * 131 + sl.h);
  const mid = by + fh / 2;
  const s = fh / 54;
  const out = { defs, under: '', over: '', pairs: [] };

  if (kind === 'quiet') {
    // the birch: paired lenticels along the foot
    let d = '';
    for (let x = sl.x + 22; x < sl.x + sl.w - 90; x += 17 + r() * 12) {
      const a = (8 + r() * 14) * (phone ? 0.8 : 1);
      d += `M${f1(x)} ${f1(mid - 4 * s)}h${f1(a)}M${f1(x + r() * 6)} ${f1(mid + 5 * s)}h${f1(a * 0.5)}`;
    }
    out.under = wrap(`<path d="${d}" stroke="${k.mark}" stroke-opacity=".3" stroke-width="2.2" stroke-linecap="round" fill="none"/>`);
  } else if (kind === 'swiss') {
    // the grid that organises the sheet without being drawn on it: two column hairlines and a footer rule
    const cols = [1, 2].map((i) => `M${f1(sl.x + (sl.w * i) / 3)} ${f1(sl.y + 8)}V${f1(sl.y + sl.h - 8)}`).join('');
    out.under = wrap(
      `<path d="${cols}" stroke="${k.mark}" stroke-opacity=".08" stroke-width="1"/>` +
        `<path d="M${f1(sl.x + 20)} ${f1(by + 12)}H${f1(sl.x + sl.w - 20)}" stroke="${k.mark}" stroke-width="${f1(1.6 * Math.max(s, 0.7))}"/>`,
    );
  } else if (kind === 'bauhaus') {
    // Kandinsky's pairing: yellow triangle, red square, blue circle
    const u = 14 * s;
    const x0 = sl.x + 20;
    out.under = wrap(
      `<circle cx="${f1(x0 + u)}" cy="${f1(mid)}" r="${f1(u)}" fill="${sig.blue}"/>` +
        `<rect x="${f1(x0 + 2.4 * u + 2)}" y="${f1(mid - u)}" width="${f1(2 * u)}" height="${f1(2 * u)}" fill="${sig.red}"/>` +
        `<path d="M${f1(x0 + 4.9 * u + 4)} ${f1(mid + u)}L${f1(x0 + 5.9 * u + 4)} ${f1(mid - u)}L${f1(x0 + 6.9 * u + 4)} ${f1(mid + u)}Z" fill="${sig.yellow}"/>`,
    );
  } else if (kind === 'glass') {
    // soft blurred colour fields under a frosted card
    const light = scheme === 'light';
    const blobs = [
      [sl.x + sl.w * 0.12, sl.y + sl.h * 0.18, 58, sig.a],
      [sl.x + sl.w * 0.92, sl.y + sl.h * 0.46, 62, sig.b],
      [sl.x + sl.w * 0.34, sl.y + sl.h * 0.98, 66, sig.a],
    ];
    const blur = `<filter id="gb-${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${phone ? 14 : 20}"/></filter>`;
    out.defs += blur;
    const cardInset = 12;
    const card =
      `<rect x="${f1(sl.x + cardInset)}" y="${f1(sl.y + cardInset)}" width="${f1(sl.w - cardInset * 2)}" height="${f1(sl.h - cardInset * 2)}" rx="10" fill="#ffffff" fill-opacity="${light ? 0.42 : 0.07}" stroke="#ffffff" stroke-opacity="${light ? 0.7 : 0.22}" stroke-width="1.2"/>` +
      `<path d="M${f1(sl.x + cardInset + 10)} ${f1(sl.y + cardInset + 1)}H${f1(sl.x + sl.w * 0.55)}" stroke="#ffffff" stroke-opacity="${light ? 0.9 : 0.35}" stroke-width="1.4" stroke-linecap="round"/>`;
    out.under = wrap(
      `<g filter="url(#gb-${id})">${blobs.map(([cx, cy, rr, c]) => `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${rr}" fill="${c}" fill-opacity=".62"/>`).join('')}</g>` + card,
    );
    // worst case behind text: a blob at its strongest under the frosted card
    for (const c of [sig.a, sig.b]) {
      const under = mix(k.field, c, 0.62);
      const behind = mix(under, '#ffffff', light ? 0.42 : 0.07);
      out.pairs.push({ where: `glass wordmark over its blob (worst case)`, fg: k.mark, bg: behind });
      out.pairs.push({ where: `glass name and copy over its blob (worst case)`, fg: k.muted, bg: behind });
    }
  } else if (kind === 'vaporwave') {
    // a sun on the horizon over a perspective grid
    const hz = by + fh * 0.5;
    const vx = sl.x + sl.w * 0.3;
    const gid = `sun-${id}`;
    out.defs += `<linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sig.sunA}"/><stop offset=".55" stop-color="${sig.sunB}"/><stop offset="1" stop-color="${sig.sunC}"/></linearGradient>`;
    let lines = '';
    for (let i = -5; i <= 5; i++) lines += `M${f1(vx)} ${f1(hz)}L${f1(vx + i * sl.w * 0.2)} ${f1(sl.y + sl.h)}`;
    for (const dy of [5, 12, 22, 36]) lines += `M${f1(sl.x)} ${f1(hz + dy * s)}H${f1(sl.x + sl.w)}`;
    const sr = 22 * s;
    out.under = wrap(
      `<path d="${lines}" stroke="${sig.grid}" stroke-opacity=".5" stroke-width="1" fill="none"/>` +
        `<path d="M${f1(vx - sr)} ${f1(hz)}A${f1(sr)} ${f1(sr)} 0 0 1 ${f1(vx + sr)} ${f1(hz)}Z" fill="url(#${gid})"/>` +
        `<path d="M${f1(sl.x)} ${f1(hz)}H${f1(sl.x + sl.w)}" stroke="${sig.grid}" stroke-opacity=".8" stroke-width="1.2"/>`,
    );
  } else if (kind === 'grandmillennial') {
    // a gilt frame and a scalloped lace edge
    let sc = '';
    const rr = 8.5 * Math.max(s, 0.8);
    for (let x = sl.x - 2; x < sl.x + sl.w; x += rr * 2) sc += `M${f1(x)} ${f1(sl.y + sl.h)}a${f1(rr)} ${f1(rr)} 0 0 1 ${f1(rr * 2)} 0`;
    out.under = wrap(
      `<path d="${sc}" fill="${sig.lace}" fill-opacity=".85" stroke="${sig.gold}" stroke-width="1.2"/>` +
        `<rect x="${f1(sl.x + 7)}" y="${f1(sl.y + 7)}" width="${f1(sl.w - 14)}" height="${f1(sl.h - 14)}" rx="7" fill="none" stroke="${sig.gold}" stroke-opacity=".75" stroke-width="1.2"/>`,
    );
  } else if (kind === 'cottagecore') {
    // gingham at the foot and a running stitch around the edge
    const gid = `gh-${id}`;
    const c = 13 * Math.max(s, 0.7);
    out.defs += `<pattern id="${gid}" width="${f1(c * 2)}" height="${f1(c * 2)}" patternUnits="userSpaceOnUse" x="${f1(sl.x)}" y="${f1(by)}"><rect width="${f1(c)}" height="${f1(c * 2)}" fill="${sig.sage}" fill-opacity=".3"/><rect width="${f1(c * 2)}" height="${f1(c)}" fill="${sig.sage}" fill-opacity=".3"/></pattern>`;
    out.under = wrap(
      `<rect x="${f1(sl.x)}" y="${f1(by)}" width="${sl.w}" height="${f1(fh)}" fill="url(#${gid})"/>` +
        `<rect x="${f1(sl.x + 6)}" y="${f1(sl.y + 6)}" width="${f1(sl.w - 12)}" height="${f1(sl.h - 12)}" rx="8" fill="none" stroke="${k.accent}" stroke-opacity=".6" stroke-width="1.3" stroke-dasharray="5 4" stroke-linecap="round"/>`,
    );
  }
  void contrast;
  return out;
}
