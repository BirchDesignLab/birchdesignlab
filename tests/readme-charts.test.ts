// Drift gate for the README charts (spec: docs/superpowers/specs/2026-11-17-readme-charts.md).
// Every chart is a <picture> in README.md (light and dark SVG, plus phone SVGs for
// a `(max-width: 600px)` source) followed by a <details> holding its Mermaid
// source. The SVGs record the sha256 of that source at build time (the Mermaid
// block, or the JSON data file for the two showpieces), so editing either one
// without rebuilding fails here. The showpieces' JSON must also agree with the
// Mermaid fallback and the README tables it mirrors. No browser: text, hashes and
// file checks only.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { describe, expect, it } from 'vitest';
import { deltaE, contrast, paletteHash, palette } from '../scripts/readme/charts/theme.mjs';
import { portalPaletteHash } from '../scripts/readme/charts/portal.mjs';
import { REPO, mermaidBlocks, normalizeMermaid, readmeText, registry, sha256, svgName, svgPath } from '../scripts/readme/charts/source.mjs';

type Chart = {
  n: number;
  name: string;
  built: boolean;
  phone?: boolean;
  kind: 'mermaid' | 'showpiece';
  title: string;
  alt: string;
  data?: string;
};
const charts: Chart[] = registry.charts;
const built = charts.filter((c) => c.built);
const schemes = ['light', 'dark'] as const;
const variantsOf = (c: Chart) => (c.phone ? (['desktop', 'phone'] as const) : (['desktop'] as const));
const stale = (c: Chart) => `README chart ${c.n} is stale: run node scripts/readme/charts/build.mjs`;
const readme = readmeText();
const fences = mermaidBlocks(readme);

type Found = { sources: { media: string; srcset: string }[]; light: string; alt: string; mermaid: string | null };
function findPicture(c: Chart): Found | null {
  for (const m of readme.matchAll(/<picture>([\s\S]*?)<\/picture>([\s\S]*?)(?=<picture>|$)/g)) {
    const inner = m[1];
    const light = inner.match(/<img[^>]*src="([^"]+)"/)?.[1] ?? '';
    if (!light.includes(`/${c.n}-${c.name}.`)) continue;
    const sources = [...inner.matchAll(/<source\s+media="([^"]*)"\s+srcset="([^"]+)"/g)].map((s) => ({ media: s[1], srcset: s[2] }));
    const alt = inner.match(/<img[^>]*alt="([^"]*)"/)?.[1] ?? '';
    const after = m[2].match(/^\s*<details>\s*<summary>Chart source \(Mermaid\)<\/summary>\s*```mermaid\n([\s\S]*?)```\s*<\/details>/);
    return { sources, light, alt, mermaid: after ? normalizeMermaid(after[1]) : null };
  }
  return null;
}

// ---- showpiece agreement: the JSON must say the same things as the Mermaid ----

/** Every `ID["text"]` node and `subgraph ID["text"]` in a flowchart, as id -> lines. */
function flowNodes(mermaid: string): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const m of mermaid.matchAll(/^\s*(?:subgraph\s+)?([A-Z][A-Z0-9]*)\["([^"]*)"\]/gm)) {
    out.set(m[1], m[2].split(/<br\s*\/?>/i).map((s) => s.trim()));
  }
  return out;
}

function portalAgreement(json: any, mermaid: string): string[] {
  const diffs: string[] = [];
  const mm = flowNodes(mermaid);
  const jn = new Map<string, string[]>(json.nodes.map((n: any) => [n.id, n.lines]));
  for (const [id, lines] of mm) {
    if (!jn.has(id)) diffs.push(`Mermaid node ${id} is missing from portal.json`);
    else if (JSON.stringify(jn.get(id)) !== JSON.stringify(lines)) diffs.push(`node ${id} differs: Mermaid ${JSON.stringify(lines)} vs JSON ${JSON.stringify(jn.get(id))}`);
  }
  for (const id of jn.keys()) if (!mm.has(id)) diffs.push(`portal.json node ${id} is not in the Mermaid`);
  // every node is drawn: in the copy cell, or in exactly one caption group (or as that group's title)
  const placed = new Map<string, number>();
  placed.set(json.copyNode, 1);
  for (const g of json.groups) {
    if (g.cluster) placed.set(g.cluster, (placed.get(g.cluster) ?? 0) + 1);
    for (const id of g.nodes) placed.set(id, (placed.get(id) ?? 0) + 1);
  }
  for (const id of jn.keys()) if (placed.get(id) !== 1) diffs.push(`node ${id} is drawn ${placed.get(id) ?? 0} times`);
  // the group title for the school folder is the subgraph's own title
  for (const g of json.groups) if (g.cluster && g.title !== (jn.get(g.cluster) ?? [])[0]) diffs.push(`group title ${g.title} does not match ${g.cluster}`);
  // the schools match the README's school table, in order
  const rows = [...readme.matchAll(/^\| (\w+) \| `\/t\/\1\/` \|/gm)].map((m) => m[1]);
  const ids = json.schools.map((s: any) => s.id);
  if (JSON.stringify(rows) !== JSON.stringify(ids)) diffs.push(`schools differ: README table ${JSON.stringify(rows)} vs JSON ${JSON.stringify(ids)}`);
  // the shared sentence is the real home-page copy
  const home = parseYaml(readFileSync(resolve(REPO, 'src/content/copy/home.yaml'), 'utf8'));
  if (home.opener.lead !== json.copy) diffs.push(`shared copy differs: home.yaml says ${JSON.stringify(home.opener.lead)}`);
  const chrome = parseYaml(readFileSync(resolve(REPO, 'src/content/copy/chrome.yaml'), 'utf8'));
  if (JSON.stringify(chrome.wordmark) !== JSON.stringify(json.wordmark)) diffs.push('wordmark differs from chrome.yaml');
  return diffs;
}

