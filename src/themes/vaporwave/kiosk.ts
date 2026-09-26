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

  const stop = () => {
    if (timer) window.clearTimeout(timer);
    timer = 0;
    playing = false;
    screen.classList.remove('on');
  };

  const play = () => {
    if (playing) return;
    playing = true;
    screen.classList.add('on');
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
