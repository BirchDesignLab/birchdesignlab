import { describe, expect, it } from 'vitest';
import * as data from '../src/experiments/bdl-012/data';
import { DEEP, DESK, DESK_M, FORMS, JOURNEYS, LANES, LIVE, MAIN, NIGHT, STEPS, TV_CARDS, THEMES, ART_THEME, type MapSpec } from '../src/experiments/bdl-012/data';

const SPECS: [string, MapSpec][] = [['MAIN', MAIN], ['NIGHT', NIGHT], ['LIVE', LIVE], ['FORMS', FORMS], ['DESK', DESK], ['DESK_M', DESK_M]];

/** Every string anywhere in the data module, for the copy rules. */
function strings(v: unknown, out: string[] = []): string[] {
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => strings(x, out));
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => strings(x, out));
  return out;
}
const ALL = strings(data);

describe('bdl-012 map specs', () => {
  it.each(SPECS)('%s: node ids are unique', (_name, spec) => {
    const ids = spec.nodes.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(SPECS)('%s: every edge lands on real nodes, in a real lane', (_name, spec) => {
    const ids = new Set(spec.nodes.map((n) => n.id));
    for (const e of spec.edges) {
      expect(ids.has(e.from), `from ${e.from}`).toBe(true);
      expect(ids.has(e.to), `to ${e.to}`).toBe(true);
      expect(LANES[e.lane]).toBeDefined();
    }
  });

  it.each(SPECS)('%s: every group names real nodes', (_name, spec) => {
    const ids = new Set(spec.nodes.map((n) => n.id));
    for (const g of spec.groups ?? []) for (const m of g.members) expect(ids.has(m), m).toBe(true);
  });

  it.each(SPECS)('%s: every box has its under-the-hood line', (_name, spec) => {
    // The switch swaps sub for tech on every box; a missing one would leave a
    // box blank in one of the two views.
    for (const n of spec.nodes) expect(n.tech.length, n.id).toBeGreaterThan(20);
  });

  it.each(SPECS)('%s: boxes stay on its canvas (1104px unless it says otherwise)', (_name, spec) => {
    for (const n of spec.nodes) {
      expect(n.x, n.id).toBeGreaterThanOrEqual(0);
      expect(n.x + n.w, n.id).toBeLessThanOrEqual(spec.w ?? 1104);
    }
  });

  it('MAIN: every line says what travels on it, in both voices', () => {
    // A line with no words would open an empty tip and leave a hole in every
    // drawer that lists it.
    for (const e of MAIN.edges) {
      expect(e.carries?.length ?? 0, `${e.from} -> ${e.to}`).toBeGreaterThan(3);
      expect(e.wire?.length ?? 0, `${e.from} -> ${e.to}`).toBeGreaterThan(3);
    }
  });

  it.each([['DESK', DESK], ['DESK_M', DESK_M]] as [string, MapSpec][])('%s: the ticket desk map is a piece of the main map', (_name, spec) => {
    // The desk sends its lights along these lines by name (stage.ts), and the
    // point of the small map is that it is the big one, so every box and line
    // on it has to exist there too. Both layouts carry the same lines.
    const mainIds = new Set(MAIN.nodes.map((n) => n.id));
    for (const n of spec.nodes) expect(mainIds.has(n.id), n.id).toBe(true);
    for (const e of spec.edges) {
      expect(MAIN.edges.some((m) => m.from === e.from && m.to === e.to), `${e.from} -> ${e.to}`).toBe(true);
    }
    const lines = (s: MapSpec) => s.edges.map((e) => `${e.from}>${e.to}`).sort();
    expect(lines(spec)).toEqual(lines(DESK));
    for (const [from, to] of [['guests', 'tt'], ['tt', 'watcher'], ['watcher', 'sanity'], ['sanity', 'builder'], ['builder', 'site'], ['builder', 'google']]) {
      expect(spec.edges.some((e) => e.from === from && e.to === to), `${from} -> ${to}`).toBe(true);
    }
  });

  it('the deeper drawer notes belong to real boxes', () => {
    const ids = new Set(MAIN.nodes.map((n) => n.id));
    for (const id of Object.keys(DEEP)) expect(ids.has(id), id).toBe(true);
  });
});

describe('bdl-012 journeys', () => {
  it('keys are unique, since they are the ?play= deep links', () => {
    const keys = JOURNEYS.map((j) => j.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('every step rides an edge that exists on the main map, in that direction', () => {
    // playStory looks the edge up by from/to. A step with no edge has nothing
    // to send the light along.
    for (const j of JOURNEYS) {
      for (const [from, to] of j.steps) {
        const edge = MAIN.edges.find((e) => e.from === from && e.to === to);
        expect(edge, `${j.key}: ${from} -> ${to}`).toBeDefined();
      }
    }
  });
});

describe('bdl-012 content', () => {
  it('the ticket desk drives six steps', () => {
    // stage.ts lights steps by index 2 to 5.
    expect(STEPS).toHaveLength(6);
  });

  it('TV cards point at extracted art files', () => {
    for (const c of TV_CARDS) expect(c.file).toMatch(/^tv-[a-z-]+\.webp$/);
  });

  it('the one theme that shows art is in the theme table', () => {
    expect(THEMES.map((t) => t[0])).toContain(ART_THEME);
  });
});

describe('bdl-012 copy rules', () => {
  it('has no em or en dashes', () => {
    for (const s of ALL) expect(s).not.toMatch(/—|–/);
  });

  it('never addresses the owners as "you"', () => {
    // The source was written to the owners. This version is written to a
    // visitor, so "your library" would be talking to the wrong person.
    // The lookbehind lets "thank-you" through; it is a noun, not an address.
    for (const s of ALL) expect(s, s).not.toMatch(/(?<![-\w])your?\b/i);
  });

  it('carries concepts, not settings', () => {
    // No prices, no contact addresses, no ticketing subdomain, no numeric
    // rate limits. See the rules at the top of data.ts.
    for (const s of ALL) {
      expect(s, s).not.toMatch(/\$\d/);
      expect(s, s).not.toMatch(/@/);
      expect(s, s).not.toMatch(/tickets\./i);
      expect(s, s).not.toMatch(/\d+\s+(tries|attempts)/i);
      expect(s, s).not.toMatch(/passphrase|honeypot|turnstile/i);
    }
  });
});
