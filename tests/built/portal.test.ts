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
import { THEMES } from '../../src/themes/registry';
import { WORDMARK_SCOPE } from '../../src/themes/portal/runtime';

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

/* The property is matched whatever its case and spacing (CSS property names
   are case-insensitive, esbuild keeps case, and inline style="" attributes are
   not minified), and not as the tail of a custom property such as
   --x-view-transition-name. The name keeps its case: idents are
   case-sensitive, so `Swiss-bar` is not swiss's. A var() or other function
   value is captured as its function name and so reads as stray. */
const NAME_DECL = /(?<![\w-])view-transition-name\s*:\s*([\w-]+)/gi;

/** Every innermost rule in a stylesheet: its selector list and its
    declarations (rules nested in @media, @supports or @layer included). */
function rulesOf(css: string): { selector: string; decls: { prop: string; value: string }[] }[] {
  return [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]*)\{([^{}]*)\}/g)].map((m) => ({
    selector: m[1].trim(),
    decls: m[2]
      .split(';')
      .map((d) => d.trim())
      .filter(Boolean)
      .map((d) => {
        const at = d.indexOf(':');
        return { prop: d.slice(0, at).trim().toLowerCase(), value: d.slice(at + 1).trim() };
      }),
  }));
}

/* Properties that change how the children of ::view-transition draw: set on
   that shared pseudo, they reach the switcher's group, which nothing on the
   switcher's side can undo (README, View-transition names). */
const REACHES_EVERY_GROUP = /^(opacity|filter|backdrop-filter|clip-path|clip|mask(-[\w-]+)?|transform(-[\w-]+)?|translate|rotate|scale|perspective(-origin)?|mix-blend-mode|visibility|display|content-visibility|zoom)$/;

/** Every view-transition name a page declares, wherever it is declared:
    linked stylesheets, inline <style> blocks (Astro writes transition:name
    into one) and inline style="" attributes. */
function transitionNames(html: string): { name: string; from: 'sheet' | 'attribute'; tag?: string }[] {
  const inSheets = [...cssOf(html).matchAll(NAME_DECL)].map((m) => ({ name: m[1], from: 'sheet' as const }));
  const inAttributes = doc(html)
    .querySelectorAll('[style]')
    .flatMap((el) =>
      [...(el.getAttribute('style') ?? '').matchAll(NAME_DECL)].map((m) => ({ name: m[1], from: 'attribute' as const, tag: el.tagName.toLowerCase() })),
    );
  return [...inSheets, ...inAttributes].filter((n) => n.name !== 'none');
}

/** The school a `<id>-*` name belongs to: the longest registered id it starts
    with, so a tranche-2 id that extends another (say `swiss-punk` beside
    `swiss`) owns `swiss-punk-bar` and `swiss` does not. */
function nameOwner(name: string, ids: string[]): string | undefined {
  return ids.filter((id) => name.startsWith(`${id}-`)).sort((a, b) => b.length - a.length)[0];
}

/** The school's stylesheets: every linked sheet and every inline <style>
    except the portal's own marked block. */
