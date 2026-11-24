import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO, doc, readPage } from './helpers';

/**
 * The Lab's List is in the quiet grammar: a card is the picture, the title,
 * the summary and one meta line (kind and date, "Coming soon" when it is not
 * live, the number last); no eyebrow, no stack chips, no middle dots, no
 * tracked capitals. The same cards serve /lab/ and the two category pages.
 */
const ROUTES = ['/lab/', '/lab/experiments/', '/lab/studies/'];
const META = /^(Experiment|Study), [A-Z][a-z]{2} \d{4}( Coming soon)? BDL-\d{3}$/;

describe('the List cards', () => {
  for (const route of ROUTES) {
    const d = doc(readPage(route));
    const cards = d.querySelectorAll('.catalog article');

    it(`${route}: picture, title, summary, one meta line, in that order`, () => {
      expect(cards.length).toBeGreaterThan(0);
      for (const c of cards) {
        const tag = c.getAttribute('data-status');
        // The Portal's picture brings its own script and style tags along.
        const kids = c.children.filter((k) => !/^(script|style)$/i.test(k.tagName));
        expect(kids, tag ?? '').toHaveLength(2);
        const first = kids[0];
        expect(first.getAttribute('class') ?? '', 'the picture comes first').toMatch(/thumb|portal-thumb/);
        const text = kids[1];
        expect(text.getAttribute('class')).toBe('text');
        expect(text.children.map((n) => n.tagName.toLowerCase())).toEqual(['h2', 'p', 'p']);
        expect(c.querySelectorAll('.designation, .status, .tag, .badge, .working, .tick').length, 'no eyebrow, chips or badges').toBe(0);
      }
    });

    it(`${route}: one meta line, kind and date then the number, no middle dot`, () => {
      for (const c of cards) {
        const meta = c.querySelector('.meta')!.text.replace(/\s+/g, ' ').trim();
        expect(meta).toMatch(META);
        expect(meta).not.toMatch(/[·•—]/);
        expect(meta.endsWith(c.querySelector('.num')!.text.trim())).toBe(true);
        expect(meta.includes('Coming soon')).toBe(c.getAttribute('data-status') !== 'live');
      }
    });

    it(`${route}: every card has a picture frame, a placeholder when it has no still`, () => {
      for (const c of cards) {
        const frame = c.querySelector('.thumb, .portal-thumb');
        expect(frame, c.querySelector('h2')?.text ?? '').not.toBeNull();
        if (!frame!.querySelector('img')) expect(frame!.getAttribute('class')).toContain('blank');
      }
    });
  }

  it('/lab/: the Portal card shows a picture shaped for its frame, not the wide strip', () => {
    const portal = doc(readPage('/lab/')).querySelector('.portal-thumb')!;
    const still = portal.querySelector('img:not(.shot)')!;
    const ratio = Number(still.getAttribute('width')) / Number(still.getAttribute('height'));
    // The frame is 16:10; a strip near 2.7:1 is cover-cropped to a sliver.
    expect(ratio).toBeGreaterThan(1.4);
    expect(ratio).toBeLessThan(1.8);
  });

  it('/lab/: the Portal is the one lit card, in its own date slot', () => {
    const cards = doc(readPage('/lab/')).querySelectorAll('.catalog article');
    const lit = cards.filter((c) => (c.getAttribute('class') ?? '').split(' ').includes('lit'));
    expect(lit.map((c) => c.querySelector('.num')!.text.trim())).toEqual(['BDL-010']);
    // Date order, newest first: the Portal sits between the Field Guide and Bayou Kitchen.
    const nums = cards.map((c) => c.querySelector('.num')!.text.trim());
    expect(nums.indexOf('BDL-010')).toBe(nums.indexOf('BDL-011') + 1);
    expect(nums.indexOf('BDL-009')).toBe(nums.indexOf('BDL-010') + 1);
  });

  it('/lab/: the Field Guide and the Portal show two different pictures, and Novgorod Letters shows its sheet', () => {
    const cards = doc(readPage('/lab/')).querySelectorAll('.catalog article');
    const card = (num: string) => cards.find((c) => c.querySelector('.num')!.text.trim() === num)!;
    const files = (num: string) => card(num).querySelectorAll('img:not(.shot)').map((i) => (i.getAttribute('src') ?? '').split('/').pop()!.split('.')[0]);
    // The Field Guide's own picture is a page of the guide; the six-style sheet is the Portal's.
    expect(files('BDL-011'), 'the Field Guide card').toEqual(['guide']);
    expect(files('BDL-010'), 'the Portal card').toContain('thumb');
    expect(files('BDL-010')).not.toContain('guide');
    // BDL-003 is coming soon but is no longer a blank box.
    const novgorod = card('BDL-003');
    expect(novgorod.getAttribute('data-status')).toBe('forthcoming');
    expect(novgorod.querySelectorAll('.thumb.blank').length).toBe(0);
    expect(files('BDL-003')).toEqual(['thumb']);
  });

  it('/lab/: the Portal picture is asked for at the size the card draws it, like its neighbours', () => {
    const d = doc(readPage('/lab/'));
    const sizes = d.querySelectorAll('.card .thumb img').map((i) => i.getAttribute('sizes'));
    expect(new Set(sizes).size).toBe(1);
    for (const img of d.querySelectorAll('.portal-thumb img')) {
      expect(img.getAttribute('sizes')).toBe(sizes[0]);
      const widths = (img.getAttribute('srcset') ?? '').split(',').map((x) => Number(x.trim().split(' ')[1].replace('w', '')));
      // About 500px drawn at 1440, so 1000 device pixels on a retina screen.
      expect(Math.max(...widths), img.getAttribute('data-school') ?? 'still').toBeGreaterThanOrEqual(1200);
    }
  });

  it('/lab/: the Portal says what a click does without hover: the Enter line is in the card', () => {
    const line = doc(readPage('/lab/')).querySelector('.portal-thumb .enter')?.text.replace(/\s+/g, ' ').trim();
    expect(line).toMatch(/^Enter in /);
  });

  it('/lab/ keeps the filter as three real links', () => {
    const links = doc(readPage('/lab/')).querySelectorAll('nav.filter a');
    expect(links.map((a) => [a.text.trim(), a.getAttribute('href')])).toEqual([
      ['All', '/lab/'], ['Experiments', '/lab/experiments/'], ['Studies', '/lab/studies/'],
    ]);
    expect(doc(readPage('/lab/')).querySelector('nav.filter')?.getAttribute('class')).not.toContain('smallcaps');
  });

  it('the category pages show their way back in sentence case', () => {
    for (const route of ['/lab/experiments/', '/lab/studies/']) {
      expect(doc(readPage(route)).querySelector('.kicker')?.getAttribute('class')).not.toContain('smallcaps');
    }
  });
});

