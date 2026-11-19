import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { afterArrivalIdle } from '../src/themes/glassmorphism/lens/idle-after-arrival';

// Stage 6, diagnosis C: the arrival path used to run its callback twice
// (MutationObserver, then the 2500 ms safety timer), mounting a ghost lens.
// No DOM in this suite's environment: a minimal window, document and
// MutationObserver stand in.

let observers: { cb: () => void; disconnected: boolean }[] = [];
let dataset: Record<string, string> = {};

class FakeMutationObserver {
  entry: { cb: () => void; disconnected: boolean };
  constructor(cb: () => void) {
    this.entry = { cb, disconnected: false };
    observers.push(this.entry);
  }
  observe() {}
  disconnect() { this.entry.disconnected = true; }
}

function clearArrivalMark() {
  delete dataset.fromTheme;
  for (const o of observers) if (!o.disconnected) o.cb();
}

beforeEach(() => {
  vi.useFakeTimers();
  observers = [];
  dataset = {};
  vi.stubGlobal('window', { setTimeout, clearTimeout });
  vi.stubGlobal('document', { documentElement: { dataset } });
  vi.stubGlobal('MutationObserver', FakeMutationObserver);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('afterArrivalIdle', () => {
  it('runs once on a plain load', () => {
    const cb = vi.fn();
    afterArrivalIdle(cb);
    vi.advanceTimersByTime(5000);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('runs once on an arrival, even after the safety timer would have fired', () => {
    dataset.fromTheme = 'quiet';
    const cb = vi.fn();
    afterArrivalIdle(cb);
    vi.advanceTimersByTime(300);
    clearArrivalMark();
    vi.advanceTimersByTime(5000);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('runs once when only the safety timer fires', () => {
    dataset.fromTheme = 'quiet';
    const cb = vi.fn();
    afterArrivalIdle(cb);
    vi.advanceTimersByTime(3000);
    clearArrivalMark();
    vi.advanceTimersByTime(3000);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('never runs once cancelled', () => {
    dataset.fromTheme = 'quiet';
    const cb = vi.fn();
    const stop = afterArrivalIdle(cb);
    stop();
    clearArrivalMark();
    vi.advanceTimersByTime(5000);
    expect(cb).not.toHaveBeenCalled();
  });

  it('uses requestIdleCallback when present, still once', () => {
    const idle = vi.fn((fn: () => void) => { setTimeout(fn, 10); return 1; });
    vi.stubGlobal('window', { setTimeout, clearTimeout, requestIdleCallback: idle, cancelIdleCallback: vi.fn() });
    dataset.fromTheme = 'quiet';
    const cb = vi.fn();
    afterArrivalIdle(cb);
    clearArrivalMark();
    vi.advanceTimersByTime(5000);
    expect(idle).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledTimes(1);
  });
});
