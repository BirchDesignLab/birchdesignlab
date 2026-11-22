/**
 * Stage 6 wave 4, task 30: one-off edit of cottagecore/toys.ts. The clock's and the stamp's one-shot nudge moves
 * from a bare IntersectionObserver onto the touch beat's common conditions (bauhaus/parts/beat.ts: 60% visible,
 * 400 ms still, no form focus, once per visit, touch only), and a stamp press tells fx.ts (cc:stamp) to measure the
 * text again. Kept for the record. Run from the repo root; each hunk checks its anchor, so it refuses to run twice.
 *
 *   node scripts/themes/stage6/w4-t30-edit-toys.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = 'src/themes/cottagecore/toys.ts';
let src = readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n');
function swap(name, from, to) {
  if (src.split(from).length !== 2) throw new Error(`hunk "${name}": anchor missing or not unique (already applied?)`);
  src = src.replace(from, () => to);
  console.log('ok', name);
}

swap('import',
`import { initNeedle } from './needle';
`,
`import { scheduleBeat } from '../bauhaus/parts/beat';
import { initNeedle } from './needle';
`);

swap('nudge',
`/** Once, when the toy first scrolls into view: set \`data-nudge\` for its one-shot sway or lift. */
function nudgeOnce(el: HTMLElement): () => void {
  const off = () => el.removeAttribute('data-nudge');
  el.addEventListener('animationend', off);
  let io: IntersectionObserver | null = null;
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      el.setAttribute('data-nudge', '');
      io?.disconnect();
      io = null;
    }, { threshold: 0.6 });
    io.observe(el);
  }
  return () => {
    io?.disconnect();
    el.removeEventListener('animationend', off);
    off();
  };
}`,
`/** A finger (no hover, no fine pointer): the toy gives its one-shot beat. A mouse has the cursor and the hover. */
const mouseHere = (): boolean => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

/**
 * The touch beat (Stage 6 w4 task 30, critique A1): once per page visit, when the toy is at least 60% visible, the page
 * has been still 400 ms and no form field has focus (bauhaus/parts/beat.ts holds the conditions and the memory), set
 * \`data-nudge\` for the toy's own one-shot sway or lift (the CSS beside the toy). It replaces the old scroll-in nudge,
 * which fired mid-scroll with no dwell. \`key\` names the toy and the page, so an in-school swap does not repeat it.
 */
function nudgeBeat(key: string, el: HTMLElement, signal: AbortSignal, ready: () => boolean): () => void {
  if (mouseHere()) return () => {};
  const off = () => el.removeAttribute('data-nudge');
  el.addEventListener('animationend', off);
  const stop = scheduleBeat(key, [el], () => el.setAttribute('data-nudge', ''), signal, ready);
  return () => {
    stop();
    el.removeEventListener('animationend', off);
    off();
  };
}`);

swap('dandelion-abort',
`  const anims = new Map<SVGPathElement, Animation>();
  let litTimer = 0;
  let alive = true;`,
`  const anims = new Map<SVGPathElement, Animation>();
  const abort = new AbortController();
  let litTimer = 0;
  let alive = true;`);

swap('dandelion-beat',
`  const offPress = bindPress(el, fire);
  const offNudge = nudgeOnce(el);
  return () => {
    alive = false;`,
`  const offPress = bindPress(el, fire);
  const offNudge = nudgeBeat(\`cottagecore:clock:\${location.pathname}\`, el, abort.signal, () => !anims.size && !el.hasAttribute('data-lit'));
  return () => {
    alive = false;
    abort.abort();`);

swap('stamp-abort',
`  const anims = new Set<Animation>();

  const track =`,
`  const anims = new Set<Animation>();
  const abort = new AbortController();

  const track =`);

swap('stamp-press-event',
`    ], { duration: 150, delay: Math.round(PRESS_MS * CONTACT), easing: 'ease-out', fill: 'backwards' }));
  };`,
`    ], { duration: 150, delay: Math.round(PRESS_MS * CONTACT), easing: 'ease-out', fill: 'backwards' }));
    // fx.ts counts a mark that shows as text and one at opacity 0 as nothing: tell it a mark was laid.
    window.dispatchEvent(new Event(STAMP_EVENT));
  };`);

swap('stamp-event-const',
`export const BLOW_EVENT = 'cc:blow';`,
`export const BLOW_EVENT = 'cc:blow';
/** A date stamp was pressed: fx.ts measures the text again (a cancel mark that shows is text, one at opacity 0 is not). */
export const STAMP_EVENT = 'cc:stamp';`);

swap('stamp-beat',
`  const offPress = bindPress(el, press);
  const offNudge = nudgeOnce(el);
  return () => {
    offPress();`,
`  const offPress = bindPress(el, press);
  const offNudge = nudgeBeat(\`cottagecore:stamp:\${location.pathname}\`, el, abort.signal, () => !anims.size);
  return () => {
    abort.abort();
    offPress();`);

writeFileSync(FILE, src);
