import { describe, it, expect } from 'vitest';
import {
  buildOrganization,
  buildService,
  buildCreativeWork,
} from '../src/lib/seo/organization';

const org = buildOrganization('https://birchdesignlab.com');
const service = buildService('https://birchdesignlab.com');

const study = buildCreativeWork('https://birchdesignlab.com', {
  designation: 'BDL-005',
  title: 'Cheer and Chatter Social Club',
  summary: 'A ticketing site and a live event application.',
  slug: 'bdl-005',
  date: new Date('2026-08-18T00:00:00Z'),
  tech: ['astro', 'sanity'],
  client: 'Cheer and Chatter Social Club',
});

const experiment = buildCreativeWork('https://birchdesignlab.com', {
  designation: 'BDL-001',
  title: 'The Bark Engine',
  summary: 'The generative birch system, exposed as a playable instrument.',
  slug: 'bdl-001',
  date: new Date('2026-07-15T00:00:00Z'),
  tech: ['webgl', 'svelte'],
});

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

describe('buildCreativeWork', () => {
  it('declares every Lab entry a CreativeWork, experiments and studies alike', () => {
    expect(study['@type']).toBe('CreativeWork');
    expect(experiment['@type']).toBe('CreativeWork');
  });

  it('carries the designation as an alternate name, so BDL-005 is findable', () => {
    expect(study.alternateName).toBe('BDL-005');
    expect(study.name).toBe('Cheer and Chatter Social Club');
  });

  it('builds the canonical /lab/<slug>/ URL with its trailing slash', () => {
    expect(study.url).toBe('https://birchdesignlab.com/lab/bdl-005/');
    expect(experiment.url).toBe('https://birchdesignlab.com/lab/bdl-001/');
  });

  it('emits datePublished as a plain ISO date, not a timestamp', () => {
    expect(study.datePublished).toBe('2026-08-18');
    expect(experiment.datePublished).toBe('2026-07-15');
  });

  it('attributes the work to the same business the home page declares', () => {
    expect(study.creator).toEqual({
      '@type': 'ProfessionalService',
      name: 'Birch Design Lab',
      url: 'https://birchdesignlab.com/',
    });
  });

  it('names the client on a study and omits the field entirely on an experiment', () => {
    expect(study.sourceOrganization).toEqual({
      '@type': 'Organization',
      name: 'Cheer and Chatter Social Club',
    });
    expect('sourceOrganization' in experiment).toBe(false);
  });

  it('never names a person, because the founder stays abstracted', () => {
    const serialized = JSON.stringify(study);
    expect(serialized).not.toMatch(/founder/i);
    expect(serialized).not.toMatch(/"Person"/);
  });

  it('claims no image, since the OG cards are per-type rather than per-entry', () => {
    expect('image' in study).toBe(false);
  });
});
