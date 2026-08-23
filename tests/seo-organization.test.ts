import { describe, it, expect } from 'vitest';
import { buildOrganization } from '../src/lib/seo/organization';

const org = buildOrganization('https://birchdesignlab.com');

describe('buildOrganization', () => {
  it('declares itself as schema.org Organization', () => {
    expect(org['@context']).toBe('https://schema.org');
    expect(org['@type']).toBe('Organization');
  });

  it('carries the brand name and absolute URLs', () => {
    expect(org.name).toBe('Birch Design Lab');
    expect(org.url).toBe('https://birchdesignlab.com/');
    expect(org.logo).toBe('https://birchdesignlab.com/icon-512.png');
  });

  it('never names a person, because the founder stays abstracted', () => {
    const serialized = JSON.stringify(org);
    expect(serialized).not.toMatch(/founder/i);
    expect(serialized).not.toMatch(/Person/);
  });

  it('omits sameAs entirely while no profiles exist, rather than emitting an empty array', () => {
    expect('sameAs' in org).toBe(false);
  });

  it('has a description free of emdashes, since it is external-facing', () => {
    expect(org.description.length).toBeGreaterThan(0);
    expect(org.description).not.toMatch(/[—–]/);
  });

  it('accepts a URL object as well as a string', () => {
    expect(buildOrganization(new URL('https://birchdesignlab.com')).url).toBe(
      'https://birchdesignlab.com/',
    );
  });
});
