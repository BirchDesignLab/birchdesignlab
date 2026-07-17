import { describe, it, expect } from 'vitest';
import { seqLength, yarnAt, type Stripe } from '../src/lib/weave/stripes';

const seq: Stripe[] = [
  { yarn: 'indigo', count: 4 },
  { yarn: 'ecru', count: 2 },
];

describe('stripe sequences', () => {
  it('sums length', () => {
    expect(seqLength(seq)).toBe(6);
  });

  it('resolves yarn by index within one repeat', () => {
    expect(yarnAt(seq, 0)).toBe('indigo');
    expect(yarnAt(seq, 3)).toBe('indigo');
    expect(yarnAt(seq, 4)).toBe('ecru');
    expect(yarnAt(seq, 5)).toBe('ecru');
  });

  it('repeats past the end', () => {
    expect(yarnAt(seq, 6)).toBe('indigo');
    expect(yarnAt(seq, 10)).toBe('ecru');
  });

  it('single stripe means solid', () => {
    expect(yarnAt([{ yarn: 'madder', count: 1 }], 999)).toBe('madder');
  });
});
