/**
 * The Control Centre's Clear/Tinted tile (B2 fix round, item 4): a second,
 * repeated control for the same setting the hero window-bar switch already
 * owns, the way a real macOS/iOS Control Centre repeats a toggle that also
 * lives elsewhere (a menu-bar icon, say) rather than defining a second,
 * independent source of truth for it.
 *
 * This module owns none of that state. It is a pure forwarding control: a
 * click on the tile's own switch dispatches a click on the REAL switch
 * (`.hero .window-bar .switch`), whose own handler (`lens/home-boot.ts`,
 * off limits to this seat) is the only code that ever calls
 * `updateSettings({ tint })`, writes sessionStorage, or calls
 * `lens.setTint()`. A MutationObserver mirrors the real switch's
 * `aria-checked` back onto this tile whenever it changes, from either
 * control, so the two stay in lockstep without a second settings path to
 * keep in sync by hand.
 *
 * Mounted from Home.astro's own `<script>` (onMount), alongside
 * `mountHomeGlass`; independent of it, so a missing tile (an older cached
 * page, a future layout without one) just no-ops rather than breaking the
 * real switch.
 */
export function mountCcTintTile(): (() => void) | void {
  if (document.documentElement.dataset.theme !== 'glassmorphism') return;
  const real = document.querySelector<HTMLButtonElement>('.hero .window-bar .switch');
  const tile = document.querySelector<HTMLButtonElement>('.control-centre .cc-tint-switch');
  if (!real || !tile) return;

  const reflect = () => {
    tile.setAttribute('aria-checked', real.getAttribute('aria-checked') ?? 'false');
  };
  reflect();

  const onTileClick = () => real.click();
  tile.addEventListener('click', onTileClick);

  const mo = new MutationObserver(reflect);
  mo.observe(real, { attributeFilter: ['aria-checked'] });

  return () => {
    tile.removeEventListener('click', onTileClick);
    mo.disconnect();
  };
}
