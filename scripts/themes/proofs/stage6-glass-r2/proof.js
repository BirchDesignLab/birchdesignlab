/**
 * Stage 6 wave 1, task 7: the R2 proof. Glass over the page, bending the real
 * DOM (a1-critic-glassmorphism.md G5 and R2; stop 1 call 2).
 *
 * Written 11-19-26. A proof, not production code: nothing under src/ changes.
 * serve.mjs (this folder) injects this file and proof.css into the frozen
 * build's glass Home, so the markup, styles and scripts are the real ones.
 * On top of them it adds:
 *
 *   1. A magnifier lens in the top layer (a manual popover): a fixed disc
 *      whose backdrop-filter is url(#r2-lens-f), a feDisplacementMap and no
 *      blur, so the headline, body text, panes and the Control Centre under
 *      it are magnified and bent at the rim. The disc ignores the pointer;
 *      only a ring along its rim (a real <button>, clipped to the ring with
 *      an even-odd clip-path, which hit testing honours) grabs it. Arrow keys
 *      move it while the button has focus (Shift for bigger steps).
 *   2. The header bar as a clear cylinder lens: its frost and rim layers
 *      (fx.ts) are hidden and one unblurred displacement layer replaces them,
 *      so content scrolling under the bar is stretched tall in the middle and
 *      squeezed into the top and bottom rims.
 *   3. One extra toy: a pill line magnifier (a glass reading ruler), the
 *      same machinery as the lens, magnifying mostly up and down.
 *
 * Only Blink applies url() in backdrop-filter (fx.ts bendSupported()). In
 * Safari and Firefox the proof does nothing and today's WebGL lens stays.
 *
 * The WebGL lens is hidden while the proof runs (proof.css, html.r2-on).
 * `?r2=off` leaves the page as built, for comparisons.
 *
 * Test hooks: window.__r2 = { lens, pill, maps, place(name, x, y),
 *   sampleAt(name, x, y) }.
 */

const SVGNS = 'http://www.w3.org/2000/svg';

function bendSupported() {
  const uad = navigator.userAgentData;
  const blink = !!uad && Array.isArray(uad.brands) && uad.brands.some((b) => /Chromium/i.test(b.brand));
  const grammar = typeof CSS !== 'undefined' && CSS.supports('backdrop-filter', 'url(#x) blur(1px)');
  return blink && grammar;
}

/* ---------- displacement maps ---------- */

/** Signed distance to a w x h rounded rect of radius r, positive inside. */
function edgeDist(x, y, w, h, r) {
  const qx = Math.abs(x - w / 2) - (w / 2 - r);
  const qy = Math.abs(y - h / 2) - (h / 2 - r);
  const out = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
  const ins = Math.min(Math.max(qx, qy), 0);
  return -(out + ins - r);
}

/**
 * A map for a w x h rounded rect (radius r), rendered at `res` pixels per
 * CSS px. Each pixel's displacement (where it samples from, CSS px) is the
 * sum of
 *   - magnification toward the centre: -(p - c) * (1 - 1/m), per axis, so a
 *     flat interior reads m times larger (mx, my);
 *   - a bezel pull: along the inward normal, `bez` px at the very edge,
 *     easing to 0 at `band` px in, which squeezes a ring of the backdrop into
 *     the rim the way a thick glass edge does.
 * Every displacement points inward, so nothing samples past the element's
 * own box (Chromium mirrors the backdrop there).
 * Returns { href, scale, max } for feImage + feDisplacementMap.
 */
