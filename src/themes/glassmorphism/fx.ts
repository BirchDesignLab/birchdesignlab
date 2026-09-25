/** Pauses each section's drifting orbs while the section is off-screen, so a
    reader scrolled past the hero does not keep every panel below re-blurring
    for orbs they cannot see. Mounted once per page via onMount
    (src/lib/lifecycle.ts); .orbs:not([data-live]) .orb is paused in
    theme.css. */
export function mountOrbs(): (() => void) | void {
  if (document.documentElement.dataset.theme !== 'glassmorphism') return;
  const groups = document.querySelectorAll<HTMLElement>('.orbs');
  if (groups.length === 0) return;

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        (entry.target as HTMLElement).toggleAttribute('data-live', entry.isIntersecting);
      }
    },
    { rootMargin: '25% 0px' },
  );
  groups.forEach((el) => io.observe(el));

  return () => io.disconnect();
}

/* ---------- the Liquid pane recipe (item 8, B1 scope) ----------
 *
 * Ported from scripts/themes/proofs/stage3-lens/room.js (the Tier A lens
 * proof), scoped down for B1: every .glass pane gets the SVG bevel and a
 * light adaptive tint. B1 has no draggable lens and no shared canvas
 * wallpaper model (that is B2's "production lens"; proofs/lens.md, "For
 * Tier B: one wallpaper source"), so the tint reads real .orb elements'
 * boxes and colours directly instead of a sampled bitmap, and this skips
 * the ink flip: meta.ts's contrast pairs are checked against a fixed
 * --mark/--mark-muted over the worst orb, and flipping ink at runtime would
 * escape that discipline without a matching checked pair.
 *
 * The frosted base (blur/saturate/brightness, literal for -webkit-) and the
 * rim ring are CSS (theme.css); this only prepends url(#...) to the
 * unprefixed backdrop-filter, and only where it actually bends something
 * (the Blink gate below, never CSS.supports, which lies true in every
 * engine: proofs/lens.md, "Detecting url() in backdrop-filter"), and not on
 * the header bar or pill-shaped panes (mountPanes, bendable()). All of it
 * waits until the page has arrived and gone idle (B1 fix round 2).
 */

/** Same check as the lens proof's bendSupport(): only Blink applies url() in
    backdrop-filter today (Chromium ships it; WebKit PR 68614 is unmerged;
    Firefox drops the whole filter list, bug 1961378). CSS.supports() cannot
    tell: it says true in every engine (a lax grammar check), so this never
    trusts it alone. */
function bendSupported(): boolean {
  const uad = (navigator as unknown as { userAgentData?: { brands?: { brand: string }[] } }).userAgentData;
  const blink = !!uad && Array.isArray(uad.brands) && uad.brands.some((b) => /Chromium/i.test(b.brand));
  const grammar = typeof CSS !== 'undefined' && CSS.supports('backdrop-filter', 'url(#x) blur(1px)');
  return blink && grammar;
}

/** E10's off state (theme.css, prefers-reduced-transparency/prefers-contrast)
    turns every pane's blur off in CSS, but mountPanes() used to write the
    bevel's url(#...) into each pane's inline style unconditionally, and an
    inline style always wins over a stylesheet rule regardless of the media
    query it is gated on. Checked live (not cached) so a mid-session OS
    setting change is picked up by the matchMedia listener below. */
function transparencyReduced(): boolean {
  return (
    window.matchMedia('(prefers-reduced-transparency: reduce)').matches ||
    window.matchMedia('(prefers-contrast: more)').matches
  );
}

/** Signed distance from (x, y) to a rounded rect of size w x h and corner
    radius r (positive inside), and the outward unit normal there. Verbatim
    from room.js. */
