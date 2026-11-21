/**
 * BDL-013, The Drawing Set: every word the sheet draws, and the facts behind
 * every number on it.
 *
 * Pure data, no DOM and no imports, so tests/bdl-013-data.test.ts can check
 * it (every Plain string has a Hood twin, no em dash, no forbidden words, no
 * time or speed figures, FACTS equal the numbers the sheet shows).
 *
 * Source of truth for look and wording: docs/bdl-013/mockups/o7-drawing-set.html
 * (the mockup, kept as the reference). Facts: docs/bdl-013/briefs/round6/
 * judge-picks.md, bdlBase 1f9afc7, re-read against bdlBase main on 11-20-26
 * (main was still 1f9afc7; nothing moved).
 *
 * Voice and rules that bind any later edit:
 *   1. Visitor-facing, studio "we". Plain = everyday words, Hood = the same
 *      sheet in engineering terms. Every string exists in both.
 *   2. No build-speed or time figures. No private-client or prospect
 *      examples (list: docs/private/forbidden-words.txt) and no compliance.
 *      Never list the three language codes.
 *   3. bdlBase is "the web framework we built". Harbor Table is the bdlBase
 *      restaurant test fixture, labelled "a demo restaurant" on the sheet.
 *
 * Strings that carry paths set `wbr` where the sheet lets a long path break
 * after a slash.
 */

/** One string in both voices. */
export interface PH { p: string; h: string }

const BS = String.fromCharCode(92); // a backslash, spelled so no editor can fold it

/* ------------------------------------------------------------------ */
/* Facts: each number the sheet shows, with its bdlBase source.        */
/* ------------------------------------------------------------------ */

export const FACTS = {
  /** The ordering module's route table. The sheet lists five and says "+ 4 more". */
  routes: {
    value: 9,
    listed: 5,
    source: 'src/modules/ordering/module.manifest.ts',
    lines: '10-33',
  },
  /** The client deploy job's needs list. The sheet's gate column lists the
      middle seven; detect_changes and cloudflare_ready are named in Hood only. */
  deployNeeds: {
    value: ['detect_changes', 'lint', 'unit_test', 'build', 'scrub', 'audit', 'e2e', 'lhci', 'cloudflare_ready'],
    source: 'scripts/create-client-site/ci-templates.mjs',
    lines: '439',
  },
  /** Generated files re-rendered and merged three-way on upgrade. package.json
      is the eighth artifact, merged key by key, so it is not in this count. */
  mergedFiles: {
    value: ['deploy.yml', 'LAUNCH.md', 'RUNBOOK.md', 'README.md', 'wrangler.jsonc', 'test/support/wrangler.jsonc', '.dev.vars.example'],
    source: 'scripts/sync-from-base.mjs',
    lines: '1120-1215 (RENDERED_ARTIFACTS)',
  },
  /** Lighthouse CI score floors, level 'error'. */
  lhci: {
    value: { performance: 0.95, accessibility: 0.95, 'best-practices': 0.95, seo: 1 } as Record<string, number>,
    source: 'lighthouserc.cjs',
    lines: '90-93',
  },
  /** Files in the salon repo that mention the ordering folder path. */
  absence: {
    value: 0,
    source: 'test/build/module-absence.spec.ts',
    lines: '57, 95-96',
  },
  /** The build refuses ordering without menu. */
  dependency: {
    source: 'src/lib/modules.ts',
    lines: '37',
  },
  /** Unreviewed language refusal (demo sites bypass). */
  languages: {
    source: 'src/lib/i18n/coverage.ts',
    lines: '183-191',
  },
  /** Placeholder guard (allowPlaceholderDemoConfig bypasses). */
  placeholders: {
    source: 'astro.config.mjs',
    lines: '83-135',
  },
};

/* ------------------------------------------------------------------ */
/* Sheet furniture                                                     */
/* ------------------------------------------------------------------ */

/** Progress strip and Next label. Index = sheet number (0 = sheet 1). */
export const SHEET_NAMES = ['Sheet', 'Off is gone', 'What ordering is made of', 'Rules and upgrades'];

