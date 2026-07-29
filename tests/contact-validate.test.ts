import { describe, expect, it } from 'vitest';
import { LIMITS, parseContactSubmission } from '../src/lib/contact/validate';

const good = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  message: 'I have a spreadsheet that became a monster.',
};

describe('parseContactSubmission', () => {
  it('accepts a complete submission and trims whitespace', () => {
    const result = parseContactSubmission({
      name: '  Ada Lovelace  ',
      email: ' ada@example.com ',
      message: `  ${good.message}  `,
    });
    expect(result).toEqual({ ok: true, data: good });
  });

  it('flags a filled honeypot distinctly, without field errors', () => {
    const result = parseContactSubmission({ ...good, company: 'Bots Inc' });
    expect(result).toEqual({ ok: false, honeypot: true });
  });

  it('ignores an empty or whitespace honeypot', () => {
    expect(parseContactSubmission({ ...good, company: '  ' }).ok).toBe(true);
  });

  it('requires every field', () => {
    const result = parseContactSubmission({});
    expect(result.ok).toBe(false);
    if (result.ok || result.honeypot) throw new Error('expected field errors');
    expect(result.errors).toHaveLength(3);
  });

  it('treats missing and empty-after-trim the same', () => {
    const result = parseContactSubmission({ ...good, message: '   ' });
    expect(result.ok).toBe(false);
    if (result.ok || result.honeypot) throw new Error('expected field errors');
    expect(result.errors).toEqual(['Message is required.']);
  });

  it.each([
    'no-at-sign.example.com',
    'two@@example.com',
    'spaces in@example.com',
    'nodot@example',
    '@example.com',
    'ada@',
  ])('rejects malformed email %s', (email) => {
    const result = parseContactSubmission({ ...good, email });
    expect(result.ok).toBe(false);
  });

  it('accepts plus-addressed and subdomain emails', () => {
    for (const email of ['a+b@mail.example.co.uk', 'x_y.z@sub.example.io']) {
      expect(parseContactSubmission({ ...good, email }).ok).toBe(true);
    }
  });

  it('enforces length caps', () => {
    const over = (n: number) => 'x'.repeat(n + 1);
    expect(parseContactSubmission({ ...good, name: over(LIMITS.name) }).ok).toBe(false);
    expect(
      parseContactSubmission({ ...good, email: `a@${'b'.repeat(LIMITS.email)}.com` }).ok
    ).toBe(false);
    expect(parseContactSubmission({ ...good, message: over(LIMITS.message) }).ok).toBe(false);
    expect(parseContactSubmission({ ...good, message: 'x'.repeat(LIMITS.message) }).ok).toBe(true);
  });
});
