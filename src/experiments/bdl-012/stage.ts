/**
 * BDL-012 stage: everything on the data map that moves or answers a tap.
 * The markup and the static tables are server-rendered by Experiment.astro;
 * this mounts the node maps, the hero, the phone timelines, the box drawer
 * and the ticket desk on top of them. (The TV miniature mounts itself: tv.ts.)
 *
 * How the pieces answer a visitor:
 *   - A journey button plays that journey across the main map. On a wide
 *     screen the page scrolls to keep each step in view; on a phone the map's
 *     camera flies to it instead (engine.ts).
 *   - A box opens its drawer: both voices, what travels on each of its lines,
 *     and for five boxes the reasoning and the failure modes (DEEP in data.ts).
 *   - A line, hovered or tapped, says what travels on it.
 *   - The ticket desk sends each sale along its own small copy of the map and
 *     leaves a flag on the big one.
 *
 * URL switches (all optional):
 *   ?play=publish|ticket|game|form   start on that journey (a shareable link)
 *   ?view=tech                       start with Under the hood on
 *   ?still                           no motion at all, for stills and OG shots
 */
import { DEEP, DESK, DESK_M, FORMS, JOURNEYS, LANES, LIVE, MAIN, NIGHT, SIM, type Journey, type MapNode, type MapSpec } from './data';
import { STRIP, WALL } from './art';
import {
  buildMap, clearHighlight, cssv, edgeOf, enableCamera, fit, focusEdge, focusNode, frame, frameAll, isZoomed, maps,
  pingNode, playStory, setEnv, startTick, stopStory, travel, zoomAt, type LiveEdge, type LiveMap,
} from './engine';

