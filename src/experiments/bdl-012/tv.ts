/**
 * The game night miniature: a host phone that calls bingo cards onto a venue
 * TV, with real cards from the Plant deck. Markup and styles are in
 * TvDemo.astro. It stands on its own so two pages can carry it: the data map
 * (BDL-012) and the case study it belongs to (BDL-005).
 *
 * It calls by itself until somebody presses a button, then only moves when
 * they do. With motion off (?still, or prefers-reduced-motion) it shows one
 * card with its fact and waits.
 */
import { TV_CARDS, TV_DECK } from './data';
import { tvUrl } from './art';

export function mountTv() {
  const byId = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T | null;
  const screen = byId('dm-screen'), call = byId<HTMLButtonElement>('dm-call'), fact = byId<HTMLButtonElement>('dm-fact');
  if (!screen || !call || !fact || !TV_CARDS.length || screen.dataset.on) return;
  screen.dataset.on = '1';
  const still = new URLSearchParams(location.search).has('still');
  const MOVE = !still && !matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

  let k = 0, called = TV_DECK.called, auto = MOVE;
  const history = [...TV_DECK.history];
  let timers: ReturnType<typeof setTimeout>[] = [];
  const show = (withFact: boolean) => {
    const c = TV_CARDS[k % TV_CARDS.length];
    const prev = history.slice(-3).reverse();
    const el = document.createElement('div');
    el.className = 'card-tv' + (MOVE ? ' out' : '');
    el.innerHTML = `<img alt="" src="${tvUrl(c.file)}"><div><div class="k">${esc(TV_DECK.name)}</div><div class="nm">${esc(c.label)}</div>
      <div class="fact${withFact ? '' : ' hide'}"><b>Did you know?</b>${esc(c.fact)}</div>
      <div class="prev">Before that: ${prev.map(esc).join(' · ')}</div></div>`;
    // Every card already up goes, not just the first found: two quick calls
    // leave one still fading, and the one after it must not be left behind.
    for (const old of screen.querySelectorAll('.card-tv')) { old.classList.add('out'); setTimeout(() => old.remove(), 500); }
    screen.appendChild(el);
    if (MOVE) requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('out')));
    new Image().src = tvUrl(TV_CARDS[(k + 1) % TV_CARDS.length].file); // next card, ready before it is called
    return el;
  };
  const ripple = (b: HTMLElement) => { const r = document.createElement('span'); r.className = 'ripple'; b.appendChild(r); setTimeout(() => r.remove(), 750); };
  let current = show(!MOVE);
  const reveal = () => { ripple(fact); current.querySelector('.fact')!.classList.remove('hide'); };
  const next = () => {
    ripple(call);
    history.push(TV_CARDS[k % TV_CARDS.length].label);
    k++;
    called = called + 1 > TV_DECK.size ? 1 : called + 1;
    byId('dm-n-called')!.textContent = String(called);
    byId('dm-n-left')!.textContent = String(TV_DECK.size - called);
    current = show(false);
  };
  const cycle = () => {
    timers = [setTimeout(reveal, 2300), setTimeout(() => { next(); cycle(); }, 7600)];
  };
  const takeOver = () => {
    // The screen is announced to screen readers only once a person is driving
    // it. While it calls by itself it would interrupt them every few seconds.
    screen.setAttribute('aria-live', 'polite');
    if (!auto) return;
    auto = false;
    timers.forEach(clearTimeout);
    const note = byId('dm-demo-note');
    if (note) note.textContent = 'You have the phone now. The TV only moves when you tap.';
  };
  call.addEventListener('click', () => { takeOver(); next(); });
  fact.addEventListener('click', () => { takeOver(); reveal(); });
  if (!auto) return;
  // Only call cards while the miniature is on screen.
  if (!('IntersectionObserver' in window)) { cycle(); return; }
  new IntersectionObserver(([en]) => {
    timers.forEach(clearTimeout);
    if (auto && en.isIntersecting) cycle();
  }, { threshold: 0.2 }).observe(screen);
}
