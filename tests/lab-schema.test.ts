import { describe, it, expect } from 'vitest';
import { labSchema } from '../src/lib/lab-schema';

const valid = {
  designation: 'BDL-001',
  title: 'The Bark Engine',
  summary: 'The generative birch system, exposed.',
  date: '2026-07-15',
  tech: ['webgl', 'svelte'],
  device: 'universal',
};

describe('labSchema', () => {
  it('accepts a valid entry and applies defaults', () => {
    const parsed = labSchema.parse(valid);
    expect(parsed.status).toBe('live');
    expect(parsed.featured).toBe(false);
    expect(parsed.date).toBeInstanceOf(Date);
  });
  it('rejects malformed designations', () => {
    expect(() => labSchema.parse({ ...valid, designation: 'BDL-1' })).toThrow();
    expect(() => labSchema.parse({ ...valid, designation: 'bdl-001' })).toThrow();
  });
  it('rejects unknown device values', () => {
    expect(() => labSchema.parse({ ...valid, device: 'tablet' })).toThrow();
  });
});
