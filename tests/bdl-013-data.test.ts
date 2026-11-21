import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import * as data from '../src/experiments/bdl-013/data';
import { BUBBLES, D1, D2, D3, FACTS, NOTES, ROWS, STRIP, TB, type PH } from '../src/experiments/bdl-013/data';
import { labTestSchema } from '../src/lib/lab-schema';

/** Every string anywhere in the data module, for the copy rules. */
function strings(v: unknown, out: string[] = []): string[] {
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => strings(x, out));
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => strings(x, out));
  return out;
}
/** Every { p, h } pair anywhere in the data module. */
function pairs(v: unknown, path = 'data', out: [string, PH][] = []): [string, PH][] {
  if (Array.isArray(v)) v.forEach((x, i) => pairs(x, `${path}[${i}]`, out));
  else if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if (typeof o.p === 'string' || typeof o.h === 'string') out.push([path, o as unknown as PH]);
    for (const [k, x] of Object.entries(o)) if (k !== 'p' && k !== 'h') pairs(x, `${path}.${k}`, out);
  }
  return out;
}
const ALL = strings(data);
const PAIRS = pairs(data);

// Word edges are lookarounds, so the patterns carry no backslashes.
// Private client and prospect names live in docs/private/forbidden-words.txt
// (gitignored: this repo is public; scripts/lab/lib/private-words.mjs reads the
// same file). Absent in a fresh clone, so the public checks still run.
const PRIVATE_FILE = ['docs/private/forbidden-words.txt', '../../../docs/private/forbidden-words.txt'].find((f) => existsSync(f));
const PRIVATE = PRIVATE_FILE
  ? readFileSync(PRIVATE_FILE, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#')).map((l) => l + '|').join('')
  : '';
const WB = '(?<![A-Za-z0-9_])';
const WE = '(?![A-Za-z0-9_])';
const FORBIDDEN = new RegExp(`${PRIVATE}compliance|${WB}PT${WE}|${WB}en${WE}.*${WB}es${WE}.*${WB}vi${WE}`, 'i');
const TIMEY = new RegExp(`${WB}[0-9]+ ?(ms|seconds?|minutes?|hours?|days?|weeks?)${WE}|${WB}faster${WE}|${WB}fast${WE}|${WB}quick(ly)?${WE}`, 'i');
const EMDASH = new RegExp(String.fromCharCode(0x2014));

describe('bdl-013 voices', () => {
  it('finds the pairs it is meant to check', () => {
    // Guard against the walker silently matching nothing.
    expect(PAIRS.length).toBeGreaterThan(100);
  });

  it('every Plain string has a Hood twin and every Hood string a Plain one', () => {
    for (const [path, pair] of PAIRS) {
      expect(typeof pair.p, `${path}.p`).toBe('string');
      expect(typeof pair.h, `${path}.h`).toBe('string');
      expect(pair.p.trim().length, `${path}.p is empty`).toBeGreaterThan(0);
      expect(pair.h.trim().length, `${path}.h is empty`).toBeGreaterThan(0);
    }
  });

  it('the title block has both voices for all four sheets', () => {
    expect(Object.keys(TB).map(Number)).toEqual([0, 1, 2, 3]);
    for (const n of [0, 1, 2, 3]) {
      expect(TB[n].t.length, `TB ${n} title`).toBeGreaterThan(0);
      expect(TB[n].s).toBe(n === 0 ? 'Sheet 1 of 1' : `Detail ${n} of 3`);
    }
  });

  it('the notes have as many Hood lines as Plain lines', () => {
    expect(NOTES.h.length).toBe(NOTES.p.length);
  });

  it('the strip has Sheet plus the three details, in order', () => {
    expect(STRIP.map((s) => s.go)).toEqual([0, 1, 2, 3]);
    expect(BUBBLES.map((b) => b.detail)).toEqual([1, 2, 3]);
  });

  it('every sheet-1 row id is unique', () => {
    const ids = ROWS.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('bdl-013 copy rules', () => {
  it('has no em dash anywhere in the data module', () => {
    for (const s of ALL) expect(s).not.toMatch(EMDASH);
    expect(readFileSync(new URL('../src/experiments/bdl-013/data.ts', import.meta.url), 'utf8')).not.toMatch(EMDASH);
  });

  it('has no em dash in the stage markup or the entry', () => {
    for (const f of ['../src/experiments/bdl-013/Experiment.astro', '../src/experiments/bdl-013/PH.astro', '../src/content/lab/bdl-013.md']) {
      expect(readFileSync(new URL(f, import.meta.url), 'utf8'), f).not.toMatch(EMDASH);
    }
  });

  it('uses none of the words the sheet must never say', () => {
    for (const s of ALL) expect(s, s).not.toMatch(FORBIDDEN);
    expect(readFileSync(new URL('../src/content/lab/bdl-013.md', import.meta.url), 'utf8')).not.toMatch(FORBIDDEN);
  });

  it('carries no time or speed figures', () => {
    for (const s of ALL) expect(s, s).not.toMatch(TIMEY);
    expect(readFileSync(new URL('../src/content/lab/bdl-013.md', import.meta.url), 'utf8')).not.toMatch(TIMEY);
  });

  it('never lists the three languages', () => {
    for (const s of ALL) expect(s, s).not.toMatch(new RegExp(`${WB}vi${WE}`, 'i'));
  });

  it('Detail 1 links the salon tree to its own page, with the trailing slash', () => {
    expect(D1.salon.href).toBe('/lab/bdl-008/');
  });
});

describe('bdl-013 FACTS equal what the sheet shows', () => {
  it('every fact names a bdlBase source and a place in it', () => {
    for (const [name, f] of Object.entries(FACTS)) {
      expect(f.source.length, name).toBeGreaterThan(3);
      expect(f.lines.length, name).toBeGreaterThan(0);
    }
  });

  it('routes: nine, five listed on the sheet and four more', () => {
    expect(FACTS.routes.value).toBe(9);
    expect(D2.svg.routes).toHaveLength(FACTS.routes.listed);
    const more = Number(/^\+ ?(\d+) more$/.exec(D2.svg.more)?.[1]);
    expect(D2.svg.routes.length + more).toBe(FACTS.routes.value);
    // The bill of materials row, the Hood field, the title-block line and the
    // diagram all say the same number.
    expect(D2.bom[0].name.p).toBe(`${FACTS.routes.value} pages and endpoints`);
    expect(D2.bom[0].name.h).toBe(`routes[${FACTS.routes.value}]`);
    expect(D2.bom[0].w.h).toContain(`+${more} more`);
    expect(D2.bom[0].more).toBe(D2.svg.more);
    expect(TB[2].h).toContain(`${FACTS.routes.value} routes in total; the ${FACTS.routes.listed} customer-facing`);
    // The plain list is the same five routes as the diagram, in order.
    expect(D2.bom[0].w.p).toBe(D2.svg.routes.join(', '));
  });

  it('deploy needs: nine jobs; the gate column lists the seven between detect_changes and cloudflare_ready', () => {
    const needs = FACTS.deployNeeds.value;
    expect(needs).toHaveLength(9);
    expect(ROWS.find((r) => r.id === '6')!.slab.tx!.h).toBe(`deploy needs ${needs.length} jobs`);
    const listed = needs.filter((n) => n !== 'detect_changes' && n !== 'cloudflare_ready');
    expect(listed).toHaveLength(7);
    expect(D3.gates.items).toHaveLength(listed.length);
    D3.gates.items.forEach((g, i) => expect(g.name.h.split(':')[0], `gate ${i}`).toBe(listed[i]));
    expect(D3.gates.items.filter((g) => g.last)).toHaveLength(1);
    // The two left out are named in the Hood footnote.
    expect(D3.gates.pay.h).toContain('detect_changes');
    expect(D3.gates.pay.h).toContain('cloudflare_ready');
  });

  it('merged lane: seven files, all named, package.json merged key by key', () => {
    const files = FACTS.mergedFiles.value;
    expect(files).toHaveLength(7);
    const merged = D3.revision.rows.find((r) => r.name.p === 'Merged')!;
    expect(merged.w.p).toMatch(/^Seven generated files/);
    const listed = merged.w.h.split('. package.json')[0].replace('git merge-file: ', '').split(', ');
    expect(listed).toEqual(files);
    expect(merged.w.p).toContain('package.json is merged key by key');
    expect(merged.w.h).toContain('package.json key by key');
  });

  it('Lighthouse: 0.95 / 0.95 / 0.95 and SEO 1.0, in the order the sheet shows them', () => {
    const v = FACTS.lhci.value;
    expect(v).toEqual({ performance: 0.95, accessibility: 0.95, 'best-practices': 0.95, seo: 1 });
    expect(D3.gates.lighthouse.map((l) => l.name.h)).toEqual(Object.keys(v));
    expect(D3.gates.lighthouse.map((l) => Number(l.v))).toEqual(Object.values(v));
    expect(D3.gates.pay.h).toContain(`lighthouserc.cjs L${FACTS.lhci.lines}`);
  });

  it('absence: the big number is the zero in the facts', () => {
    expect(FACTS.absence.value).toBe(0);
    expect(D1.zero.n).toBe('0');
  });

  it('the two trees list the same files; the salon tree ghosts the ordering ones', () => {
    expect(D1.salon.rows.map((r) => r.t)).toEqual(D1.restaurant.rows.map((r) => r.t));
    const on = D1.restaurant.rows.filter((r) => r.s === 'on').map((r) => r.t);
    for (const t of on) expect(D1.salon.rows.find((r) => r.t === t)!.s, t).toBe('gone');
    // every dimension spans real rows
    for (const d of D1.salon.dims) {
      expect(d.a).toBeGreaterThanOrEqual(0);
      expect(d.b).toBeLessThan(D1.salon.rows.length);
      expect(d.a).toBeLessThanOrEqual(d.b);
    }
  });
});

describe('bdl-013 registration', () => {
  it('the registry maps BDL-013 to its stage', () => {
    const src = readFileSync(new URL('../src/experiments/registry.ts', import.meta.url), 'utf8');
    expect(src).toContain("import BDL013 from './bdl-013/Experiment.astro';");
    expect(src).toContain("'BDL-013': BDL013,");
  });

  it('the entry parses against the Lab schema, with the four wall-label lines', () => {
    const raw = readFileSync(new URL('../src/content/lab/bdl-013.md', import.meta.url), 'utf8');
    const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw)?.[1] ?? '';
    const entry = labTestSchema.parse(parse(fm));
    expect(entry.designation).toBe('BDL-013');
    expect(entry.type).toBe('experiment');
    expect(entry.title).toBe('The Drawing Set');
    if (entry.type === 'experiment') {
      expect(entry.howto).toHaveLength(4);
      expect(entry.device).toBe('universal');
    }
    expect(entry.status).toBe('live');
  });
});