function roundedRectSdf(x: number, y: number, w: number, h: number, r: number) {
  const cx = x - w / 2;
  const cy = y - h / 2;
  const qx = Math.abs(cx) - (w / 2 - r);
  const qy = Math.abs(cy) - (h / 2 - r);
  let d: number;
  let nx: number;
  let ny: number;
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

/** The bevel refraction map for one pane, as a data: URL (room.js's
    bevelMap(), bevel always inward per the founder's Tier A decision: dir is
    not parameterised here). R carries x, G carries y, 128 is no shift.

    The map covers the pane plus `pad` px on every side (all 128 there), to
    match the padded filter region in buildOne() below. Only the band along
    the rim is computed; everything else is the flat 128 fill, so a big pane
    costs a thin ring of SDF work instead of its whole area. */
function bevelMapUrl(w: number, h: number, r: number, band: number, max: number, pad: number): string {
  const scale = 2;
  const W = w + 2 * pad;
  const H = h + 2 * pad;
  const mw = Math.max(2, Math.round(W / scale));
  const mh = Math.max(2, Math.round(H / scale));
  const c = document.createElement('canvas');
  c.width = mw;
  c.height = mh;
  // willReadFrequently keeps this canvas in software: a GPU canvas makes
  // toDataURL() wait on a GPU readback, which the B1 fix-round-2 trace
  // measured at 20 to 60 ms per pane (scripts/themes/glassmorphism/
  // b1-fix2-trace.mjs). The flat fill is written straight into the pixel
  // buffer for the same reason (no getImageData).
  const g = c.getContext('2d', { willReadFrequently: true });
  if (!g) return '';
  const img = g.createImageData(mw, mh);
  new Uint32Array(img.data.buffer).fill(0xff808080); // RGBA 128,128,128,255 (little-endian)
  // The band lies within `edge` px of the pane's box; with a rounded corner
  // of radius r, a corner pixel can be up to r from both edges.
  const edge = Math.max(band, r) + scale * 2;
  for (let j = 0; j < mh; j++) {
    const y = (j + 0.5) * scale - pad;
    if (y < -1 || y > h + 1) continue;
    const rowNearEdge = y < edge || y > h - edge;
    for (let i = 0; i < mw; i++) {
      const x = (i + 0.5) * scale - pad;
      if (x < -1 || x > w + 1) continue;
      if (!rowNearEdge && x > edge && x < w - edge) {
        i = Math.max(i, Math.floor((w - edge + pad) / scale) - 1);
        continue;
      }
      const { d, nx, ny } = roundedRectSdf(x, y, w, h, r);
      if (!(d < band && d > -1)) continue;
      const t = Math.min(1, Math.max(0, 1 - d / band));
      const shift = max * Math.pow(t, 1.6);
      const k = (j * mw + i) * 4;
      img.data[k] = Math.round(128 + ((-nx * shift) / max) * 127);
      img.data[k + 1] = Math.round(128 + ((-ny * shift) / max) * 127);
    }
  }
  g.putImageData(img, 0, 0);
  return c.toDataURL('image/png');
}

const SVGNS = 'http://www.w3.org/2000/svg';

/** The largest orb overlapping a pane's rect, and its colour, for the
    adaptive tint. Reads the orb's own --lo custom property by applying it
    to a probe element appended inside the orb (so it inherits the right
    cascade scope), rather than trusting getComputedStyle to have already
    resolved the var() chain, which is not guaranteed. */
function orbColorAt(orb: HTMLElement): [number, number, number] | null {
  const lo = getComputedStyle(orb).getPropertyValue('--lo').trim();
  if (!lo) return null;
  const probe = document.createElement('span');
  probe.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;';
  probe.style.color = lo;
  orb.appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  probe.remove();
  const m = resolved.match(/[\d.]+/g);
  if (!m || m.length < 3) return null;
  return [Math.round(Number(m[0])), Math.round(Number(m[1])), Math.round(Number(m[2]))];
}

/** Which blur token a pane's frosted list comes from, by class (theme.css:
    .glass is --blur, .glass.thin --blur-thin, .glass-strong and .glass.thick
    --blur-thick, the thick rule winning a tie on source order). Read as the
    token, never as the pane's computed backdrop-filter: once buildOne() has
    written an inline value, the computed value IS that inline value, so a
    rebuild after a live scheme flip or a resize across 720 px would copy the
    old scheme's list forward (the B1 re-critic's scheme-live nit). */
/** Pad each bevel's filter region so the pane frosts all the way to its rim
    (true), or keep the Tier A proof's look, where the rim band's frost is
    thinner and crisp orb edges read through it as the bend (false). A
    founder decision, open as of 09-25-26; see buildOne(). */
const FULL_FROST_TO_RIM = false;

function blurTokenFor(el: HTMLElement): string {
  if (el.classList.contains('glass-strong') || el.classList.contains('thick')) return '--blur-thick';
  if (el.classList.contains('thin')) return '--blur-thin';
  return '--blur';
}

export function mountPanes(): (() => void) | void {
  if (document.documentElement.dataset.theme !== 'glassmorphism') return;
  const html = document.documentElement;
  const panes = [...document.querySelectorAll<HTMLElement>('.glass, .glass-strong')];
  if (panes.length === 0) return;

  /* Which panes bend. Not the header bar: it is the one pane text scrolls
     under, and it never bent anyway (its 999px radius made its map all
     "no shift"), yet the url() still cost it its frost (the B1 re-critic's
     header ghost); it also has to drop its whole backdrop-filter while it
     is named for an in-school swap (theme.css, "The header bar holds
     still"), which an inline style would outrank. Not a pill either (radius
     at least half its short side, Home's locale widget): the bevel band
     would be most of its height, and like the header it never bent. */
  const bendable = (el: HTMLElement) => {
    if (el.closest('.site-header')) return false;
    const r = el.getBoundingClientRect();
    const radius = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
    return radius < Math.min(r.width, r.height) / 2;
  };

  const bend = bendSupported();
  let svg: SVGSVGElement | null = null;
  let defs: SVGDefsElement | null = null;
  const ids = new WeakMap<HTMLElement, string>();
  let nextId = 0;

  /* Arrival first, bend after (B1 fix round 2). Nothing here runs until the
     page has arrived and gone idle: the frosted CSS base shows from the
     first frame, and each pane's bevel and tint land quietly afterwards,
     one pane per idle slot. A cross-school arrival (portal runtime.ts marks
     <html data-from-theme> until its view transition has finished) waits
     for that mark to clear; a hard load waits for idle. Building every
     pane's map in one rAF during the arrival cost Home 150 to 250 ms of main
     thread in the middle of the view transition (the frozen frames in the
     re-critic's films). */
  let ready = false;
  let idleId = 0;
  let timerId = 0;
  const idle = (fn: () => void) => {
    const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number })
      .requestIdleCallback;
    if (ric) idleId = ric(fn, { timeout: 1000 });
    else timerId = window.setTimeout(fn, 120);
  };
  const cancelIdle = () => {
    const cic = (window as unknown as { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback;
    if (idleId && cic) cic(idleId);
    if (timerId) clearTimeout(timerId);
    idleId = 0;
    timerId = 0;
  };

  const queue = new Set<HTMLElement>();
  const pump = () => {
    idleId = 0;
    timerId = 0;
    const el = queue.values().next().value as HTMLElement | undefined;
    if (!el) return;
    queue.delete(el);
    buildOne(el);
    if (queue.size) idle(pump);
  };
  const enqueue = (els: Iterable<HTMLElement>) => {
    if (!ready || !bend) return;
    for (const el of els) queue.add(el);
    if (queue.size && !idleId && !timerId) idle(pump);
  };

  const ensureDefs = () => {
    if (defs) return defs;
    svg = document.createElementNS(SVGNS, 'svg') as unknown as SVGSVGElement;
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    (svg as unknown as HTMLElement).style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;';
    defs = document.createElementNS(SVGNS, 'defs') as unknown as SVGDefsElement;
    svg.appendChild(defs as unknown as Node);
    document.body.appendChild(svg as unknown as Node);
    return defs;
  };

  function buildOne(el: HTMLElement) {
    if (!el.isConnected) return;
    if (transparencyReduced() || !bendable(el)) {
      el.style.removeProperty('backdrop-filter');
      return;
    }
    const rect = el.getBoundingClientRect();
    const w = Math.round(rect.width);
    const h = Math.round(rect.height);
    if (w < 2 || h < 2) return;
    const list = getComputedStyle(el).getPropertyValue(blurTokenFor(el)).trim();
    if (!list) return;
    // CSS clamps a radius to half the short side; so does the map.
    const r = Math.min(parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0, w / 2, h / 2);
    const band = Math.max(8, Math.min(24, r * 0.85));
    const max = Math.min(30, band * 0.9);
    /* The filter region, and why the rim looks bent (B1 fix round 2). An
       SVG filter's output stops at its filter region, so with the region
       equal to the pane's box, the blur that follows the url() in the list
       reads transparent past every rim: the frosted result loses alpha
       toward the edges and the sharp, unfiltered backdrop shows through it
       (proofs/lens.md finding 1's "4 px against 14 px", and the header
       ghost). Much of the "bend" the founder approved in the Tier A proof
       is that thinning: crisp orb edges read through the rim band. Padding
       the region by three blur radii (Chromium mirrors the backdrop past
       the box, finding 2) gives the blur real pixels to read and frosts
       the pane to its rim like the plain list, but the bend then almost
       vanishes under the blur (scripts/themes/.out/b1-glass-fix2/
       order-light-1440/crop-hero-old-new-none.png). Which one ships is the
       founder's call; until then the approved look stays (no padding) on
       the rectangular panes, which have only wallpaper and orbs under
       them, and the panes text can pass under (the header) or that never
       bent (pills) take no url() at all, above. FULL_FROST_TO_RIM flips it. */
    const sigma = Number(/blur\(\s*([\d.]+)px/.exec(list)?.[1] ?? 0);
    const pad = FULL_FROST_TO_RIM ? Math.min(120, Math.ceil(3 * sigma) + 2) : 0;
    const url = bevelMapUrl(w, h, r, band, max, pad);
    if (!url) return;
    let id = ids.get(el);
    if (!id) {
      id = `glass-pane-bevel-${nextId++}`;
      ids.set(el, id);
    }
    const d = ensureDefs();
    let filter = d.querySelector(`#${id}`);
    if (!filter) {
      filter = document.createElementNS(SVGNS, 'filter');
      filter.setAttribute('id', id);
      d.appendChild(filter);
    }
    filter.setAttribute('x', String(-pad));
    filter.setAttribute('y', String(-pad));
    filter.setAttribute('width', String(w + 2 * pad));
    filter.setAttribute('height', String(h + 2 * pad));
    filter.setAttribute('filterUnits', 'userSpaceOnUse');
    filter.setAttribute('primitiveUnits', 'userSpaceOnUse');
    filter.setAttribute('color-interpolation-filters', 'sRGB');
    filter.innerHTML =
      `<feImage href="${url}" x="${-pad}" y="${-pad}" width="${w + 2 * pad}" height="${h + 2 * pad}" preserveAspectRatio="none" result="map"/>` +
      `<feDisplacementMap in="SourceGraphic" in2="map" scale="${2 * max}" xChannelSelector="R" yChannelSelector="G"/>`;
    el.style.backdropFilter = `url(#${id}) ${list}`;
  }

  const rebuildAll = () => {
    if (!ready) return;
    if (transparencyReduced()) {
      // The CSS off state wins the look either way; drop any inline filter
      // a previous build left so the stylesheet's `none` is not shadowed by
      // an inline value that no longer matches the current preference.
      queue.clear();
      for (const el of panes) el.style.removeProperty('backdrop-filter');
      return;
    }
    enqueue(panes);
  };
  const ro = bend
    ? new ResizeObserver((entries) => enqueue(entries.map((e) => e.target as HTMLElement)))
    : null;

  // A light/dark toggle or a reduced-transparency change does not itself
  // resize any pane, so nothing else would ask for a rebuild; a resize past
  // the 720px breakpoint usually does reflow panes (caught by the
  // ResizeObserver), but the token can change without a reflow, so the
  // breakpoint is listened to directly too.
  const rtMq = window.matchMedia('(prefers-reduced-transparency: reduce)');
  const contrastMq = window.matchMedia('(prefers-contrast: more)');
  const phoneMq = window.matchMedia('(max-width: 720px)');
  rtMq.addEventListener('change', rebuildAll);
  contrastMq.addEventListener('change', rebuildAll);
  phoneMq.addEventListener('change', rebuildAll);
  const schemeObserver = new MutationObserver(rebuildAll);
  schemeObserver.observe(html, { attributeFilter: ['data-scheme'] });

  /* Adaptive tint: lean each pane's fill toward the largest orb it
     overlaps. Alpha is capped well under what meta.ts already proved
     passes against the worst-case orb directly under a pane, so this can
     only make a pane's own tuned contrast better, never worse. */
  const applyTint = () => {
    const orbs = [...document.querySelectorAll<HTMLElement>('.orb')];
    for (const el of panes) {
      const r = el.getBoundingClientRect();
      const area = r.width * r.height;
      if (area <= 0) continue;
      let best: { area: number; rgb: [number, number, number] } | null = null;
      for (const orb of orbs) {
        const or = orb.getBoundingClientRect();
        const ix = Math.max(0, Math.min(r.right, or.right) - Math.max(r.left, or.left));
        const iy = Math.max(0, Math.min(r.bottom, or.bottom) - Math.max(r.top, or.top));
        const overlap = ix * iy;
        if (overlap <= 0 || (best && overlap <= best.area)) continue;
        const rgb = orbColorAt(orb);
        if (rgb) best = { area: overlap, rgb };
      }
      if (!best) {
        el.style.setProperty('--pane-tint-alpha', '0');
        continue;
      }
      const share = Math.min(1, best.area / area);
      el.style.setProperty('--pane-tint-rgb', best.rgb.join(' '));
      el.style.setProperty('--pane-tint-alpha', String(Math.min(0.1, 0.3 * share)));
    }
  };
  let tintScheduled = false;
  const scheduleTint = () => {
    if (!ready || tintScheduled) return;
    tintScheduled = true;
    requestAnimationFrame(() => {
      tintScheduled = false;
      applyTint();
    });
  };
  window.addEventListener('scroll', scheduleTint, { passive: true });
  window.addEventListener('resize', scheduleTint);
  const onVisibility = () => {
    if (!document.hidden) scheduleTint();
  };
  document.addEventListener('visibilitychange', onVisibility);

  /* Start: once the arrival has settled (no data-from-theme), at idle. */
  let arrivalMo: MutationObserver | null = null;
  let safetyId = 0;
  const start = () => {
    if (ready) return;
    arrivalMo?.disconnect();
    arrivalMo = null;
    clearTimeout(safetyId);
    idle(() => {
      idleId = 0;
      timerId = 0;
      ready = true;
      panes.forEach((el) => ro?.observe(el)); // observe() reports each pane once: the first build
      if (!ro) rebuildAll();
      scheduleTint();
    });
  };
  if ('fromTheme' in html.dataset) {
    arrivalMo = new MutationObserver(() => {
      if (!('fromTheme' in html.dataset)) start();
    });
    arrivalMo.observe(html, { attributeFilter: ['data-from-theme'] });
    // runtime.ts clears the mark when the transition finishes, is skipped
    // or fails; this only covers a mark that somehow outlives all three.
    safetyId = window.setTimeout(start, 2500);
  } else {
    start();
  }

  return () => {
    cancelIdle();
    clearTimeout(safetyId);
    arrivalMo?.disconnect();
    queue.clear();
    window.removeEventListener('scroll', scheduleTint);
    window.removeEventListener('resize', scheduleTint);
    document.removeEventListener('visibilitychange', onVisibility);
    rtMq.removeEventListener('change', rebuildAll);
    contrastMq.removeEventListener('change', rebuildAll);
    phoneMq.removeEventListener('change', rebuildAll);
    schemeObserver.disconnect();
    ro?.disconnect();
    svg?.remove();
    for (const el of panes) {
      el.style.removeProperty('backdrop-filter');
      el.style.removeProperty('--pane-tint-alpha');
      el.style.removeProperty('--pane-tint-rgb');
    }
  };
}
