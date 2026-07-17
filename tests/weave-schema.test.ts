import { describe, it, expect } from 'vitest';
import { yarnSchema, draftSchema, presetSchema } from '../src/lib/weave/schema';

const goodDraft = {
  shafts: 4,
  treadles: 6,
  threading: [0, 1, 2, 3],
  tieUp: [
    [true, false, true, false],
    [false, true, false, true],
    [false, false, false, false],
    [false, false, false, false],
    [false, false, false, false],
    [false, false, false, false],
  ],
  treadling: [0, 1],
};

describe('yarnSchema', () => {
  it('accepts a yarn', () => {
    expect(yarnSchema.safeParse({ id: 'madder', name: 'Madder', hex: '#9e4638' }).success).toBe(true);
  });
  it('rejects a bad hex', () => {
    expect(yarnSchema.safeParse({ id: 'x', name: 'X', hex: 'red' }).success).toBe(false);
  });
});

describe('draftSchema', () => {
  it('accepts a valid draft', () => {
    expect(draftSchema.safeParse(goodDraft).success).toBe(true);
  });
  it('rejects a threading value out of shaft range', () => {
    expect(draftSchema.safeParse({ ...goodDraft, threading: [0, 4] }).success).toBe(false);
  });
  it('rejects a treadling value out of treadle range', () => {
    expect(draftSchema.safeParse({ ...goodDraft, treadling: [6] }).success).toBe(false);
  });
  it('rejects a tie-up with wrong dimensions', () => {
    expect(draftSchema.safeParse({ ...goodDraft, tieUp: [[true, false]] }).success).toBe(false);
  });
});

describe('presetSchema', () => {
  it('accepts a preset', () => {
    const preset = {
      id: 'plain',
      name: 'Plain weave',
      draft: goodDraft,
      defaultWarp: [{ yarn: 'ecru', count: 1 }],
      defaultWeft: [{ yarn: 'walnut', count: 1 }],
    };
    expect(presetSchema.safeParse(preset).success).toBe(true);
  });
});
