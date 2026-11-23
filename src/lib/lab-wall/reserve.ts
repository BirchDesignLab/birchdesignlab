/**
 * The wall's box, measured and written in one place. The engine (wall.ts) does
 * this on every layout; the first script (boot.ts) does it once before the
 * engine has arrived, so the box the engine takes over is already the size and
 * place it will have: nothing below it moves when the engine mounts.
 *
 * Browser only: it reads the page.
 */
import { DESK_MIN_HEIGHT, PHONE_BELOW, PHONE_COLS, PHONE_GAP, PHONE_ROWS, PHONE_ROW_RATIO, layoutWall } from './layout';
import type { WallLayout } from './layout';

/**
 * A script for LabWall.astro to run inline, right after the wall's element: it holds the box at the size and place the
 * layout will give it, from the very first paint, before any module has arrived. It repeats what layoutWall computes
 * for a wall with no spill row (the spill of a piece added later is the engine's to add), from the same constants;
 * tests/lab-wall-layout.test.ts runs this text against layoutWall so the two cannot drift apart.
 * It does nothing in the list view or with no wall to measure.
 */
export const RESERVE_INLINE = `(function () {
  var w = document.querySelector('[data-lw="wall"]');
  if (!w || document.documentElement.getAttribute('data-lab-view') !== 'wall') return;
  var p = w.parentElement;
  if (p) w.style.setProperty('--lw-bleed', Math.max(0, p.getBoundingClientRect().left + (parseFloat(getComputedStyle(p).paddingLeft) || 0)).toFixed(2) + 'px');
  var h;
  if (window.innerWidth < ${PHONE_BELOW}) {
    var cell = (w.clientWidth - 2 * ${PHONE_GAP} - (${PHONE_COLS} - 1) * ${PHONE_GAP}) / ${PHONE_COLS};
    h = 2 * ${PHONE_GAP} + ${PHONE_ROWS} * Math.round(cell * ${PHONE_ROW_RATIO}) + (${PHONE_ROWS} - 1) * ${PHONE_GAP};
  } else {
    h = Math.max(window.innerHeight - (w.getBoundingClientRect().top + window.scrollY), ${DESK_MIN_HEIGHT});
  }
  w.style.height = h + 'px';
  w.style.minHeight = '0';
})();`;

/**
 * Measure the wall for `ids` (in catalog order) and write the two things the page needs of it: the
 * full-bleed margin (the wall reaches past the page's column to both window edges) and the height.
 * Returns the layout, for a caller that places tiles from it.
 */
export function measureWall(wallEl: HTMLElement, ids: string[]): WallLayout {
  const root = document.documentElement;
  const page = wallEl.parentElement;
  if (page) {
    const pr = page.getBoundingClientRect();
    const pad = parseFloat(getComputedStyle(page).paddingLeft) || 0;
    wallEl.style.setProperty('--lw-bleed', Math.max(0, pr.left + pad).toFixed(2) + 'px');
  }
  const top = wallEl.getBoundingClientRect().top + window.scrollY;
  const L = layoutWall(ids, {
    width: wallEl.clientWidth || root.clientWidth,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    topHeight: top,
  });
  wallEl.style.height = L.height + 'px';
  // The exact height is set, so the stylesheet's approximation (its min-height) is done with.
  wallEl.style.minHeight = '0';
  return L;
}