function makeMap(w, h, r, { mx = 1, my = 1, bez = 0, band = 1 }, res = 1) {
  const W = Math.max(1, Math.round(w * res));
  const H = Math.max(1, Math.round(h * res));
  const dx = new Float32Array(W * H);
  const dy = new Float32Array(W * H);
  const kx = 1 - 1 / mx;
  const ky = 1 - 1 / my;
  let max = 0.5;
  for (let j = 0; j < H; j++) {
    const y = (j + 0.5) / res;
    for (let i = 0; i < W; i++) {
      const x = (i + 0.5) / res;
      const d = edgeDist(x, y, w, h, r);
      if (d <= 0) continue;
      let vx = -(x - w / 2) * kx;
      let vy = -(y - h / 2) * ky;
      if (bez > 0 && d < band) {
        // Inward normal from the distance field's gradient.
        const e = 0.5;
        let nx = edgeDist(x + e, y, w, h, r) - edgeDist(x - e, y, w, h, r);
        let ny = edgeDist(x, y + e, w, h, r) - edgeDist(x, y - e, w, h, r);
        const nl = Math.hypot(nx, ny) || 1;
        nx /= nl; ny /= nl;
        const t = 1 - d / band;
        vx += nx * bez * t * t;
        vy += ny * bez * t * t;
      }
      dx[j * W + i] = vx;
      dy[j * W + i] = vy;
      max = Math.max(max, Math.abs(vx), Math.abs(vy));
    }
  }
  const scale = 2 * max;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const img = g.createImageData(W, H);
  for (let k = 0; k < W * H; k++) {
    img.data[k * 4] = Math.round(255 * (0.5 + dx[k] / scale));
    img.data[k * 4 + 1] = Math.round(255 * (0.5 + dy[k] / scale));
    img.data[k * 4 + 2] = 128;
    img.data[k * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return { href: c.toDataURL('image/png'), scale, max, dx, dy, W, H, res };
}

let defs = null;
function ensureDefs() {
  if (defs?.isConnected) return defs;
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('class', 'r2-defs');
  svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;';
  defs = document.createElementNS(SVGNS, 'defs');
  svg.appendChild(defs);
  document.body.appendChild(svg);
  return defs;
}

/** (Re)write filter `id` for a w x h box from a makeMap() result. */
function writeFilter(id, w, h, map) {
  const d = ensureDefs();
  let f = d.querySelector(`#${id}`);
  if (!f) {
    f = document.createElementNS(SVGNS, 'filter');
    f.setAttribute('id', id);
    d.appendChild(f);
  }
  f.setAttribute('x', '0');
  f.setAttribute('y', '0');
  f.setAttribute('width', String(w));
  f.setAttribute('height', String(h));
  f.setAttribute('filterUnits', 'userSpaceOnUse');
  f.setAttribute('primitiveUnits', 'userSpaceOnUse');
  f.setAttribute('color-interpolation-filters', 'sRGB');
  f.innerHTML =
    `<feImage href="${map.href}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="none" result="map"/>` +
    `<feDisplacementMap in="SourceGraphic" in2="map" scale="${map.scale.toFixed(3)}" xChannelSelector="R" yChannelSelector="G"/>`;
}

/** An even-odd ring path: the w x h capsule (radius h/2, or r) minus the
    same shape inset by `t`. For clip-path, so only the rim hit-tests. */
function ringPath(w, h, r, t) {
  const rr = (x, y, W, H, R) =>
    `M${x + R},${y} H${x + W - R} A${R},${R} 0 0 1 ${x + W},${y + R} V${y + H - R} ` +
    `A${R},${R} 0 0 1 ${x + W - R},${y + H} H${x + R} A${R},${R} 0 0 1 ${x},${y + H - R} ` +
    `V${y + R} A${R},${R} 0 0 1 ${x + R},${y} Z`;
  const ri = Math.max(0, r - t);
  return `path(evenodd, '${rr(0, 0, w, h, r)} ${rr(t, t, w - 2 * t, h - 2 * t, ri)}')`;
}

/* ---------- glass objects: the lens and the pill ---------- */

const objects = {};

/**
 * One draggable glass object in the top layer.
 * spec: { name, w, h, r, optics, rim, label, at: [cx, cy] }
 */
function makeObject(spec) {
  const res = Math.min(2, window.devicePixelRatio || 1);
  const id = `r2-${spec.name}-f`;
  const map = makeMap(spec.w, spec.h, spec.r, spec.optics, res);
  writeFilter(id, spec.w, spec.h, map);

  const el = document.createElement('div');
  el.className = `r2-glass r2-${spec.name}`;
  el.setAttribute('popover', 'manual');
  el.style.width = `${spec.w}px`;
  el.style.height = `${spec.h}px`;
  el.style.borderRadius = `${spec.r}px`;
  el.style.backdropFilter = `url(#${id})`;
  const sheen = document.createElement('span');
  sheen.className = 'r2-sheen';
  sheen.setAttribute('aria-hidden', 'true');
  const rim = document.createElement('button');
  rim.type = 'button';
  rim.className = 'r2-rim';
  rim.setAttribute('aria-label', spec.label);
  rim.style.clipPath = ringPath(spec.w, spec.h, spec.r, spec.rim);
  el.append(sheen, rim);
  document.body.appendChild(el);
  try { el.showPopover(); } catch { /* no popover: it is still fixed and on top by z-index */ }

  const o = { el, rim, spec, map, x: 0, y: 0 };
  const place = (cx, cy) => {
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    // At most about a third off any edge, so the rim can always be grabbed back.
    const mx = spec.w * 0.18;
    const my = spec.h * 0.18;
    o.x = Math.min(vw - mx, Math.max(mx, cx));
    o.y = Math.min(vh - my, Math.max(my, cy));
    el.style.transform = `translate3d(${o.x - spec.w / 2}px, ${o.y - spec.h / 2}px, 0)`;
  };
  o.place = place;
  place(spec.at[0], spec.at[1]);

  let grab = null;
  rim.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    rim.setPointerCapture(e.pointerId);
    grab = { id: e.pointerId, dx: o.x - e.clientX, dy: o.y - e.clientY };
    el.classList.add('r2-held');
    // The one being moved goes on top of the other.
    try { el.hidePopover(); el.showPopover(); } catch {}
    rim.focus({ preventScroll: true });
  });
  rim.addEventListener('pointermove', (e) => {
    if (!grab || e.pointerId !== grab.id) return;
    place(e.clientX + grab.dx, e.clientY + grab.dy);
  });
  const drop = (e) => {
    if (!grab || e.pointerId !== grab.id) return;
    grab = null;
    el.classList.remove('r2-held');
  };
  rim.addEventListener('pointerup', drop);
  rim.addEventListener('pointercancel', drop);
  rim.addEventListener('keydown', (e) => {
    const step = e.shiftKey ? 48 : 12;
    const m = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!m) return;
    e.preventDefault();
    place(o.x + m[0], o.y + m[1]);
  });
  window.addEventListener('resize', () => place(o.x, o.y));
  objects[spec.name] = o;
  return o;
}

