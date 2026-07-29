import { describe, it, expect } from 'vitest';
import { drawCloth, tileDims, THREAD_PX, SHADOW_ALPHA, type ClothView } from '../src/lib/weave/render2d';
import type { Draft } from '../src/lib/weave/draft';

const plain: Draft = {
  shafts: 4,
  treadles: 6,
  threading: [0, 1, 2, 3],
  tieUp: [
    [true, false, true, false],
    [false, true, false, true],
    [false, false, false, false],
    [false, false, false, false],
    [false, false, false, false],
    [false, false, false, false],
  ],
  treadling: [0, 1],
};

function mockCtx() {
  let rects = 0;
  const styles = new Set<string>();
  const ctx = {
    globalAlpha: 1,
    _fillStyle: '',
    set fillStyle(v: string) { this._fillStyle = v; styles.add(v); },
    get fillStyle() { return this._fillStyle; },
    save: () => {},
    restore: () => {},
    translate: () => {},
    rotate: () => {},
    beginPath: () => {},
    roundRect: () => { rects++; },
    fill: () => {},
  };
  return { ctx, rectCount: () => rects, styles };
}

const view = (picks: number): ClothView => ({
  draft: plain,
  warp: [{ yarn: 'a', count: 1 }],
  picks: Array.from({ length: picks }, (_, i) => ({ treadle: i % 2, weftYarn: 'b' })),
  yarnHex: (id) => (id === 'a' ? '#e8dfc9' : '#33465e'),
  seed: 42,
});

describe('drawCloth', () => {
  it('draws nothing woven when there are no picks, but still draws warp threads', () => {
    const m = mockCtx();
    drawCloth(m.ctx as never, view(0), 400, 300);
    expect(m.rectCount()).toBeGreaterThan(0); // unwoven warp is visible
  });

  it('draws more with more picks', () => {
    const a = mockCtx();
    drawCloth(a.ctx as never, view(2), 400, 300);
    const b = mockCtx();
    drawCloth(b.ctx as never, view(10), 400, 300);
    expect(b.rectCount()).toBeGreaterThan(a.rectCount());
  });

  it('uses both yarn colors', () => {
    const m = mockCtx();
    drawCloth(m.ctx as never, view(6), 400, 300);
    expect(m.styles.has('#e8dfc9')).toBe(true);
    expect(m.styles.has('#33465e')).toBe(true);
  });
});

describe('tileDims', () => {
  it('plain weave with solid yarns tiles at threading x treadling', () => {
    expect(tileDims(plain, [{ yarn: 'a', count: 1 }], [{ yarn: 'b', count: 1 }])).toEqual({ ends: 4, picks: 2 });
  });

  it('stripe sequences stretch the tile to the lcm', () => {
    // threading 4 x warp stripes 6 -> 12 ends; treadling 2 x weft stripes 8 -> 8 picks
    expect(
      tileDims(plain, [{ yarn: 'a', count: 4 }, { yarn: 'b', count: 2 }], [{ yarn: 'a', count: 4 }, { yarn: 'b', count: 4 }]),
    ).toEqual({ ends: 12, picks: 8 });
  });
});

describe('knobs', () => {
  it('thread size is a sane positive knob', () => {
    expect(THREAD_PX).toBeGreaterThan(2);
  });

  it('crossing shadow is on by default', () => {
    expect(SHADOW_ALPHA).toBeGreaterThan(0);
    expect(SHADOW_ALPHA).toBeLessThan(1);
  });
});
