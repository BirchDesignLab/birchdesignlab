import { describe, it, expect } from 'vitest';
import { labSchema } from '../src/lib/lab-schema';

const valid = {
  designation: 'BDL-001',
  title: 'The Bark Engine',
  summary: 'The generative birch system, exposed.',
  date: '2026-07-15',
  tech: ['webgl', 'svelte'],
  device: 'universal',
  howto: ['Type a seed and watch the bark regrow.'],
};

describe('labSchema', () => {
  it('accepts a valid entry and applies defaults', () => {
    const parsed = labSchema.parse(valid);
    expect(parsed.status).toBe('live');
    expect(parsed.date).toBeInstanceOf(Date);
  });
  it('rejects malformed designations', () => {
    expect(() => labSchema.parse({ ...valid, designation: 'BDL-1' })).toThrow();
    expect(() => labSchema.parse({ ...valid, designation: 'bdl-001' })).toThrow();
  });
  it('rejects unknown device values', () => {
    expect(() => labSchema.parse({ ...valid, device: 'tablet' })).toThrow();
  });
  it('rejects empty title and summary', () => {
    expect(() => labSchema.parse({ ...valid, title: '' })).toThrow();
    expect(() => labSchema.parse({ ...valid, summary: '' })).toThrow();
  });
  it('rejects unknown status values', () => {
    expect(() => labSchema.parse({ ...valid, status: 'draft' })).toThrow();
  });
  it('defaults tech to an empty array when omitted', () => {
    const { tech, ...withoutTech } = valid;
    expect(labSchema.parse(withoutTech).tech).toEqual([]);
  });
  it('href is optional and must be a site-relative path', () => {
    expect(labSchema.parse(valid).href).toBeUndefined();
    expect(labSchema.parse({ ...valid, href: '/styleguide' }).href).toBe('/styleguide');
    expect(() => labSchema.parse({ ...valid, href: 'https://example.com' })).toThrow();
  });
});

describe('howto wall label', () => {
  it('requires howto when there is no href', () => {
    const { howto, ...withoutHowto } = valid;
    expect(() => labSchema.parse(withoutHowto)).toThrow();
  });
  it('href entries are exempt', () => {
    const { howto, ...withoutHowto } = valid;
    expect(labSchema.parse({ ...withoutHowto, href: '/styleguide' }).howto).toBeUndefined();
  });
  it('caps lines at four and rejects empty lines', () => {
    expect(() => labSchema.parse({ ...valid, howto: ['a', 'b', 'c', 'd', 'e'] })).toThrow();
    expect(() => labSchema.parse({ ...valid, howto: [''] })).toThrow();
    expect(labSchema.parse({ ...valid, howto: ['a', 'b', 'c', 'd'] }).howto).toHaveLength(4);
  });
});
