/**
 * Stage 6 wave 3, task 23: the edit that gives src/themes/cottagecore/fx.ts the clock's release (a puff of
 * seeds in the light scheme, a rising firefly in the dark) and makes it ignore presses on the toys. fx.ts is
 * CRLF; this reads it as LF, applies each replacement (each must match exactly once) and writes it back CRLF.
 * This is the first pass; the sizes, the Home closer breakpoint rules and the second pass (w3-t23-edit-fx2.mjs)
 * were tuned by hand afterwards, so running it now would not reproduce the committed files: it is the record of
 * what was changed and why.
 *   node scripts/themes/stage6/w3-t23-edit-fx.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = new URL('../../../src/themes/cottagecore/fx.ts', import.meta.url);
let src = readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n');

function swap(from, to) {
  const n = src.split(from).length - 1;
  if (n !== 1) throw new Error(`expected one match, found ${n}: ${from.slice(0, 80)}`);
  src = src.replace(from, () => to);
}

// ---- header comment ----
swap(` * Text (item 14): text is measured line by line, in document space, once on`,
` * The clock (Stage 6 w3 task 23): the dandelion clock on the closer and the sent page (toys.ts) sends one
 * \`cc:blow\` window event when it is pressed. By day that releases the 6 to 10 seeds it lost into this canvas as
 * puffs: ordinary seeds that leave the head with a kick and then ride the breeze like the rest, off text by the
 * same fade. A puff is seated by the seat rules (the whole drawn seed clear of the viewport edges, every sheet and
 * every line of text, and clear for seatMinLife s of drift; a seed with no such seat is not released), is kept
 * out of the keep loop (it is never re-seated), at most puffCap live at once (the oldest fade first), and goes
 * when it leaves the view or after puffLife. By lamplight the same event is a tap on clear cloth at the clock,
 * and the mote it calls (or lights) rises from there.
 *
 * Text (item 14): text is measured line by line, in document space, once on`);

// ---- numbers ----
swap(`/** Ink-brown, the school's --cc-ink. The seeds are drawn in it. */`,
`/** The clock's release (Stage 6 w3 task 23): at most puffCap released seeds live at once, each for puffLife ms
    (the last puffFade ms of it a fade), leaving the head with a kick (px/s) that the breeze takes back over. */
