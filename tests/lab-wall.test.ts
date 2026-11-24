import { describe, expect, it } from 'vitest';
import {
  VIEW_KEY, counterLabel, hashFor, idFromHash, inFilter, readFilter, readView, stepTarget, tryLine, writeView,
} from '../src/lib/lab-wall/model';
import { bestLines, fit, per } from '../src/lib/lab-wall/minis/shared';
import { LAMP_INNER, LIT_SLEEP, LIT_WAKE, lingerRound, litCover, revealSteps } from '../src/lib/lab-wall/lamp';
import { MINI_IDS } from '../src/lib/lab-wall/minis';
import { POSTER_IDS, posterSrc } from '../src/lib/lab-wall/reserve';
import { detail as bayouDetail } from '../src/lib/lab-wall/minis/bdl-009';
import { detail as magnoliaDetail } from '../src/lib/lab-wall/minis/bdl-008';

const store = (initial: Record<string, string> = {}) => {
  const data = { ...initial };
  return {
    data,
    getItem: (k: string) => (k in data ? data[k]! : null),
    setItem: (k: string, v: string) => { data[k] = v; },
  };
};

describe('the remembered view', () => {
  it('is the wall unless the visitor chose the list', () => {
    expect(readView(store())).toBe('wall');
    expect(readView(store({ [VIEW_KEY]: 'list' }))).toBe('list');
    expect(readView(store({ [VIEW_KEY]: 'wall' }))).toBe('wall');
    expect(readView(store({ [VIEW_KEY]: 'grid' }))).toBe('wall');
  });
  it('survives storage that throws or is missing', () => {
    expect(readView(null)).toBe('wall');
    expect(readView({ getItem: () => { throw new Error('blocked'); } })).toBe('wall');
    expect(() => writeView({ setItem: () => { throw new Error('blocked'); } }, 'list')).not.toThrow();
    expect(() => writeView(null, 'list')).not.toThrow();
  });
  it('writes under the key the page script reads', () => {
    const s = store();
    writeView(s, 'list');
    expect(s.data[VIEW_KEY]).toBe('list');
  });
});

describe('the filter', () => {
  it('reads what the list script writes, and anything else as all', () => {
    expect(readFilter('experiment')).toBe('experiment');
    expect(readFilter('study')).toBe('study');
    expect(readFilter('all')).toBe('all');
    expect(readFilter(undefined)).toBe('all');
    expect(readFilter('nonsense')).toBe('all');
  });
  it('lets a piece through when its set is the filter, or the filter is all', () => {
    expect(inFilter('study', 'all')).toBe(true);
    expect(inFilter('study', 'study')).toBe(true);
    expect(inFilter('study', 'experiment')).toBe(false);
    expect(inFilter('experiment', 'experiment')).toBe(true);
    expect(inFilter('experiment', 'study')).toBe(false);
  });
});

describe('the "Try it" line', () => {
  it('says move and touch the way the device does them', () => {
    expect(tryLine('Move to turn it', false)).toBe('Try it: move to turn it');
    expect(tryLine('Move to turn it', true)).toBe('Try it: drag to turn it');
    expect(tryLine('Touch a node', false)).toBe('Try it: click a node');
    expect(tryLine('Touch a node', true)).toBe('Try it: touch a node');
  });
  it('leaves other hints as written, lower-cased at the front', () => {
    expect(tryLine('Scroll the page', false)).toBe('Try it: scroll the page');
  });
  it('is nothing for a piece with no miniature', () => {
    expect(tryLine(null, false)).toBeNull();
    expect(tryLine(undefined, true)).toBeNull();
    expect(tryLine('', false)).toBeNull();
  });
});

