/**
 * The Home kiosk's elevator directory (Stage 6 wave 3, task 25, a1-critic
 * "Interactables" 3; stop 1 call 7: no sound).
 *
 * The plaque's three floors are real buttons (Home.astro), B1, 1F and 2F. A
 * press lights the floor (aria-pressed, one lit at a time), steps the LED
 * readout beside the plaque from the floor the car is at to that floor, one
 * floor at a time, and when it arrives activates the matching window on the
 * page: B1 SOFTWARE the software.exe door, 1F WEB the web_design.htm door
 * (both through mountWindowActivation's ACTIVATE_EVENT), and 2F LAB flips the
 * CRT to its Lab list (a short flip of the screen, the list already there).
 * It navigates nowhere and scrolls nothing. The car starts at 1F with no
 * button lit. Memory only; the cleanup clears the timers and the flip.
 *
 * The readout and the buttons' faces are aria-hidden and carry no new words:
 * the controls are named by their aria-labels, the lit one by aria-pressed.
 */
import { ACTIVATE_EVENT } from './windows';

const THEME = 'vaporwave';
/** One floor of travel. */
export const STEP_MS = 420;
/** The CRT's flip, matching `vw-crt-flip` in Home.astro. */
export const FLIP_MS = 560;
export const FLOORS = ['B1', '1F', '2F'] as const;
/** The floor the car is at when the page loads: the lobby, 1F. */
export const START_FLOOR = 1;

/** The floors a car passes from `from` to `to`, excluding where it is: the readout's steps. */
export function route(from: number, to: number): number[] {
  const out: number[] = [];
  const dir = Math.sign(to - from);
  for (let f = from + dir; dir !== 0 && f !== to + dir; f += dir) out.push(f);
  return out;
}

export function mountElevator(): (() => void) | void {
  if (document.documentElement.dataset.theme !== THEME) return;
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-floor]'));
  const readout = document.querySelector<HTMLElement>('[data-floor-readout]');
  const readoutBox = document.querySelector<HTMLElement>('[data-floor-box]');
  const screen = document.querySelector<HTMLElement>('.kiosk .screen');
  if (buttons.length !== FLOORS.length || !readout || !readoutBox) return;

  let at = START_FLOOR;
  let timer = 0;
  let flipTimer = 0;
  let queue: number[] = [];
  let goal = -1;

  const show = (floor: number) => {
    readout.textContent = FLOORS[floor];
  };
  show(at);

  const arrive = (floor: number) => {
    readoutBox.removeAttribute('data-dir');
    if (floor === 0) document.querySelector('.door-0')?.dispatchEvent(new CustomEvent(ACTIVATE_EVENT));
    else if (floor === 1) document.querySelector('.door-1')?.dispatchEvent(new CustomEvent(ACTIVATE_EVENT));
    else if (screen) {
      // Restart the flip when it is pressed again mid-flip.
      screen.classList.remove('flip');
      void screen.offsetWidth;
      screen.classList.add('flip');
      window.clearTimeout(flipTimer);
      flipTimer = window.setTimeout(() => screen.classList.remove('flip'), FLIP_MS + 60);
    }
  };

  const step = () => {
    timer = 0;
    const next = queue.shift();
    if (next === undefined) return;
    at = next;
    show(at);
    if (queue.length) timer = window.setTimeout(step, STEP_MS);
    else arrive(goal);
  };

  const press = (floor: number) => {
    buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(i === floor)));
    window.clearTimeout(timer);
    timer = 0;
    goal = floor;
    queue = route(at, floor);
    if (!queue.length) {
      arrive(floor);
      return;
    }
    readoutBox.setAttribute('data-dir', floor > at ? 'up' : 'down');
    timer = window.setTimeout(step, STEP_MS);
  };

  const handlers = buttons.map((button, floor) => {
    const fn = () => press(floor);
    button.addEventListener('click', fn);
    return fn;
  });

  return () => {
    window.clearTimeout(timer);
    window.clearTimeout(flipTimer);
    screen?.classList.remove('flip');
    buttons.forEach((button, i) => button.removeEventListener('click', handlers[i]));
  };
}
