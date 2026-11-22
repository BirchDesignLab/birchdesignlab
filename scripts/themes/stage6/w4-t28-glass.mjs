/**
 * Stage 6 wave 4, task 28 (18/C2): the glass lens's flick-back keeps its
 * throw. 1024x768, both schemes. The lens is carried slowly into the open
 * strip below the hero window and let rest, then flicked: out 60px and back
 * through the start in about 110 ms, released within 2px of where it was
 * pressed. Before the fix isTap saw only the release point (2px from the
 * press), called it a tap and put the lens back; now the farthest point of
 * the hold counts and the lens glides on.
 *
 *   LABEL=before node scripts/themes/snap.mjs --name stage6-w3 --reuse --port 4470 -- node scripts/themes/stage6/w4-t28-glass.mjs
 *   LABEL=after  node scripts/themes/snap.mjs --name s6-w4-t28  --reuse --port 4470 -- node scripts/themes/stage6/w4-t28-glass.mjs
 *
 * Also checks a real tap (3px of jitter) still leaves the lens where it was.
 * Output: .out/stage6/w4/t28/glass/<LABEL>/ (strips and glass.json)
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { launch, open, startFilm, strip, pickAt, OUT } from './w4-t28-lib.mjs';

const LABEL = process.env.LABEL || 'head';
const D = join(OUT, 'glass', LABEL);
await mkdir(D, { recursive: true });
const { browser } = await launch();
const R = { label: LABEL, runs: {} };
const fails = [];

const waitLens = (page) => page.waitForFunction(() => document.querySelector('.lens-canvas')?.style.visibility === 'visible', null, { timeout: 9000 }).then(() => true).catch(() => false);
const lensState = (page) => page.evaluate(() => {
  const hits = document.querySelectorAll('.lens-hit');
  const hit = hits[hits.length - 1];
  if (!hit) return { hits: 0 };
  const q = hit.getBoundingClientRect();
  const cx = q.left + q.width / 2, cy = q.top + q.height / 2, r = q.width / 2;
  let best = null, bestD = -1;
  for (let y = -r + 3; y < r; y += 6) for (let x = -r + 3; x < r; x += 6) {
    if (x * x + y * y > r * r) continue;
    if (document.elementFromPoint(cx + x, cy + y) === hit) { const d = -Math.hypot(x, y); if (d > bestD || !best) { bestD = d; best = [cx + x, cy + y]; } }
  }
  return { c: [cx, cy], r, open: best };
});

for (const scheme of ['light', 'dark']) {
  const tag = `${scheme}__1024`;
  const { ctx, page, errors } = await open(browser, { path: '/t/glassmorphism/', width: 1024, scheme, height: 768, hideSwitcher: true, settle: 0 });
  await waitLens(page);
  await page.waitForTimeout(700);
  const win = await page.evaluate(() => { const r = document.querySelector('.hero .window').getBoundingClientRect(); return { b: r.bottom }; });
  // The hero window fills the travel box but for its margins: scroll so its foot sits mid-screen and open wallpaper lies below it.
  await page.evaluate((y) => scrollTo(0, y), Math.round(win.b - 420));
  await page.waitForTimeout(1500);

  /** Carry the lens (slowly, no throw) so its centre rests at `to`. */
  const carryTo = async (to) => {
    const s = await lensState(page);
    const g = s.open ?? s.c;
    const off = [g[0] - s.c[0], g[1] - s.c[1]];
    const dest = [to[0] + off[0], to[1] + off[1]];
    await page.mouse.move(g[0], g[1]);
    await page.mouse.down();
    for (let i = 1; i <= 24; i++) { await page.mouse.move(g[0] + ((dest[0] - g[0]) * i) / 24, g[1] + ((dest[1] - g[1]) * i) / 24, { steps: 2 }); await page.waitForTimeout(20); }
    await page.waitForTimeout(300);
    await page.mouse.up();
    await page.waitForTimeout(1500);
    return lensState(page);
  };
  const track = async (ms) => { const path = []; const t0 = Date.now(); while (Date.now() - t0 < ms) { const s = await lensState(page); path.push({ t: Date.now() - t0, c: s.c.map((v) => +v.toFixed(1)) }); await page.waitForTimeout(60); } return path; };

  const rest = await carryTo([512, 690]);
  R.runs[tag] = { rest: rest.c, window: win, errors };
  /** Press on the lens, go `out` px along `dir`, come back to the press point, release. */
  const flick = async (name, dir, out, finalJitter) => {
    const s0 = await carryTo([512, 690]);
    const g = s0.open ?? s0.c;
    const film = await startFilm(page);
    await page.mouse.move(g[0], g[1]);
    await page.mouse.down();
    for (let i = 1; i <= 6; i++) { await page.mouse.move(g[0] + (dir[0] * out * i) / 6, g[1] + (dir[1] * out * i) / 6); await page.waitForTimeout(8); }
    for (let i = 5; i >= 0; i--) { await page.mouse.move(g[0] + (dir[0] * out * i) / 6 + (i === 0 ? finalJitter[0] : 0), g[1] + (dir[1] * out * i) / 6 + (i === 0 ? finalJitter[1] : 0)); await page.waitForTimeout(8); }
    await page.mouse.up();
    const path = await track(1800);
    const end = await lensState(page);
    const frames = await film.stop();
    const moved = +Math.hypot(end.c[0] - s0.c[0], end.c[1] - s0.c[1]).toFixed(1);
    const far = +Math.max(...path.map((p) => Math.hypot(p.c[0] - s0.c[0], p.c[1] - s0.c[1]))).toFixed(1);
    R.runs[tag][name] = { start: s0.c, end: end.c, moved, far };
    await strip(pickAt(frames, [-1, 60, 120, 200, 300, 420, 560, 720, 900, 1100, 1400, 1800]), join(D, `flick-${name}__${tag}.png`), `${LABEL} glass ${tag}: ${name} (out ${out}px and back, released ${finalJitter.join(',')}px from the press); the lens ends ${moved}px from where it started`, { cols: 6, cellW: 260 });
    console.log(LABEL, tag, name, JSON.stringify({ start: s0.c, end: end.c, moved, far }));
    return { moved };
  };
  // Along the open strip (the lens glides left or right along it, as a throw does).
  const a = await flick('flick-right-and-back', [1, 0], 60, [2, 0]);
  const b = await flick('flick-left-and-back', [-1, 0], 60, [-2, 0]);
  const c = await flick('flick-up-left-and-back', [-0.7, -0.7], 60, [0, 0]);
  // A real tap still stays put: 3px of jitter.
  const t = await flick('tap-3px', [1, 0], 3, [0, 0]);
  R.runs[tag].verdict = { flicksThrow: [a.moved, b.moved, c.moved].map((m) => m > 20), tapStays: t.moved <= 1 };
  if (LABEL === 'after') {
    for (const [n, m] of [['right', a.moved], ['left', b.moved], ['up-left', c.moved]]) if (!(m > 20)) fails.push(`${tag} flick-${n}: the lens only moved ${m}px (a tap, not a throw)`);
    if (t.moved > 1) fails.push(`${tag}: a 3px tap moved the lens ${t.moved}px`);
  }
  await ctx.close();
}
await writeFile(join(D, 'glass.json'), JSON.stringify(R, null, 1));
console.log(fails.length ? `FAIL\n${fails.join('\n')}` : `${LABEL}: done`);
await browser.close();
