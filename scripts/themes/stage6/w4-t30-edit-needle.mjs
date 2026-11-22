/**
 * Stage 6 wave 4, task 30: one-off edit of cottagecore/needle.ts (task 27 minors C1 to C4, and the touch beat).
 *   C1  finish() flips the thread colour only when a thread was sewn
 *   C2  the word mask is rebuilt on resize while a thread lives
 *   C3  the needle's eye never reaches the call-to-action: the tip is held clear of it
 *   C4  the loop's first frame uses the rAF timestamp, so dt and the travel's t are never negative
 *   beat  the scroll-in nudge moves onto the common touch conditions (bauhaus/parts/beat.ts)
 * Kept for the record. Run from the repo root; each hunk checks its anchor, so it refuses to run twice.
 *
 *   node scripts/themes/stage6/w4-t30-edit-needle.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = 'src/themes/cottagecore/needle.ts';
let src = readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n');
function swap(name, from, to) {
  if (src.split(from).length !== 2) throw new Error(`hunk "${name}": anchor missing or not unique (already applied?)`);
  src = src.replace(from, () => to);
  console.log('ok', name);
}

swap('import',
` */

const NS = 'http://www.w3.org/2000/svg';`,
` */
import { scheduleBeat } from '../bauhaus/parts/beat';

const NS = 'http://www.w3.org/2000/svg';`);

// C1
swap('c1',
`    const th = live;
    if (!th) return;
    live = null;
    nextC = (nextC ^ 1) as 0 | 1;
    el.setAttribute('data-c', String(nextC));
    if (th.pts.length < 4 || th.lastIn < 1) { removeThread(th); return; }`,
`    const th = live;
    if (!th) return;
    live = null;
    // A thread that was begun and dropped (a click on the needle with no move, a hold released in place, a drag that
    // never reached the linen) was never sewn: the colour in the eye stays, so two threads in a row never share one.
    if (th.pts.length < 4 || th.lastIn < 1) { removeThread(th); return; }
    nextC = (nextC ^ 1) as 0 | 1;
    el.setAttribute('data-c', String(nextC));`);

// C3: geometry
swap('c3-geo',
`  const geo = { k: 1, cx: 0, cy: 0, left: 0, top: 0, linenR: 1, hoopR: 1, homeX: 0, homeY: 0, S: 0 };`,
`  const geo = { k: 1, cx: 0, cy: 0, left: 0, top: 0, linenR: 1, hoopR: 1, homeX: 0, homeY: 0, S: 0 };
  /** The call-to-action under the hoop (page px), and how far the needle's body (the hit padding too) reaches from
      its tip: left and right, and down. The tip is held where the body clears the link (clampTip). */
  const avoid = { l: 0, r: 0, t: 0, on: false, reachL: 0, reachR: 0, reachDown: 0 };
  const cta = hoop.parentElement?.querySelector<HTMLElement>('a') ?? null;`);
swap('c3-measure',
`    geo.homeX = n.left + sx() - o.x;
    geo.homeY = n.top + sy() - o.y;
    off.x = o.x;
    off.y = o.y;
    knockOut(c);`,
`    geo.homeX = n.left + sx() - o.x;
    geo.homeY = n.top + sy() - o.y;
    off.x = o.x;
    off.y = o.y;
    // The body's reach from the tip (its box and the 0.8rem by 0.5rem hit padding round it), for the link below.
    const bb = body.getBoundingClientRect();
    const pad = 14;
    avoid.reachL = n.left - bb.left + pad;
    avoid.reachR = bb.right - n.left + pad;
    avoid.reachDown = bb.bottom - n.top + pad;
    const a = cta?.getBoundingClientRect();
    avoid.on = !!a && a.width > 1;
    if (a) {
      avoid.l = a.left + sx();
      avoid.r = a.right + sx();
      avoid.t = a.top + sy();
    }
    knockOut(c);`);
swap('c3-clamp',
`    const d = Math.hypot(dx, dy);
    if (d <= geo.hoopR) return { x, y };
    return { x: geo.cx + (dx / d) * geo.hoopR, y: geo.cy + (dy / d) * geo.hoopR };
  };`,
`    const d = Math.hypot(dx, dy);
    const p = d <= geo.hoopR ? { x, y } : { x: geo.cx + (dx / d) * geo.hoopR, y: geo.cy + (dy / d) * geo.hoopR };
    // Held clear of the call-to-action: where the body would reach it, the tip stops short, so a held or idling needle
    // never sits over the link and a click on the link is never the needle's (27/C3).
    if (avoid.on && p.x + avoid.reachR > avoid.l && p.x - avoid.reachL < avoid.r) p.y = Math.min(p.y, avoid.t - avoid.reachDown);
    return p;
  };`);

// C4
swap('c4-loop',
`    if (raf || !alive) return;
    lastFrame = performance.now();
    raf = requestAnimationFrame(tick);`,
`    if (raf || !alive) return;
    // The first frame's own timestamp starts the clock (it can be earlier than performance.now() here).
    lastFrame = 0;
    raf = requestAnimationFrame(tick);`);
swap('c4-tick',
`    const dt = Math.min(64, now - lastFrame);
    lastFrame = now;`,
`    if (!lastFrame) lastFrame = now;
    const dt = Math.max(0, Math.min(64, now - lastFrame));
    lastFrame = now;`);
swap('c4-travel',
`    const t = Math.min(1, (now - tr.t0) / tr.dur);`,
`    const t = Math.min(1, Math.max(0, (now - tr.t0) / tr.dur));`);

// C2 + beat
swap('beat',
`  // Once, when the needle first scrolls into view: a small draw-back and settle, so a visitor who has not met it finds it moves.
  const offNudge = () => el.removeAttribute('data-nudge');
  el.addEventListener('animationend', offNudge);
  let nudgeIo: IntersectionObserver | null = null;
  if ('IntersectionObserver' in window) {
    nudgeIo = new IntersectionObserver((entries) => {
      if (!entries.some((en) => en.isIntersecting)) return;
      el.setAttribute('data-nudge', '');
      nudgeIo?.disconnect();
      nudgeIo = null;
    }, { threshold: 0.6 });
    nudgeIo.observe(el);
  }
`,
`  // The touch beat (Stage 6 w4 task 30, critique A1): once per visit, when the needle is at least 60% visible, the page
  // has been still 400 ms and no form field has focus (bauhaus/parts/beat.ts), a small draw-back and settle, so a visitor
  // who has not met it finds it moves. A mouse has the grab cursor and the steel highlight instead.
  const offNudge = () => el.removeAttribute('data-nudge');
  el.addEventListener('animationend', offNudge);
  const beatAbort = new AbortController();
  const stopBeat = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    ? () => {}
    : scheduleBeat('cottagecore:needle', [body], () => el.setAttribute('data-nudge', ''), beatAbort.signal, () => !grab && !travel && !live && !threads.some((t) => t.unpicking));

  // A resize or a rotation while a thread lives re-flows the manifesto: the word mask is built again so the threads
  // keep clear of the words (27/C2). Nothing is measured while there is no thread.
  let ro: ResizeObserver | null = null;
  if ('ResizeObserver' in window) {
    ro = new ResizeObserver(() => { if (alive && framed && threads.length) measure(); });
    ro.observe(hoop);
  }
`);
swap('teardown-beat',
`    io?.disconnect();
    nudgeIo?.disconnect();
    el.removeEventListener('animationend', offNudge);`,
`    io?.disconnect();
    ro?.disconnect();
    stopBeat();
    beatAbort.abort();
    el.removeEventListener('animationend', offNudge);`);

writeFileSync(FILE, src);
