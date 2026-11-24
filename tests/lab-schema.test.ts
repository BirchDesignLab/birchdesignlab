import { describe, it, expect } from 'vitest';
import { labTestSchema as labSchema } from '../src/lib/lab-schema';
import { readFileSync } from 'node:fs';
import { catalogSet, kindLabel, KIND_WORDS } from '../src/lib/lab-sets';

const experiment = {
  type: 'experiment',
  designation: 'BDL-001',
  title: 'The Bark Engine',
  summary: 'The generative birch system, exposed.',
  date: '2026-07-15',
  tech: ['webgl', 'svelte'],
  device: 'universal',
  howto: ['Type a seed and watch the bark regrow.'],
};

const study = {
  type: 'study',
  designation: 'BDL-005',
  title: 'Cheer and Chatter Social Club',
  summary: 'A ticketing site and a live event application.',
  date: '2026-07-28',
  tech: ['astro', 'react', 'sanity'],
  client: 'Cheer and Chatter Social Club',
  liveUrl: 'https://cheerandchatter.com',
  hero: { src: './bdl-005/hero.png', alt: 'The Cheer and Chatter homepage.' },
};

describe('shared base', () => {
  it('accepts both branches and applies defaults', () => {
    expect(labSchema.parse(experiment).status).toBe('live');
    expect(labSchema.parse(study).status).toBe('live');
    expect(labSchema.parse(study).date).toBeInstanceOf(Date);
  });
  it('requires an explicit type', () => {
    const { type, ...untyped } = experiment;
    expect(() => labSchema.parse(untyped)).toThrow();
  });
  it('rejects malformed designations on both branches', () => {
    expect(() => labSchema.parse({ ...experiment, designation: 'BDL-1' })).toThrow();
    expect(() => labSchema.parse({ ...study, designation: 'bdl-005' })).toThrow();
  });
  it('rejects unknown status values', () => {
    expect(() => labSchema.parse({ ...study, status: 'draft' })).toThrow();
  });
});

describe('experiment branch', () => {
  it('rejects unknown device values', () => {
    expect(() => labSchema.parse({ ...experiment, device: 'tablet' })).toThrow();
  });
  it('requires howto when there is no href, and exempts href entries', () => {
    const { howto, ...bare } = experiment;
    expect(() => labSchema.parse(bare)).toThrow();
    const result = labSchema.parse({ ...bare, href: '/styleguide' });
    expect(result.type === 'experiment' && result.howto).toBeUndefined();
  });
  it('caps howto at four lines and rejects empty lines', () => {
    expect(() => labSchema.parse({ ...experiment, howto: ['a', 'b', 'c', 'd', 'e'] })).toThrow();
    expect(() => labSchema.parse({ ...experiment, howto: [''] })).toThrow();
  });
  it('rejects study fields on an experiment', () => {
    expect(() => labSchema.parse({ ...experiment, client: 'Somebody' })).toThrow();
  });
});

describe('study branch', () => {
  it('requires client, liveUrl, and hero', () => {
    for (const key of ['client', 'liveUrl', 'hero'] as const) {
      const { [key]: _omitted, ...bare } = study;
      expect(() => labSchema.parse(bare)).toThrow();
    }
  });
  it('requires liveUrl to be a full URL', () => {
    expect(() => labSchema.parse({ ...study, liveUrl: '/lab' })).toThrow();
  });
  it('requires hero alt text', () => {
    expect(() => labSchema.parse({ ...study, hero: { src: './x.png', alt: '' } })).toThrow();
  });
  it('accepts a self-study with no client', () => {
    const { client: _c, ...own } = study;
    const parsed = labSchema.parse({ ...own, selfStudy: true });
    expect(parsed.type === 'study' && parsed.client).toBeUndefined();
  });
  it('rejects a study with both a client and selfStudy', () => {
    expect(() => labSchema.parse({ ...study, selfStudy: true })).toThrow();
  });
  it('rejects selfStudy: false (declare it or leave it out)', () => {
    const { client: _c, ...own } = study;
    expect(() => labSchema.parse({ ...own, selfStudy: false })).toThrow();
  });
  it('accepts a genre study with no client', () => {
    const { client: _c, ...genre } = study;
    const parsed = labSchema.parse({ ...genre, genreStudy: true });
    expect(parsed.type === 'study' && parsed.genreStudy).toBe(true);
  });
  it('rejects a genre study that also names a client or is a self-study', () => {
    const { client: _c, ...genre } = study;
    expect(() => labSchema.parse({ ...study, genreStudy: true })).toThrow();
    expect(() => labSchema.parse({ ...genre, genreStudy: true, selfStudy: true })).toThrow();
  });
  it('catalogues genre studies with the experiments, and names them the same way', () => {
    const { client: _c, ...genre } = study;
    const g = labSchema.parse({ ...genre, genreStudy: true });
    const c = labSchema.parse(study);
    const e = labSchema.parse(experiment);
    expect([catalogSet(g), catalogSet(c), catalogSet(e)]).toEqual(['experiment', 'study', 'experiment']);
    expect([kindLabel(g), kindLabel(c), kindLabel(e)]).toEqual(['Experiment', 'Study', 'Experiment']);
  });
  it('gives the wall tile the same two words the List and the case page use', () => {
    // LabWall.astro belongs to another run and keeps its own two-word map; this pins it to KIND_WORDS.
    const wall = readFileSync(new URL('../src/components/LabWall.astro', import.meta.url), 'utf8');
    const m = /const KIND_LABEL = \{ experiment: '([^']+)', study: '([^']+)' \} as const;/.exec(wall);
    expect(m, 'LabWall.astro KIND_LABEL').not.toBeNull();
    expect({ experiment: m![1], study: m![2] }).toEqual(KIND_WORDS);
  });
  it('rejects experiment fields on a study', () => {
    expect(() => labSchema.parse({ ...study, device: 'universal' })).toThrow();
    expect(() => labSchema.parse({ ...study, howto: ['Look at it.'] })).toThrow();
  });
});
