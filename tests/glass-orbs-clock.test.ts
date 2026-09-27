/**
 * Round 5 (R1, the round-4 critic's 820 jump): mountOrbClock must hand Home's
 * orbs from CSS to the clock and write the clock's positions synchronously,
 * so home-boot.ts's one start plan (planLensStart, right after the mount)
 * reads the orbs where they really are. A tiny fake DOM stands in for the
 * browser: no DOM library is installed, and the module only touches a handful
 * of APIs.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { mountOrbClock } from '../src/themes/glassmorphism/lens/orbs-clock';

interface FakeOrb {
  style: { translate: string; removeProperty(n: string): void };
  layoutTop: number; // document-relative top of the untransformed layout box
  height: number;
  rate: number;
  group: FakeGroup;
  readsWithoutClock: number;
  getBoundingClientRect(): { top: number; height: number; left: number; width: number };
}
interface FakeGroup {
  attrs: Set<string>;
  orbs: FakeOrb[];
  hasAttribute(n: string): boolean;
  setAttribute(n: string, v: string): void;
  removeAttribute(n: string): void;
  querySelectorAll(sel: string): FakeOrb[];
}

function makeGroup(specs: { top: number; h: number; rate: number }[]): FakeGroup {
  const group: FakeGroup = {
    attrs: new Set(),
    orbs: [],
    hasAttribute: (n) => group.attrs.has(n),
    setAttribute: (n) => void group.attrs.add(n),
    removeAttribute: (n) => void group.attrs.delete(n),
    querySelectorAll: () => group.orbs,
  };
  for (const s of specs) {
    const orb: FakeOrb = {
      style: { translate: '', removeProperty(n) { if (n === 'translate') this.translate = ''; } },
      layoutTop: s.top,
      height: s.h,
      rate: s.rate,
      group,
      readsWithoutClock: 0,
      getBoundingClientRect() {
        // Without data-clock the stylesheet's view() animation is running, and
        // an inline translate cannot override it: count such reads as wrong.
        if (!group.attrs.has('data-clock')) orb.readsWithoutClock++;
        const t = orb.style.translate;
        let dy = 0;
        if (t === '') dy = -s.h / 2; // the static -50% -50%
        else if (t !== 'none') dy = -s.h / 2 - Number(/-\s*([\d.]+)px/.exec(t)?.[1] ?? 0);
        return { top: s.top + dy - (globalThis as any).window.scrollY, height: s.h, left: 0, width: s.h };
      },
    };
    group.orbs.push(orb);
  }
  return group;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubDom(groups: FakeGroup[], scrollY: number, vh: number) {
  const rafs: FrameRequestCallback[] = [];
  vi.stubGlobal('window', { scrollY, innerHeight: vh, addEventListener() {}, removeEventListener() {} });
  vi.stubGlobal('document', { querySelectorAll: () => groups });
  vi.stubGlobal('getComputedStyle', (el: FakeOrb) => ({ getPropertyValue: () => String(el.rate) }));
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { rafs.push(cb); return rafs.length; });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  return rafs;
}

const expected = (top: number, h: number, rate: number, scrollY: number, vh: number) => {
  const p = Math.min(1, Math.max(0, (vh - (top - scrollY)) / (vh + h)));
  return rate * vh * p;
};

describe('mountOrbClock (round 5)', () => {
  it('writes every orb its clock position before it returns, live or not', () => {
    // 820 x 1180: the hero group (not yet data-live: fx.ts's observer has
    // not reported) and a group further down the page.
    const hero = makeGroup([{ top: 403 - 200, h: 400, rate: 0.35 }, { top: 832 - 37, h: 74, rate: 0.55 }]);
    const doors = makeGroup([{ top: 1900, h: 300, rate: 0.45 }]);
    const rafs = stubDom([hero, doors], 0, 1180);
    const stop = mountOrbClock();
    expect(rafs.length).toBe(1); // no frame has run yet
    for (const g of [hero, doors]) {
      expect(g.hasAttribute('data-clock')).toBe(true);
      for (const o of g.orbs) {
        const px = Number(/-\s*([\d.]+)px/.exec(o.style.translate)?.[1]);
        expect(px).toBeCloseTo(expected(o.layoutTop, o.height, o.rate, 0, 1180), 1);
        expect(o.readsWithoutClock).toBe(0); // measured with the CSS driver already off
      }
    }
    stop?.();
    for (const g of [hero, doors]) {
      expect(g.hasAttribute('data-clock')).toBe(false);
      for (const o of g.orbs) expect(o.style.translate).toBe('');
    }
  });
  it('measures the untransformed layout box (docTop independent of scroll)', () => {
    const hero = makeGroup([{ top: 300, h: 200, rate: 0.45 }]);
    stubDom([hero], 250, 900);
    mountOrbClock();
    const px = Number(/-\s*([\d.]+)px/.exec(hero.orbs[0].style.translate)?.[1]);
    expect(px).toBeCloseTo(expected(300, 200, 0.45, 250, 900), 1);
  });
});
