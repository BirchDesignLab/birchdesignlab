/**
 * Stage 6 wave 4, task 30: one-off edit of the wave 3 tests whose pinned source changed.
 *   cottagecore t23  the clock's teardown aborts its beat; fx.ts skips only a cancel mark at opacity 0; toys.ts holds the beat
 *   cottagecore t27  the light rose thread is --cc-rose-deep, dark's top thread is deepened, the needle stops its beat
 *   gm t26           the pivot is the screen top of a turned plate (hangPoint, swingTransform)
 * Kept for the record; each hunk checks its anchor, so it refuses to run twice.
 *
 *   node scripts/themes/stage6/w4-t30-edit-tests.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';

function edit(file, hunks) {
  let src = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  for (const [name, from, to] of hunks) {
    if (src.split(from).length !== 2) throw new Error(`${file} hunk "${name}": anchor missing or not unique (already applied?)`);
    src = src.replace(from, () => to);
    console.log('ok', file, name);
  }
  writeFileSync(file, src);
}

edit('tests/cottagecore-stage6-t23.test.ts', [
  ['teardown-abort',
`    expect(toys).toMatch(/alive = false;\\s*asked\\.clear\\(\\);/);`,
`    expect(toys).toMatch(/alive = false;\\s*abort\\.abort\\(\\);\\s*asked\\.clear\\(\\);/);`],
  ['cancel-pad',
`    expect(fx).toMatch(/closest\\('\\.cancel-pad'\\)/);`,
`    expect(fx).toMatch(/closest\\('\\.cancel-pad \\.cm'\\)/);`],
  ['io-disconnect',
`    expect(toys).toMatch(/io\\?\\.disconnect\\(\\);/);`,
`    // the one-shot nudge is the touch beat now (Stage 6 w4 task 30): it stops with the toy
    expect(toys).toContain("import { scheduleBeat } from '../bauhaus/parts/beat';");
    expect(toys).toMatch(/const stop = scheduleBeat\\(key, \\[el\\],/);
    expect(toys).toMatch(/stop\\(\\);\\s*el\\.removeEventListener\\('animationend', off\\);/);`],
]);

edit('tests/cottagecore-stage6-t27.test.ts', [
  ['css-rose',
`    expect(css).toContain("--thread-rose: var(--cc-rose-petal);");
    expect(css).toContain('--thread-rose: #b85f6c;');`,
`    // light: the school's rose-deep over dark's edge colour (Stage 6 w4 task 30, critique B3); dark: deepened to clear 3:1
    expect(css).toContain("--thread-rose: var(--cc-rose-deep);");
    expect(css).toContain('--thread-rose: #a24a58;');`],
  ['stop-beat',
`    expect(needle).toContain('nudgeIo?.disconnect()');`,
`    expect(needle).toContain('stopBeat();');
    expect(needle).toContain('ro?.disconnect();');`],
]);

edit('tests/gm-stage6-w3-t26.test.ts', [
  ['hang-point',
`  it('puts the hanging point at the top rim of the turned plate', () => {
    const p = hangPoint({ x: 100, y: 100 }, 40, 0);
    expect(p).toEqual({ x: 100, y: 80 });
    const q = hangPoint({ x: 100, y: 100 }, 40, 90);
    expect(q.x).toBeCloseTo(120, 6);
    expect(q.y).toBeCloseTo(100, 6);
  });`,
`  it('puts the hanging point at the SCREEN top of the plate, whatever its resting turn (Stage 6 w4 task 30, 26/C4)', () => {
    const p = hangPoint({ x: 100, y: 100 }, 40, 0);
    expect(p.x).toBeCloseTo(100, 6);
    expect(p.y).toBeCloseTo(80, 6);
    for (const rest of [90, 20, -14, 8, -12]) {
      const q = hangPoint({ x: 100, y: 100 }, 40, rest);
      expect(q.x, String(rest)).toBeCloseTo(100, 6);
      expect(q.y, String(rest)).toBeCloseTo(80, 6);
    }
  });`],
  ['transform',
`    expect(swingTransform(4, 100)).toBe('translate(0, -50px) rotate(4.000deg) translate(0, 50px)');`,
`    expect(swingTransform(4, 100)).toBe('translate(0.000px, -50.000px) rotate(4.000deg) translate(0.000px, 50.000px)');
    // a plate resting at 90 degrees: the screen top is the plate's own left, so the offset is turned by minus the rest angle
    expect(swingTransform(4, 100, 90)).toBe('translate(-50.000px, 0.000px) rotate(4.000deg) translate(50.000px, 0.000px)');`],
]);
