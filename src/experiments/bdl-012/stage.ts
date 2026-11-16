/**
 * BDL-012 stage: everything on the data map that moves or answers a tap.
 * The markup and the static tables are server-rendered by Experiment.astro;
 * this mounts the four node maps, the phone timelines, the photo wall, the
 * ticket desk and the TV demo on top of them.
 *
 * URL switches (all optional):
 *   ?play=publish|ticket|game|form   start on that journey (a shareable link)
 *   ?view=tech                       start with Under the hood on
 *   ?still                           no motion at all, for stills and OG shots
 */
import { FORMS, JOURNEYS, LANES, LIVE, MAIN, NIGHT, SIM, TV_CARDS, TV_DECK, type Journey, type MapNode, type MapSpec } from './data';
import { STRIP, WALL, tvUrl } from './art';
import { buildMap, clearHighlight, cssv, fit, focusNode, maps, playStory, setEnv, startTick, stopStory, type LiveMap } from './engine';

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
  const laneVar = (l: keyof typeof LANES) => `var(${LANES[l].v})`;

  setEnv({ root, move: MOVE, thumbs: { wall: WALL, strip: STRIP } });
  root.classList.toggle('is-still', !MOVE);

  /* ======================= maps ======================= */
  let mainMap: LiveMap;
  function mountMaps() {
    maps.length = 0;
    const phone = PHONE();
    mainMap = buildMap($('dm-map-main'), MAIN, { tiny: phone, tech });
    for (const n of Object.values(mainMap.nodes)) {
      if (n.cls === 'quiet') continue;
      const on = () => { if (!mainMap.story) focusNode(mainMap, n.id); };
      const off = () => { if (!mainMap.story) clearHighlight(mainMap); };
      if (!phone) { n.el.addEventListener('mouseenter', on); n.el.addEventListener('mouseleave', off); }
      n.el.addEventListener('focus', on);
      n.el.addEventListener('blur', off);
      const pick = () => { endAttract(); if (mainMap.story) { stopStory(mainMap); unpress(); } focusNode(mainMap, n.id); };
      n.el.addEventListener('click', pick);
      n.el.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); pick(); } });
    }
    $('dm-zoom').textContent = 'Zoom in';
    if (!phone) {
      buildMap($('dm-map-night'), NIGHT, { tech });
      buildMap($('dm-map-live'), LIVE, { tech });
      buildMap($('dm-map-forms'), FORMS, { tech });
    }
  }

  /* ======================= journeys ======================= */
  const tourBar = $('dm-tour-bar');
  const caption = $('dm-caption');
  function setCaption(n: string, text: string, sub: string, color?: string) {
    caption.style.setProperty('--c', color || 'var(--line)');
    caption.innerHTML = `<div class="c-step">${n}</div><div class="c-text">${text}${sub ? `<small>${sub}</small>` : ''}</div>`;
  }
  const IDLE: [string, string, string] = ['✦', 'Pick a moment above to watch it travel across the map, step by step.', 'Or tap any box to see what it connects to.'];
  const buttons = new Map<string, HTMLButtonElement>();
  const unpress = () => buttons.forEach((b) => b.setAttribute('aria-pressed', 'false'));
  const press = (j: Journey) => { unpress(); buttons.get(j.key)?.setAttribute('aria-pressed', 'true'); };

  /** Scroll just enough that both ends of the current step sit under the sticky bar. */
  function follow(a: HTMLElement, b: HTMLElement) {
    const bar = tourBar.getBoundingClientRect().bottom;
    const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
    const top = Math.min(ra.top, rb.top), bottom = Math.max(ra.bottom, rb.bottom);
    const floor = innerHeight - 64; // clear of the specimen plate strip
    if (top >= bar + 8 && bottom <= floor - 8) return;
    scrollBy({ top: (top + bottom) / 2 - (bar + (floor - bar) / 2), behavior: MOVE ? 'smooth' : 'auto' });
  }
  function play(j: Journey) {
    endAttract();
    press(j);
    void playStory(mainMap, j, { caption: setCaption, follow });
  }

  /* Attract mode: until somebody touches the map, it plays the four journeys
     by itself whenever it is on screen. It never scrolls the page. */
  let attractOff = !MOVE;
  let attractRun = 0;
  let attractAt = 0;
  let mapOnScreen = false;
  function endAttract() { attractOff = true; attractRun++; }
  async function attract() {
    if (attractOff || PHONE()) return;
    const run = ++attractRun;
    await wait(1400);
    while (run === attractRun && !attractOff && mapOnScreen) {
      const j = JOURNEYS[attractAt % JOURNEYS.length];
      press(j);
      const done = await playStory(mainMap, j, {
        caption: (n, text, sub, color) => setCaption(n, text, n === '✓' ? 'Playing by itself. Pick a moment to take over.' : sub + ' · playing by itself', color),
      });
      if (!done || run !== attractRun) return;
      attractAt++;
      await wait(1600);
    }
  }
  function pauseAttract() {
    if (attractOff) return;
    attractRun++;
    if (mainMap.story) { stopStory(mainMap); unpress(); setCaption(...IDLE); }
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
      { cap: 'only real people', node: pick(FORMS, 'rs') },
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

  /* ======================= hero wall ======================= */
  function renderWall() {
    const wall = $('dm-wall');
    if (!WALL.length) return;
    const pics = [...WALL, ...STRIP];
    const cols = Math.min(20, Math.ceil(innerWidth / 114) + 1), per = 9;
    for (let c = 0; c < cols; c++) {
      const col = document.createElement('div');
      col.className = 'col' + (c % 2 ? ' up' : '');
      col.style.setProperty('--dur', 70 + (c % 4) * 14 + 's');
      // 13 and the list length share no factor, so neighbouring columns never line up the same plant.
      const set = Array.from({ length: per }, (_, k) => pics[(c * 13 + k * 4) % pics.length]);
      for (const src of [...set, ...set]) { const i = new Image(); i.src = src; i.alt = ''; col.appendChild(i); }
      wall.appendChild(col);
    }
    if (MOVE) setInterval(() => {
      const imgs = wall.querySelectorAll('img');
      const i = imgs[Math.floor(Math.random() * imgs.length)];
      i.classList.add('glint');
      setTimeout(() => i.classList.remove('glint'), 1800);
    }, 450);
  }

  /* ======================= ticket desk ======================= */
  function renderDesk() {
    const desk = $('dm-desk'), sell = $<HTMLButtonElement>('dm-sell'), refund = $<HTMLButtonElement>('dm-refund');
    const logEl = $('dm-log'), avail = $('dm-g-avail');
    const steps = [...root.querySelectorAll<HTMLElement>('#dm-steps .step')];
    const cap = SIM.capacity;
    let sold = SIM.sold, soldOut = false, busy = false;
    const lit = (i: number) => steps.forEach((el, k) => el.classList.toggle('lit', k === i));
    const log = (text: string) => {
      const li = document.createElement('li');
      li.textContent = text;
      logEl.insertBefore(li, logEl.firstChild);
      while (logEl.children.length > 4) logEl.lastElementChild!.remove();
    };
    const paint = () => {
      $('dm-sold').textContent = String(sold);
      $('dm-meter').style.width = (sold / cap) * 100 + '%';
      desk.classList.toggle('sold', soldOut);
      $('dm-cta').textContent = soldOut ? 'Join the waitlist' : 'Get tickets';
      $('dm-state').textContent = soldOut ? 'Sold out' : 'On sale';
      const text = soldOut ? 'Sold out' : 'In stock';
      if (avail.textContent !== text) {
        avail.textContent = text;
        if (MOVE) avail.animate([{ background: cssv('--l-tickets') + '55' }, { background: 'transparent' }], { duration: 1600 });
      }
      sell.disabled = busy || soldOut;
      refund.disabled = busy || sold <= cap - 6;
    };
    const run = async (beats: [number, string, (() => void)?][]) => {
      busy = true;
      desk.classList.remove('fresh');
      paint();
      for (const [step, text, then] of beats) {
        lit(step);
        log(text);
        then?.();
        paint();
        await wait(MOVE ? 1050 : 0);
      }
      busy = false;
      lit(soldOut ? 5 : -1);
      paint();
    };
    sell.addEventListener('click', () => {
      if (busy || soldOut) return;
      const next = sold + 1;
      void run([
        [2, 'A guest buys a ticket on the event page.', () => { sold = next; }],
        [3, 'Ticket Tailor tells the watcher about the order.'],
        [4, `The watcher asks Ticket Tailor for the real count: ${next} of ${cap}.`],
        next >= cap
          ? [5, 'Sold out. The watcher ticks Sold Out, the site rebuilds, and Google hears too.', () => { soldOut = true; }]
          : [-1, 'Not the last seat, so nothing changes. No rebuild.'],
      ]);
    });
    refund.addEventListener('click', () => {
      if (busy) return;
      const next = sold - 1, was = soldOut;
      void run([
        [3, 'A refund frees a seat. Ticket Tailor tells the watcher.', () => { sold = next; }],
        [4, `The watcher asks Ticket Tailor for the real count: ${next} of ${cap}.`],
        was
          ? [5, 'Sold Out clears itself. The site rebuilds and the Buy button is back.', () => { soldOut = false; }]
          : [-1, 'Still on sale, so nothing changes.'],
      ]);
    });
    paint();
  }

  /* ======================= game night demo ======================= */
  function renderTv() {
    const screen = $('dm-screen'), call = $<HTMLButtonElement>('dm-call'), fact = $<HTMLButtonElement>('dm-fact');
    if (!TV_CARDS.length) return;
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
      const old = screen.querySelector('.card-tv');
      if (old) { old.classList.add('out'); setTimeout(() => old.remove(), 500); }
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
      $('dm-n-called').textContent = String(called);
      $('dm-n-left').textContent = String(TV_DECK.size - called);
      current = show(false);
    };
    const cycle = () => {
      timers = [setTimeout(reveal, 2300), setTimeout(() => { next(); cycle(); }, 7600)];
    };
    const takeOver = () => {
      if (!auto) return;
      auto = false;
      timers.forEach(clearTimeout);
      $('dm-demo-note').textContent = 'You have the phone now. The TV only moves when you tap.';
    };
    call.addEventListener('click', () => { takeOver(); next(); });
    fact.addEventListener('click', () => { takeOver(); reveal(); });
    if (auto) cycle();
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
    renderWall();
    mountMaps();
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
      stopStory(mainMap);
      unpress();
      setCaption('✦', 'Everything, all at once.', 'Pick a moment above, or tap any box to see what it connects to.');
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

    $('dm-zoom').addEventListener('click', (ev) => {
      mainMap.zoom = !mainMap.zoom;
      (ev.currentTarget as HTMLElement).textContent = mainMap.zoom ? 'Zoom out' : 'Zoom in';
      fit(mainMap);
    });

    let lastPhone = PHONE();
    addEventListener('resize', () => {
      if (PHONE() !== lastPhone) {
        lastPhone = PHONE();
        if (mainMap.story) { stopStory(mainMap); unpress(); setCaption(...IDLE); }
        mountMaps();
      } else maps.forEach(fit);
      root.querySelectorAll<Chain>('.chain').forEach(layoutChain);
    });

    // The sticky bar draws its shadow only while it is actually stuck.
    const mapEl = $('dm-map-main');
    addEventListener('scroll', () => {
      const stick = parseFloat(getComputedStyle(tourBar).top) || 0;
      tourBar.classList.toggle('stuck', tourBar.getBoundingClientRect().top <= stick + 1 && mapEl.getBoundingClientRect().bottom > 0);
    }, { passive: true });

    renderDesk();
    renderTv();
    countUp();
    growBars();
    startTick();

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([en]) => {
        mapOnScreen = en.isIntersecting;
        if (mapOnScreen) void attract(); else pauseAttract();
      }, { threshold: 0.35 }).observe(mapEl);
    }

    // A shared link can open on one journey.
    const want = JOURNEYS.find((j) => j.key === params.get('play'));
    if (want) {
      endAttract();
      const target = PHONE() ? root.querySelector<HTMLElement>(`.chain[data-key="${want.key}"]`) : $('dm-map-section');
      target?.scrollIntoView({ block: 'start' });
      if (!PHONE()) setTimeout(() => play(want), 500);
    }

    root.dataset.ready = '1';
  }

  // Box heights depend on the faces, so nothing is measured until they load.
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(render);
}
