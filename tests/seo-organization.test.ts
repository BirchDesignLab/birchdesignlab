import { describe, it, expect } from 'vitest';
import { buildOrganization, buildService } from '../src/lib/seo/organization';

const org = buildOrganization('https://birchdesignlab.com');
const service = buildService('https://birchdesignlab.com');

describe('buildOrganization', () => {
  it('declares itself as a schema.org ProfessionalService', () => {
    expect(org['@context']).toBe('https://schema.org');
    expect(org['@type']).toBe('ProfessionalService');
  });

  it('carries the brand name and absolute URLs', () => {
    expect(org.name).toBe('Birch Design Lab');
    expect(org.url).toBe('https://birchdesignlab.com/');
    expect(org.logo).toBe('https://birchdesignlab.com/icon-512.png');
  });

  it('names the service area, which is the reason for the LocalBusiness subtype', () => {
    expect(org.areaServed).toEqual({
      '@type': 'AdministrativeArea',
      name: 'Mississippi Gulf Coast',
    });
  });

  it('never names a person, because the founder stays abstracted', () => {
    const serialized = JSON.stringify(org);
    expect(serialized).not.toMatch(/founder/i);
    expect(serialized).not.toMatch(/"Person"/);
  });

  it('omits sameAs entirely while no profiles exist, rather than emitting an empty array', () => {
    expect('sameAs' in org).toBe(false);
  });

  it('omits address and telephone, so nothing here is the founder to find', () => {
    expect('address' in org).toBe(false);
    expect('telephone' in org).toBe(false);
  });

  it('has a description free of emdashes, since it is external-facing', () => {
    expect(org.description.length).toBeGreaterThan(0);
    expect(org.description).not.toMatch(/[—–]/);
  });

  it('names the region in the description, so the meta and the markup agree', () => {
    expect(org.description).toMatch(/Mississippi Gulf Coast/);
  });

  it('accepts a URL object as well as a string', () => {
    expect(buildOrganization(new URL('https://birchdesignlab.com')).url).toBe(
      'https://birchdesignlab.com/',
    );
  });
});

describe('buildService', () => {
  it('stays a plain Service, so the business entity is declared only once', () => {
    expect(service['@type']).toBe('Service');
  });

  it('attributes itself to the business and shares its service area', () => {
    expect(service.provider).toEqual({
      '@type': 'ProfessionalService',
      name: 'Birch Design Lab',
      url: 'https://birchdesignlab.com/',
    });
    expect(service.areaServed).toEqual(org.areaServed);
  });

  it('names both offerings and points at the services page', () => {
    expect(service.serviceType).toEqual(['Custom software', 'Custom websites']);
    expect(service.url).toBe('https://birchdesignlab.com/services');
  });
});
