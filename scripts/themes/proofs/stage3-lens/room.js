/**
 * The glass room's backdrop and panes, for the stage 3 lens proof.
 *
 * Written 09-25-26 for Tier 3 stage 3 (Tier A proofs). A proof, not
 * production code. Four jobs:
 *   - paint the warm Big Sur wallpaper once, on a canvas, and hand the same
 *     pixels to the CSS background (a blob: URL) and to the lens (a texture),
 *     so the lens and the page can never disagree about the wallpaper;
 *   - lay out the flat crisp orbs and move them at their own scroll rate
 *     (E4), from JS (one rAF, the default) or from a CSS scroll timeline;
 *   - read the backdrop model (wallpaper rect, orb circles and colours) from
 *     the DOM and CSS, which the lens draws from every frame;
 *   - give every glass pane its SVG displacement filter: a bevel refraction
 *     map generated for the pane's own size, used in backdrop-filter only
 *     where url() backdrop filters are known to apply (see bendSupport()),
 *     plus a tint that follows the colour behind the pane.
 *
 * Usage: imported by main.js; see index.html for the query parameters.
 */

/* ---------- wallpaper ---------- */

const WALL_W = 1600;
const WALL_H = 1000;

/** Deterministic Big Sur-style wallpaper: a warm sky over layered coral,
    ember and deep blue waves, softened. Returns the canvas. */
export function paintWallpaper() {
  const c = document.createElement('canvas');
  c.width = WALL_W;
  c.height = WALL_H;
  const g = c.getContext('2d');
  const sky = g.createLinearGradient(0, 0, 0, WALL_H);
  sky.addColorStop(0, '#ffd59a');
  sky.addColorStop(0.28, '#ffac6b');
  sky.addColorStop(0.55, '#f2705c');
  sky.addColorStop(0.8, '#8a3a6a');
  sky.addColorStop(1, '#1c2f5e');
  g.fillStyle = sky;
  g.fillRect(0, 0, WALL_W, WALL_H);
  const waves = [
    { base: 0.34, a: 70, f: 1.3, p: 0.4, top: '#ff9e6e', bot: '#f06a5a' },
    { base: 0.47, a: 90, f: 0.9, p: 2.1, top: '#f2616a', bot: '#b8406e' },
    { base: 0.6, a: 80, f: 1.1, p: 4.0, top: '#c24a78', bot: '#5a2c6a' },
    { base: 0.72, a: 95, f: 0.7, p: 1.2, top: '#3d3f86', bot: '#1d2c63' },
    { base: 0.85, a: 60, f: 1.5, p: 3.3, top: '#243a7a', bot: '#101c44' },
  ];
  g.filter = 'blur(10px)';
  for (const w of waves) {
    g.beginPath();
    g.moveTo(-40, WALL_H + 40);
    for (let x = -40; x <= WALL_W + 40; x += 8) {
      const t = x / WALL_W;
      const y = w.base * WALL_H + w.a * Math.sin(t * Math.PI * 2 * w.f + w.p) + w.a * 0.35 * Math.sin(t * Math.PI * 5.3 * w.f + w.p * 1.7);
      g.lineTo(x, y);
    }
    g.lineTo(WALL_W + 40, WALL_H + 40);
    g.closePath();
    const grad = g.createLinearGradient(0, (w.base - 0.12) * WALL_H, 0, (w.base + 0.25) * WALL_H);
    grad.addColorStop(0, w.top);
    grad.addColorStop(1, w.bot);
    g.fillStyle = grad;
    g.fill();
  }
  g.filter = 'none';
  // A warm sun glow top right and a gentle vignette.
  const sun = g.createRadialGradient(WALL_W * 0.78, WALL_H * 0.16, 0, WALL_W * 0.78, WALL_H * 0.16, WALL_W * 0.35);
  sun.addColorStop(0, 'rgba(255,240,200,0.55)');
  sun.addColorStop(1, 'rgba(255,240,200,0)');
  g.fillStyle = sun;
  g.fillRect(0, 0, WALL_W, WALL_H);
  const vig = g.createRadialGradient(WALL_W / 2, WALL_H * 0.45, WALL_W * 0.3, WALL_W / 2, WALL_H * 0.45, WALL_W * 0.75);
  vig.addColorStop(0, 'rgba(20,10,30,0)');
  vig.addColorStop(1, 'rgba(20,10,30,0.28)');
  g.fillStyle = vig;
  g.fillRect(0, 0, WALL_W, WALL_H);
  return c;
}

