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

   Defines window.__ccMount(opts) and returns the strip table. */
window.__ccMount = function (opts) {
  const o = Object.assign({ strips: true, at: [0.3, 0.64] }, opts || {});
  document.querySelectorAll('.hero .sheet, .herbarium .sheet').forEach((s) => s.classList.add('cc-board'));
  const sheet = document.querySelector('.hero .sheet');
  const table = [];
  if (!sheet || !o.strips) return table;
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
  for (const [sel, name] of kinds) {
    const svg = sheet.querySelector(sel);
    const stem = svg && svg.querySelector('path.stem');
    if (!stem) continue;
    const L = stem.getTotalLength();
    const m = stem.getScreenCTM();
    for (const t of o.at) {
      const p = stem.getPointAtLength(L * t);
      const q = stem.getPointAtLength(Math.min(L, L * t + 2));
      const sp = new DOMPoint(p.x, p.y).matrixTransform(m);
      const sq = new DOMPoint(q.x, q.y).matrixTransform(m);
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
      sheet.appendChild(g);
      table.push({ sprig: name, t, left, top, rotate: rot });
    }
  }
  return table;
};
