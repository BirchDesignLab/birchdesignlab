/**
 * P3 re-division, a proof (Stage 6 wave 1, task 8, 11-19-26).
 *
 * A division key beside the grid key in swiss Home's header. Each press moves
 * the page's programme to the next of 2, 3, 4, 6 columns (the page as built
 * is the starting state and is not in the cycle). The re-lay is a stepped
 * paste-up in the school's own shape: the same four beats and 640ms clock as
 * the arrival (theme.css, "Arrival"), hard steps and no easing. The old
 * layout is cleared panel by panel from the left, on the old division's
 * column lines; while the sheet is bare the division changes; the new layout
 * is laid panel by panel on the new division's column lines.
 *
 * What is NOT here, and would be in a real build: the key and the status
 * line would be Astro, the division would be state the portal knows about
 * (so an arrival or a swap carries it), and the dial's re-measure would be
 * a call, not a size nudge on the hero.
 *
 * ?div=2|3|4|6 starts on a division, for filming. window.__p3 is a probe.
 */
const SEQ = [2, 3, 4, 6];
/** Panels laid after each of the first three beats, per division (the school
    lays one, two, one, two; the fourth beat lays the rest). */
const STEPS = { 2: [1, 1, 1], 3: [1, 2, 2], 4: [1, 2, 3], 6: [1, 3, 4], 12: [3, 6, 9] };
const CLOCK = 640;
/** The division is swapped while the bare sheet holds (285 to 345ms). */
const SWAP_AT = 320;

const root = document.documentElement;
const main = document.querySelector('main');
const bar = document.querySelector('.site-header .bar');
const gridKey = document.querySelector('[data-sw-grid-key]');
const guides = document.querySelector('[data-sw-guides]');

function mount() {
  if (!main || !bar || !gridKey || root.dataset.p3proof) return;
  root.dataset.p3proof = '1';

  const key = document.createElement('button');
  key.type = 'button';
  key.className = 'p3-key';
  key.dataset.n = '0';
  const status = document.createElement('p');
  status.className = 'p3-status';
  status.setAttribute('role', 'status');
  gridKey.after(key);
  bar.appendChild(status);

  let current = 0; // 0 = as built
  let anim = null;
  let timer = 0;
  let pending = null;

  const cols = () => parseFloat(getComputedStyle(root).getPropertyValue('--cols')) || 4;
  const nextOf = (n) => SEQ[(SEQ.indexOf(n) + 1) % SEQ.length];

  const label = () => {
    const next = nextOf(current);
    key.setAttribute('aria-label', current
      ? `Change the page division: ${current} columns now, ${next} next`
      : `Change the page division: the page's own grid now, ${SEQ[0]} columns next`);
    status.textContent = current ? `The page is laid on ${current} columns` : '';
  };

  /** Set the division and everything that reads it. */
  const apply = (n) => {
    current = n;
    if (n) {
      root.dataset.p3 = String(n);
      root.style.setProperty('--cols', String(n));
      root.style.setProperty('--div', String(n));
      root.style.setProperty('--p3-n', String(n));
    } else {
      delete root.dataset.p3;
      for (const p of ['--cols', '--div', '--p3-n']) root.style.removeProperty(p);
    }
    key.dataset.n = String(n);
    key.style.setProperty('--n', String(n || 1));
    if (guides) Array.from(guides.children).forEach((s, i) => { s.style.display = n ? (i < n ? 'block' : 'none') : ''; });
    label();
    // The grid key's layer and the width dial re-measure on a resize; the
    // dial watches the hero's box, so give it one (a real build calls it).
    window.dispatchEvent(new Event('resize'));
    const hero = document.querySelector('.hero');
    if (hero) {
      hero.style.paddingRight = '0.5px';
      requestAnimationFrame(() => requestAnimationFrame(() => { hero.style.paddingRight = ''; }));
    }
  };

  /** The sheet's frame, measured now (it does not depend on the division). */
  const frame = () => {
    const row = main.querySelector('.sw-row');
    const r = row.getBoundingClientRect();
    const gap = parseFloat(getComputedStyle(row).columnGap) || 24;
    return { left: r.left, width: r.width, gap, vw: root.clientWidth };
  };

  const relay = (to) => {
    // A press that lands mid re-lay finishes the one in flight first.
    if (anim) { anim.cancel(); anim = null; }
    if (timer) { clearTimeout(timer); timer = 0; if (pending !== null) apply(pending); pending = null; }
    const from = current || cols();
    const f = frame();
    const pOld = (f.width + f.gap) / from;
    const pNew = (f.width + f.gap) / to;
    const [o1, o2, o3] = STEPS[from] ?? STEPS[4];
    const [n1, n2, n3] = STEPS[to];
    const showRight = (x) => `inset(0 0 0 ${x}px)`;
    const showLeft = (x) => `inset(0 ${Math.max(0, f.vw - x)}px 0 0)`;
    const L = f.left;
    const at = [0, 0.156, 0.297, 0.445, 0.539, 0.703, 0.844, 1];
    const val = [
      showRight(L + o1 * pOld), showRight(L + o2 * pOld), showRight(L + o3 * pOld), 'inset(0 0 0 100%)',
      showLeft(L + n1 * pNew), showLeft(L + n2 * pNew), showLeft(L + n3 * pNew), 'inset(0 0 0 0)',
    ];
    const frames = at.map((offset, i) => ({ offset, clipPath: val[i], easing: 'step-end' }));
    anim = main.animate(frames, { duration: CLOCK, easing: 'linear', fill: 'none' });
    pending = to;
    timer = window.setTimeout(() => { timer = 0; apply(to); pending = null; }, SWAP_AT);
    anim.onfinish = () => { anim = null; };
    window.__p3.last = { from, to, at: Math.round(performance.now()) };
  };

  // A press during a re-lay steps on from the division that re-lay is heading to.
  key.addEventListener('click', () => relay(nextOf(pending ?? current)));
  window.__p3 = { relay, apply, get current() { return current; }, cols, key };
  label();

  const want = Number(new URLSearchParams(location.search).get('div'));
  if (SEQ.includes(want)) apply(want);
}

window.__p3 = window.__p3 ?? {};
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
else mount();
