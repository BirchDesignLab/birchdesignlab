import { describe, expect, it } from 'vitest';
import { letterSchema } from '../src/lib/scratch/letter-schema';

// Neutral fixture: exercises the schema only. The real letters live in Task 3
// so this test never pretends to be a specific gramota.
const valid = {
  id: 'sample',
  gramota: 1,
  caption: 'a sample plate',
  circa: 'c. 1200',
  transcription: 'а б в г д',
  translation: 'A short sample translation.',
  viewBox: '0 0 100 60',
  strokes: ['M10 10 L20 12', 'M22 10 L30 14'],
};

describe('letterSchema', () => {
  it('accepts a complete letter', () => {
    expect(letterSchema.parse(valid)).toEqual(valid);
  });
  it('rejects empty strokes array', () => {
    expect(() => letterSchema.parse({ ...valid, strokes: [] })).toThrow();
  });
  it('rejects empty translation', () => {
    expect(() => letterSchema.parse({ ...valid, translation: '' })).toThrow();
  });
  it('rejects a malformed viewBox', () => {
    expect(() => letterSchema.parse({ ...valid, viewBox: 'wide' })).toThrow();
  });
});