export async function mountWallpaper(canvas) {
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
  const url = URL.createObjectURL(blob);
  const el = document.getElementById('wallpaper');
  el.style.backgroundImage = `url("${url}")`;
  // Wait until the image has decoded so the first still shows it.
  const img = new Image();
  img.src = url;
  await img.decode();
  // A small copy for tint sampling on the CPU.
  const s = document.createElement('canvas');
  s.width = 160;
  s.height = 100;
  s.getContext('2d').drawImage(canvas, 0, 0, 160, 100);
  wallSample = s.getContext('2d').getImageData(0, 0, 160, 100);
}
let wallSample = null;

/* ---------- orbs ---------- */

/* Flat discs with crisp edges (D7 B). x, y at scroll 0 as fractions of the
   viewport; d as a fraction of the viewport's shorter side; k is the share
   of scroll travel the orb moves (content moves 1). */
const ORBS = [
  { x: 0.63, y: 0.16, d: 0.34, k: 0.35, c: '#ffcf5c' },
  { x: 0.08, y: 0.5, d: 0.3, k: 0.55, c: '#ff5a36' },
  { x: 0.8, y: 0.62, d: 0.26, k: 0.3, c: '#2f6fe0' },
  { x: 0.42, y: 1.05, d: 0.36, k: 0.5, c: '#ef4f7a' },
  { x: 0.7, y: 1.45, d: 0.3, k: 0.6, c: '#ffb13b' },
  { x: 0.05, y: 1.6, d: 0.28, k: 0.45, c: '#1f4fa8' },
];
const PHONE_ORBS = [
  { x: 0.52, y: 0.12, d: 0.5, k: 0.35, c: '#ffcf5c' },
  { x: -0.15, y: 0.42, d: 0.46, k: 0.55, c: '#ff5a36' },
  { x: 0.62, y: 0.6, d: 0.44, k: 0.3, c: '#2f6fe0' },
  { x: 0.2, y: 1.0, d: 0.52, k: 0.5, c: '#ef4f7a' },
  { x: 0.55, y: 1.4, d: 0.48, k: 0.6, c: '#ffb13b' },
  { x: -0.1, y: 1.7, d: 0.46, k: 0.45, c: '#1f4fa8' },
];

let orbEls = [];
let orbBase = [];
export function layoutOrbs() {
  const host = document.getElementById('orbs');
  const vw = innerWidth;
  const vh = innerHeight;
  const set = vw <= 600 ? PHONE_ORBS : ORBS;
  const short = Math.min(vw, vh);
  if (!orbEls.length) {
    orbEls = set.map(() => host.appendChild(document.createElement('div')));
  }
  orbBase = set.map((o, i) => {
    const d = Math.round(o.d * short * (vw > 600 ? 1.3 : 1));
    const el = orbEls[i];
    el.className = 'orb';
    el.style.cssText = `--x:${Math.round(o.x * vw)};--y:${Math.round(o.y * vh)};--d:${d};--k:${o.k};background:${o.c}`;
    return { x: Math.round(o.x * vw), y: Math.round(o.y * vh), d, k: o.k, rgb: hexRgb(o.c) };
  });
  const travel = Math.max(0, document.documentElement.scrollHeight - vh);
  document.documentElement.style.setProperty('--travel', String(travel));
}

/** JS orb driver: one transform per orb from this frame's scrollY. */
export function driveOrbs(scrollY) {
  for (let i = 0; i < orbEls.length; i++) {
    orbEls[i].style.transform = `translate3d(0, ${(-orbBase[i].k * scrollY).toFixed(2)}px, 0)`;
  }
}

/* ---------- the backdrop model the lens draws from ---------- */

/** Read the backdrop as the page shows it now: the wallpaper's drawn image
    rect (background-size: cover, centred) and every orb's circle and colour.
    `fromDom` reads the orbs' boxes (needed for the CSS driver, whose
    transforms live in CSS); otherwise the JS driver's own numbers are used,
    which needs no layout read. */
export function readModel(scrollY, fromDom) {
  const wr = document.getElementById('wallpaper').getBoundingClientRect();
  const s = Math.max(wr.width / WALL_W, wr.height / WALL_H);
  const w = WALL_W * s;
  const h = WALL_H * s;
  const wall = [wr.left + (wr.width - w) / 2, wr.top + (wr.height - h) / 2, w, h];
  const orbs = orbBase.map((o, i) => {
    if (fromDom) {
      const r = orbEls[i].getBoundingClientRect();
      return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, r: r.width / 2, rgb: o.rgb };
    }
    return { cx: o.x + o.d / 2, cy: o.y + o.d / 2 - o.k * scrollY, r: o.d / 2, rgb: o.rgb };
  });
  return { wall, orbs };
}

