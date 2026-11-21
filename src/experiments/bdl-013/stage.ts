/**
 * BDL-013 stage: everything on the drawing set that answers a visitor.
 * The markup is server-rendered by Experiment.astro from data.ts; this wires
 * it up.
 *
 * What a visitor can do:
 *   - Plain / Under the hood: the same sheet in everyday words or in
 *     engineering terms.
 *   - Day / Night: the stage's own face (ink on cream, or cyanotype). Lives on
 *     the stage root, never on <html>, never stored, so leaving the page
 *     leaves the site's theme exactly as it was.
 *   - Next, the strip marks and the three numbered bubbles open the detail
 *     sheets; the arrow keys and Escape do the same while the stage is on
 *     screen.
 *   - Point at a line in the file (or its leader or layer) and the three of
 *     them light together.
 *
 * URL switches (all optional, shareable):
 *   ?detail=N or #detail-N   start on detail N (1 to 3)
 *   ?hood=1                  start under the hood
 *   ?scheme=dark|light       start on that face
 *   ?og=1                    the 1200x630 share frame (title block + elevation)
 *
 * Fit: above 760px the stage is a box one viewport tall and the 1440x900
 * drawing scales to fit inside it, leaving clear of the specimen plate strip
 * and the wall label (both fixed over the page). Below 760px the sheet flows.
 */
import { SHEET_NAMES, TB, NAV_TEXT } from './data';