const PUFF = { cap: 30, life: 42000, fade: 2500, kickX: [20, 85], kickY: [15, 60], tries: 14, window: 1200 } as const;
/** Ink-brown, the school's --cc-ink. The seeds are drawn in it. */`);

swap(`  call: { x: number; y: number; until: number } | null;`,
`  call: { x: number; y: number; until: number; rise: boolean } | null;`);

swap(`  held: boolean;
}
type Pt = [number, number];`,
`  held: boolean;
  /** A seed released by the clock: outside the keep loop, gone at dieAt (ms). */
  puff?: boolean;
  dieAt?: number;
}
type Pt = [number, number];`);

// ---- state ----
swap(`    const tap = { x: 0, y: 0, pending: false, clear: false };`,
`    const tap = { x: 0, y: 0, pending: false, clear: false, rise: false };
    /** The clock's release waiting for the next frame (see the header). */
    let blow: { at: number; x: number; y: number; r: number; n: number; points: Array<{ x: number; y: number }> } | null = null;`);

// ---- dark: the called mote rises ----
swap(`      const m = nearest ?? newFirefly(tap.x, tap.y, 1.8);
      if (nearest) {
        m.call = { x: tap.x, y: tap.y, until: t + FIREFLY.callMs };
      } else {`,
`      const m = nearest ?? newFirefly(tap.x, tap.y, 1.8);
      if (nearest) {
        m.call = { x: tap.x, y: tap.y, until: t + FIREFLY.callMs, rise: tap.rise };
      } else {
        // From the clock a new mote lifts off the head.
        if (tap.rise) { m.vy = -0.7; m.vx = (Math.random() - 0.5) * 0.2; }`);

swap(`            if (t >= m.call.until) m.call = null;`,
`            if (t >= m.call.until) {
              // A mote called to the clock lifts off it.
              if (m.call.rise) m.vy = -0.7;
              m.call = null;
            }`);

// ---- light: the keep loop leaves puffs alone ----
swap(`          for (const s of seeds) if (!s.held && s.cover > 0.5 && edgeFade(s) > 0.5 && seedOnShow(`,
`          for (const s of seeds) if (!s.held && !s.puff && s.cover > 0.5 && edgeFade(s) > 0.5 && seedOnShow(`);
swap(`            if (s.held) continue;
            // Only a seed nobody can see is moved`,
`            if (s.held || s.puff) continue;
            // Only a seed nobody can see is moved`);

// ---- light: a puff dies, leaves, fades ----
swap(`      for (const s of seeds) {
        if (s.held) continue;
        if (!still) {
          s.swayPhase += s.swayRate * dt;`,
`      let spent = false;
      for (const s of seeds) {
        if (s.held) continue;
        if (s.puff && t >= (s.dieAt ?? 0)) { spent = true; continue; }
        if (!still) {
          s.swayPhase += s.swayRate * dt;`);
swap(`          if (s.x > width + 50 || s.y < -60 || s.x < -90 || s.y > height + 90) spawnSeed(s, false);`,
`          if (s.x > width + 50 || s.y < -60 || s.x < -90 || s.y > height + 90) {
            // A released seed that leaves the view is gone; the others come back in from an edge.
            if (s.puff) { s.dieAt = t; continue; }
            spawnSeed(s, false);
          }`);
swap(`        const a = s.alpha * s.cover * edgeFade(s);
        if (a < 0.01) continue;`,
`        const a = s.alpha * s.cover * edgeFade(s) * (s.puff ? Math.min(1, Math.max(0, ((s.dieAt ?? 0) - t) / PUFF.fade)) : 1);
        if (a < 0.01) continue;`);
swap(`        ctx.restore();
      }
      ctx.globalAlpha = 1;
    };

    const draw = (t: number, dt: number, still: boolean) => {`,
`        ctx.restore();
      }
      if (spent) seeds = seeds.filter((s) => !(s.puff && t >= (s.dieAt ?? 0)));
      ctx.globalAlpha = 1;
    };

    /** The clock's release by day: up to rel.n seeds leave the head, each only where it has a strict seat. */
    const releasePuff = (t: number, sy: number, rel: NonNullable<typeof blow>) => {
      if (!fontsSettled || !rel.points.length) return;
      // Room for them: the oldest puffs fade first.
      const live = seeds.filter((s) => s.puff);
      const over = live.length + rel.n - PUFF.cap;
      if (over > 0) {
        live.sort((a, b) => (a.dieAt ?? 0) - (b.dieAt ?? 0));
        for (const s of live.slice(0, over)) s.dieAt = Math.min(s.dieAt ?? 0, t + 700);
      }
      for (let i = 0; i < rel.n; i++) {
        const from = rel.points[i % rel.points.length];
        const drift = rand(0.7, 1.35);
        const vx = SEED.windX * drift;
        const vy = SEED.windY * drift;
        const base = rand(SEED.sizeMin, SEED.sizeMax);
        const s: Seed = {
          x: from.x,
          y: from.y,
          vx,
          vy,
          size: base,
          base,
          sprite: i % 2,
          drift,
          swayPhase: Math.random() * Math.PI * 2,
          swayRate: (Math.PI * 2) / rand(3.6, 6.4),
          swayAmp: rand(5, 11),
          turnPhase: Math.random() * Math.PI * 2,
          turnRate: (Math.PI * 2) / rand(7, 13),
          alpha: rand(SEED.alphaMin, SEED.alphaMax),
          cover: 0,
          seatedAt: t,
          held: false,
          puff: true,
          dieAt: t + PUFF.life + rand(-4000, 4000),
        };
        const turn = turnOf(s);
        const angle = angleOf(s);
        const sizes = [base, SEED.sizeMin + (base - SEED.sizeMin) / 2, SEED.sizeMin];
        let placed = false;
        for (let k = 0; k < PUFF.tries && !placed; k++) {
          // Off the head's rim, a few px round the seed's own place.
          const x = from.x + rand(-7, 7);
          const y = from.y + rand(-7, 7);
          for (const size of sizes) {
            const kk = size * SEED.spriteScale;
            if (!seatClear(x, y, kk, sy, turn, angle) || seatLife(x, y, kk, vx, vy, sy, turn, angle) < SEED.seatMinLife) continue;
            s.x = x;
            s.y = y;
            s.size = size;
            placed = true;
            break;
          }
        }
        if (!placed) continue;
        // The puff: up and across, then the breeze takes it back over (the same settle as a tap's kick).
        s.vx = vx + rand(PUFF.kickX[0], PUFF.kickX[1]);
        s.vy = vy - rand(PUFF.kickY[0], PUFF.kickY[1]);
        seeds.push(s);
      }
    };

    const draw = (t: number, dt: number, still: boolean) => {`);

// ---- draw: take the release before the branch ----
swap(`      const switched = now !== branch;
      branch = now;
      if (now === 'dark') drawFireflies(t, still, sy, dsy, switched);`,
`      const switched = now !== branch;
      branch = now;
      if (blow) {
        const b = blow;
        blow = null;
        if (t - b.at < PUFF.window) {
          if (now === 'dark') {
            // A tap on clear cloth at the clock; the mote it calls rises.
            tap.x = b.x;
            tap.y = b.y;
            tap.clear = true;
            tap.rise = true;
            tap.pending = true;
          } else releasePuff(t, sy, b);
        }
      }
      if (now === 'dark') drawFireflies(t, still, sy, dsy, switched);`);
swap(`      tap.pending = false;
    };

    const tick`, `      tap.pending = false;
      tap.rise = false;
    };

    const tick`);

// ---- pointer: toys keep their own presses ----
swap(`    const tapIsClear = (e: PointerEvent) => {`,
`    /** A press on a toy (the clock, the date stamp) is the toy's, not a tap on the cloth. */
    const onToy = (e: PointerEvent) => e.target instanceof Element && !!e.target.closest('[data-cc-toy]');
    const tapIsClear = (e: PointerEvent) => {`);
swap(`    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') {`,
`    const onPointerDown = (e: PointerEvent) => {
      if (onToy(e)) return;
      if (e.pointerType === 'mouse') {`);
swap(`    const onPointerCancel = (e: PointerEvent) => {
      presses.delete(e.pointerId);
    };`,
`    const onPointerCancel = (e: PointerEvent) => {
      presses.delete(e.pointerId);
    };
    const onBlow = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (d && Number.isFinite(d.x) && Number.isFinite(d.y)) blow = { at: performance.now(), x: d.x, y: d.y, r: d.r, n: d.n, points: d.points ?? [] };
    };`);
swap(`    window.addEventListener('pointercancel', onPointerCancel, { passive: true });
    document.documentElement`,
`    window.addEventListener('pointercancel', onPointerCancel, { passive: true });
    window.addEventListener('cc:blow', onBlow);
    document.documentElement`);
swap(`      window.removeEventListener('pointercancel', onPointerCancel);
      presses.clear();`,
`      window.removeEventListener('pointercancel', onPointerCancel);
      window.removeEventListener('cc:blow', onBlow);
      blow = null;
      presses.clear();`);

writeFileSync(FILE, src.replace(/\n/g, '\r\n'));
console.log('fx.ts edited');
