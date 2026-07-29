import { describe, it, expect } from 'vitest';
import { renderTile, tileSizePx } from '../src/lib/weave/export';
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
  return {
    ctx: {
      globalAlpha: 1, fillStyle: '',
      save: () => {}, restore: () => {}, translate: () => {}, rotate: () => {},
      beginPath: () => {}, roundRect: () => { rects++; }, fill: () => {},
    },
    rectCount: () => rects,
  };
}

const warp = [{ yarn: 'a', count: 1 }];
const weft = [{ yarn: 'b', count: 1 }];
const hex = (id: string) => (id === 'a' ? '#e8dfc9' : '#33465e');

describe('tileSizePx', () => {
  it('is repeat threads times thread size', () => {
    expect(tileSizePx(plain, warp, weft, 10)).toEqual({ w: 40, h: 20 });
  });
});

describe('renderTile', () => {
  it('reports the same size it drew and draws every crossing', () => {
    const m = mockCtx();
    const size = renderTile(m.ctx as never, plain, warp, weft, hex, 10);
    expect(size).toEqual({ w: 40, h: 20 });
    // 2 picks x (1 weft ground + lifted warp segments) plus sheen: at least one rect per crossing
    expect(m.rectCount()).toBeGreaterThanOrEqual(4 * 2);
  });
});
