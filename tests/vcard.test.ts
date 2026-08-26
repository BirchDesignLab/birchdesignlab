import { describe, it, expect } from 'vitest';
import { buildVcf, escapeVcf, type VcardIdentity } from '../src/lib/vcard';

const CR = String.fromCharCode(13);
const LF = String.fromCharCode(10);
const CRLF = CR + LF;
const BACKSLASH = String.fromCharCode(92);

const ORG: VcardIdentity = {
  isOrg: true,
  name: 'Birch Design Lab',
  title: 'Independent design studio',
  company: 'Birch Design Lab',
  phone: '',
  email: 'hello@birchdesignlab.com',
  url: 'https://birchdesignlab.com',
};

function lines(vcf: string): string[] {
  return vcf.split(CRLF).filter(Boolean);
}

describe('escapeVcf', () => {
  it('escapes the four RFC 2426 specials', () => {
    expect(escapeVcf('a;b')).toBe('a' + BACKSLASH + ';b');
    expect(escapeVcf('a,b')).toBe('a' + BACKSLASH + ',b');
    expect(escapeVcf('a' + BACKSLASH + 'b')).toBe('a' + BACKSLASH + BACKSLASH + 'b');
    expect(escapeVcf('a' + LF + 'b')).toBe('a' + BACKSLASH + 'nb');
    expect(escapeVcf('a' + CRLF + 'b')).toBe('a' + BACKSLASH + 'nb');
  });

  it('leaves plain text alone', () => {
    expect(escapeVcf('Birch Design Lab')).toBe('Birch Design Lab');
  });
});

describe('buildVcf', () => {
  it('emits a well-formed org card with CRLF endings', () => {
    const vcf = buildVcf(ORG);
    expect(vcf.endsWith(CRLF)).toBe(true);
    expect(lines(vcf)).toEqual([
      'BEGIN:VCARD',
      'VERSION:3.0',
      'N:Birch Design Lab;;;;',
      'FN:Birch Design Lab',
      'ORG:Birch Design Lab',
      'X-ABShowAs:COMPANY',
      'TITLE:Independent design studio',
      'EMAIL;TYPE=INTERNET:hello@birchdesignlab.com',
      'URL:https://birchdesignlab.com',
      'END:VCARD',
    ]);
  });

  it('omits empty fields (phone above) but always emits FN', () => {
    const vcf = buildVcf(ORG);
    expect(vcf).not.toContain('TEL');
    expect(vcf).toContain('FN:Birch Design Lab');
  });

  it('splits a personal name into given/family so surname sorting works', () => {
    const vcf = buildVcf({ ...ORG, isOrg: false, name: 'Ada May Lovelace' });
    expect(lines(vcf)).toContain('N:Lovelace;Ada May;;;');
    expect(vcf).not.toContain('X-ABShowAs');
  });

  it('keeps a single-token personal name in the given slot', () => {
    const vcf = buildVcf({ ...ORG, isOrg: false, name: 'Ada' });
    expect(lines(vcf)).toContain('N:;Ada;;;');
  });

  it('escapes founder-filled punctuation instead of corrupting the card', () => {
    const vcf = buildVcf({ ...ORG, isOrg: false, name: 'Ada Lovelace', title: 'Founder, Principal; Designer' });
    expect(lines(vcf)).toContain(
      'TITLE:Founder' + BACKSLASH + ', Principal' + BACKSLASH + '; Designer',
    );
  });

  it('falls back to the company for FN when the name is emptied', () => {
    const vcf = buildVcf({ ...ORG, name: '' });
    expect(vcf).toContain('FN:Birch Design Lab');
  });
});