describe('the List stylesheet', () => {
  const css = readFileSync(join(REPO, 'src', 'styles', 'lab-list.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = css.split('}').map((r) => r.trim()).filter(Boolean);

  it('sets no capitals and no tracking outside the wall view, which keeps its own filter for now', () => {
    const offenders = rules.filter((r) => /text-transform:\s*uppercase|letter-spacing:\s*(var\(--tracking|0\.0[3-9]|0\.[1-9])/.test(r));
    for (const r of offenders) expect(r, 'only the wall-view filter may keep capitals').toMatch(/html\[data-lab-view='wall'\] \.filter a/);
  });

  it('leaves no stacking context in the meta line, so no spot on the card is dead to a click', () => {
    const meta = rules.filter((r) => /^\.card \.meta/.test(r));
    expect(meta.length).toBeGreaterThan(0);
    for (const r of meta) expect(r).not.toMatch(/(^|[\s;{])(opacity|transform|filter|isolation|z-index):|position:\s*(relative|absolute|fixed)/);
  });

  it('lights the Portal card with a frame and a glow in the wall\'s lamp colour, and styles no other card that way', () => {
    const lit = rules.filter((r) => /\.card\.lit\b/.test(r));
    expect(lit.length).toBeGreaterThan(0);
    expect(lit.join('; ')).toMatch(/--lw-glow/);
    expect(lit.join('; ')).toMatch(/box-shadow/);
    for (const r of lit) expect(r.split('{')[0], 'only the Portal picture is lit').toMatch(/\.card\.lit \.portal-thumb/);
  });

  it('draws no rule under the catalog: the closing band\'s top rule is the one', () => {
    for (const r of rules.filter((x) => /^\.catalog\s*\{/.test(x))) expect(r).not.toMatch(/border(-bottom)?\s*:|box-shadow/);
  });

  it('keeps every filter link and card a touch target of at least 44px', () => {
    expect(css).toMatch(/\.filter a \{[^}]*min-height: 44px/);
  });

  it('keeps the closing band\'s "Talk to us" link a touch target of at least 44px', () => {
    expect(css).toMatch(/\.lab-contact \.talk \{[^}]*min-height: 44px[^}]*min-width: 44px/);
  });
});
