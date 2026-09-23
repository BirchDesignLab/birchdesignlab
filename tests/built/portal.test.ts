import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  DIST,
  readPage,
  listRoutes,
  doc,
  stylesheetHrefs,
  anchorHrefs,
  visibleText,
  wordCounts,
  diffWords,
} from './helpers';
import { ROOT_PAGES } from '../../scripts/themes/lib/root-pages.mjs';

/**
 * The /t/ portal's promises, checked on the built site (spec §1, §5, §6).
 * Every school renders the same five pages with the same words and links as
 * quiet; each school ships only its own CSS; none of it reaches search; the
 * contact form works the same way in every school; and the root pages carry
 * none of the portal's machinery.
 */
const SITE = 'https://birchdesignlab.com';
const PAGES = ['', 'about/', 'services/', 'contact/', 'contact/sent/'];

const portalRoutes = listRoutes('/t/');
const schools = [...new Set(portalRoutes.map((r) => r.split('/')[2]))].sort();
const others = schools.filter((s) => s !== 'quiet');
const routesOf = (id: string) => PAGES.map((p) => `/t/${id}/${p}`);

/** Stylesheet contents a page loads: linked files plus inline <style> blocks. */
function cssOf(html: string): string {
  const linked = stylesheetHrefs(html)
    .filter((h) => h.startsWith('/'))
    .map((h) => readFileSync(join(DIST, h.split('?')[0]), 'utf8'));
  const inline = doc(html).querySelectorAll('style').map((s) => s.text);
  return [...linked, ...inline].join('\n');
}