export function mount() {
  const found = document.getElementById('dm');
  if (!found) return;
  const root: HTMLElement = found;

  const params = new URLSearchParams(location.search);
  const STILL = params.has('still');
  const CALM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MOVE = !STILL && !CALM;
  const PHONE = () => innerWidth < 760;
  let tech = params.get('view') === 'tech';
  const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
  const wait = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const laneVar = (l: keyof typeof LANES) => `var(${LANES[l].v})`;
  const titleOf = (id: string) => MAIN.nodes.find((n) => n.id === id)!.title;

  setEnv({ root, move: MOVE, dwell: !STILL, thumbs: { wall: WALL, strip: STRIP } });
  root.classList.toggle('is-still', !MOVE);

  /* ======================= caption ======================= */
  const tourBar = $('dm-tour-bar');
  const caption = $('dm-caption');
  type Cap = [n: string, text: string, sub: string, color?: string];
  const IDLE: Cap = ['✦', 'Pick a moment above to watch it travel across the map, step by step.', 'Or open any box, or point at any line.'];
  /** The caption a line's hover gives back when the pointer leaves. */
  let resting: Cap = IDLE;
  function setCaption(n: string, text: string, sub: string, color?: string, passing = false) {
    if (!passing) resting = [n, text, sub, color];
    caption.style.setProperty('--c', color || 'var(--line)');
    caption.innerHTML = `<div class="c-step">${n}</div><div class="c-text">${text}${sub ? `<small>${sub}</small>` : ''}</div>`;
  }
  const buttons = new Map<string, HTMLButtonElement>();
  const unpress = () => buttons.forEach((b) => b.setAttribute('aria-pressed', 'false'));
  const press = (j: Journey) => { unpress(); buttons.get(j.key)?.setAttribute('aria-pressed', 'true'); };

  /* ======================= maps ======================= */
  let mainMap: LiveMap;
  let deskMap: LiveMap | undefined;
  /** Which layout deskMap was built in (DESK_M below 760px, DESK above). */
  let deskPhone = false;
  /** The box whose drawer is open. Its highlight outlives hover and blur. */
  let picked: string | null = null;
  /** True once a visitor has moved the camera themselves; a journey then stops steering it. */
  let userCam = false;
  /** The map is small enough on screen that the camera, not the page, does the following. */
  const camMode = () => mainMap.fitS < 0.75;
  const restHighlight = () => { if (picked) focusNode(mainMap, picked); else clearHighlight(mainMap); };

  let tip: HTMLElement | null = null;
  const dropTip = () => { tip?.remove(); tip = null; };
  function showLine(i: number) {
    if (mainMap.story) return;
    const r: LiveEdge = mainMap.edges[i];
    focusEdge(mainMap, i);
    dropTip();
    const says = (tech ? r.e.wire : r.e.carries) ?? '';
    tip = document.createElement('div');
    tip.className = 'edge-tip';
    tip.style.setProperty('--c', r.color);
    Object.assign(tip.style, { left: r.mid.x + 'px', top: r.mid.y + 'px' });
    tip.textContent = cap(says);
    mainMap.el.appendChild(tip);
    const between = r.e.both ? `Between ${titleOf(r.e.from)} and ${titleOf(r.e.to)}` : `From ${titleOf(r.e.from)} to ${titleOf(r.e.to)}`;
    setCaption('→', cap(says), `${between} · ${LANES[r.e.lane].name.split(':')[0]}`, r.color, true);
  }
  function hideLine() {
    if (!tip) return;
    dropTip();
    if (mainMap.story) return;
    restHighlight();
    setCaption(...resting);
  }

  function mountMaps() {
    const phone = PHONE();
    dropTip();
    mainMap = buildMap($('dm-map-main'), MAIN, {
      tech, cam: true,
      onView: (m) => {
        $('dm-zoom').textContent = isZoomed(m) ? 'Whole map' : 'Zoom in';
        // The zoom button and the pinch hint belong to any width where the
        // camera does the following, tablets included, not just to phones.
        root.classList.toggle('is-cam', m.fitS < 0.75);
      },
    });
    // The visitor has moved the map themselves: a journey stops steering it,
    // and one that was only playing by itself stops altogether.
    enableCamera($('dm-view'), () => mainMap, () => {
      userCam = true;
      if (attractOff) return;
      endAttract();
      if (mainMap.story) { stopStory(mainMap); unpress(); setCaption(...IDLE); }
    });
    for (const n of Object.values(mainMap.nodes)) {
      if (n.cls === 'quiet') continue;
      const on = () => { if (!mainMap.story) focusNode(mainMap, n.id); };
      const off = () => { if (!mainMap.story) restHighlight(); };
      if (!phone) { n.el.addEventListener('mouseenter', on); n.el.addEventListener('mouseleave', off); }
      n.el.addEventListener('focus', on);
      n.el.addEventListener('blur', off);
      // Focus always follows the drawer in, however the box was pressed: a
      // screen reader's tap is a click like any other, and it has to land there.
      const pick = () => { endAttract(); if (mainMap.story) { stopStory(mainMap); unpress(); setCaption(...IDLE); } openDrawer(n.id, true); };
      n.el.addEventListener('click', pick);
      n.el.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); pick(); }
        // Escape puts the whole map back, the way moving the pointer off a box does.
        else if (ev.key === 'Escape' && !mainMap.story && !picked) clearHighlight(mainMap);
      });
    }
    mainMap.edges.forEach((r, i) => {
      if (!r.hit) return;
      r.hit.addEventListener('mouseenter', () => showLine(i));
      r.hit.addEventListener('mouseleave', hideLine);
      // A tap has no hover: the line stays read until the next tap lands elsewhere.
      r.hit.addEventListener('click', (ev) => {
        ev.stopPropagation();
        endAttract();
        if (mainMap.story) { stopStory(mainMap); unpress(); setCaption(...IDLE); }
        showLine(i);
      });
    });
    if (picked) focusNode(mainMap, picked);

    if (!phone) {
      buildMap($('dm-map-night'), NIGHT, { tech });
      buildMap($('dm-map-live'), LIVE, { tech });
      buildMap($('dm-map-forms'), FORMS, { tech });
    }
    // The desk map is titles and chips only, the same in both voices, so the
    // label switch leaves it alone and a sale in flight keeps its light. Only
    // the phone breakpoint swaps its layout (send() re-sends a light caught
    // in that rebuild).
    if (!deskMap || deskPhone !== phone) {
      deskMap = buildMap($('dm-map-desk'), phone ? DESK_M : DESK, { compact: true, ambient: false });
      deskPhone = phone;
    }
    paintDesk();
  }

  /* ======================= journeys ======================= */
  /** Bring a step's two boxes into view: with the camera on a small map, by scrolling the page on a wide one. */
  function follow(a: HTMLElement, b: HTMLElement, from: string, to: string) {
    if (camMode()) { if (!userCam) frame(mainMap, [from, to]); return; }
    const bar = tourBar.getBoundingClientRect().bottom;
    const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
    const top = Math.min(ra.top, rb.top), bottom = Math.max(ra.bottom, rb.bottom);
    const floor = innerHeight - 64; // clear of the specimen plate strip
    if (top >= bar + 8 && bottom <= floor - 8) return;
    scrollBy({ top: (top + bottom) / 2 - (bar + (floor - bar) / 2), behavior: MOVE ? 'smooth' : 'auto' });
  }
  let playRun = 0;
  function play(j: Journey) {
    endAttract();
    closeDrawer();
    dropTip();
    userCam = false;
    press(j);
    if (camMode()) {
      // Caption and map have to be on screen together for the camera to mean anything.
      const top = tourBar.getBoundingClientRect().top;
      if (top < 60 || top > innerHeight * 0.3) scrollBy({ top: top - 70, behavior: MOVE ? 'smooth' : 'auto' });
    }
    const mine = ++playRun;
    void playStory(mainMap, j, { caption: setCaption, follow }).then((done) => {
      // Back out to the whole map after a beat, unless another journey has
      // started or the visitor has taken the camera in the meantime.
      if (done && camMode()) setTimeout(() => { if (mine === playRun && !userCam && mainMap.story) { frameAll(mainMap); } }, 1500);
    });
  }

  /* Attract mode: until somebody touches the map, it plays the four journeys
     by itself whenever it is on screen. It never scrolls the page; on a phone
     it moves the map's own camera. Screen readers are not told about it. */
  let attractOff = !MOVE;
  let attractRun = 0;
  let attractAt = 0;
  let mapOnScreen = false;
  function endAttract() {
    if (!attractOff) caption.setAttribute('aria-live', 'polite');
    attractOff = true;
    attractRun++;
  }
  async function attract() {
    if (attractOff) return;
    const run = ++attractRun;
    caption.setAttribute('aria-live', 'off');
    await wait(1400);
    while (run === attractRun && !attractOff && mapOnScreen) {
      const j = JOURNEYS[attractAt % JOURNEYS.length];
      press(j);
      const done = await playStory(mainMap, j, {
        caption: (n, text, sub, color) => setCaption(n, text, n === '✓' ? 'Playing by itself. Pick a moment to take over.' : sub + ' · playing by itself', color),
        follow: (_a, _b, from, to) => { if (camMode() && !userCam) frame(mainMap, [from, to]); },
      });
      if (!done || run !== attractRun) return;
      attractAt++;
      await wait(1100);
      if (run === attractRun && camMode() && !userCam) frameAll(mainMap);
      await wait(700);
    }
  }
  function pauseAttract() {
    if (attractOff) return;
    attractRun++;
    if (mainMap.story) { stopStory(mainMap); unpress(); setCaption(...IDLE); if (camMode()) frameAll(mainMap, false); }
  }

  /* ======================= a box's drawer ======================= */
  const drawer = $('dm-drawer'), drawerBody = $('dm-drawer-body');
  function openDrawer(id: string, takeFocus: boolean) {
    const n = MAIN.nodes.find((x) => x.id === id);
    if (!n || n.cls === 'quiet') return;
    picked = id;
    dropTip();
    if (!mainMap.story) focusNode(mainMap, id);
    const touching = MAIN.edges.filter((e) => e.from === id || e.to === id);
    const lanes = [...new Set(touching.map((e) => e.lane))];
    const sec = (cls: string, h: string, body: string) => `<div class="dr-sec ${cls}"><h4>${h}</h4>${body}</div>`;
    const plain = n.sub ?? (n.list ? n.list.map(([a, b]) => `${a} ${b}`).join(', ') + '.' : '');
    const lines = touching.map((e) => {
      const out = e.from === id, other = out ? e.to : e.from;
      const way = e.both ? 'Both ways, with' : out ? 'Out to' : 'In from';
      return `<li style="--c:${laneVar(e.lane)}"><i></i><div>${way} <button type="button" data-go="${other}">${titleOf(other)}</button>`
        + (e.carries ? `<small>${cap(e.carries)}</small>` : '') + (e.wire ? `<small class="w">${cap(e.wire)}</small>` : '') + '</div></li>';
    }).join('');
    const deep = DEEP[id];
    drawerBody.innerHTML = '<div class="dr-lanes">' + lanes.map((l) => `<i style="background:${laneVar(l)}"></i>`).join('') + '</div>'
      + (n.kick ? `<div class="dr-kick">${n.kick}</div>` : '')
      + `<h3 class="dr-title" id="dm-drawer-title">${n.title}</h3>`
      + (plain ? sec('', 'In plain English', `<p>${plain}</p>`) : '')
      + sec('tech', 'Under the hood', `<p>${n.tech}</p>`)
      + (lines ? sec('', 'On its lines', `<ul class="dr-lines">${lines}</ul>`) : '')
      + (deep ? sec('deep', 'Why it is built this way', `<p>${deep.why}</p>`) + sec('', 'When something goes wrong', `<p>${deep.fails}</p>`) : '')
      + (deep?.sketch ? sec('', 'The order of things', `<pre class="dr-sketch">${esc(deep.sketch.join('\n'))}</pre><p class="dr-note">A sketch of the idea, not the client’s code.</p>`) : '');
    drawerBody.querySelectorAll<HTMLButtonElement>('[data-go]').forEach((b) => b.addEventListener('click', (ev) => openDrawer(b.dataset.go!, ev.detail === 0)));
    drawer.scrollTop = 0;
    drawer.classList.add('open');
    if (takeFocus) $('dm-drawer-close').focus({ preventScroll: true });
  }
  function closeDrawer(backToBox = false) {
    if (!picked) return;
    const id = picked;
    picked = null;
    drawer.classList.remove('open');
    if (!mainMap.story) clearHighlight(mainMap);
    // Keyboard users go back to the box they came from. A pointer has no "back".
    if (backToBox) mainMap.nodes[id]?.el.focus({ preventScroll: true });
  }

  /* ======================= phone timelines ======================= */
  type ChainNode = { kick?: string; title: string; sub?: string; big?: string; thumbs?: string[]; hub?: boolean };
  const asChain = (n: MapNode): ChainNode => ({
    kick: n.kick, title: n.title, big: n.big, hub: n.cls === 'hub',
    sub: tech ? n.tech : n.sub,
    thumbs: n.thumbs ? (n.thumbs === 'wall' ? WALL : STRIP).slice(0, 7) : undefined,
  });
  const pick = (spec: MapSpec, id: string) => asChain(spec.nodes.find((x) => x.id === id)!);
  function chainHTML(items: { cap?: string; node: ChainNode }[], numbered: boolean) {
    const nodeHTML = (n: ChainNode) => '<div class="ch-node' + (n.hub ? ' hub' : '') + '">'
      + (n.kick ? '<div class="k">' + n.kick + '</div>' : '')
      + '<div class="t">' + n.title + '</div>'
      + (n.big ? '<div class="b">' + n.big + '</div>' : '')
      + (n.sub ? '<div class="s' + (tech ? ' is-tech' : '') + '">' + n.sub + '</div>' : '')
      + (n.thumbs?.length ? '<div class="n-thumbs">' + n.thumbs.map((s) => '<img alt="" src="' + s + '">').join('') + '</div>' : '')
      + '</div>';
    return '<div class="ch-body"><div class="ch-rail"><div class="ch-fill"></div>' + (MOVE ? '<span class="ch-dot"></span>' : '') + '</div>'
      + items.map((it, i) => (it.cap ? '<div class="ch-cap' + (numbered ? '' : ' pill') + '">' + (numbered ? '<b>' + i + '</b>' : '') + '<span>' + it.cap + '</span></div>' : '') + nodeHTML(it.node)).join('')
      + '</div>';
  }
  type Chain = HTMLElement & { _run?: number; _top?: number };
  function layoutChain(chain: Chain) {
    const body = chain.querySelector<HTMLElement>('.ch-body')!, rail = chain.querySelector<HTMLElement>('.ch-rail')!;
    const nodes = body.querySelectorAll<HTMLElement>('.ch-node');
    if (!nodes.length || !body.offsetHeight) return;
    const top = nodes[0].offsetTop + 21, bottom = nodes[nodes.length - 1].offsetTop + 21;
    rail.style.top = top + 'px';
    rail.style.height = Math.max(0, bottom - top) + 'px';
    chain._top = top;
    const lit = body.querySelectorAll<HTMLElement>('.ch-node.on');
    if (lit.length) chain.querySelector<HTMLElement>('.ch-fill')!.style.height = Math.max(0, lit[lit.length - 1].offsetTop + 21 - top) + 'px';
  }
  function playChain(chain: Chain, instant = false) {
    const run = (chain._run ?? 0) + 1;
    chain._run = run;
    const nodes = [...chain.querySelectorAll<HTMLElement>('.ch-node')], caps = [...chain.querySelectorAll<HTMLElement>('.ch-cap')];
    const fill = chain.querySelector<HTMLElement>('.ch-fill')!;
    layoutChain(chain);
    nodes.forEach((n) => n.classList.remove('on'));
    caps.forEach((c) => c.classList.remove('on'));
    fill.style.height = '0px';
    const step = MOVE && !instant;
    const light = (k: number) => {
      if (chain._run !== run) return;
      const node = nodes[k], prev = node.previousElementSibling;
      if (prev?.classList.contains('ch-cap')) prev.classList.add('on');
      node.classList.add('on');
      fill.style.height = Math.max(0, node.offsetTop + 21 - (chain._top ?? 0)) + 'px';
      if (step && k + 1 < nodes.length) setTimeout(() => light(k + 1), 1150);
    };
    if (!step) { nodes.forEach((_, k) => light(k)); return; }
    light(0);
  }
  let chainIO: IntersectionObserver | undefined;
  function renderChains(instant = false) {
    chainIO?.disconnect();
    $('dm-chains').innerHTML = JOURNEYS.map((j) => {
      const items = [{ node: pick(MAIN, j.steps[0][0]) } as { cap?: string; node: ChainNode }]
        .concat(j.steps.map(([, to, text]) => ({ cap: text, node: pick(MAIN, to) })));
      return `<div class="chain" data-key="${j.key}" style="--c:${laneVar(j.lane)}"><div class="ch-head"><i></i><span>${j.name}</span><button type="button" class="ch-replay">Replay</button></div>${chainHTML(items, true)}</div>`;
    }).join('');
    const bare = (lane: keyof typeof LANES, items: { cap?: string; node: ChainNode }[]) =>
      `<div class="chain bare" style="--c:${laneVar(lane)}">${chainHTML(items, false)}</div>`;
    $('dm-night-m').innerHTML = bare('content', [
      { node: { ...pick(NIGHT, 'event'), sub: tech ? pick(NIGHT, 'event').sub : 'Date and time, theme, series ID, pitch, details, FAQs, photos and board layout.' } },
      { cap: 'picked from a list', node: pick(NIGHT, 'venue') },
      { cap: 'added to every night', node: pick(NIGHT, 'settings') },
      { cap: 'same theme', node: pick(NIGHT, 'callers') },
      { cap: 'same theme', node: pick(NIGHT, 'trivia') },
      { cap: 'same series ID', node: pick(NIGHT, 'ttnight') },
    ]);
    $('dm-live-m').innerHTML = bare('live', [
      { node: pick(LIVE, 'lib') },
      { cap: 'load once, on wifi', node: pick(LIVE, 'phone') },
      { cap: 'every tap', node: pick(LIVE, 'room') },
      { cap: 'instantly', node: pick(LIVE, 'screen') },
    ]);
    $('dm-forms-m').innerHTML = bare('mail', [
      { node: pick(FORMS, 'four') },
      { cap: 'every form, checked', node: pick(FORMS, 'fdesk') },
      { cap: 'spam screened out', node: pick(FORMS, 'rs') },
      { cap: 'the full lead, to the owners', node: pick(FORMS, 'oin') },
      { cap: 'a thank-you, to the sender', node: pick(FORMS, 'gin') },
      { cap: 'signups join the lists', node: pick(FORMS, 'lst') },
    ]);

    const chains = [...root.querySelectorAll<Chain>('.chain')];
    chains.forEach((c) => {
      layoutChain(c);
      c.querySelector('.ch-replay')?.addEventListener('click', () => playChain(c));
    });
    if (instant || !MOVE || !('IntersectionObserver' in window)) { chains.forEach((c) => playChain(c, true)); return; }
    chainIO = new IntersectionObserver((entries) => {
      for (const en of entries) if (en.isIntersecting) { chainIO!.unobserve(en.target); playChain(en.target as Chain); }
    }, { threshold: 0.3 });
    chains.forEach((c) => chainIO!.observe(c));
  }

  /* ======================= hero ======================= */
  /* The map as the opening picture, with the club's caller cards flying into
     the content library while its count runs up to the real number. */
  function renderHero() {
    const host = $('dm-hero'), cardsEl = $('dm-hero-cards');
    const heroMap = buildMap($('dm-map-hero'), { ...MAIN, interactive: false }, {
      glow: false,
      scaleFn: () => (PHONE() ? 0.6 : Math.max(0.58, Math.min(0.8, innerWidth / 1950))),
    });
    const pics = [...WALL, ...STRIP];
    if (!pics.length) return;
    const lib = heroMap.nodes.sanity;
    const size = () => (PHONE() ? 58 : 86);
    const target = () => {
      const n = lib.el.getBoundingClientRect(), h = cardsEl.getBoundingClientRect();
      return { x: n.left + n.width / 2 - h.left, y: n.top + n.height * 0.45 - h.top };
    };

    if (!MOVE) {
      // A still: a short trail of cards on their way in.
      const t = target(), sz = size(), n = 6;
      for (let k = 0; k < n; k++) {
        const f = (k + 1) / (n + 1), img = new Image();
        img.src = pics[(k * 5) % pics.length];
        img.alt = '';
        img.className = 'rest';
        const x = t.x - sz / 2 - (1 - f) * (PHONE() ? 150 : 420), y = t.y - sz / 2 + Math.sin(f * 3) * 60 + (1 - f) * 150;
        img.style.transform = `translate(${x}px, ${y}px) scale(${1 - f * 0.7}) rotate(${(k % 2 ? 1 : -1) * 6}deg)`;
        cardsEl.appendChild(img);
      }
      return;
    }

    const big = lib.el.querySelector<HTMLElement>('.n-big');
    const total = 2738, fmt = (v: number) => v.toLocaleString('en-US');
    const showCount = (v: number) => { if (big) big.innerHTML = `${fmt(v)} <small>records</small>`; };
    let born = 0, k = 0, flying = 0, on = false, timer = 0;
    const moss = cssv('--moss');
    function launch() {
      const t = target(), W = cardsEl.clientWidth, H = cardsEl.clientHeight, sz = size();
      let sx: number, sy: number;
      const r = Math.random();
      if (PHONE()) { sx = r < 0.5 ? -sz : W; sy = Math.random() * H; }
      else if (r < 0.3) { sx = W * (0.04 + Math.random() * 0.34); sy = Math.random() < 0.5 ? -sz : H; } // out from behind the title
      else if (r < 0.45) { sx = -sz; sy = Math.random() * H; }
      else if (r < 0.75) { sx = W * (0.55 + Math.random() * 0.45); sy = H; } // up from below; the top edge is the letterhead's
      else { sx = W; sy = Math.random() * H * 0.9; }
      const ex = t.x - sz / 2, ey = t.y - sz / 2;
      // Bend the flight: a midpoint pushed off the straight line.
      const mx = (sx + ex) / 2 + (ey - sy) * 0.22, my = (sy + ey) / 2 - (ex - sx) * 0.22;
      const spin = (Math.random() - 0.5) * 50;
      const img = new Image();
      img.src = pics[(k++ * 7) % pics.length];
      img.alt = '';
      cardsEl.appendChild(img);
      flying++;
      const fly = img.animate([
        { transform: `translate(${sx}px, ${sy}px) scale(1) rotate(${spin}deg)`, opacity: 0, offset: 0 },
        { opacity: 0.92, offset: 0.14 },
        { transform: `translate(${mx}px, ${my}px) scale(.74) rotate(${spin / 3}deg)`, opacity: 0.92, offset: 0.55 },
        { opacity: 0.9, offset: 0.9 },
        { transform: `translate(${ex}px, ${ey}px) scale(.16) rotate(0deg)`, opacity: 0, offset: 1 },
      ], { duration: 3000 + Math.random() * 1600, easing: 'cubic-bezier(.45,.05,.3,1)' });
      fly.onfinish = () => { img.remove(); flying--; pingNode(lib, moss); };
    }
    function loop() {
      if (!on) return;
      if (flying < 14) launch();
      const since = performance.now() - born;
      // A rush while the count runs up, then a steady trickle.
      timer = window.setTimeout(loop, since < 5200 ? 210 : 760 + Math.random() * 500);
    }
    function countUp() {
      const t0 = performance.now(), dur = 5200;
      const step = (now: number) => {
        const t = Math.min(1, (now - t0) / dur);
        showCount(Math.round(total * (1 - (1 - t) ** 3)));
        if (t < 1) requestAnimationFrame(step);
      };
      showCount(0);
      setTimeout(() => requestAnimationFrame(step), 900); // the first cards are just landing
    }
    const start = () => { if (on) return; on = true; if (!born) { born = performance.now(); countUp(); } loop(); };
    const stop = () => { on = false; clearTimeout(timer); };
    if (!('IntersectionObserver' in window)) { start(); return; }
    new IntersectionObserver(([en]) => { if (en.isIntersecting) start(); else stop(); }, { threshold: 0.05 }).observe(host);
  }

  /* ======================= ticket desk ======================= */
  /* A made-up night. `sold` is the count; the three flags are the three places
     a sell-out has to reach, flipped one at a time as the light gets there. */
  const cap40 = SIM.capacity;
  const desk = { sold: SIM.sold, ticked: false, page: false, listing: false, busy: false, watcher: 'listening', builder: 'idle' };
  function paintDesk() {
    const dm = deskMap;
    if (!dm) return;
    const chip = (id: string, text: string, cls = '') => {
      const c = dm.nodes[id]?.el.querySelector<HTMLElement>('.n-chip');
      if (c) { c.textContent = text; c.className = 'n-chip' + (cls ? ' ' + cls : ''); }
    };
    chip('tt', `${desk.sold} of ${cap40} sold`, desk.sold >= cap40 ? 'on' : '');
    chip('watcher', desk.watcher, desk.watcher === 'listening' ? '' : 'busy');
    chip('sanity', desk.ticked ? 'Sold Out: on' : 'Sold Out: off', desk.ticked ? 'on' : '');
    chip('builder', desk.builder, desk.builder === 'idle' ? '' : 'busy');
    chip('site', desk.page ? 'Sold out' : 'On sale', desk.page ? 'on' : '');
    chip('google', desk.listing ? 'Sold out' : 'In stock', desk.listing ? 'on' : '');
    // The big map remembers it too.
    for (const [id, set] of [['site', desk.page], ['google', desk.listing]] as const) {
      const el = mainMap?.nodes[id]?.el;
      if (!el) continue;
      el.querySelector('.n-flag')?.remove();
      if (set) { const f = document.createElement('span'); f.className = 'n-flag'; f.textContent = 'Plant Bingo: sold out'; el.appendChild(f); }
    }
  }
  function renderDesk() {
    const deskEl = $('dm-desk'), sell = $<HTMLButtonElement>('dm-sell'), refund = $<HTMLButtonElement>('dm-refund');
    const logEl = $('dm-log'), avail = $('dm-g-avail');
    const steps = [...root.querySelectorAll<HTMLElement>('#dm-steps .step')];
    const tickets = cssv('--l-tickets'), content = cssv('--l-content');
    const lit = (i: number) => steps.forEach((el, k) => el.classList.toggle('lit', k === i));
    const log = (text: string) => {
      const li = document.createElement('li');
      li.textContent = text;
      logEl.insertBefore(li, logEl.firstChild);
      while (logEl.children.length > 4) logEl.lastElementChild!.remove();
    };
    const paint = () => {
      $('dm-sold').textContent = String(desk.sold);
      $('dm-meter').style.width = (desk.sold / cap40) * 100 + '%';
      deskEl.classList.toggle('sold', desk.page);
      $('dm-cta').textContent = desk.page ? 'Join the waitlist' : 'Get tickets';
      $('dm-state').textContent = desk.page ? 'Sold out' : 'On sale';
      const text = desk.listing ? 'Sold out' : 'In stock';
      if (avail.textContent !== text) {
        avail.textContent = text;
        if (MOVE) avail.animate([{ background: tickets + '55' }, { background: 'transparent' }], { duration: 1600 });
      }
      sell.disabled = desk.busy || desk.sold >= cap40;
      refund.disabled = desk.busy || desk.sold <= cap40 - 6;
      paintDesk();
    };
    /** Send a light along one of the desk map's lines, and ring the box it lands on. */
    const send = async (from: string, to: string, back = false) => {
      for (;;) {
        const m = deskMap;
        const r = m && edgeOf(m, from, to);
        if (!m || !r) return;
        r.g.classList.add('hot');
        await travel(m, r, r.e.lane === 'tickets' ? tickets : content, 620, () => deskMap === m, back);
        r.g.classList.remove('hot');
        // Crossing the phone breakpoint rebuilt the map under the light: send
        // it again along the same line of the new layout.
        if (deskMap !== m) continue;
        const end = m.nodes[back ? from : to];
        if (end) pingNode({ el: end.el }, r.color);
        return;
      }
    };
    const beat = () => wait(STILL ? 0 : 380);
    const say = (step: number, text: string) => { lit(step); log(text); };
    /** The watcher never trusts the message: out to Ticket Tailor and back for the real count. */
    const ask = async (n: number) => {
      say(4, `The watcher asks Ticket Tailor for the real count: ${n} of ${cap40}.`);
      desk.watcher = 'checking'; paint();
      await send('tt', 'watcher', true);
      await send('tt', 'watcher');
    };
    /** A real change: tick or clear Sold Out, rebuild, and tell the page and Google. */
    const flip = async (to: boolean) => {
      await send('watcher', 'sanity');
      desk.ticked = to; desk.watcher = 'listening'; paint();
      await send('sanity', 'builder');
      desk.builder = 'rebuilding'; paint();
      await Promise.all([send('builder', 'site'), send('builder', 'google')]);
      desk.page = desk.listing = to; desk.builder = 'idle'; paint();
    };
    const run = async (work: () => Promise<void>) => {
      // Both buttons are disabled while the steps answer, and a disabled
      // button drops keyboard focus on the floor. Remember who was pressed and
      // hand focus back afterwards (to the other button if this one stays
      // disabled), unless the visitor has already moved on.
      const pressed = document.activeElement === sell ? sell : document.activeElement === refund ? refund : null;
      desk.busy = true;
      deskEl.classList.remove('fresh');
      paint();
      await work();
      desk.busy = false;
      lit(desk.page ? 5 : -1);
      paint();
      if (pressed && document.activeElement === document.body) {
        const other = pressed === sell ? refund : sell;
        (pressed.disabled ? other : pressed).focus({ preventScroll: true });
      }
    };
    sell.addEventListener('click', () => {
      if (desk.busy || desk.sold >= cap40) return;
      const next = desk.sold + 1;
      void run(async () => {
        say(2, 'A guest buys a ticket on the event page.');
        await send('guests', 'tt');
        desk.sold = next; paint();
        await beat();
        say(3, 'Ticket Tailor tells the watcher about the order.');
        await send('tt', 'watcher');
        await beat();
        await ask(next);
        await beat();
        if (next >= cap40) {
          say(5, 'Sold out. The watcher ticks Sold Out, the site rebuilds, and Google hears too.');
          await flip(true);
        } else {
          say(-1, 'Not the last seat, so nothing changes. No rebuild.');
          desk.watcher = 'listening'; paint();
        }
        await beat();
      });
    });
    refund.addEventListener('click', () => {
      if (desk.busy) return;
      const next = desk.sold - 1, was = desk.page;
      void run(async () => {
        say(3, 'A refund frees a seat. Ticket Tailor tells the watcher.');
        desk.sold = next; paint();
        await send('tt', 'watcher');
        await beat();
        await ask(next);
        await beat();
        if (was) {
          say(5, 'Sold Out clears itself. The site rebuilds and the Buy button is back.');
          await flip(false);
        } else {
          say(-1, 'Still on sale, so nothing changes.');
          desk.watcher = 'listening'; paint();
        }
        await beat();
      });
    });
    paint();
  }

  /* ======================= small motions ======================= */
  function countUp() {
    if (!MOVE || !('IntersectionObserver' in window)) return;
    const fmt = (n: number) => n.toLocaleString('en-US');
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) {
        if (!en.isIntersecting) continue;
        io.unobserve(en.target);
        const el = en.target as HTMLElement, to = Number(el.dataset.to), suffix = el.dataset.suffix ?? '';
        const t0 = performance.now(), dur = 1500;
        const step = (now: number) => {
          const t = Math.min(1, (now - t0) / dur), e = 1 - (1 - t) ** 3;
          el.textContent = fmt(Math.round(to * e)) + (t < 1 ? '' : suffix);
          if (t < 1) requestAnimationFrame(step);
        };
        el.textContent = '0';
        requestAnimationFrame(step);
      }
    }, { threshold: 0.6 });
    root.querySelectorAll('[data-to]').forEach((el) => io.observe(el));
  }
  function growBars() {
    const matrix = $('dm-matrix');
    if (!MOVE || !('IntersectionObserver' in window)) return;
    matrix.classList.add('pre');
    const io = new IntersectionObserver(([en]) => {
      if (en.isIntersecting) { matrix.classList.remove('pre'); matrix.classList.add('grow'); io.disconnect(); }
    }, { threshold: 0.3 });
    io.observe(matrix);
  }

  /* ======================= render ======================= */
  function render() {
    mountMaps();
    renderHero();
    renderChains();

    // The journey buttons.
    const tour = $('dm-tour');
    for (const j of JOURNEYS) {
      const b = document.createElement('button');
      b.type = 'button';
      b.style.setProperty('--c', laneVar(j.lane));
      b.innerHTML = `<i></i>${j.name}`;
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', () => play(j));
      tour.appendChild(b);
      buttons.set(j.key, b);
    }
    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'reset';
    reset.innerHTML = '<i></i>Show everything';
    reset.addEventListener('click', () => {
      endAttract();
      closeDrawer();
      dropTip();
      stopStory(mainMap);
      unpress();
      userCam = false;
      if (camMode()) frameAll(mainMap);
      setCaption('✦', 'Everything, all at once.', 'Pick a moment above, open any box, or point at any line.');
    });
    tour.appendChild(reset);

    // Plain English / Under the hood.
    const modes = [...root.querySelectorAll<HTMLButtonElement>('[data-mode]')];
    const paintMode = () => {
      root.classList.toggle('is-tech', tech);
      modes.forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.mode === 'tech') === tech)));
    };
    modes.forEach((b) => b.addEventListener('click', () => {
      const want = b.dataset.mode === 'tech';
      if (want === tech) return;
      tech = want;
      endAttract();
      if (mainMap.story) { stopStory(mainMap); unpress(); setCaption(...IDLE); }
      paintMode();
      mountMaps();
      renderChains(true);
    }));
    paintMode();

    $('dm-zoom').addEventListener('click', () => {
      endAttract();
      userCam = true;
      if (isZoomed(mainMap)) frameAll(mainMap);
      else zoomAt(mainMap, 0.8 / mainMap.view.s, mainMap.vw / 2, mainMap.vh * 0.3, true);
    });

    // The drawer closes on its button, on Escape, and on a tap on open map.
    $('dm-drawer-close').addEventListener('click', (ev) => closeDrawer(ev.detail === 0));
    addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && picked) closeDrawer(true); });
    $('dm-view').addEventListener('click', (ev) => {
      if ((ev.target as Element).closest('.node, path.hit')) return;
      hideLine();
      if (picked) closeDrawer();
    });

    let lastPhone = PHONE();
    addEventListener('resize', () => {
      if (PHONE() !== lastPhone) {
        lastPhone = PHONE();
        if (mainMap.story) { stopStory(mainMap); unpress(); setCaption(...IDLE); }
        mountMaps();
        if (mapOnScreen && !attractOff) void attract(); // stopping the story ended its loop
      }
      maps.forEach(fit);
      root.querySelectorAll<Chain>('.chain').forEach(layoutChain);
    });

    // The sticky bar draws its shadow only while it is actually stuck.
    const mapEl = $('dm-map-main');
    addEventListener('scroll', () => {
      const stick = parseFloat(getComputedStyle(tourBar).top) || 0;
      tourBar.classList.toggle('stuck', !PHONE() && tourBar.getBoundingClientRect().top <= stick + 1 && mapEl.getBoundingClientRect().bottom > 0);
    }, { passive: true });

    renderDesk();
    countUp();
    growBars();
    startTick();

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([en]) => {
        mapOnScreen = en.isIntersecting;
        if (mapOnScreen) void attract(); else pauseAttract();
      }, { threshold: 0.35 }).observe($('dm-view'));
    }

    // A shared link can open on one journey.
    const want = JOURNEYS.find((j) => j.key === params.get('play'));
    if (want) {
      endAttract();
      (PHONE() ? tourBar : $('dm-map-section')).scrollIntoView({ block: 'start' });
      setTimeout(() => play(want), 500);
    }

    root.dataset.ready = '1';
  }

  // Box heights depend on the faces, so nothing is measured until they load.
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(render);
}