describe('stepping between pieces', () => {
  const pool = ['a', 'b', 'c'];
  it('moves one way or the other and wraps at the ends', () => {
    expect(stepTarget(pool, 'a', 1)).toBe('b');
    expect(stepTarget(pool, 'c', 1)).toBe('a');
    expect(stepTarget(pool, 'a', -1)).toBe('c');
    expect(stepTarget(pool, 'b', -1)).toBe('a');
  });
  it('goes nowhere with one piece, none, or a current that is not in the pool', () => {
    expect(stepTarget(['a'], 'a', 1)).toBeNull();
    expect(stepTarget([], 'a', 1)).toBeNull();
    expect(stepTarget(pool, 'z', 1)).toBeNull();
  });
});

describe('the words around an open piece', () => {
  it('reads "<position> of <count>"', () => {
    expect(counterLabel(1, 11)).toBe('1 of 11');
    expect(counterLabel(4, 4)).toBe('4 of 4');
  });
  it('puts the piece in the address bar as a hash', () => {
    expect(hashFor('bdl-007')).toBe('#bdl-007');
  });
});

describe('a link to a piece', () => {
  const ids = ['bdl-012', 'bdl-007', 'bdl-001'];
  it('names a listed piece by its hash', () => {
    expect(idFromHash('#bdl-007', ids)).toBe('bdl-007');
    expect(idFromHash(hashFor('bdl-012'), ids)).toBe('bdl-012');
  });
  it('does not mind case or an escaped character', () => {
    expect(idFromHash('#BDL-007', ids)).toBe('bdl-007');
    expect(idFromHash('#bdl%2D001', ids)).toBe('bdl-001');
  });
  it('is nothing for no hash, a hash for nothing here, an id that is not listed, or a broken escape', () => {
    expect(idFromHash('', ids)).toBeNull();
    expect(idFromHash('#', ids)).toBeNull();
    expect(idFromHash('#nope', ids)).toBeNull();
    expect(idFromHash('#bdl-004', ids)).toBeNull();
    expect(idFromHash('#bdl-007/extra', ids)).toBeNull();
    expect(idFromHash('#%E0%A4%A', ids)).toBeNull();
    expect(idFromHash('bdl-007', ids)).toBeNull();
    expect(idFromHash('#bdl-007', [])).toBeNull();
  });
});

describe('fitting a miniature\'s type to its box', () => {
  // A stand-in for a 2D context: every glyph is half the font size wide, the font size is read from the font string.
  const ctx = () => {
    const c = { font: '', letterSpacing: '0px', measureText: (s: string) => ({ width: s.length * 0.5 * parseFloat(/(\d+(?:\.\d+)?)px/.exec(c.font)![1]!) }) };
    return c as unknown as CanvasRenderingContext2D;
  };
  const font = (s: number) => `${s}px Test`;
  it('measures a text per pixel of size, and sets the size that just fits a width', () => {
    expect(per(ctx(), 'abcd', font)).toBeCloseTo(2, 5);
    expect(fit(ctx(), ['abcd'], font, 100, 999)).toBeCloseTo(50, 5);
  });
  it('never sets type above its cap, and fits the widest line', () => {
    expect(fit(ctx(), ['abcd'], font, 100, 20)).toBe(20);
    expect(fit(ctx(), ['ab', 'abcdef'], font, 60, 999)).toBeCloseTo(20, 5);
  });
  it('picks the line breaks that set the biggest type, fewer lines on a tie', () => {
    const opts = [['abcdefgh'], ['abcd', 'efgh'], ['ab', 'cd', 'ef', 'gh']];
    // wide and short: one line is as big as the height allows
    expect(bestLines(ctx(), opts, font, 400, 30, 30).lines).toHaveLength(1);
    // narrow and tall: the width rules out one line, more lines win
    const tall = bestLines(ctx(), opts, font, 40, 400, 400);
    expect(tall.lines.length).toBeGreaterThan(1);
    expect(tall.size).toBeGreaterThan(fit(ctx(), opts[0]!, font, 40, 400));
    // a tie between a one-line and a two-line break goes to the one line
    expect(bestLines(ctx(), [['abcd'], ['ab', 'cd']], font, 400, 400, 20).lines).toHaveLength(1);
  });
});