function timelineAgreement(json: any, mermaid: string): string[] {
  const diffs: string[] = [];
  const events: { date: string; items: string[] }[] = [];
  let title = '';
  for (const line of mermaid.split('\n')) {
    const t = line.match(/^\s*title\s+(.*)$/);
    const d = line.match(/^\s*(\d{4}-\d{2}-\d{2})\s*:\s*(.*)$/);
    const c = line.match(/^\s+:\s*(.*)$/);
    if (t) title = t[1].trim();
    else if (d) events.push({ date: d[1], items: [d[2].trim()] });
    else if (c && events.length) events[events.length - 1].items.push(c[1].trim());
  }
  if (title !== json.title) diffs.push(`title differs: Mermaid ${JSON.stringify(title)} vs JSON ${JSON.stringify(json.title)}`);
  const jd = new Map<string, string[]>(json.events.map((e: any) => [e.date, e.items]));
  for (const e of events) {
    if (!jd.has(e.date)) diffs.push(`Mermaid date ${e.date} is missing from timeline.json`);
    else if (JSON.stringify(jd.get(e.date)) !== JSON.stringify(e.items)) diffs.push(`${e.date} differs: Mermaid ${JSON.stringify(e.items)} vs JSON ${JSON.stringify(jd.get(e.date))}`);
  }
  for (const d of jd.keys()) if (!events.some((e) => e.date === d)) diffs.push(`timeline.json date ${d} is not in the Mermaid`);
  if (JSON.stringify(events.map((e) => e.date)) !== JSON.stringify(json.events.map((e: any) => e.date))) diffs.push('events are in a different order');
  for (const p of json.picked) if (!jd.has(p.date)) diffs.push(`picked date ${p.date} is not an event`);
  return diffs;
}

const agreement: Record<string, (json: unknown, mermaid: string) => string[]> = {
  'portal-schools': portalAgreement,
  timeline: timelineAgreement,
};

