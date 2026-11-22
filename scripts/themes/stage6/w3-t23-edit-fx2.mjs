/**
 * Stage 6 wave 3, task 23, second pass on fx.ts (found by w3-t23-probe.mjs): a puff is seated against the path its
 * kick will take (not only the settled drift), and the tap from the clock in the dark lights four flashes so the
 * mote is seen rising. fx.ts is CRLF; each replacement must match once.
 *   node scripts/themes/stage6/w3-t23-edit-fx2.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = new URL('../../../src/themes/cottagecore/fx.ts', import.meta.url);
let src = readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n');
function swap(from, to) {
  const n = src.split(from).length - 1;
  if (n !== 1) throw new Error(`expected one match, found ${n}: ${from.slice(0, 80)}`);
  src = src.replace(from, () => to);
}

swap(`        const turn = turnOf(s);
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
        seeds.push(s);`,
`        const turn = turnOf(s);
        const angle = angleOf(s);
        const sizes = [base, SEED.sizeMin + (base - SEED.sizeMin) / 2, SEED.sizeMin];
        let placed = false;
        for (let k = 0; k < PUFF.tries && !placed; k++) {
          // Off the head's rim, a few px round the seed's own place, with a kick up and across that the
          // breeze then takes back over (the same settle as a tap's kick). The seat is tested along that
          // path, not only along the drift it settles to: where the kick would carry the seed into a line
          // of text it would only fade out, and a seed that fades out was never seated.
          const x = from.x + rand(-7, 7);
          const y = from.y + rand(-7, 7);
          const kx = rand(PUFF.kickX[0], PUFF.kickX[1]);
          const ky = rand(PUFF.kickY[0], PUFF.kickY[1]);
          // Where the kick has carried it once the breeze has the seed again (the kick's own travel is its speed times the settle).
          const sx = x + kx * SEED.settle;
          const sy2 = y - ky * SEED.settle;
          for (const size of sizes) {
            const kk = size * SEED.spriteScale;
            const along = SEED.lookAhead;
            if (
              !seatClear(x, y, kk, sy, turn, angle) ||
              !seatClear(x + (vx + kx) * along, y + (vy - ky) * along, kk, sy, turn, angle) ||
              !seatClear(sx, sy2, kk, sy, turn, angle) ||
              seatLife(sx, sy2, kk, vx, vy, sy, turn, angle) < SEED.seatMinLife
            ) continue;
            s.x = x;
            s.y = y;
            s.size = size;
            s.vx = vx + kx;
            s.vy = vy - ky;
            placed = true;
            break;
          }
        }
        if (!placed) continue;
        seeds.push(s);`);

swap(`      m.flashes = makeBurst(t + (nearest ? FIREFLY.callLead : 100), 2);`,
`      // From the clock four flashes, so the mote is seen rising; a tap on the cloth keeps two.
      m.flashes = makeBurst(t + (nearest ? FIREFLY.callLead : 100), tap.rise ? 4 : 2);`);
swap(`if (tap.rise) { m.vy = -1; m.vx = (Math.random() - 0.5) * 0.2; }`, `if (tap.rise) { m.vy = -1.4; m.vx = (Math.random() - 0.5) * 0.2; }`);
swap(`if (m.call.rise) m.vy = -1;`, `if (m.call.rise) m.vy = -1.4;`);

writeFileSync(FILE, src.replace(/\n/g, '\r\n'));
console.log('fx.ts edited (second pass)');