describe('the wall at rest, and what the lamp wakes', () => {
  it('counts a small tile lit when about half of it is under the pool, and a big one when about half the pool is on it', () => {
    const small = { x: 0, y: 0, w: 200, h: 120 };
    expect(litCover(small, 100, 60)).toBeGreaterThan(0.97);
    expect(litCover(small, 100, 60 + LAMP_INNER + 200)).toBe(0);
    // the pool beside the tile: a sliver lit, not enough to wake it; nearer, enough
    const beside = litCover(small, 200 + LAMP_INNER * 0.75, 60);
    expect(beside).toBeGreaterThan(0.02);
    expect(beside).toBeLessThan(LIT_SLEEP);
    expect(litCover(small, 200 + LAMP_INNER * 0.4, 60)).toBeGreaterThan(LIT_WAKE);
    const big = { x: 0, y: 0, w: 900, h: 700 };
    expect(litCover(big, 450, 350)).toBeGreaterThan(0.97);
    expect(litCover(big, 0, 0)).toBeGreaterThan(0.2);
    expect(litCover(big, 0, 0)).toBeLessThan(LIT_WAKE);
    expect(LIT_SLEEP).toBeLessThan(LIT_WAKE);
  });
  it('lingers on the lead and the three secondary tiles twice as often as the rest, and on every tile in a round', () => {
    const areas = [
      { id: 'lead', area: 100 }, { id: 's1', area: 50 }, { id: 's2', area: 48 }, { id: 's3', area: 46 },
      { id: 'm1', area: 20 }, { id: 'm2', area: 19 }, { id: 'x1', area: 5 },
    ];
    const round = lingerRound(areas);
    expect(round[0]).toBe('lead');
    for (const a of areas) expect(round).toContain(a.id);
    const n = (id: string) => round.filter((x) => x === id).length;
    for (const big of ['lead', 's1', 's2', 's3']) expect(n(big)).toBeGreaterThanOrEqual(2 * n('m1'));
    for (let i = 1; i < round.length; i++) expect(round[i]).not.toBe(round[i - 1]);
    expect(lingerRound(areas.slice(0, 3))).toEqual(['lead', 's1', 's2']);
  });
  it('reveals tiles nearest the lamp first', () => {
    const steps = revealSteps({ a: { x: 0, y: 0, w: 10, h: 10 }, b: { x: 100, y: 0, w: 10, h: 10 }, c: { x: 40, y: 0, w: 10, h: 10 } }, { x: 105, y: 5 });
    expect(steps).toEqual({ b: 0, c: 1, a: 2 });
  });
  it('rests the menu and the price cards on whole rows: the heading whole above them, or left out whole', () => {
    const fake = { font: '', letterSpacing: '0px', measureText: (t: string) => ({ width: t.length * parseFloat(fake.font) * 0.5 }) };
    const c = fake as unknown as CanvasRenderingContext2D;
    for (const [name, d] of [['bayou', bayouDetail], ['magnolia', magnoliaDetail]] as const) {
      for (const W of [180, 240, 300, 380]) {
        const tall = d.rest!(c, W, 2000), short = d.rest!(c, W, 90);
        expect(tall, `${name} ${W} tall`).toBe(0);
        // a heading is at most 13 * 1.15 or 1.5 high with its baseline at most pad + 13 * 1.2: the rest line sits below all of it
        expect(short, `${name} ${W} short`).toBeGreaterThan(Math.round(W * 0.055) + 13 * 1.2 + 4);
        expect(short, `${name} ${W} short is inside the strip`).toBeLessThan(d.height(c, W, 90));
      }
    }
  });
  it('has a rest frame for every miniature', async () => {
    for (const id of MINI_IDS) {
      const m = (await import(`../src/lib/lab-wall/minis/${id}.ts`)) as { default: unknown };
      expect(typeof m.default, id).toBe('function');
    }
    expect(POSTER_IDS).toEqual([...MINI_IDS]);
    expect(posterSrc('bdl-010', 'dark', 'desk')).toBe('/lab-wall/posters/bdl-010-dark-desk.webp');
  });
});