/** The backdrop colour at a viewport point, on the CPU (for pane tints). */
export function sampleModel(model, x, y) {
  for (let i = model.orbs.length - 1; i >= 0; i--) {
    const o = model.orbs[i];
    if ((x - o.cx) ** 2 + (y - o.cy) ** 2 < o.r * o.r) return o.rgb;
  }
  const [wx, wy, ww, wh] = model.wall;
  const u = Math.min(159, Math.max(0, Math.floor(((x - wx) / ww) * 160)));
  const v = Math.min(99, Math.max(0, Math.floor(((y - wy) / wh) * 100)));
  const k = (v * 160 + u) * 4;
  const d = wallSample.data;
  return [d[k], d[k + 1], d[k + 2]];
}

/* ---------- url() backdrop-filter support ---------- */

/**
 * Does `backdrop-filter: url(#svg-filter)` actually bend what is behind?
 *
 * CSS.supports() cannot answer: the grammar accepts <url>, so it says yes in
 * Firefox (bug 1995195, which then paints nothing for the url) and Safari
 * (WebKit bug 245510: Core Animation drops the filter). Script cannot read
 * the composited backdrop either (no readback of page pixels, by design), so
 * a pixel test is impossible from inside the page. What is left is the
 * engine: only Blink applies url() in backdrop-filter today. Blink is
 * identified by navigator.userAgentData, which only Chromium browsers ship
 * (secure contexts: https and localhost). Chrome on iOS is WebKit and has no
 * userAgentData, so it correctly gets the frosted fallback. The grammar
 * check stays as a guard against a Blink that parses the property
 * differently.
 */
export function bendSupport() {
  const uad = navigator.userAgentData;
  const blink = !!uad && Array.isArray(uad.brands) && uad.brands.some((b) => /Chromium/i.test(b.brand));
  const grammar = typeof CSS !== 'undefined' && CSS.supports('backdrop-filter', 'url(#x) blur(1px)');
  return {
    bend: blink && grammar,
    blink,
    grammar,
    // Recorded so the harness can show how little CSS.supports tells us.
    supportsProbes: {
      'backdrop-filter: url(#x)': CSS.supports('backdrop-filter', 'url(#x)'),
      'backdrop-filter: url(#does-not-exist) blur(2px)': CSS.supports('backdrop-filter', 'url(#does-not-exist) blur(2px)'),
      '-webkit-backdrop-filter: url(#x)': CSS.supports('-webkit-backdrop-filter', 'url(#x)'),
      '@supports selector-free check, backdrop-filter: blur(1px)': CSS.supports('backdrop-filter', 'blur(1px)'),
    },
    brands: uad ? uad.brands.map((b) => `${b.brand} ${b.version}`) : null,
  };
}

/* ---------- panes ---------- */

/** Signed distance from (x, y) to a rounded rect of size w x h and corner
    radius r (positive inside), and the outward unit normal there. */
function roundedRectSdf(x, y, w, h, r) {
  const cx = x - w / 2;
  const cy = y - h / 2;
  const qx = Math.abs(cx) - (w / 2 - r);
  const qy = Math.abs(cy) - (h / 2 - r);
  let d;
  let nx;
  let ny;
  if (qx > 0 && qy > 0) {
    const l = Math.hypot(qx, qy);
    d = r - l;
    nx = qx / l;
    ny = qy / l;
  } else if (qx > qy) {
    d = r - qx;
    nx = 1;
    ny = 0;
  } else {
    d = r - qy;
    nx = 0;
    ny = 1;
  }
  return { d, nx: nx * Math.sign(cx || 1), ny: ny * Math.sign(cy || 1) };
}

/**
 * The bevel refraction map for one pane: inside a bevel band of width `b`
 * along the rounded edge the glass surface curves away like a convex rim
 * and the ray through it bends more the steeper the surface gets (t^2 of
 * the largest shift, t the depth into the band). With `dir` 1 (the default,
 * bevel=in) the bent sample
 * points inward, toward the pane's middle, so the band shows a compressed
 * view of what lies just inside it. (Pointing outward would ask for pixels
 * beyond the pane, which backdrop-filter does not have: Chromium clips the
 * backdrop to the border box and mirrors it past the edge. See the notes.)
 * With `dir` -1 (bevel=out) it points outward on purpose: Chromium then
 * shows the inside mirrored past the rim, which reads like the internal
 * reflection a thick glass edge shows. Both are kept so Tier B can choose.
 * R carries x, G carries y, 128 is no shift; `max` px is the largest shift.
 */