/** Normalize a school link back to the root page it mirrors. */
function normalizeLink(href: string): string {
  return href.replace(/^\/t\/[a-z][a-z0-9-]*\//, '/').replace(/(.)\/$/, '$1');
}

describe('portal pages exist', () => {
  it('includes quiet', () => {
    expect(schools).toContain('quiet');
  });
  for (const id of schools) {
    it(`${id} builds exactly the five business pages`, () => {
      expect(portalRoutes.filter((r) => r.startsWith(`/t/${id}/`)).sort()).toEqual(routesOf(id).sort());
    });
  }
});

describe('root pages carry none of the portal', () => {
  const roots = [...ROOT_PAGES.map((p) => p.route), '/lab/', '/privacy/', '/lab/bdl-001/'];
  for (const route of roots) {
    it(`${route} has no router, no switcher, no school data`, () => {
      const html = readPage(route);
      expect(html).not.toMatch(/astro-view-transitions-enabled/);
      expect(html).not.toMatch(/<bdl-switcher/);
      expect(html).not.toMatch(/id="bdl-schools"/);
      expect(html).not.toMatch(/data-theme=/);
    });
  }

  it('root pages ship no stylesheet that only another school uses', () => {
    const otherSheets = new Set(others.flatMap((id) => routesOf(id).flatMap((r) => stylesheetHrefs(readPage(r)))));
    const quietSheets = new Set(routesOf('quiet').flatMap((r) => stylesheetHrefs(readPage(r))));
    for (const { route } of ROOT_PAGES) {
      const leaked = stylesheetHrefs(readPage(route)).filter((h) => otherSheets.has(h) && !quietSheets.has(h));
      expect(leaked, route).toEqual([]);
    }
  });
});

describe('every portal page', () => {
  const jsonBlobs = new Set<string>();
  for (const route of portalRoutes) {
    const id = route.split('/')[2];
    it(`${route}: head is noindex, self canonical, lab-experiment card, no JSON-LD`, () => {
      const html = readPage(route);
      const d = doc(html);
      expect(d.querySelector('html')?.getAttribute('data-theme')).toBe(id);
      expect(d.querySelector('meta[name="robots"]')?.getAttribute('content')).toMatch(/noindex/);
      expect(d.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(`${SITE}${route}`);
      expect(d.querySelector('meta[property="og:image"]')?.getAttribute('content')).toBe(`${SITE}/og/lab-experiment.png`);
      expect(html).not.toMatch(/application\/ld\+json/);
    });
    it(`${route}: router, persisted switcher and school data are present`, () => {
      const html = readPage(route);
      const d = doc(html);
      expect(d.querySelector('meta[name="astro-view-transitions-enabled"]')).toBeTruthy();
      const switchers = d.querySelectorAll('bdl-switcher');
      expect(switchers).toHaveLength(1);
      expect(switchers[0].getAttribute('data-astro-transition-persist')).toBe('switcher');
      const data = d.querySelector('script#bdl-schools')?.text ?? '';
      const parsed = JSON.parse(data) as { schools: { id: string }[] };
      expect(parsed.schools.map((s) => s.id).sort()).toEqual(schools);
      jsonBlobs.add(data);
    });
    it(`${route}: no em dash anywhere in the page`, () => {
      expect(readPage(route).includes('—')).toBe(false);
    });
    it(`${route}: every view-transition name is used once`, () => {
      const names = [...cssOf(readPage(route)).matchAll(/view-transition-name:\s*([\w-]+)/g)].map((m) => m[1]);
      const dupes = names.filter((n, i) => n !== 'none' && names.indexOf(n) !== i);
      expect(dupes).toEqual([]);
    });
    it(`${route}: styles name no other school`, () => {
      const named = new Set([...cssOf(readPage(route)).matchAll(/data-theme=["']?([a-z][a-z0-9-]*)/g)].map((m) => m[1]));
      named.delete(id);
      expect([...named]).toEqual([]);
    });
  }

  it('the school data is byte-identical on every portal page', () => {
    for (const route of portalRoutes) readPage(route); // populate even when run filtered
    expect(jsonBlobs.size).toBeLessThanOrEqual(1);
  });
});

describe('each school ships only its own CSS', () => {
  const sheets = new Map(schools.map((id) => [id, new Set(routesOf(id).flatMap((r) => stylesheetHrefs(readPage(r))))]));
  const shared = [...(sheets.get(schools[0]) ?? [])].filter((h) => schools.every((id) => sheets.get(id)!.has(h)));
  for (const id of schools) {
    it(`${id}'s own stylesheets appear on no other school's pages`, () => {
      const own = [...sheets.get(id)!].filter((h) => !shared.includes(h));
      for (const other of schools.filter((s) => s !== id)) {
        const leaked = own.filter((h) => sheets.get(other)!.has(h));
        expect(leaked, `${id} -> ${other}`).toEqual([]);
      }
    });
  }
});

describe('same words and links in every school', () => {
  for (const [i, seg] of PAGES.entries()) {
    const quiet = readPage(`/t/quiet/${seg}`);
    const quietWords = wordCounts(visibleText(quiet, { parity: true }));
    const quietLinks = [...new Set(anchorHrefs(quiet).map(normalizeLink))].sort();

    it(`/t/quiet/${seg} says what the root page says`, () => {
      const root = readPage(ROOT_PAGES[i].route);
      expect(diffWords(wordCounts(visibleText(root, { parity: true })), quietWords)).toEqual({ missing: [], extra: [] });
    });

    for (const id of others) {
      it(`/t/${id}/${seg} has quiet's words`, () => {
        const words = wordCounts(visibleText(readPage(`/t/${id}/${seg}`), { parity: true }));
        expect(diffWords(quietWords, words)).toEqual({ missing: [], extra: [] });
      });
      it(`/t/${id}/${seg} has quiet's links`, () => {
        const links = [...new Set(anchorHrefs(readPage(`/t/${id}/${seg}`)).map(normalizeLink))].sort();
        expect(links).toEqual(quietLinks);
      });
    }
  }
});

describe('the contact form is the same contract in every school', () => {
  for (const id of schools) {
    it(`/t/${id}/contact/ posts to the Worker with the school, outside the router`, () => {
      const d = doc(readPage(`/t/${id}/contact/`));
      const forms = d.querySelectorAll('form[action="/api/contact"]');
      expect(forms).toHaveLength(1);
      const form = forms[0];
      expect(form.getAttribute('method')?.toLowerCase()).toBe('post');
      expect(form.hasAttribute('data-astro-reload')).toBe(true);
      expect(form.querySelector('input[name="name"]')).toBeTruthy();
      expect(form.querySelector('input[name="email"][type="email"]')).toBeTruthy();
      expect(form.querySelector('textarea[name="message"]')).toBeTruthy();
      const honeypots = form.querySelectorAll('input[name="company"]');
      expect(honeypots).toHaveLength(1);
      expect(honeypots[0].closest('[aria-hidden="true"]')).toBeTruthy();
      const ret = form.querySelectorAll('input[name="return"]');
      expect(ret).toHaveLength(1);
      expect(ret[0].getAttribute('type')).toBe('hidden');
      expect(ret[0].getAttribute('value')).toBe(id);
    });
  }

  it('the root form is unchanged: no return field, still inside the normal page', () => {
    const form = doc(readPage('/contact/')).querySelector('form[action="/api/contact"]')!;
    expect(form.querySelector('input[name="return"]')).toBeNull();
    expect(form.hasAttribute('data-astro-reload')).toBe(false);
  });
});

describe('search', () => {
  it('no sitemap lists a /t/ page', () => {
    const maps = readdirSync(DIST).filter((f) => /^sitemap.*\.xml$/.test(f));
    expect(maps.length).toBeGreaterThan(0);
    for (const f of maps) expect(readFileSync(join(DIST, f), 'utf8')).not.toMatch(/\/t\//);
  });
});