export const STRIP = [
  { go: 0, aria: 'Sheet 1', mi: 'Sheet', ml: '' },
  { go: 1, aria: 'Detail 1: Off is gone', mi: '1', ml: 'Off is gone' },
  { go: 2, aria: 'Detail 2: What ordering is made of', mi: '2', ml: 'What ordering is made of' },
  { go: 3, aria: 'Detail 3: Rules and upgrades', mi: '3', ml: 'Rules and upgrades' },
];

export const CONTROLS = {
  mode: [
    { v: 'plain', label: 'Plain' },
    { v: 'hood', label: 'Under the hood' },
  ],
  scheme: [
    { v: 'light', label: 'Day' },
    { v: 'dark', label: 'Night' },
  ],
};

export const NAV_TEXT = { backLong: 'Back to sheet', backShort: 'Sheet', cue: 'Try it', next: 'Next: ', nextShort: 'Next', open: 'Open' };

/** Where the tour goes after detail 3: a live site built on bdlBase. */
export const ONWARD = { href: '/lab/bdl-008/', long: 'See a site built this way', short: 'A live site' };

/** The title block. `t` is the title (one entry per line), `s` the sheet
    number, p and h the sentence in each voice. Index = sheet number. */
export const TB: Record<number, { t: string[]; s: string; p: string; h: string }> = {
  0: {
    t: ['One page of facts.', 'A whole website.'],
    s: 'Sheet 1 of 1',
    p: 'bdlBase is the web framework we built. Describe a business in one file and it builds the site’s pages, features and launch checks, tests included.',
    h: 'Astro on Cloudflare Workers. client.json in, a standalone repo out: modules, languages, consent and CI generated per site.',
  },
  1: {
    t: ['Off is gone'],
    s: 'Detail 1 of 3',
    p: 'A feature that is off is not hidden from the site. Its files are never written. The test searches for the ordering folder path, not for the word.',
    h: 'Absence is tested on the repo, not only on dist/. Menu is off on the salon too, so modules/menu is gone as well.',
  },
  2: {
    t: ['What ordering', 'is made of'],
    s: 'Detail 2 of 3',
    p: 'Everything Ordering brings with it, and what it needs first.',
    h: 'src/modules/ordering/module.manifest.ts. 9 routes in total; the 5 customer-facing ones are listed.',
  },
  3: {
    t: ['Rules and', 'upgrades'],
    s: 'Detail 3 of 3',
    p: 'What stops a build, what every site must pass, and how a finished site takes a fix.',
    h: 'Ratings: modules.ts, coverage.ts, astro.config.mjs. Gates: ci-templates.mjs L439. Lanes: sync-from-base.mjs.',
  },
};

/** Sheet 1's call to action, after the title-block sentence. Its own span so
    the share card (?og=1), where nothing can be opened, leaves it out. */
export const TB_CTA: PH = { p: 'Follow the arrows, then open the three details.', h: 'Follow the leaders, then open details 1 to 3.' };

export const TITLE_BLOCK = {
  name: 'bdlBase',
  subject: { label: 'Subject', value: 'Harbor Table, a demo restaurant' },
  source: { label: 'Source', value: 'client.json' },
};

/* ------------------------------------------------------------------ */
/* Sheet 1                                                             */
/* ------------------------------------------------------------------ */

export const HEADS = {
  file: { p: 'One file describes the business', h: 'client.json' } as PH,
  site: { p: 'The website that comes out', h: 'generated site, by layer' } as PH,
  details: { p: 'Details', h: 'Details' } as PH,
  hint: { p: 'Each line of the file makes the layer under it.', h: 'Each key below generates the part under it.' } as PH,
};

export interface SheetRow {
  id: string;
  row: number;
  /** The client.json line (left column). */
  fl: { bal?: string; dashBal?: boolean; code: string; wide?: string; indent?: boolean; ghost?: boolean; pull?: boolean };
  /** The leader's label. */
  lead: PH;
  dashed?: boolean;
  /** The layer it points at (right column). */
  slab: {
    kind: 'main' | 'sub' | 'ghost';
    first?: boolean;
    first3?: boolean;
    tab?: string;
    name?: string;
    tx?: PH;
    b?: PH;
    sub?: PH;
    wbr?: boolean;
  };
}