export function mount() {
  const found = document.getElementById('ds');
  if (!found) return;
  const root: HTMLElement = found;
  const stage = root.querySelector<HTMLElement>('#stage');
  if (!stage) return;
  const html = document.documentElement;
  const Q = new URLSearchParams(location.search);
  const OG = Q.get('og') === '1';
  if (OG) root.classList.add('og');
  const phoneMQ = matchMedia('(max-width:760px)');
  const $ = <T extends HTMLElement = HTMLElement>(id: string) => root.querySelector<T>('#' + id)!;
  const all = <T extends HTMLElement = HTMLElement>(sel: string) => Array.from(root.querySelectorAll<T>(sel));

  /* ---------------- view switches ---------------- */
  function schemeNow(): string {
    return root.getAttribute('data-scheme') || html.getAttribute('data-scheme') || 'dark';
  }
  function mark() {
    const sc = schemeNow();
    html.setAttribute('data-ds-face', sc); // the Lab chrome follows the sheet's face
    all('#scheme button').forEach((b) => b.classList.toggle('on', b.dataset.v === sc));
    const hood = root.classList.contains('hood');
    all('#mode button').forEach((b) => b.classList.toggle('on', (b.dataset.v === 'hood') === hood));
  }
  function setScheme(s: string) {
    root.setAttribute('data-scheme', s);
    mark();
  }

  /* ---------------- sheet sequence ---------------- */
  let used = false;
  let cur = 0;
  function updateNav(n: number) {
    cur = n;
    all('#nav .mk').forEach((m) => {
      if (Number(m.dataset.go) === n) m.setAttribute('aria-current', 'step');
      else m.removeAttribute('aria-current');
    });
    const nx = $('next');
    const pv = $('prev');
    if (n < 3) {
      nx.hidden = false;
      const lg = nx.querySelector('.long');
      if (lg) lg.textContent = NAV_TEXT.next + SHEET_NAMES[n + 1];
    } else nx.hidden = true;
    // After detail 3 the tour goes on to a live site built this way.
    $('onward').hidden = n !== 3;
    $('tbC').hidden = n !== 0;
    pv.hidden = n === 0;
    pv.className = 'go alt'; // the filled button is always the way forward
  }
  /** After a change of sheet, bring the stage back into view if the visitor
      had scrolled past its top (the phone sheet is long). Never on first paint. */
  function toStageTop() {
    const top = stage!.getBoundingClientRect().top;
    if (top < 0) window.scrollTo({ top: window.scrollY + top, behavior: 'instant' as ScrollBehavior });
  }
  /* The hash carries the sheet once the visitor navigates. A ?detail= deep
     link is dropped on the first push, or it would outrank the hash on Back
     and on reload (?detail=2, Next, Back used to land on sheet 0). */
  function urlFor(n: number): string {
    const u = new URL(location.href);
    u.searchParams.delete('detail');
    u.hash = n ? 'detail-' + n : '';
    return u.pathname + u.search + u.hash;
  }
  function detailFromUrl(): number {
    const fromHash = (location.hash.match(/detail-(\d)/) || [])[1];
    const d = parseInt(fromHash || Q.get('detail') || '0', 10) || 0;
    return d >= 1 && d <= 3 ? d : 0;
  }
  function setDetail(n: number, push: boolean, scroll: boolean) {
    root.setAttribute('data-detail', String(n));
    updateNav(n);
    const t = TB[n];
    const title = $('tbTitle');
    title.textContent = '';
    t.t.forEach((line, i) => {
      if (i) title.appendChild(document.createElement('br'));
      title.appendChild(document.createTextNode(line));
    });
    $('tbSheet').textContent = t.s;
    $('tbP').textContent = t.p;
    $('tbH').textContent = t.h;
    if (scroll) toStageTop();
    if (push) {
      try {
        history.pushState({ d: n }, '', urlFor(n));
      } catch {
        /* history blocked: the sheet still changes */
      }
    }
  }
  function go(n: number, push: boolean) {
    if (n < 0 || n > 3) return;
    if (n > 0) used = true;
    root.classList.toggle('used', used);
    setDetail(n, push, true);
  }

  $('mode').addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest('button');
    if (!b) return;
    root.classList.toggle('hood', b.dataset.v === 'hood');
    mark();
  });
  $('scheme').addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest('button');
    if (!b) return;
    setScheme(b.dataset.v || 'dark');
  });
  $('next').addEventListener('click', () => go(cur + 1, true));
  $('prev').addEventListener('click', () => go(0, true));
  all('#nav .mk').forEach((m) => m.addEventListener('click', () => go(Number(m.dataset.go), true)));
  all('button[data-detail]').forEach((b) => b.addEventListener('click', () => go(Number(b.dataset.detail), true)));
  window.addEventListener('popstate', (e) => {
    const d = e.state && typeof e.state.d === 'number' ? e.state.d : detailFromUrl();
    setDetail(d, false, false);
  });

  /* Keys act only while the stage is what the visitor is looking at, and
     never from a form field or the summary strips (wall label, specimen plate),
     so they cannot fight page scroll or a disclosure's own keys. */
  function stageOnScreen(): boolean {
    const r = stage!.getBoundingClientRect();
    const vis = Math.min(r.bottom, innerHeight) - Math.max(r.top, 0);
    return vis > 0 && vis >= 0.4 * Math.min(r.height, innerHeight);
  }
  document.addEventListener('keydown', (e) => {
    if (e.altKey || e.metaKey || e.ctrlKey || e.defaultPrevented) return;
    const t = e.target as HTMLElement | null;
    if (t && t.closest && t.closest('input, textarea, select, summary, [contenteditable="true"]')) return;
    if (!stageOnScreen()) return;
    if (e.key === 'Escape' && cur !== 0) go(0, true);
    else if (e.key === 'ArrowRight' && cur < 3) go(cur + 1, true);
    else if (e.key === 'ArrowLeft' && cur > 0) go(cur - 1, true);
  });

  /* ---------------- leader hover ---------------- */
  let hov: string | null = null;
  const elev = $('elev');
  function clear() {
    hov = null;
    root.classList.remove('hovering');
    all('.row.hl').forEach((x) => x.classList.remove('hl'));
  }
  elev.addEventListener('mouseover', (e) => {
    const r = (e.target as HTMLElement).closest<HTMLElement>('.row');
    if (!r) {
      clear();
      return;
    }
    const id = r.dataset.r;
    if (!id || hov === id) return;
    clear();
    hov = id;
    root.classList.add('hovering');
    all('.row[data-r="' + id + '"]').forEach((x) => x.classList.add('hl'));
  });
  elev.addEventListener('mouseleave', clear);

  /* ---------------- zone grid (drawing-sheet margin marks) ---------------- */
  function zones() {
    stage!.querySelectorAll('.zone,.tick').forEach((n) => n.remove());
    const W = stage!.offsetWidth;
    const H = stage!.offsetHeight;
    const o = OG ? 12 : 14; // outer inset
    const i = OG ? 32 : 38; // inner border offset
    const nx = 8;
    const ny = OG ? 4 : 6;
    const x0 = i, x1 = W - i, y0 = i, y1 = H - i;
    function add(c: string, s: Record<string, string>) {
      const d = document.createElement('div');
      d.className = c;
      d.setAttribute('aria-hidden', 'true');
      Object.keys(s).forEach((k) => d.style.setProperty(k, s[k]));
      stage!.appendChild(d);
      return d;
    }
    for (let a = 0; a < nx; a++) {
      const cx = x0 + ((x1 - x0) * (a + 0.5)) / nx;
      [o + (i - o) / 2 - 8, H - o - (i - o) / 2 - 8].forEach((ty) => {
        add('zone', { left: cx - 10 + 'px', top: ty + 'px' }).textContent = String(a + 1);
      });
      if (a > 0) {
        const bx = x0 + ((x1 - x0) * a) / nx;
        [o, H - i].forEach((ty) => add('tick', { left: bx + 'px', top: ty + 'px', width: '1px', height: i - o + 'px' }));
      }
    }
    for (let b = 0; b < ny; b++) {
      const cy = y0 + ((y1 - y0) * (b + 0.5)) / ny;
      [o + (i - o) / 2 - 10, W - o - (i - o) / 2 - 10].forEach((tx) => {
        add('zone', { left: tx + 'px', top: cy - 8 + 'px' }).textContent = String.fromCharCode(65 + b);
      });
      if (b > 0) {
        const by = y0 + ((y1 - y0) * b) / ny;
        [o, W - i].forEach((tx) => add('tick', { top: by + 'px', left: tx + 'px', height: '1px', width: i - o + 'px' }));
      }
    }
  }

  /* ---------------- fit ----------------
     The root is a box one viewport tall. The 1440x900 drawing scales to fit
     inside it, measured from the box (never the window), and stays clear of
     the two fixed things the Lab puts over the page: the specimen plate strip
     along the bottom and the wall label at the bottom left. A folded label is
     a small tab above the plate, so the drawing stops above it; an open one
     (wide screens only, see the inline fold script) is a column, so the
     drawing starts to its right. The "back to Lab" pill floats over the top
     left corner; the drawing leaves that corner empty by design. */
  function fit() {
    // The phone's sticky sequence bar rests just above the plate strip.
    const plate = document.querySelector<HTMLElement>('details.plate > summary');
    if (plate) root.style.setProperty('--ds-plate', plate.getBoundingClientRect().height + 'px');
    // Where the phone's sticky bar rests: just above the plate strip, or, from
    // 721 to 760px where the site still fixes the wall label over the bottom
    // left, just above that label too. At 720px and below the label is in flow.
    // Only a folded label lifts the bar: an open one is tall, and lifting
    // over it would bury short screens. The visitor opened it; it sits over
    // the stage until folded again.
    const lbl = document.querySelector<HTMLDetailsElement>('details.label');
    if (phoneMQ.matches && lbl && !lbl.open && getComputedStyle(lbl).position === 'fixed') {
      root.style.setProperty('--ds-nav-bottom', Math.ceil(document.documentElement.clientHeight - lbl.getBoundingClientRect().top + 8) + 'px');
    } else root.style.removeProperty('--ds-nav-bottom');
    if (phoneMQ.matches) {
      stage!.style.transform = '';
      stage!.style.left = '';
      stage!.style.top = '';
      return;
    }
    const W = OG ? 1200 : 1440;
    const H = OG ? 630 : 900;
    const boxW = root.clientWidth;
    const boxH = root.clientHeight;
    let left = 0, bottom = 0;
    if (!OG) {
      const strip = document.querySelector<HTMLElement>('details.plate > summary');
      if (strip) bottom = Math.max(bottom, boxH - (innerHeight - strip.getBoundingClientRect().height));
      const label = document.querySelector<HTMLDetailsElement>('details.label');
      if (label && label.getClientRects().length) {
        const r = label.getBoundingClientRect();
        if (label.open) {
          if (r.right + 16 + 1100 <= boxW) left = r.right + 16;
        } else bottom = Math.max(bottom, boxH - r.top);
      }
    }
    const aw = boxW - left;
    const ah = boxH - Math.max(0, bottom);
    const s = Math.max(0.1, Math.min(aw / W, ah / H));
    stage!.style.transformOrigin = '0 0';
    stage!.style.transform = 'scale(' + s + ')';
    stage!.style.left = left + (aw - W * s) / 2 + 'px';
    stage!.style.top = (ah - H * s) / 2 + 'px';
  }
  window.addEventListener('resize', fit);
  if (phoneMQ.addEventListener) phoneMQ.addEventListener('change', fit);
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(fit).observe(root);
  // The wall label folds and unfolds; the phone bar's lift follows it.
  document.querySelector('details.label')?.addEventListener('toggle', fit);

  /* ---------------- start ---------------- */
  if (Q.get('hood') === '1') root.classList.add('hood');
  const qs = Q.get('scheme');
  if (qs === 'dark' || qs === 'light') root.setAttribute('data-scheme', qs);
  const d0 = detailFromUrl();
  setDetail(d0, false, false);
  // Stamp the landing entry so Back to it restores this sheet exactly.
  try {
    history.replaceState({ d: d0 }, '');
  } catch {
    /* history blocked */
  }
  mark();
  zones();
  fit();
}