/* ---------- the header bar ---------- */

function mountBar() {
  const bar = document.querySelector('.site-header .bar');
  if (!bar) return;
  const layer = document.createElement('span');
  layer.className = 'r2-bar-lens';
  layer.setAttribute('aria-hidden', 'true');
  bar.insertBefore(layer, bar.firstChild);
  let last = '';
  const build = () => {
    const w = bar.clientWidth;
    const h = bar.clientHeight;
    const key = `${w}x${h}`;
    if (!w || !h || key === last) return;
    last = key;
    const r = Math.min(parseFloat(getComputedStyle(bar).borderTopLeftRadius) || 0, h / 2);
    const res = Math.min(2, window.devicePixelRatio || 1);
    // A clear rod: content is stretched about 1.5x tall across the middle
    // and pulled hard into the top and bottom rims.
    const map = makeMap(w, h, r, { mx: 1, my: 1.5, bez: Math.min(18, h * 0.3), band: Math.min(h * 0.45, 26) }, res);
    writeFilter('r2-bar-f', w, h, map);
    layer.style.backdropFilter = 'url(#r2-bar-f)';
    window.__r2.maps.bar = { w, h, r, scale: map.scale, max: map.max };
  };
  build();
  new ResizeObserver(build).observe(bar);
}

/* ---------- mount ---------- */

function mount() {
  if (window.__r2?.mounted) return;
  if (new URLSearchParams(location.search).get('r2') === 'off') return;
  const html = document.documentElement;
  if (html.dataset.theme !== 'glassmorphism') return;
  const win = document.querySelector('.hero .window');
  if (!win) return;
  if (!bendSupported()) {
    html.dataset.r2 = 'unsupported';
    return;
  }
  // E10 off state: under prefers-contrast: more there is no lens and no
  // clear bar; the page stays as built (poster disc, solid unblurred bar). proof.css
  // repeats this as a media query so a live change of the setting also
  // takes effect.
  if (window.matchMedia('(prefers-contrast: more)').matches) {
    html.dataset.r2 = 'contrast';
    return;
  }
  window.__r2 = {
    mounted: true,
    maps: {},
    place: (n, x, y) => objects[n]?.place(x, y),
    /** Where the eye sees, at viewport point (x, y) on object n's face: the
        point the displacement samples from (as the 8-bit map encodes it). */
    sampleAt: (n, x, y) => {
      const o = objects[n];
      if (!o) return null;
      const { dx, dy, W, H, res } = o.map;
      const i = Math.floor((x - (o.x - o.spec.w / 2)) * res);
      const j = Math.floor((y - (o.y - o.spec.h / 2)) * res);
      if (i < 0 || j < 0 || i >= W || j >= H) return null;
      return [x + dx[j * W + i], y + dy[j * W + i]];
    },
  };
  html.classList.add('r2-on');

  const phone = window.innerWidth < 720;
  const R = phone ? 74 : 124;
  const wb = win.getBoundingClientRect();
  const lens = makeObject({
    name: 'lens',
    w: 2 * R, h: 2 * R, r: R,
    rim: phone ? 18 : 16,
    // About 1.45x across the face, with a thick bent rim.
    optics: { mx: 1.45, my: 1.45, bez: phone ? 12 : 18, band: phone ? 20 : 30 },
    label: 'Glass lens. Drag its rim, or focus it and use the arrow keys, to move it across the page.',
    at: [Math.round(wb.left + Math.min(wb.width * 0.3, R + 40)), Math.round(wb.top + wb.height * 0.4)],
  });
  const pw = phone ? 230 : 340;
  const ph = phone ? 56 : 70;
  const pill = makeObject({
    name: 'pill',
    w: pw, h: ph, r: ph / 2,
    rim: 14,
    // A reading ruler: lines grow tall, letters only a little wider.
    optics: { mx: 1.12, my: 1.7, bez: 9, band: 16 },
    label: 'Glass ruler. Drag its rim, or focus it and use the arrow keys, to slide it over the text.',
    at: [Math.round(document.documentElement.clientWidth - pw / 2 - (phone ? 16 : 48)), Math.round(window.innerHeight - ph / 2 - (phone ? 120 : 110))],
  });
  window.__r2.lens = { R, scale: lens.map.scale, max: lens.map.max };
  window.__r2.pill = { w: pw, h: ph, scale: pill.map.scale, max: pill.map.max };
  mountBar();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
else mount();
document.addEventListener('astro:page-load', () => {
  // A ClientRouter swap replaces <body>, taking the objects with it.
  if (window.__r2?.mounted && !document.querySelector('.r2-glass')) window.__r2.mounted = false;
  mount();
});