export const ROWS: SheetRow[] = [
  {
    id: '1', row: 3,
    fl: { bal: '1', code: '"businessName": "Demo Harbor Table",' },
    lead: { p: 'shown on every page', h: '→ site.config.ts' },
    slab: { kind: 'main', first: true, tab: '1', name: 'Facts', tx: { p: 'Name, address, phone', h: 'site.config.ts, generated' } },
  },
  {
    id: '2', row: 4,
    fl: { bal: '2', code: '"modules": {' },
    lead: { p: 'adds feature pages', h: '→ module registry' },
    slab: { kind: 'main', tab: '2', name: 'Pages', tx: { p: 'Home, About, Services, legal, plus a page per feature', h: 'src/pages + modules/*/pages' } },
  },
  {
    id: '3a', row: 5,
    fl: { code: '  "menu": true,', indent: true },
    lead: { p: 'on: Menu page added', h: '→ modules/menu' },
    slab: { kind: 'sub', first3: true, tab: '3', b: { p: 'Features · Menu', h: 'modules.menu' }, sub: { p: 'Dishes and prices, one page', h: 'src/modules/menu/' }, wbr: true },
  },
  {
    id: '3b', row: 6,
    fl: { code: '  "ordering": true,', indent: true },
    lead: { p: 'on: Order page added', h: '→ modules/ordering' },
    slab: { kind: 'sub', b: { p: 'Online ordering', h: 'modules.ordering' }, sub: { p: 'Order and pay on the site', h: 'src/modules/ordering/' }, wbr: true },
  },
  {
    id: '3c', row: 7,
    fl: { code: '  "booking": true', indent: true },
    lead: { p: 'on: Book page added', h: '→ modules/booking' },
    slab: { kind: 'sub', b: { p: 'Booking', h: 'modules.booking' }, sub: { p: 'Reservations, one page', h: 'src/modules/booking/' }, wbr: true },
  },
  {
    id: '4', row: 9,
    fl: { bal: '4', dashBal: true, code: '"i18n": { … }', ghost: true },
    lead: { p: 'optional line, not set', h: '→ i18n.locales' },
    dashed: true,
    slab: { kind: 'ghost', tab: '4', name: 'Languages', tx: { p: 'On a real site, a new language goes live only once reviewed.', h: 'coverage.ts refuses unreviewed; demos exempt' } },
  },
  {
    id: '5', row: 10,
    fl: { bal: '5', code: '"consent": "opt-out",' },
    lead: { p: 'sets the tracking rule', h: '→ consent.ts' },
    slab: { kind: 'main', tab: '5', name: 'Consent', tx: { p: 'One rule for tracking choices', h: 'analytics/consent.ts' }, wbr: true },
  },
  {
    id: '6', row: 11,
    fl: { bal: '6', code: '}', wide: '{ … } the whole file', indent: true, pull: true },
    lead: { p: 'sets the launch checks', h: '→ deploy.yml' },
    slab: { kind: 'main', tab: '6', name: 'Checks', tx: { p: 'Tests that must pass to launch', h: 'deploy needs 9 jobs' } },
  },
];

/** Braces in the file listing; the closing one sits beside the switch-off note. */
export const BRACES = { open: { row: 2, text: '{' }, close: { row: 8, text: '},' } };
export const SWITCH_NOTE = {
  b: { p: 'Switch one off', h: 'modules.x = false' } as PH,
  sub: { p: 'and its files are never written.', h: 'absent from the repo, not hidden' } as PH,
};

export const LEGEND: { dashed: boolean; t: PH }[] = [
  { dashed: false, t: { p: 'A line in the file', h: 'key present in file' } },
  { dashed: true, t: { p: 'An optional line, not set', h: 'optional key, absent' } },
];

export const BUBBLES: { n: string; detail: number; cls: string; rows: string; title: PH; sub: PH }[] = [
  { n: '1', detail: 1, cls: 'b1', rows: '5/7', title: { p: 'Off is gone', h: 'Detail 1: grep = 0' }, sub: { p: 'Salon vs restaurant', h: 'tree diff' } },
  { n: '2', detail: 2, cls: 'b2', rows: '7/9', title: { p: 'What ordering is made of', h: 'Detail 2: manifest' }, sub: { p: 'A parts list', h: 'module.manifest.ts' } },
  { n: '3', detail: 3, cls: 'b3', rows: '10/12', title: { p: 'Rules and upgrades', h: 'Detail 3: gates + lanes' }, sub: { p: 'What stops a build', h: 'ratings, CI, lanes' } },
];

