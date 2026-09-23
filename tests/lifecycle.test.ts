import { describe, it, expect, vi } from 'vitest';
import { onMount, type LifecycleEnv } from '../src/lib/lifecycle';

function fakeEnv() {
  const docTarget = new EventTarget();
  const winTarget = new EventTarget();
  const env = {
    doc: Object.assign(docTarget, { body: {} as object | null }),
    win: winTarget,
  };
  return {
    env: env as unknown as LifecycleEnv,
    swapBody() { env.doc.body = {}; },
    fire(target: 'doc' | 'win', type: string, init: Record<string, unknown> = {}) {
      const e = Object.assign(new Event(type), init);
      (target === 'doc' ? docTarget : winTarget).dispatchEvent(e);
    },
  };
}

describe('onMount', () => {
  it('mounts the current body immediately, once', () => {
    const f = fakeEnv();
    const fn = vi.fn();
    onMount(fn, f.env);
    expect(fn).toHaveBeenCalledTimes(1);
    f.fire('doc', 'astro:page-load'); // the router's initial page-load for the same body
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('tears down before a swap and mounts the new body on page-load', () => {
    const f = fakeEnv();
    const teardown = vi.fn();
    const fn = vi.fn(() => teardown);
    onMount(fn, f.env);
    f.fire('doc', 'astro:before-swap');
    expect(teardown).toHaveBeenCalledTimes(1);
    f.swapBody();
    f.fire('doc', 'astro:page-load');
    expect(fn).toHaveBeenCalledTimes(2);
    f.fire('doc', 'astro:before-swap');
    expect(teardown).toHaveBeenCalledTimes(2);
  });

  it('never runs a teardown twice', () => {
    const f = fakeEnv();
    const teardown = vi.fn();
    onMount(() => teardown, f.env);
    f.fire('doc', 'astro:before-swap');
    f.fire('win', 'pagehide', { persisted: false });
    expect(teardown).toHaveBeenCalledTimes(1);
  });

  it('tears down on a real pagehide but not on a bfcache freeze', () => {
    const f = fakeEnv();
    const teardown = vi.fn();
    onMount(() => teardown, f.env);
    f.fire('win', 'pagehide', { persisted: true });
    expect(teardown).not.toHaveBeenCalled();
    f.fire('win', 'pagehide', { persisted: false });
    expect(teardown).toHaveBeenCalledTimes(1);
  });

  it('releases a stale mount if a new body arrives without before-swap', () => {
    const f = fakeEnv();
    const teardown = vi.fn();
    onMount(() => teardown, f.env);
    f.swapBody();
    f.fire('doc', 'astro:page-load');
    expect(teardown).toHaveBeenCalledTimes(1);
  });

  it('accepts a mount with no teardown', () => {
    const f = fakeEnv();
    onMount(() => {}, f.env);
    expect(() => f.fire('doc', 'astro:before-swap')).not.toThrow();
  });
});