function schoolCssOf(html: string): string {
  const linked = stylesheetHrefs(html)
    .filter((h) => h.startsWith('/'))
    .map((h) => readFileSync(join(DIST, h.split('?')[0]), 'utf8'));
  const inline = doc(html)
    .querySelectorAll('style')
    .filter((s) => !s.hasAttribute('data-portal-vt'))
    .map((s) => s.text);
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
  it('builds exactly the registered schools, no stale or unregistered ones', () => {
    expect(schools).toEqual(THEMES.map((t) => t.id).sort());
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
      const names = transitionNames(readPage(route)).map((n) => n.name);
      const dupes = names.filter((n, i) => names.indexOf(n) !== i);
      expect(dupes).toEqual([]);
    });
    it(`${route}: view-transition names are wordmark, bdl-switcher or this school's own <id>-*`, () => {
      // The naming contract (README): wordmark is the one pair across
      // schools, bdl-switcher is the portal's, and a school names its own
      // chrome <id>-*. Another school's prefix, a bare word, `auto` or a
      // var() would pair (or fail to pair) with something it should not.
      const stray = transitionNames(readPage(route))
        .map((n) => n.name)
        .filter((n) => n !== 'wordmark' && n !== 'bdl-switcher' && nameOwner(n, schools) !== id);
      expect(stray).toEqual([]);
    });
    it(`${route}: <id>-* names are named only when both sides of the swap are this school`, () => {
      // The recipe (README): the rule that sets an <id>-* name is keyed on
      // data-to-theme or data-from-theme. Named at rest, the chrome is a
      // stacking context and a backdrop root; named on a swap to or from
      // another school, it has no partner and animates apart from the arrival.
      const html = readPage(route);
      const ungated = rulesOf(schoolCssOf(html)).filter(
        (r) =>
          r.decls.some((d) => d.prop === 'view-transition-name' && nameOwner(d.value.split(/[\s!]/)[0], schools) === id) &&
          !/data-(to|from)-theme/.test(r.selector),
      );
      expect(ungated.map((r) => r.selector)).toEqual([]);
      const inAttributes = transitionNames(html).filter((n) => n.from === 'attribute' && nameOwner(n.name, schools) === id);
      expect(inAttributes).toEqual([]);
    });
    it(`${route}: bdl-switcher names the switcher and nothing else, and holds it still`, () => {
      const html = readPage(route);
      const named = transitionNames(html).filter((n) => n.name === 'bdl-switcher');
      expect(named).toEqual([{ name: 'bdl-switcher', from: 'attribute', tag: 'bdl-switcher' }]);
      // Only the portal's marked inline block may style its group; no
      // school stylesheet may reach it.
      expect(schoolCssOf(html)).not.toMatch(/bdl-switcher/);
      const blocks = doc(html).querySelectorAll('style[data-portal-vt]');
      expect(blocks).toHaveLength(1);
      const vt = blocks[0].text.replace(/\s+/g, '');
      // In a layer, so its !important outranks a school's !important
      // wildcards whatever their specificity.
      expect(vt).toMatch(/^@layer[\w-]+\{/);
      // Every property of all four pseudo-elements goes back to the
      // browser's own styles (so no school wildcard reaches them), then the
      // group, the image pair and the new snapshot are unanimated and the
      // old snapshot is not drawn. Each pseudo-element is checked on its
      // own, so dropping one from a selector list fails.
      const rules = rulesOf(vt);
      const sets = (pseudo: string, prop: string, value: string) =>
        rules.some(
          (r) => r.selector.split(',').includes(`::view-transition-${pseudo}(bdl-switcher)`) && r.decls.some((d) => d.prop === prop && d.value === value),
        );
      for (const pseudo of ['group', 'image-pair', 'new', 'old']) expect(sets(pseudo, 'all', 'revert!important'), pseudo).toBe(true);
      for (const pseudo of ['group', 'image-pair', 'new']) expect(sets(pseudo, 'animation', 'none!important'), pseudo).toBe(true);
      expect(sets('old', 'display', 'none!important')).toBe(true);
      // The resets must come after `all: revert`, or it would undo them.
      const last = (prop: string) => rules.findLastIndex((r) => r.decls.some((d) => d.prop === prop));
      expect(last('all')).toBeLessThan(Math.min(last('animation'), last('display')));
    });
    it(`${route}: no school draws on the shared ::view-transition pseudo in a way that reaches the switcher`, () => {
      const onRoot = rulesOf(schoolCssOf(readPage(route))).filter((r) => /::view-transition(?![\w-])/.test(r.selector));
      const reaching = onRoot.flatMap((r) => r.decls.filter((d) => REACHES_EVERY_GROUP.test(d.prop)).map((d) => `${r.selector} { ${d.prop} }`));
      expect(reaching).toEqual([]);
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

  it('the school data walks the exhibit in order and carries each list row', () => {
    // The switcher lists schools in this order (S7), each row with its era
    // and signature. Lessons stay out: they wait for the BDL-011 case study.
    const data = doc(readPage(portalRoutes[0])).querySelector('script#bdl-schools')?.text ?? '';
    const parsed = JSON.parse(data) as { schools: { id: string; era: string; signature: string; lesson?: string }[] };
    expect(parsed.schools.map((s) => s.id)).toEqual(THEMES.map((t) => t.id));
    for (const t of THEMES) {
      const s = parsed.schools.find((x) => x.id === t.id)!;
      expect({ era: s.era, signature: s.signature }, t.id).toEqual({ era: t.era, signature: t.signature });
      expect(s.lesson, t.id).toBeUndefined();
    }
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

describe("quiet's header lights the page it is on (root and portal alike)", () => {
  /** The hrefs of the header nav links marked aria-current="page". */
  const lit = (route: string) =>
    doc(readPage(route))
      .querySelectorAll('header nav a[aria-current="page"]')
      .map((a) => a.getAttribute('href'));
  const cases: [string, string[]][] = [
    ['/contact/', ['/contact']],
    ['/contact/sent/', []],
    ['/t/quiet/contact/', ['/t/quiet/contact/']],
    ['/t/quiet/contact/sent/', []],
    ['/lab/', ['/lab']],
    ['/lab/experiments/', ['/lab']],
    ['/lab/studies/', ['/lab']],
  ];
  for (const [route, want] of cases) {
    it(`${route} lights ${want.length ? want.join(', ') : 'nothing'}`, () => {
      expect(lit(route)).toEqual(want);
    });
  }
});

describe('"From the lab" lines link to their entries', () => {
  /** The home page's specimen lines: designation text, its link and attributes. */
  const lines = (route: string) =>
    doc(readPage(route))
      .querySelectorAll('ul[data-parity-skip] > li')
      .map((li) => {
        const links = li.querySelectorAll('a[href]');
        const a = links[0];
        return {
          count: links.length,
          text: a?.text.trim() ?? '',
          href: a?.getAttribute('href') ?? '',
          label: a?.getAttribute('aria-label') ?? '',
          reload: a?.hasAttribute('data-astro-reload') ?? false,
        };
      });
  const root = lines('/');

  it('the root home shows the three newest, each designation one link', () => {
    expect(root).toHaveLength(3);
    for (const l of root) {
      expect(l.count).toBe(1);
      expect(l.text).toMatch(/^BDL-\d{3}$/);
      expect(l.label.startsWith(`${l.text}, `), l.label).toBe(true);
    }
  });

  it('root links keep the root convention and land on built pages', () => {
    for (const { href, reload } of root) {
      expect(reload).toBe(false);
      if (href.startsWith('/lab/')) expect(href).toMatch(/^\/lab\/[a-z0-9-]+$/);
      expect(() => readPage(href.endsWith('/') ? href : `${href}/`)).not.toThrow();
    }
  });

  for (const id of schools) {
    it(`/t/${id}/ links the same three, leaving the school only for the Lab`, () => {
      const here = lines(`/t/${id}/`);
      expect(here.map((l) => [l.count, l.text, l.label])).toEqual(root.map((l) => [l.count, l.text, l.label]));
      for (const { href, reload } of here) {
        if (href.startsWith('/t/')) {
          expect(reload, href).toBe(false);
        } else {
          expect(href, href).toMatch(/^\/lab\/[a-z0-9-]+\/$/);
          expect(reload, href).toBe(true);
        }
        expect(() => readPage(href)).not.toThrow();
      }
    });
  }
});

describe('the wordmark contract holds on the built site (README, "The wordmark")', () => {
  // runtime.ts finds the arriving wordmark by this pattern in Astro's inline
  // style; if an Astro upgrade changes that output, the scrolled-swap fix
  // turns itself off without a sound, so every page is checked against it.
  for (const route of portalRoutes) {
    it(`${route}: Astro's inline style names the wordmark in the form runtime.ts reads`, () => {
      const page = doc(readPage(route));
      const scopes = page
        .querySelectorAll('style')
        .map((s) => WORDMARK_SCOPE.exec(s.text)?.[1])
        .filter((x): x is string => !!x);
      expect(scopes, 'runtime.ts WORDMARK_SCOPE no longer matches what Astro writes').toHaveLength(1);
      expect(page.querySelectorAll(`[data-astro-transition-scope="${scopes[0]}"]`)).toHaveLength(1);
    });
  }
  // Without these three, a school's wordmark falls back to Astro's layered
  // 180 ms fade inside a longer morph (p5-proof.md), which only a film shows.
  for (const id of schools) {
    it(`${id}: both wordmark images run on the group's clock (duration and delay inherit, fill both)`, () => {
      const rules = rulesOf(schoolCssOf(readPage(`/t/${id}/`)));
      for (const image of ['old', 'new']) {
        const own = new RegExp(`data-theme=['"]?${id}['"]?\\]::view-transition-${image}\\(wordmark\\)$`);
        const recipe = rules.some(
          (r) =>
            r.selector.split(',').some((sel) => own.test(sel.trim())) &&
            ['animation-duration', 'animation-delay'].every((prop) => r.decls.some((d) => d.prop === prop && d.value === 'inherit')) &&
            r.decls.some((d) => d.prop === 'animation-fill-mode' && d.value === 'both'),
        );
        expect(recipe, `${id} ::view-transition-${image}(wordmark) lacks the recipe`).toBe(true);
      }
    });
  }
});

describe("vaporwave's floor runs to the true page bottom", () => {
  it('its --vw-tail is the height of the portal tail it paints under', () => {
    const html = readPage('/t/vaporwave/');
    const tail = /height:\s*(\d+)px/.exec(doc(html).querySelector('[data-portal-tail]')?.getAttribute('style') ?? '')?.[1];
    const floor = /--vw-tail:\s*(\d+)px/.exec(schoolCssOf(html))?.[1];
    expect(tail, 'PortalLayout no longer sets the tail height inline').toBeDefined();
    expect(floor, 'src/themes/vaporwave/Footer.astro --vw-tail must match PortalLayout.astro data-portal-tail').toBe(tail);
  });
});
