/* Stage 5 proof a5: the markup half of the proof, run in the page after the
   CSS is injected (the proof changes nothing under src/).

   1. Adds `cc-board` to the two mounted herbarium sheets (Home hero `.sheet`,
      About `.sheet`). Tier B writes the class into Home.astro and About.astro.
   2. Lays gum strips across the Home hero sprigs' stems, reusing the About
      twig's strip drawing (a gummed parallelogram, class `gum-strip`, from
      Pressed.astro). Two strips per sprig. Each strip is an inline SVG
      positioned in percent of the sheet and rotated across the stem; the
      positions are computed from the real stem paths and returned, so strips.json
      (written by the harness) is what Tier B hardcodes.

   Options: fixed (a strip table to replay, each strip re-tested at this size),
   scan (return, per sprig, every t that is clear at this size, and place
   nothing; the harness intersects the sizes and picks one table for all).

   Defines window.__ccMount(opts) and returns the strip table. */
window.__ccMount = function (opts) {
  const o = Object.assign({ strips: true, at: [0.3, 0.64], fixed: null }, opts || {});
  document.querySelectorAll('.hero .sheet, .herbarium .sheet').forEach((s) => s.classList.add('cc-board'));
  const sheet = document.querySelector('.hero .sheet');
  const table = [];
  if (!sheet || !o.strips) return table;
  /* All geometry is taken at scroll 0, so client coordinates are page
     coordinates. Hit tests scroll each sample into the viewport first
     (elementsFromPoint answers [] for a point outside it, which would read as
     bare board and pass a strip it never looked at), then scroll back. */
  const scroll0 = [scrollX, scrollY];
  window.scrollTo(0, 0);
  const NS = 'http://www.w3.org/2000/svg';
  const theta = parseFloat(getComputedStyle(sheet).rotate) || 0; // the sheet's own tilt, degrees
  const r = sheet.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const w = sheet.offsetWidth, h = sheet.offsetHeight;
  const th = (theta * Math.PI) / 180;
  const toLocal = (x, y) => {
    const dx = x - cx, dy = y - cy;
    return [dx * Math.cos(-th) - dy * Math.sin(-th) + w / 2, dx * Math.sin(-th) + dy * Math.cos(-th) + h / 2];
  };
  const kinds = [['.p-fern', 'fern'], ['.p-lav', 'lavender'], ['.p-rose', 'rose'], ['.p-daisy', 'daisy']];
  // small hand jitter, fixed so every run draws the same strips
  const jit = [3, -4, 2, -3, 4, -2, 3, -4];
  let n = 0;
  const pending = [];
  for (const [sel, name] of kinds) {
    const svg = sheet.querySelector(sel);
    const stem = svg && svg.querySelector('path.stem');
    if (!stem) continue;
    const L = stem.getTotalLength();
    const proj = (t) => {
      if (scrollX || scrollY) window.scrollTo(0, 0); // a hit test may have scrolled; the CTM is read at scroll 0
      const m = stem.getScreenCTM();
      const p = stem.getPointAtLength(L * t);
      const q = stem.getPointAtLength(Math.min(L, L * t + 2));
      const sp = new DOMPoint(p.x, p.y).matrixTransform(m);
      const sq = new DOMPoint(q.x, q.y).matrixTransform(m);
      return { sp, sq };
    };
    /* Hit test: the strip must land on bare stem. Before the strip exists, the
       topmost sprig element under its centre must be this sprig's own .stem,
       and under both ends of its long axis it must be that stem or no sprig at
       all (bare board). So no bloom, bud or other sprig sits under the strip. */
    const OFF = { off: true };
    const sprigAt = (px, py) => {
      let x = px, y = py - scrollY;
      if (y < 0 || y >= innerHeight) {
        window.scrollTo(0, Math.max(0, Math.min(document.documentElement.scrollHeight - innerHeight, py - innerHeight / 2)));
        y = py - scrollY;
      }
      /* a sample that still falls outside the viewport cannot be tested: fail it */
      if (x < 0 || x >= innerWidth || y < 0 || y >= innerHeight) return OFF;
      for (const el of document.elementsFromPoint(x, y)) {
        if (el === sheet || !sheet.contains(el)) continue;
        if (el.matches('svg')) continue; // an svg root answers for its whole box
        if (el.closest('svg.pressed')) return el;
      }
      return null;
    };
    /* what may lie under a strip: this sprig's own stem, leaf, frond, vein or
       sepal, or any sprig's stem (a strip may hold two crossing stems). Never a
       bloom, a bud, a petal, or another sprig's leaf. */
    const okUnder = (e) => {
      const own = e.closest('svg') === svg;
      const cls = (e.getAttribute('class') || '').split(/\s+/);
      if (cls.includes('stem')) return true;
      return own && ['leaf', 'frond', 'vein', 'sepal'].some((c) => cls.includes(c));
    };
    const clear = (t) => {
      const { sp, sq } = proj(t);
      const a = Math.atan2(sq.y - sp.y, sq.x - sp.x) + Math.PI / 2; // strip long axis, screen
      const W = 0.095 * w * 1.2, H = W * (12 / 34) * 1.3; // the strip's footprint on screen, with a margin so the result holds at every size
      const ux = Math.cos(a), uy = Math.sin(a), vx = -uy, vy = ux;
      const why = (e, r) => { if (e === OFF) { if (o.trace) o.trace.push([name, +t.toFixed(2), r + ':off-screen']); return false; } if (o.trace) o.trace.push([name, +t.toFixed(2), r + ':' + e.closest('svg').getAttribute('class').split(' ').pop() + '/' + e.getAttribute('class')]); return false; };
      /* a 7 x 5 grid of samples across the footprint, centre included: bare
         board or something allowed under, nothing else */
      for (let i = -3; i <= 3; i++) for (let j = -2; j <= 2; j++) {
        const x = sp.x + ux * (i / 3) * (W / 2) + vx * (j / 2) * (H / 2);
        const y = sp.y + uy * (i / 3) * (W / 2) + vy * (j / 2) * (H / 2);
        const e = sprigAt(x, y);
        if (e === OFF || (e && !okUnder(e))) return why(e, i === 0 && j === 0 ? 'centre' : 'foot');
      }
      return true;
    };
    const place = (t, ok) => {
        const { sp, sq } = proj(t);
        const [lx, ly] = toLocal(sp.x, sp.y);
        const ang = (Math.atan2(sq.y - sp.y, sq.x - sp.x) * 180) / Math.PI - theta;
        const rot = +(ang + 90 + jit[n++ % jit.length]).toFixed(1);
        const left = +((lx / w) * 100).toFixed(1), top = +((ly / h) * 100).toFixed(1);
        const g = document.createElementNS(NS, 'svg');
        g.setAttribute('class', 'pressed gum');
        g.setAttribute('viewBox', '0 0 34 12');
        g.setAttribute('aria-hidden', 'true');
        g.setAttribute('focusable', 'false');
        g.style.left = left + '%';
        g.style.top = top + '%';
        g.style.rotate = rot + 'deg';
        const path = document.createElementNS(NS, 'path');
        path.setAttribute('class', 'gum-strip');
        path.setAttribute('d', 'M1.2 .6L33 0L32.6 11.4L0 12Z');
        g.appendChild(path);
      pending.push(g);
      table.push({ sprig: name, t, left, top, rotate: rot, clear: ok });
    };
    const taken = [];
    if (o.scan) {
      /* every t (0.03 to 0.95, step 0.01) where a strip would be clear at this size */
      const ok = [];
      for (let i = 3; i <= 95; i++) if (clear(i / 100)) ok.push(i / 100);
      table.push({ sprig: name, scan: ok });
      continue;
    }
    if (o.fixed) {
      /* replay a table found at another size; report whether each still passes */
      for (const f of o.fixed.filter((x) => x.sprig === name && x.t !== null)) {
        const ok = clear(f.t);
        taken.push(f.t);
        place(f.t, ok);
      }
      continue;
    }
    for (const want of o.at) {
      /* nearest passing t to the wanted one, at least 0.2 from the other strip */
      let t = null;
      for (let d = 0; d <= 0.7 && t === null; d += 0.01) {
        for (const c of [want - d, want + d]) {
          if (c < 0.03 || c > 0.95) continue;
          if (taken.some((u) => Math.abs(u - c) < 0.2)) continue;
          if (clear(c)) { t = +c.toFixed(2); break; }
        }
      }
      if (t === null) { table.push({ sprig: name, t: null, skipped: 'no bare stem found' }); continue; }
      taken.push(t);
      place(t, true);
    }
  }
  /* strips go in after every test, so none hides another sprig from the hit test */
  pending.forEach((g) => sheet.appendChild(g));
  window.scrollTo(scroll0[0], scroll0[1]);
  return table;
};
