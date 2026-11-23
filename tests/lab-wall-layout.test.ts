import { describe, expect, it } from 'vitest';
import { DESK, PHONE, layoutWall } from '../src/lib/lab-wall/layout';
import type { Rect } from '../src/lib/lab-wall/layout';
import { MINI_IDS } from '../src/lib/lab-wall/minis';

const IDS = [...MINI_IDS] as string[];
const WIDTHS = [1440, 1024, 720, 719, 390];
const box = (width: number) => ({ width, viewportHeight: 900, topHeight: 120 });
const EPS = 1e-6;

function overlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w - EPS && b.x < a.x + a.w - EPS && a.y < b.y + b.h - EPS && b.y < a.y + a.h - EPS;
}

function expectSound(ids: string[], width: number) {
  const { rects, height } = layoutWall(ids, box(width));
  const keys = Object.keys(rects);
  for (const id of ids) expect(rects[id], `${id} at ${width}`).toBeDefined();
  for (const id of keys) {
    const r = rects[id]!;
    expect(r.w, `${id} width`).toBeGreaterThan(0);
    expect(r.h, `${id} height`).toBeGreaterThan(0);
    expect(r.x, `${id} x`).toBeGreaterThanOrEqual(-EPS);
    expect(r.y, `${id} y`).toBeGreaterThanOrEqual(-EPS);
    expect(r.x + r.w, `${id} right edge at ${width}`).toBeLessThanOrEqual(width + EPS);
    expect(r.y + r.h, `${id} bottom edge at ${width}`).toBeLessThanOrEqual(height + EPS);
  }
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      expect(overlap(rects[keys[i]!]!, rects[keys[j]!]!), `${keys[i]} vs ${keys[j]} at ${width}`).toBe(false);
    }
  }
  return { rects, height };
}

describe('lab wall layout', () => {
  it('MINI_IDS and both maps agree', () => {
    const sorted = (a: string[]) => [...a].sort();
    expect(sorted(Object.keys(DESK))).toEqual(sorted(IDS));
    expect(sorted(Object.keys(PHONE))).toEqual(sorted(IDS));
    expect(new Set(IDS).size).toBe(IDS.length);
  });

  it('uses the phone map under 720 and the desktop map from 720', () => {
    expect(layoutWall(IDS, box(720)).phone).toBe(false);
    expect(layoutWall(IDS, box(719)).phone).toBe(true);
  });

  for (const width of WIDTHS) {
    it(`gives every piece a rectangle that fits, overlapping nothing, at ${width}`, () => {
      expectSound(IDS, width);
    });
  }

  it('fills the viewport below the header on desktop, with a floor', () => {
    expect(layoutWall(IDS, box(1440)).height).toBeCloseTo(900 - 120, 6);
    expect(layoutWall(IDS, { width: 1440, viewportHeight: 400, topHeight: 120 }).height).toBeCloseTo(540, 6);
  });

  for (const width of WIDTHS) {
    it(`gives unknown ids spill rectangles that overlap nothing at ${width}`, () => {
      const plain = layoutWall(IDS, box(width));
      const two = [...IDS, 'bdl-900', 'bdl-901'];
      const grown = expectSound(two, width);
      expect(grown.height).toBeGreaterThan(plain.height);
      // the mapped pieces stay exactly where they were
      for (const id of IDS) expect(grown.rects[id]).toEqual(plain.rects[id]);
      // the spill sits under the mosaic
      const lowest = Math.max(...IDS.map((id) => plain.rects[id]!.y + plain.rects[id]!.h));
      expect(grown.rects['bdl-900']!.y).toBeGreaterThanOrEqual(lowest);
      expect(grown.rects['bdl-901']!.y).toBeGreaterThanOrEqual(lowest);
    });
  }

  it('wraps a long spill into more rows and keeps everything inside', () => {
    const many = [...IDS, ...Array.from({ length: 9 }, (_, i) => `bdl-9${i}0`)];
    for (const width of WIDTHS) expectSound(many, width);
    const a = layoutWall([...IDS, 'bdl-950'], box(1440)).height;
    const b = layoutWall(many, box(1440)).height;
    expect(b).toBeGreaterThan(a);
  });

  it('leaves the cell empty for a mapped id that is not in the list', () => {
    const fewer = IDS.filter((id) => id !== 'bdl-007');
    for (const width of WIDTHS) {
      const { rects } = expectSound(fewer, width);
      expect(rects['bdl-007']).toBeUndefined();
      expect(Object.keys(rects)).toHaveLength(fewer.length);
    }
  });

  it('ignores a repeated id and an id that only exists on the prototype', () => {
    const { rects } = layoutWall([...IDS, 'bdl-900', 'bdl-900', 'constructor'], box(1440));
    expect(Object.keys(rects)).toHaveLength(IDS.length + 2);
  });
});