export const NOTES: { p: string[]; h: string[] } = {
  p: [
    'Each line in the file makes the layer its arrow points to.',
    'Harbor Table is a demo restaurant. The file is an excerpt.',
  ],
  h: [
    'Leaders run from client.json lines to the parts generated from them.',
    'restaurant.client.json excerpt; modules reformatted; i18n optional, absent.',
  ],
};

/* ------------------------------------------------------------------ */
/* Detail 1: Off is gone                                               */
/* ------------------------------------------------------------------ */

export interface TreeRow { t: string; l?: 0 | 1 | 2; s?: 'on' | 'gone' }
export interface Dim { a: number; b: number; label: PH }

export const D1 = {
  aria: 'Detail 1, Off is gone',
  head: {
    bal: '1',
    title: { p: 'Off is gone', h: 'Detail 1: absence' } as PH,
    lede: {
      p: 'Same framework, two businesses. A feature that is off is not hidden. It is never written.',
      h: 'module-absence.spec.ts: generate(salon) and generate(restaurant), then grep every shipped text file.',
    } as PH,
  },
  restaurant: {
    th: {
      b: { p: 'Harbor Table · restaurant', h: 'restaurant.client.json' } as PH,
      sub: { p: 'Menu, ordering and booking on.', h: 'modules: menu, ordering, booking = true' } as PH,
    },
    rows: [
      { t: 'src/modules/' },
      { t: 'booking/', l: 1 },
      { t: 'menu/', l: 1 },
      { t: 'ordering/', l: 1, s: 'on' },
      { t: 'durable-objects/order-board.ts', l: 2, s: 'on' },
      { t: 'lib/', l: 2, s: 'on' },
      { t: 'pages/', l: 2, s: 'on' },
      { t: 'module.manifest.ts', l: 2, s: 'on' },
      { t: 'test/modules/ordering/', s: 'on' },
      { t: 'e2e-security/modules/ordering/', s: 'on' },
      { t: 'wrangler.jsonc' },
      { t: 'ORDER_BOARD binding', l: 1, s: 'on' },
      { t: '.dev.vars.example' },
      { t: 'STRIPE_ keys', l: 1, s: 'on' },
    ] as TreeRow[],
  },
  salon: {
    /** The one link out: Magnolia & Mane is BDL-008. */
    href: '/lab/bdl-008/',
    th: {
      b: { p: 'Magnolia & Mane · salon', h: 'salon.client.json' } as PH,
      sub: { p: 'Menu off, ordering off, booking on.', h: 'modules: menu, ordering = false; booking = true' } as PH,
    },
    rows: [
      { t: 'src/modules/' },
      { t: 'booking/', l: 1 },
      { t: 'menu/', l: 1, s: 'gone' },
      { t: 'ordering/', l: 1, s: 'gone' },
      { t: 'durable-objects/order-board.ts', l: 2, s: 'gone' },
      { t: 'lib/', l: 2, s: 'gone' },
      { t: 'pages/', l: 2, s: 'gone' },
      { t: 'module.manifest.ts', l: 2, s: 'gone' },
      { t: 'test/modules/ordering/', s: 'gone' },
      { t: 'e2e-security/modules/ordering/', s: 'gone' },
      { t: 'wrangler.jsonc' },
      { t: 'ORDER_BOARD binding', l: 1, s: 'gone' },
      { t: '.dev.vars.example' },
      { t: 'STRIPE_ keys', l: 1, s: 'gone' },
    ] as TreeRow[],
    dims: [
      { a: 2, b: 2, label: { p: 'menu: off', h: 'menu: false' } },
      { a: 3, b: 9, label: { p: 'ordering: not in this site', h: 'ordering: false. Not generated.' } },
      { a: 11, b: 11, label: { p: 'no order storage', h: 'no ORDER_BOARD' } },
      { a: 13, b: 13, label: { p: 'no payment keys', h: 'no STRIPE_*' } },
    ] as Dim[],
  },
  zero: {
    n: String(FACTS.absence.value),
    b: { p: 'files point to the ordering folder', h: 'files match modules/ordering' } as PH,
    p: {
      p: 'A test builds the salon and searches every file in it for the ordering folder path. It finds none. Harbor Table is the control: it must still have everything.',
      h: '/modules[' + BS + BS + '/]ordering' + BS + 'b/ over src, test, e2e, e2e-security, scripts and root config. Expected: []. Restaurant fixture is the positive control.',
    } as PH,
  },
};

