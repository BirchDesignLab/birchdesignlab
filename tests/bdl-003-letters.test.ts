import { describe, expect, it } from 'vitest';
import { letterSchema } from '../src/lib/scratch/letter-schema';
import { letters } from '../src/experiments/bdl-003/letters';

describe('bdl-003 letters', () => {
  it('ships exactly three letters', () => {
    expect(letters).toHaveLength(3);
  });
  it('every letter validates against the schema', () => {
    for (const l of letters) expect(() => letterSchema.parse(l)).not.toThrow();
  });
  it('ids are unique and expected', () => {
    expect(letters.map((l) => l.id)).toEqual(['onfim', 'love-letter', 'household-list']);
  });
  it('translations contain no emdash', () => {
    for (const l of letters) {
      expect(l.translation).not.toMatch(/—|–/);
      expect(l.caption).not.toMatch(/—|–/);
    }
  });
});
