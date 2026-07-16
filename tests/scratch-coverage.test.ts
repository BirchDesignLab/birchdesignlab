import { describe, expect, it } from 'vitest';
import {
  createGrid, paintCircle, fractionPainted,
  advancePhase, STROKE_DONE, BLOOM_RUB,
} from '../src/lib/scratch/coverage';

describe('coverage grid', () => {
  it('starts empty', () => {
    const g = createGrid(10, 10);
    expect(fractionPainted(g)).toBe(0);
  });
  it('painting the center covers cells once', () => {
    const g = createGrid(10, 10);
    const first = paintCircle(g, 0.5, 0.5, 0.2);
    expect(first).toBeGreaterThan(0);
    expect(paintCircle(g, 0.5, 0.5, 0.2)).toBe(0); // idempotent repaint
    expect(fractionPainted(g)).toBeCloseTo(first / 100, 5);
  });
  it('a huge circle paints everything', () => {
    const g = createGrid(8, 8);
    paintCircle(g, 0.5, 0.5, 2);
    expect(fractionPainted(g)).toBe(1);
  });
  it('fractionPainted over a mask counts only masked cells', () => {
    const g = createGrid(2, 2);
    const mask = new Uint8Array([1, 0, 0, 1]); // two stroke cells
    paintCircle(g, 0.25, 0.25, 0.3); // paints top-left region
    expect(fractionPainted(g, mask)).toBeCloseTo(0.5, 5);
  });
  it('clamps circles at the edges without crashing', () => {
    const g = createGrid(4, 4);
    expect(() => paintCircle(g, -0.1, 1.2, 0.3)).not.toThrow();
  });
});

describe('advancePhase', () => {
  it('stays in dig below the stroke threshold', () => {
    expect(advancePhase('dig', STROKE_DONE - 0.01, 0)).toBe('dig');
  });
  it('moves dig to complete at the stroke threshold', () => {
    expect(advancePhase('dig', STROKE_DONE, 0)).toBe('complete');
  });
  it('moves complete to bloom after enough further rubbing', () => {
    expect(advancePhase('complete', 1, BLOOM_RUB)).toBe('bloom');
    expect(advancePhase('complete', 1, BLOOM_RUB - 0.01)).toBe('complete');
  });
  it('honors a custom bloom-rub threshold', () => {
    expect(advancePhase('complete', 1, 0.3, 0.4)).toBe('complete');
    expect(advancePhase('complete', 1, 0.4, 0.4)).toBe('bloom');
  });
  it('bloom is terminal', () => {
    expect(advancePhase('bloom', 0, 0)).toBe('bloom');
  });
});