/* ------------------------------------------------------------------ */
/* Detail 2: what ordering is made of                                  */
/* ------------------------------------------------------------------ */

export const D2 = {
  aria: 'Detail 2, What ordering is made of',
  head: {
    bal: '2',
    title: { p: 'What ordering is made of', h: 'Detail 2: module.manifest.ts' } as PH,
    lede: {
      p: 'One manifest per feature, like a parts list. Turn the feature on and everything below is added.',
      h: 'src/modules/ordering/module.manifest.ts feeds the generated module registry.',
    } as PH,
  },
  svg: {
    label: 'Ordering module with its needs and attachments',
    menu: 'Menu',
    ordering: 'Ordering',
    serverCode: { p: 'Server code', h: 'workerExports' } as PH,
    liveStorage: { p: 'Live storage', h: 'DO binding' } as PH,
    needs: { p: 'needs', h: 'requires' } as PH,
    routes: ['/order', '/order/success', '/order/cancelled', '/api/checkout', '/api/checkout/webhook'],
    more: '+ 4 more',
    className: 'OrderBoard',
    binding: 'ORDER_BOARD',
    navTag: 'Order',
    menuCount: '3',
  },
  bomHead: {
    n: '#',
    part: { p: 'PART', h: 'FIELD' } as PH,
    what: { p: 'WHAT IT IS', h: 'VALUE' } as PH,
  },
  bom: [
    {
      bal: '1',
      name: { p: '9 pages and endpoints', h: 'routes[9]' } as PH,
      w: {
        p: '/order, /order/success, /order/cancelled, /api/checkout, /api/checkout/webhook',
        h: '/order (localized) · /order/success · /order/cancelled · /api/checkout · /api/checkout/webhook · +4 more',
      } as PH,
      more: '+ 4 more',
    },
    {
      bal: '2',
      name: { p: 'A menu link', h: 'navLink' } as PH,
      w: { p: '“Order” joins the site\'s navigation, pointing at /order.', h: '{ labelKey: \'module.ordering.nav\', href: \'/order\', order: 20 }' } as PH,
    },
    {
      bal: '3',
      name: { p: 'Needs: Menu', h: 'requires' } as PH,
      w: { p: 'Ordering will not build while Menu is off.', h: '[\'menu\']. validateModuleDependencies() throws at build.' } as PH,
    },
    {
      bal: '4',
      name: { p: 'Server code', h: 'workerExports' } as PH,
      w: { p: 'OrderBoard, code that runs on Cloudflare\'s servers.', h: '[{ name: \'OrderBoard\', from: \'./durable-objects/order-board\' }]' } as PH,
    },
    {
      bal: '5',
      name: { p: 'Live storage', h: 'durableObjects' } as PH,
      w: { p: 'ORDER_BOARD, a small store that holds incoming orders.', h: '[{ binding: \'ORDER_BOARD\', className: \'OrderBoard\' }]' } as PH,
    },
    {
      bal: '·',
      name: { p: 'Its own wording', h: 'uiStrings' } as PH,
      w: { p: 'Every label it shows, ready to translate.', h: 'orderingStrings' } as PH,
    },
  ] as { bal: string; name: PH; w: PH; more?: string }[],
};

/* ------------------------------------------------------------------ */
/* Detail 3: rules and upgrades                                        */
/* ------------------------------------------------------------------ */