describe('README charts', () => {
  it('the three model-tier colours are distinguishable in both schemes (distance and 3:1 on the field)', () => {
    for (const scheme of ['light', 'dark'] as const) {
      const t = palette(scheme);
      const names = ['haiku', 'sonnet', 'opus'] as const;
      for (const n of names) expect(contrast(t.tier[n], t.field), `${scheme} ${n} against the field`).toBeGreaterThanOrEqual(3);
      for (let i = 0; i < 3; i++) {
        for (let j = i + 1; j < 3; j++) {
          expect(deltaE(t.tier[names[i]], t.tier[names[j]]), `${scheme} ${names[i]} vs ${names[j]}`).toBeGreaterThanOrEqual(25);
        }
      }
    }
  });

  it('registry covers the README: one chart per Mermaid block, in order', () => {
    expect(fences.length).toBe(charts.length);
    expect(charts.map((c) => c.n)).toEqual(charts.map((_, i) => i + 1));
  });

  it('has no <picture> that is not a registered, built chart', () => {
    const srcs = [...readme.matchAll(/<picture>[\s\S]*?<img[^>]*src="([^"]+)"/g)].map((m) => m[1]);
    for (const s of srcs.filter((x) => x.includes('assets/readme/charts/'))) {
      expect(built.some((c) => s.endsWith(svgName(c, 'light'))), `unregistered chart image ${s}`).toBe(true);
    }
  });

  describe('showpiece agreement checks catch a wording edit', () => {
    it('timeline: a changed event fails', () => {
      const json = JSON.parse(readFileSync(resolve(REPO, 'scripts/readme/charts/data/timeline.json'), 'utf8'));
      const mermaid = fences[6];
      expect(timelineAgreement(json, mermaid)).toEqual([]);
      expect(timelineAgreement(json, mermaid.replace('Initial commit', 'First commit')).length).toBeGreaterThan(0);
      const edited = structuredClone(json);
      edited.events[3].items[0] += ' now';
      expect(timelineAgreement(edited, mermaid).length).toBeGreaterThan(0);
    });
    it('portal: a changed node fails', () => {
      const json = JSON.parse(readFileSync(resolve(REPO, 'scripts/readme/charts/data/portal.json'), 'utf8'));
      const mermaid = fences[3];
      expect(portalAgreement(json, mermaid)).toEqual([]);
      expect(portalAgreement(json, mermaid.replace('every word, as data', 'every word as data')).length).toBeGreaterThan(0);
      const edited = structuredClone(json);
      edited.nodes[1].lines[1] += '!';
      expect(portalAgreement(edited, mermaid).length).toBeGreaterThan(0);
    });
  });

  describe.each(built)('chart $n ($name)', (c) => {
    const pic = findPicture(c);

    it('is a <picture> in the README with real alt text', () => {
      expect(pic, `README has no <picture> for chart ${c.n}`).not.toBeNull();
      expect(pic!.light).toContain(`assets/readme/charts/${svgName(c, 'light')}`);
      expect(pic!.alt.length).toBeGreaterThan(40);
      expect(pic!.alt).toBe(c.alt);
    });

    it('has the right <source>s: phone first (if it has one), then dark', () => {
      const want = [
        ...(c.phone
          ? [
              { media: '(max-width: 600px) and (prefers-color-scheme: dark)', srcset: `assets/readme/charts/${svgName(c, 'dark', 'phone')}` },
              { media: '(max-width: 600px)', srcset: `assets/readme/charts/${svgName(c, 'light', 'phone')}` },
            ]
          : []),
        { media: '(prefers-color-scheme: dark)', srcset: `assets/readme/charts/${svgName(c, 'dark')}` },
      ];
      expect(pic!.sources).toEqual(want);
    });

    it('has every SVG file', () => {
      for (const v of variantsOf(c)) for (const s of schemes) expect(existsSync(svgPath(c, s, v)), `missing ${svgName(c, s, v)}`).toBe(true);
    });

    it('keeps its Mermaid source in the <details> that follows, unchanged', () => {
      expect(pic?.mermaid, `chart ${c.n}: the <picture> must be followed by the Mermaid <details>`).not.toBeNull();
      expect(sha256(pic!.mermaid!), `chart ${c.n}'s <details> is not README block ${c.n}`).toBe(sha256(fences[c.n - 1]));
    });

    const cases = variantsOf(c).flatMap((v) => schemes.map((s) => [v, s] as const));
    if (c.kind === 'mermaid') {
      it.each(cases)('%s %s SVG was built from the current Mermaid block', (v, s) => {
        const svg = readFileSync(svgPath(c, s, v), 'utf8');
        const recorded = svg.match(/<metadata[^>]*data-source-hash="([0-9a-f]{64})"/)?.[1];
        expect(recorded, stale(c)).toBeDefined();
        expect(recorded, stale(c)).toBe(sha256(pic!.mermaid!));
      });
    } else {
      it.each(cases)('%s %s SVG was built from the current data file', (v, s) => {
        const svg = readFileSync(svgPath(c, s, v), 'utf8');
        const recorded = svg.match(/<metadata[^>]*data-source-hash="([0-9a-f]{64})"/)?.[1];
        expect(c.data, `chart ${c.n} needs a data file in charts.json`).toBeDefined();
        const data = readFileSync(resolve(REPO, c.data!), 'utf8');
        expect(recorded, stale(c)).toBe(sha256(data));
      });
      it('agrees with its Mermaid fallback', () => {
        const compare = agreement[c.name];
        expect(compare, `no agreement check registered for ${c.name}`).toBeDefined();
        const json = JSON.parse(readFileSync(resolve(REPO, c.data!), 'utf8'));
        expect(compare(json, pic!.mermaid!)).toEqual([]);
      });
    }

    it.each(cases)('%s %s SVG was drawn with the current palette', (v, s) => {
      const svg = readFileSync(svgPath(c, s, v), 'utf8');
      const recorded = svg.match(/<metadata[^>]*data-palette-hash="([0-9a-f]{64})"/)?.[1];
      const want = c.name === 'portal-schools' ? portalPaletteHash(JSON.parse(readFileSync(resolve(REPO, c.data!), 'utf8'))) : paletteHash();
      expect(recorded, `README chart ${c.n} was drawn with an older palette or builder: run node scripts/readme/charts/build.mjs`).toBe(want);
    });

    it.each(cases)('%s %s SVG is safe to show through <img>', (v, s) => {
      const file = svgPath(c, s, v);
      if (!existsSync(file)) return;
      const svg = readFileSync(file, 'utf8');
      expect(svg).not.toMatch(/<script/i);
      expect(svg).not.toMatch(/foreignObject/i);
      expect(svg).not.toMatch(/url\(\s*['"]?https?:/i);
      expect(svg).not.toMatch(/@import/i);
      expect(svg).not.toMatch(/(?:href|src)\s*=\s*["'](?!#)/i);
      expect(svg).toMatch(/<title[ >]/);
      expect(svg).toMatch(/<desc[ >]/);
      expect(statSync(file).size).toBeLessThan(150 * 1024);
      const dashes = new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`);
      expect(dashes.test(svg), 'no em or en dashes in an SVG').toBe(false);
    });
  });
});
