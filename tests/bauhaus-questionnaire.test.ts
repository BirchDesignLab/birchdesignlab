import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  ANSWER,
  SHAPES,
  agreeCount,
  applyFill,
  emptyFills,
  filledCount,
  type Fills,
} from '../src/themes/bauhaus/parts/questionnaire';

const read = (p: string) => readFileSync(p, 'utf8');
const card = read('src/themes/bauhaus/parts/Questionnaire.astro');
const about = read('src/themes/bauhaus/pages/About.astro');
const meta = read('src/themes/bauhaus/meta.ts');

describe('bauhaus questionnaire rules', () => {
  it('the 1923 answer is a yellow triangle, a red square and a blue circle', () => {
    expect(ANSWER).toEqual({ triangle: 'yellow', square: 'red', circle: 'blue' });
  });
  it('fills a shape and counts it', () => {
    const { fills, swapped } = applyFill(emptyFills(), 'square', 'red');
    expect(fills).toEqual({ triangle: null, square: 'red', circle: null });
    expect(swapped).toBeNull();
    expect(filledCount(fills)).toBe(1);
  });
  it('reusing a colour swaps the two shapes', () => {
    const start: Fills = { triangle: 'yellow', square: 'red', circle: null };
    const { fills, swapped } = applyFill(start, 'circle', 'red');
    expect(swapped).toBe('square');
    expect(fills).toEqual({ triangle: 'yellow', square: null, circle: 'red' });
    const two = applyFill({ triangle: 'yellow', square: 'red', circle: 'blue' }, 'triangle', 'blue');
    expect(two.fills).toEqual({ triangle: 'blue', square: 'red', circle: 'yellow' });
  });
  it('re-inking a shape with its own colour changes nothing', () => {
    const start: Fills = { triangle: 'yellow', square: null, circle: null };
    expect(applyFill(start, 'triangle', 'yellow').fills).toEqual(start);
  });
  it('tallies agreement with the key, 3 down to none', () => {
    const all: Fills = { triangle: 'yellow', square: 'red', circle: 'blue' };
    expect(agreeCount(all)).toBe(3);
    expect(agreeCount({ ...all, circle: 'red', square: 'blue' })).toBe(1);
    expect(agreeCount({ triangle: 'red', square: 'blue', circle: 'yellow' })).toBe(0);
    expect(agreeCount(emptyFills())).toBe(0);
    expect(SHAPES).toHaveLength(3);
  });
});

describe('bauhaus questionnaire markup (word parity and accessibility)', () => {
  it('sits on About between the founder and the manifesto, wired with onMount', () => {
    const q = about.indexOf('<Questionnaire />');
    expect(q).toBeGreaterThan(about.indexOf('<section class="founder">'));
    expect(q).toBeLessThan(about.indexOf('<section class="manifesto'));
    expect(about).toMatch(/onMount\(\(\) => initQuestionnaire\(/);
  });
  it('is a labelled section with an empty role=status', () => {
    expect(card).toContain('<section class="quiz" aria-label="Questionnaire"');
    expect(card).toMatch(/role="status" data-qstatus><\/p>/);
  });
  it('carries the approved words, every one inside aria-hidden', () => {
    for (const w of [
      'The one questionnaire we hand out.',
      'no. 1',
      'After Kandinsky, Weimar, around 1923',
      'Give each shape one colour.',
      'Pick a shape, then a colour.',
      'Reason, if you have one',
      'Show the answer',
      "Kandinsky's answer",
      'You and Kandinsky agree on 3 of 3.',
      'You and Kandinsky agree on 2 of 3.',
      'You and Kandinsky agree on 1 of 3.',
      'You and Kandinsky agree on none.',
      'This room builds on his answer.',
    ]) expect(card, w).toContain(w);
    expect(card).not.toContain('Every shape on this site');
    // The only text-bearing tags are aria-hidden themselves or sit inside an aria-hidden parent.
    for (const m of card.matchAll(/<(p|span)\b([^>]*)>\s*[A-Za-z]/g)) {
      expect(m[2], m[0]).toMatch(/aria-hidden="true"|class="(qname|qreason-label|qline|qkey-head|qhouse|qtally|qno|qtitle)"/);
    }
  });
  it('every control has an aria-label that starts with its visible word', () => {
    expect(card).toContain('aria-label="Show the answer"');
    expect(card).toContain('aria-label="Again"');
    expect(card).toMatch(/aria-label=\{`\$\{s\.id\[0\]\.toUpperCase\(\)\}/);
    expect(card).toContain('aria-pressed="false"');
  });
  it('has no em dash in anything a visitor reads', () => {
    expect(card).not.toContain('—');
    expect(read('src/themes/bauhaus/parts/questionnaire.ts')).not.toContain('—');
  });
});

describe('bauhaus questionnaire look', () => {
  it('declares the ink on paper contrast pair', () => {
    expect(meta).toMatch(/fg: '--ink', bg: \['--paper'\]/);
  });
  it('keeps touch-action none on the colour bars only, and 44px targets', () => {
    const hits = card.match(/touch-action:\s*none/g) ?? [];
    expect(hits).toHaveLength(1);
    expect(card).toMatch(/\.qbar \{[^}]*touch-action: none/);
    expect(card).toMatch(/\.qbar \{[^}]*min-height: 44px/);
    expect(card).toMatch(/\.qshow \{[^}]*min-height: 44px/);
  });
  it('fences hover to a real hover pointer', () => {
    for (const m of card.matchAll(/[^\n]*:hover[^\n]*/g)) {
      const before = card.slice(0, m.index);
      expect(before.lastIndexOf('@media (hover: hover) and (pointer: fine)'), m[0]).toBeGreaterThan(before.lastIndexOf('\n  }\n'));
    }
  });
});
