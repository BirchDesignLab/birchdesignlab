import { describe, it, expect } from 'vitest';
import { drawBarkDashes, parseColor } from '../src/lib/bark/draw2d';
import type { Dash } from '../src/lib/bark/pattern';

function mockCtx() {
  const calls: string[] = [];
  const ctx = {
    alphas: [] as number[],
    set globalAlpha(v: number) { this.alphas.push(v); },
    get globalAlpha() { return this.alphas[this.alphas.length - 1] ?? 1; },
    fillStyle: '',
    save: () => calls.push('save'),
    restore: () => calls.push('restore'),
    translate: (_x: number, _y: number) => calls.push('translate'),
    rotate: (_r: number) => calls.push('rotate'),
    beginPath: () => calls.push('beginPath'),
    roundRect: (_x: number, _y: number, _w: number, _h: number, _r: number) => calls.push('roundRect'),
    fill: () => calls.push('fill'),
  };
  return { ctx, calls };
}

const dash = (shade: number): Dash => ({ x: 0.5, y: 0.5, w: 0.1, h: 0.005, rot: 0, shade });

describe('drawBarkDashes', () => {
  it('draws one rounded rect per dash', () => {
    const { ctx, calls } = mockCtx();
    drawBarkDashes(ctx as never, [dash(0), dash(1)], '#f4f0e6', 1200, 630);
    expect(calls.filter((c) => c === 'roundRect')).toHaveLength(2);
    expect(calls.filter((c) => c === 'save')).toHaveLength(2);
    expect(calls.filter((c) => c === 'restore')).toHaveLength(2);
  });

  it('maps shade through the alpha range', () => {
    const { ctx } = mockCtx();
    drawBarkDashes(ctx as never, [dash(0), dash(1)], '#f4f0e6', 1200, 630, 0.05, 0.22);
    expect(ctx.alphas[0]).toBeCloseTo(0.05);
    expect(ctx.alphas[1]).toBeCloseTo(0.22);
  });
});

describe('parseColor re-home', () => {
  it('still parses hex', () => {
    expect(parseColor('#f4f0e6')[0]).toBeCloseTo(0xf4 / 255);
  });
});
