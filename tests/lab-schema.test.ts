import { describe, it, expect } from 'vitest';
import { labTestSchema as labSchema } from '../src/lib/lab-schema';

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
  it('rejects experiment fields on a study', () => {
    expect(() => labSchema.parse({ ...study, device: 'universal' })).toThrow();
    expect(() => labSchema.parse({ ...study, howto: ['Look at it.'] })).toThrow();
  });
});
