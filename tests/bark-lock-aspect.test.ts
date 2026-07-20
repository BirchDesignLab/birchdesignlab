import { describe, it, expect, vi } from 'vitest';
import { drawBarkDashes } from '../src/lib/bark/draw2d';
import { BARK_VERT_SOURCE, renderBark2D } from '../src/lib/bark/renderer';
import type { Dash } from '../src/lib/bark/pattern';

function mockCtx() {
  const rects: Array<[number, number, number, number, number]> = [];
  const ctx = {
    globalAlpha: 1,
    fillStyle: '',
    save() {},
    restore() {},
    translate(_x: number, _y: number) {},
    rotate(_r: number) {},
    beginPath() {},
    roundRect(x: number, y: number, w: number, h: number, r: number) {
      rects.push([x, y, w, h, r]);
    },
    fill() {},
  };
  return { ctx, rects };
}

const dash = (): Dash => ({ x: 0.5, y: 0.5, w: 0.1, h: 0.02, rot: 0, shade: 0.5 });

describe('drawBarkDashes lockAspect', () => {
  it('measures dash width against the canvas width when off (default)', () => {
    const { ctx, rects } = mockCtx();
    drawBarkDashes(ctx as never, [dash()], '#f4f0e6', 1000, 200);
    expect(rects[0][2]).toBeCloseTo(0.1 * 1000);
  });

  it('measures dash width against the canvas height when on', () => {
    const { ctx, rects } = mockCtx();
    drawBarkDashes(ctx as never, [dash()], '#f4f0e6', 1000, 200, 0.05, 0.22, true);
    expect(rects[0][2]).toBeCloseTo(0.1 * 200);
  });

  it('leaves dash height alone when on', () => {
    const { ctx, rects } = mockCtx();
    drawBarkDashes(ctx as never, [dash()], '#f4f0e6', 1000, 200, 0.05, 0.22, true);
    expect(rects[0][3]).toBeCloseTo(0.02 * 200);
  });

  it('keeps dash shape identical across canvas aspects when on', () => {
    const wide = mockCtx();
    const tall = mockCtx();
    drawBarkDashes(wide.ctx as never, [dash()], '#f4f0e6', 1600, 400, 0.05, 0.22, true);
    drawBarkDashes(tall.ctx as never, [dash()], '#f4f0e6', 400, 400, 0.05, 0.22, true);
    const ratio = (r: [number, number, number, number, number]) => r[2] / r[3];
    expect(ratio(wide.rects[0])).toBeCloseTo(ratio(tall.rects[0]));
  });

  it('stretches dash shape across canvas aspects when off', () => {
    const wide = mockCtx();
    const tall = mockCtx();
    drawBarkDashes(wide.ctx as never, [dash()], '#f4f0e6', 1600, 400);
    drawBarkDashes(tall.ctx as never, [dash()], '#f4f0e6', 400, 400);
    const ratio = (r: [number, number, number, number, number]) => r[2] / r[3];
    expect(ratio(wide.rects[0])).toBeGreaterThan(ratio(tall.rects[0]) * 3);
  });

  it('still floors the drawn height at 1.5px when on', () => {
    const { ctx, rects } = mockCtx();
    drawBarkDashes(ctx as never, [{ ...dash(), h: 0.0001 }], '#f4f0e6', 1000, 200, 0.05, 0.22, true);
    expect(rects[0][3]).toBe(1.5);
  });
});

describe('renderBark2D lockAspect', () => {
  function mockCanvas() {
    const { ctx, rects } = mockCtx();
    const canvas = {
      clientWidth: 1000,
      clientHeight: 200,
      width: 0,
      height: 0,
      getContext: () => ({ ...ctx, clearRect() {} }),
    };
    return { canvas, rects, ctx };
  }

  it('forwards the flag to the dash drawing', () => {
    vi.stubGlobal('devicePixelRatio', 1);
    const off = mockCanvas();
    const on = mockCanvas();
    renderBark2D(off.canvas as unknown as HTMLCanvasElement, [dash()], '#f4f0e6', 0.05, 0.22, false);
    renderBark2D(on.canvas as unknown as HTMLCanvasElement, [dash()], '#f4f0e6', 0.05, 0.22, true);
    expect(off.rects[0][2]).toBeCloseTo(0.1 * 1000);
    expect(on.rects[0][2]).toBeCloseTo(0.1 * 200);
    vi.unstubAllGlobals();
  });
});

describe('bark vertex shader lockAspect', () => {
  it('declares the uAspectLock uniform', () => {
    expect(BARK_VERT_SOURCE).toContain('uniform float uAspectLock');
  });

  it('divides the rotated offset x by the canvas aspect, gated by the uniform', () => {
    expect(BARK_VERT_SOURCE).toMatch(/p\.x \/= mix\(1\.0, aspect, uAspectLock\)/);
  });

  it('derives aspect from the resolution uniform', () => {
    expect(BARK_VERT_SOURCE).toMatch(/float aspect = uResolution\.x \/ max\(uResolution\.y, 1\.0\)/);
  });
});