function bevelMap(w, h, r, b, max, dir = 1) {
  const scale = 2; // map at half resolution; feImage stretches it
  const mw = Math.max(2, Math.round(w / scale));
  const mh = Math.max(2, Math.round(h / scale));
  const c = document.createElement('canvas');
  c.width = mw;
  c.height = mh;
  const g = c.getContext('2d');
  const img = g.createImageData(mw, mh);
  for (let j = 0; j < mh; j++) {
    for (let i = 0; i < mw; i++) {
      const { d, nx, ny } = roundedRectSdf((i + 0.5) * scale, (j + 0.5) * scale, w, h, r);
      let dx = 0;
      let dy = 0;
      if (d < b && d > -1) {
        const t = Math.min(1, Math.max(0, 1 - d / b)); // 0 inner edge of band, 1 at the rim
        // The shift grows with the square of the depth into the band, so the
        // band's inner edge joins the flat middle without a crease.
        const shift = max * Math.pow(t, 1.6) * dir;
        dx = -nx * shift;
        dy = -ny * shift;
      }
      const k = (j * mw + i) * 4;
      img.data[k] = Math.round(128 + (dx / max) * 127);
      img.data[k + 1] = Math.round(128 + (dy / max) * 127);
      img.data[k + 2] = 128;
      img.data[k + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return c.toDataURL('image/png');
}

const SVGNS = 'http://www.w3.org/2000/svg';
let panes = [];

export function setupPanes(bend) {
  const svg = document.getElementById('filters');
  panes = [...document.querySelectorAll('[data-pane]')].map((el) => ({ el, id: `pane-${el.dataset.pane}`, bevel: Number(el.dataset.bevel || 18) }));
  const build = () => {
    for (const p of panes) {
      const rect = p.el.getBoundingClientRect();
      const w = Math.round(rect.width);
      const h = Math.round(rect.height);
      const r = parseFloat(getComputedStyle(p.el).borderTopLeftRadius) || 0;
      const blur = p.el.classList.contains('thin') ? 4 : p.el.classList.contains('regular') ? 12 : 20;
      p.blur = blur;
      if (!bend) continue;
      const max = Math.min(36, p.bevel * 0.9);
      const url = bevelMap(w, h, r, p.bevel, max, document.documentElement.dataset.bevel === 'out' ? -1 : 1);
      let f = svg.querySelector(`#${p.id}`);
      if (!f) {
        f = document.createElementNS(SVGNS, 'filter');
        f.id = p.id;
        svg.appendChild(f);
      }
      f.setAttribute('x', '0');
      f.setAttribute('y', '0');
      f.setAttribute('width', String(w));
      f.setAttribute('height', String(h));
      f.setAttribute('filterUnits', 'userSpaceOnUse');
      f.setAttribute('primitiveUnits', 'userSpaceOnUse');
      f.setAttribute('color-interpolation-filters', 'sRGB');
      f.innerHTML = `<feImage href="${url}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="none" result="map"/>` +
        `<feDisplacementMap in="SourceGraphic" in2="map" scale="${2 * max}" xChannelSelector="R" yChannelSelector="G"/>`;
      p.el.style.backdropFilter = `url(#${p.id}) blur(${blur}px) saturate(1.7) brightness(1.06)`;
    }
  };
  build();
  const ro = new ResizeObserver(() => build());
  panes.forEach((p) => ro.observe(p.el));
  return panes;
}

/** Tint each pane toward the colour behind it (Liquid Glass's adaptive
    tint, [5]) and pick its ink so text stays readable. */
export function tintPanes(model) {
  for (const p of panes) {
    const r = p.el.getBoundingClientRect();
    let R = 0;
    let G = 0;
    let B = 0;
    let n = 0;
    for (let j = 0; j < 4; j++) {
      for (let i = 0; i < 6; i++) {
        const [a, b, c] = sampleModel(model, r.left + ((i + 0.5) / 6) * r.width, r.top + ((j + 0.5) / 4) * r.height);
        R += a;
        G += b;
        B += c;
        n++;
      }
    }
    R /= n;
    G /= n;
    B /= n;
    // Lean 30% toward what is behind, from white.
    const t = [255 + (R - 255) * 0.3, 255 + (G - 255) * 0.3, 255 + (B - 255) * 0.3].map(Math.round);
    p.el.style.setProperty('--tint', t.join(' '));
    const lum = (0.2126 * R + 0.7152 * G + 0.0722 * B) / 255;
    const dark = lum < 0.36;
    p.el.style.setProperty('--pane-ink', dark ? '#fbf7f2' : '#1c1a24');
    p.el.style.setProperty('--pane-ink-2', dark ? 'rgb(251 247 242 / 0.78)' : 'rgb(28 26 36 / 0.72)');
  }
}

function hexRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