export const D3 = {
  aria: 'Detail 3, Rules and upgrades',
  head: {
    bal: '3',
    title: { p: 'Rules and upgrades', h: 'Detail 3: ratings, gates, lanes' } as PH,
    lede: {
      p: 'The rules every site is held to, and how a finished site takes a fix.',
      h: 'modules.ts · coverage.ts · astro.config.mjs · ci-templates.mjs · sync-from-base.mjs',
    } as PH,
  },
  ratings: {
    h3: { t: { p: 'What the build refuses', h: 'Absolute ratings' } as PH, small: { p: 'Any one of these stops it.', h: 'build or deploy fails' } as PH },
    items: [
      { bal: 'A', b: { p: 'Ordering on, Menu off', h: 'ordering without menu' } as PH, s: { p: 'The build stops and names the switch to flip.', h: 'src/lib/modules.ts validateModuleDependencies()' } as PH },
      { bal: 'B', b: { p: 'A language nobody reviewed', h: 'unreviewed locale' } as PH, s: { p: 'A production build refuses it. Demo sites are exempt.', h: 'src/lib/i18n/coverage.ts: \'refuse\'. isDemo bypasses.' } as PH },
      { bal: 'C', b: { p: 'Placeholder settings', h: 'placeholder config' } as PH, s: { p: 'For example a booking link nobody filled in.', h: 'astro.config.mjs guard. allowPlaceholderDemoConfig bypasses.' } as PH },
      { bal: 'D', b: { p: 'Secrets in the built site', h: 'secrets in dist/' } as PH, s: { p: 'The secrets scan fails the deploy.', h: 'scrub job: check-no-secrets-in-build.mjs' } as PH },
    ],
  },
  gates: {
    h3: { t: { p: 'Every site must pass', h: 'deploy needs' } as PH, small: { p: 'Launch waits for all of these.', h: 'every job above deploy' } as PH },
    items: [
      { name: { p: 'Lint', h: 'lint' } as PH },
      { name: { p: 'Unit tests', h: 'unit_test' } as PH },
      { name: { p: 'Build', h: 'build' } as PH },
      { name: { p: 'Secrets scan', h: 'scrub' } as PH },
      { name: { p: 'Dependency audit', h: 'audit' } as PH },
      { name: { p: 'Browser tests, plus proof they ran', h: 'e2e: assert-suite-ran, check:links' } as PH },
      { name: { p: 'Lighthouse scores, out of 100', h: 'lhci' } as PH, last: true },
    ] as { name: PH; last?: boolean }[],
    lighthouse: [
      { name: { p: 'Performance', h: 'performance' } as PH, v: '0.95', vp: '95' },
      { name: { p: 'Accessibility', h: 'accessibility' } as PH, v: '0.95', vp: '95' },
      { name: { p: 'Best practices', h: 'best-practices' } as PH, v: '0.95', vp: '95' },
      { name: { p: 'SEO', h: 'seo' } as PH, v: '1.0', vp: '100' },
    ],
    pay: {
      p: 'Sites with ordering also run a payments test in test mode.',
      h: 'Deploy also needs detect_changes and cloudflare_ready. lighthouserc.cjs L90-93, level \'error\'. Ordering sites add stripe-e2e.mjs.',
    } as PH,
  },
  revision: {
    h3: { t: { p: 'How a finished site takes a fix', h: 'Revision table' } as PH, small: { p: 'For sites that take upgrades.', h: 'sync-from-base.mjs' } as PH },
    head: [{ p: 'FILES', h: 'LANE' }, { p: 'WHAT HAPPENS', h: 'WHAT HAPPENS' }] as PH[],
    rows: [
      { name: { p: 'Patched', h: 'patched' } as PH, w: { p: 'Framework code. A fix arrives as a patch, one file at a time.', h: 'git apply --3way, per file' } as PH },
      {
        name: { p: 'Merged', h: 'merged' } as PH,
        w: {
          p: 'Seven generated files, merged with the site\'s own edits. package.json is merged key by key.',
          h: 'git merge-file: deploy.yml, LAUNCH.md, RUNBOOK.md, README.md, wrangler.jsonc, test/support/wrangler.jsonc, .dev.vars.example. package.json key by key.',
        } as PH,
      },
      { name: { p: 'Never touched', h: 'never touched' } as PH, w: { p: 'The business\'s content, look and settings.', h: 'src/content, src/styles/theme.css, src/lib/site.config.ts' } as PH, never: true },
    ] as { name: PH; w: PH; never?: boolean }[],
    note: { p: 'An upgrade never edits a business\'s words.', h: 'SYNC_EXTRA_EXCLUDES keeps these out of every diff.' } as PH,
  },
};
