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
 * It navigates nowhere. Task 29 (critique C5), widened at stop 5: at every
 * width B1 and 1F bring their window into view when it is off screen (a
 * smooth scroll to its middle, after the activate event); a window already in
 * view is left where it is, nothing scrolls back, and 2F stays as built. The car starts at 1F with no button lit. Memory only; the
 * cleanup clears the timers and the flip.
 *
 * Touch (task 29, the signifier rule): a finger that has not touched it gets
 * one small beat, once a visit, on the common conditions (bauhaus's beat.ts):
 * the readout steps up to 2F and back to 1F, its arrow lit while it travels.
 * It lights no key, opens no window and scrolls nothing. A mouse has the
 * pointer and the keys' hover instead (Home.astro).
 *
 * The readout and the buttons' faces are aria-hidden and carry no new words:
 * the controls are named by their aria-labels, the lit one by aria-pressed.
 */
import { ACTIVATE_EVENT } from './windows';
import { scheduleBeat } from '../bauhaus/parts/beat';

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

/** True when a rect has nothing in the viewport's height (the page never scrolls sideways here). */
export function offScreen(rect: { top: number; bottom: number }, viewportHeight: number): boolean {
  return rect.bottom <= 0 || rect.top >= viewportHeight;
}

/** The beat's two steps: up to 2F, then home to 1F. */
const BEAT_FLOOR = 2;

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

  /** The window the car brought forward, if it is off the screen (an overlap with the viewport at all counts as in view) at any width: scroll it to the middle. */
  const bring = (door: Element | null) => {
    if (!door) return;
    door.dispatchEvent(new CustomEvent(ACTIVATE_EVENT));
    if (offScreen(door.getBoundingClientRect(), window.innerHeight)) door.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const arrive = (floor: number) => {
    readoutBox.removeAttribute('data-dir');
    if (floor === 0) bring(document.querySelector('.door-0'));
    else if (floor === 1) bring(document.querySelector('.door-1'));
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

  let beatTimer = 0;
  const press = (floor: number) => {
    buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(i === floor)));
    window.clearTimeout(timer);
    timer = 0;
    // A press during the touch beat takes the car over: the readout goes back to the floor the car is at first.
    window.clearTimeout(beatTimer);
    beatTimer = 0;
    show(at);
    readoutBox.removeAttribute('data-dir');
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

  // The touch beat: the readout makes one small round trip, 1F to 2F and back, arrow lit; nothing is lit, opened or scrolled.
  const abort = new AbortController();
  const elevator = document.querySelector<HTMLElement>('.elevator');
  const beat = () => {
    readoutBox.setAttribute('data-dir', 'up');
    beatTimer = window.setTimeout(() => {
      show(BEAT_FLOOR);
      readoutBox.setAttribute('data-dir', 'down');
      beatTimer = window.setTimeout(() => {
        show(START_FLOOR);
        beatTimer = window.setTimeout(() => {
          beatTimer = 0;
          readoutBox.removeAttribute('data-dir');
        }, STEP_MS);
      }, STEP_MS);
    }, STEP_MS);
  };
  if (elevator && !window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    scheduleBeat('vaporwave:elevator', [elevator], beat, abort.signal, () => !timer && !beatTimer && at === START_FLOOR && goal === -1);
  }

  return () => {
    abort.abort();
    window.clearTimeout(timer);
    window.clearTimeout(beatTimer);
    window.clearTimeout(flipTimer);
    screen?.classList.remove('flip');
    buttons.forEach((button, i) => button.removeEventListener('click', handlers[i]));
  };
}
