/**
 * The Home kiosk's attract loop (Tier 3 Stage 3 wave B2, vw-3 item 4).
 *
 * TOUCH SCREEN TO BEGIN is a real button (Home.astro). Pressing it plays a
 * few seconds of mall-kiosk attract mode over the CRT's screen (a scrolling
 * marquee, a big kana, extra scanlines; all DOM/CSS, no canvas: the hero
 * horizon is this page's one WebGL canvas already, and this never adds a
 * second one), then returns the screen to its normal content. The overlay
 * sits on top with `pointer-events: none`, so the CRT's real links (the
 * specimens, "visit the lab") are reachable by keyboard and screen reader
 * throughout, never covered in the accessibility tree, only visually
 * obscured while the loop plays.
 */
const THEME = 'vaporwave';
const ATTRACT_MS = 5200;

export function mountKioskAttract(): (() => void) | void {
  if (document.documentElement.dataset.theme !== THEME) return;
  const button = document.querySelector<HTMLButtonElement>('[data-kiosk-attract-btn]');
  const screen = document.querySelector<HTMLElement>('[data-kiosk-attract-screen]');
  if (!button || !screen) return;

  let timer = 0;
  let playing = false;

  // Fix round 4 (founder: no scroll): round 3 brought the screen toward the
  // viewport's middle with `scrollIntoView`, which the founder rejected --
  // `window.scrollY` must be exactly what it was before the tap. Instead,
  // this positions the attract CONTENT (the marquee and the kana; not the
  // scanline overlay, which still covers the whole screen box) within
  // whichever part of the screen box is actually on screen, by setting
  // `--attract-top`, a local (screen-relative) offset theme.css's
  // `.attract-content` reads for its own vertical centring. On a phone,
  // where the screen box is taller than the viewport and the visitor
  // scrolled down to reach the button below it, that on-screen part is the
  // screen's own bottom band -- right where the button (and the visitor's
  // attention) already is. Falls back to 50% (theme.css's own default, the
  // screen's true centre) whenever the whole box already fits the viewport
  // (desktop, most tablets), so "the desktop loop as it is" is untouched.
  const positionContent = () => {
    const rect = screen.getBoundingClientRect();
    if (rect.height <= 0) return;
    const visibleTop = Math.max(rect.top, 0);
    const visibleBottom = Math.min(rect.bottom, innerHeight);
    if (visibleBottom <= visibleTop) return; // Not on screen at all; leave the CSS default.
    const localMid = (visibleTop + visibleBottom) / 2 - rect.top;
    const clamped = Math.min(Math.max(localMid, 0), rect.height);
    screen.style.setProperty('--attract-top', `${clamped}px`);
  };

  const stop = () => {
    if (timer) window.clearTimeout(timer);
    timer = 0;
    playing = false;
    screen.classList.remove('on');
    removeEventListener('scroll', positionContent);
    removeEventListener('resize', positionContent);
  };

  const play = () => {
    if (playing) return;
    playing = true;
    positionContent();
    screen.classList.add('on');
    // A manual scroll or rotation during the ~5s loop (not the tap itself,
    // which never scrolls) keeps the content following the visible band
    // rather than freezing at a position that may have scrolled away.
    addEventListener('scroll', positionContent, { passive: true });
    addEventListener('resize', positionContent);
    timer = window.setTimeout(stop, ATTRACT_MS);
  };

  const onClick = () => play();
  button.addEventListener('click', onClick);

  // A page hidden mid-loop (a tab switch, a swap to another school) finishes
  // the loop at once rather than leaving a stale timer racing the teardown.
  const onVisibility = () => {
    if (document.hidden && playing) stop();
  };
  document.addEventListener('visibilitychange', onVisibility);

  return () => {
    stop();
    button.removeEventListener('click', onClick);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}
