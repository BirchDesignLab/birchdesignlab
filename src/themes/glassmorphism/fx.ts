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
 * The frosted base (blur/saturate, literal for -webkit-) and the rim ring
 * are CSS (theme.css). Stage 6 R1 (G4): where url() in backdrop-filter
 * actually bends something (the Blink gate below, never CSS.supports, which
 * lies true in every engine: proofs/lens.md, "Detecting url() in
 * backdrop-filter"), each pane's frost moves onto two layers, an unblurred
 * displacement band along the rim and the frost inside it (buildOne). All
 * of it waits until the page has arrived and gone idle (B1 fix round 2).
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

/** E10's off state (theme.css, prefers-contrast: more) turns every pane's
    blur off in CSS, but mountPanes() used to write the bevel's url(#...)
    into each pane's inline style unconditionally, and an inline style always
    wins over a stylesheet rule regardless of the media query it is gated
    on. Checked live (not cached) so a mid-session OS setting change is
    picked up by the matchMedia listener below. Stage 6, stop 1 call 1 (a):
    prefers-reduced-transparency no longer counts; the Portal ignores it for
    glass. */
function fallbackActive(): boolean {
  return window.matchMedia('(prefers-contrast: more)').matches;
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

/** The rim band's two maps for one pane, as data: URLs (Stage 6 R1, G4).
    `map` is room.js's bevel refraction map (bevel always inward per the
    founder's Tier A decision): R carries x, G carries y, 128 is no shift.
    `mask` is the band itself as alpha: opaque along the outer part of the
    band, feathered to clear over its inner part, clear across the interior.
    The rim layer shows through `mask`; the frost layer shows through its
    complement (theme.css, `mask-composite: exclude` against a solid layer),
    so the two always add up to one and no seam opens between them.

    Both cover the pane's padding box (the layers sit inside the border).
    Only the band along the rim is computed; everything else is a flat fill,
    so a big pane costs a thin ring of SDF work instead of its whole area. */
function rimMaps(w: number, h: number, r: number, band: number, max: number): { map: string; mask: string } | null {
  // One map pixel per CSS pixel: at 2 the displaced rim stepped in 2px
  // blocks and smeared text passing under the header into streaks.
  const scale = 1;
  const mw = Math.max(2, Math.round(w / scale));
  const mh = Math.max(2, Math.round(h / scale));
  const make = () => {
    const c = document.createElement('canvas');
    c.width = mw;
    c.height = mh;
    // willReadFrequently keeps this canvas in software: a GPU canvas makes
    // toDataURL() wait on a GPU readback, which the B1 fix-round-2 trace
    // measured at 20 to 60 ms per pane (scripts/themes/glassmorphism/
    // b1-fix2-trace.mjs). Flat fills go straight into the pixel buffer for
    // the same reason (no getImageData).
    const g = c.getContext('2d', { willReadFrequently: true });
    return g ? { c, g, img: g.createImageData(mw, mh) } : null;
  };
  const disp = make();
  const band2 = make();
  if (!disp || !band2) return null;
  new Uint32Array(disp.img.data.buffer).fill(0xff808080); // RGBA 128,128,128,255 (little-endian)
  // The mask's interior stays the zero fill: transparent.
  // The band lies within `edge` px of the pane's box; with a rounded corner
  // of radius r, a corner pixel can be up to r from both edges.
  const edge = Math.max(band, r) + scale * 2;
  const solid = band * 0.45; // the outer part of the band: rim only, no frost
  for (let j = 0; j < mh; j++) {
    const y = (j + 0.5) * scale;
    const rowNearEdge = y < edge || y > h - edge;
    for (let i = 0; i < mw; i++) {
      const x = (i + 0.5) * scale;
      if (!rowNearEdge && x > edge && x < w - edge) {
        i = Math.max(i, Math.floor((w - edge) / scale) - 1);
        continue;
      }
      const { d, nx, ny } = roundedRectSdf(x, y, w, h, r);
      if (d >= band) continue;
      const k = (j * mw + i) * 4;
      // Outside the rounded corner the layer's own border-radius clips;
      // the band is full there so nothing frosts a corner it cannot reach.
      const a = d <= solid ? 1 : 1 - (d - solid) / (band - solid);
      band2.img.data[k + 3] = Math.round(255 * a * a * (3 - 2 * a));
      const t = Math.min(1, Math.max(0, 1 - d / band));
      const shift = max * Math.pow(t, 1.6);
      disp.img.data[k] = Math.round(128 + ((-nx * shift) / max) * 127);
      disp.img.data[k + 1] = Math.round(128 + ((-ny * shift) / max) * 127);
    }
  }
  disp.g.putImageData(disp.img, 0, 0);
  band2.g.putImageData(band2.img, 0, 0);
  return { map: disp.c.toDataURL('image/png'), mask: band2.c.toDataURL('image/png') };
}

const SVGNS = 'http://www.w3.org/2000/svg';

/** The largest orb overlapping a pane's rect, and its colour, for the
    adaptive tint. Reads the orb's own --lo custom property by applying it
    to a probe element appended inside the orb (so it inherits the right
    cascade scope), rather than trusting getComputedStyle to have already
    resolved the var() chain, which is not guaranteed. */
export function orbColorAt(orb: HTMLElement): [number, number, number] | null {
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

/** Both of an orb's gradient stops (`--hi`, `--lo`), resolved the same way
    orbColorAt resolves one. The lens (`lens/lens.ts`, B2 fix round item A)
    needs both: `.orb`'s real background is `linear-gradient(155deg, --hi 8%,
    --lo 78%)` (theme.css), not a flat fill, so a model that only reads `--lo`
    disagrees with the true page across most of the orb's face (the 8-78%
    transition band), not only at its rim -- measured as a 168-level identity
    mismatch, 3.01% of pixels over 8, before this existed. Returns null the
    same way orbColorAt does if either custom property is unset or fails to
    resolve to an rgb() string. */
export function orbGradientAt(orb: HTMLElement): { hi: [number, number, number]; lo: [number, number, number] } | null {
  const cs = getComputedStyle(orb);
  const hi = cs.getPropertyValue('--hi').trim();
  const lo = cs.getPropertyValue('--lo').trim();
  if (!hi || !lo) return null;
  const probe = document.createElement('span');
  probe.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;';
  orb.appendChild(probe);
  const resolve = (value: string): [number, number, number] | null => {
    probe.style.color = value;
    const resolved = getComputedStyle(probe).color;
    const m = resolved.match(/[\d.]+/g);
    if (!m || m.length < 3) return null;
    return [Math.round(Number(m[0])), Math.round(Number(m[1])), Math.round(Number(m[2]))];
  };
  const hiRgb = resolve(hi);
  const loRgb = resolve(lo);
  probe.remove();
  if (!hiRgb || !loRgb) return null;
  return { hi: hiRgb, lo: loRgb };
}

export function mountPanes(): (() => void) | void {
  if (document.documentElement.dataset.theme !== 'glassmorphism') return;
  const html = document.documentElement;
  const panes = [...document.querySelectorAll<HTMLElement>('.glass, .glass-strong')];
  if (panes.length === 0) return;

  /* Which panes bend: every pane, the header bar and pills included
     (Stage 6 R1, G4 and G6). The old url()-before-blur recipe skipped them
     because the blur erased the bend and cost the header its frost; the rim
     band below never blurs, so a pill's band is simply kept thin (its
     height times 0.22). While the header bar is named for an in-school swap
     theme.css hides its two layers ("The header bar holds still"). */
  const bendable = (el: HTMLElement) => el.clientWidth > 1 && el.clientHeight > 1;

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

  /* The rim band (Stage 6 R1, G4). The old recipe prepended url(#bevel)
     to the pane's own blur list, and the blur that followed erased the
     bend. Now, in Chromium, the pane itself stops frosting (an inline
     `backdrop-filter: none`) and carries two layers (theme.css, "The rim
     band"), both at z-index -1 so they paint over the pane's own fill and
     under its content:
     - .glass-rim, first, whose backdrop-filter is the displacement alone
       (no blur), masked to the band along the edge. Its backdrop is what is
       behind the pane plus the pane's fill, so the crisp wallpaper and orbs
       visibly bend into the edge.
     - .glass-frost, second, the pane's frost (theme.css gives it the
       pane's own --blur* token, so the Frost slider and Tinted reach it
       live), masked to the complement of the band.
     The pane must not be a backdrop root (no filter, opacity or mask of its
     own), or both layers would see only the pane. Safari and Firefox keep
     the pane's own CSS frost and get no layers (bendSupported). */
  const layers = new WeakMap<HTMLElement, { rim: HTMLElement; frost: HTMLElement }>();
  const layersFor = (el: HTMLElement) => {
    let l = layers.get(el);
    if (!l || !l.rim.isConnected) {
      const rim = document.createElement('span');
      const frost = document.createElement('span');
      rim.className = 'glass-rim';
      frost.className = 'glass-frost';
      rim.setAttribute('aria-hidden', 'true');
      frost.setAttribute('aria-hidden', 'true');
      el.insertBefore(frost, el.firstChild);
      el.insertBefore(rim, frost);
      l = { rim, frost };
      layers.set(el, l);
    }
    return l;
  };
  const clearPane = (el: HTMLElement) => {
    const l = layers.get(el);
    l?.rim.remove();
    l?.frost.remove();
    layers.delete(el);
    el.style.removeProperty('backdrop-filter');
  };

  function buildOne(el: HTMLElement) {
    if (!el.isConnected) return;
    if (fallbackActive() || !bendable(el)) {
      clearPane(el);
      return;
    }
    // The padding box: the layers sit inside the pane's border.
    const w = el.clientWidth;
    const h = el.clientHeight;
    const cs = getComputedStyle(el);
    const border = parseFloat(cs.borderTopWidth) || 0;
    // CSS clamps a radius to half the short side; so does the map.
    const r = Math.max(0, Math.min((parseFloat(cs.borderTopLeftRadius) || 0) - border, w / 2, h / 2));
    const band = Math.max(6, Math.min(24, r * 0.85, Math.min(w, h) * 0.22));
    const max = Math.min(30, band * 0.9);
    const maps = rimMaps(w, h, r, band, max);
    if (!maps) return;
    let id = ids.get(el);
    if (!id) {
      id = `glass-pane-rim-${nextId++}`;
      ids.set(el, id);
    }
    const d = ensureDefs();
    let filter = d.querySelector(`#${id}`);
    if (!filter) {
      filter = document.createElementNS(SVGNS, 'filter');
      filter.setAttribute('id', id);
      d.appendChild(filter);
    }
    filter.setAttribute('x', '0');
    filter.setAttribute('y', '0');
    filter.setAttribute('width', String(w));
    filter.setAttribute('height', String(h));
    filter.setAttribute('filterUnits', 'userSpaceOnUse');
    filter.setAttribute('primitiveUnits', 'userSpaceOnUse');
    filter.setAttribute('color-interpolation-filters', 'sRGB');
    filter.innerHTML =
      `<feImage href="${maps.map}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="none" result="map"/>` +
      `<feDisplacementMap in="SourceGraphic" in2="map" scale="${2 * max}" xChannelSelector="R" yChannelSelector="G"/>`;
    const { rim, frost } = layersFor(el);
    rim.style.backdropFilter = `url(#${id})`;
    rim.style.setProperty('--rim-mask', `url("${maps.mask}")`);
    frost.style.setProperty('--rim-mask', `url("${maps.mask}")`);
    el.style.backdropFilter = 'none';
  }

  const rebuildAll = () => {
    if (!ready) return;
    if (fallbackActive()) {
      // The CSS off state wins the look either way; drop any inline filter
      // a previous build left so the stylesheet's `none` is not shadowed by
      // an inline value that no longer matches the current preference.
      queue.clear();
      for (const el of panes) clearPane(el);
      return;
    }
    enqueue(panes);
  };
  const ro = bend
    ? new ResizeObserver((entries) => enqueue(entries.map((e) => e.target as HTMLElement)))
    : null;

  // A light/dark toggle or a contrast-preference change does not itself
  // resize any pane, so nothing else would ask for a rebuild; a resize past
  // the 720px breakpoint usually does reflow panes (caught by the
  // ResizeObserver), but the token can change without a reflow, so the
  // breakpoint is listened to directly too.
  const contrastMq = window.matchMedia('(prefers-contrast: more)');
  const phoneMq = window.matchMedia('(max-width: 720px)');
  contrastMq.addEventListener('change', rebuildAll);
  phoneMq.addEventListener('change', rebuildAll);
  /* A live scheme flip remaps the orb hues (dark's --blob-* set), so the
     tint is read again (PR #91 review). The Frost slider and Tinted no
     longer need a rebuild (Stage 6 R1): the frost layer reads the pane's
     --blur* token in CSS, live, and the rim maps depend on geometry only. */
  const settingsObserver = new MutationObserver(() => {
    scheduleTint();
  });
  settingsObserver.observe(html, { attributeFilter: ['data-scheme', 'style'] });

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
    contrastMq.removeEventListener('change', rebuildAll);
    phoneMq.removeEventListener('change', rebuildAll);
    settingsObserver.disconnect();
    ro?.disconnect();
    svg?.remove();
    for (const el of panes) {
      clearPane(el);
      el.style.removeProperty('--pane-tint-alpha');
      el.style.removeProperty('--pane-tint-rgb');
    }
  };
}
