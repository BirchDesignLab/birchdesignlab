# SEO and Configuration Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make birchdesignlab.com correctly configured and findable by its own name before the 2026-09-01 launch, without publishing the founder's identity.

**Architecture:** Two pull requests split by risk. PR 1 adds markup, content, and documentation, and cannot change how the server responds. PR 2 adds response headers and a Content Security Policy, which is the only work that can break the live site, so it is isolated to revert alone. CSP hashes are delegated to Astro's own build-time generation rather than maintained by hand.

**Tech Stack:** Astro 5.18.2 (static output), Svelte 5 islands, Cloudflare Workers Static Assets, `@napi-rs/canvas` for build-time PNG rendering, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-03-seo-configuration-pass-design.md`

## Global Constraints

- **Never publish the founder's name.** No `founder`, no `Person`, no personal identifiers in any markup. The site is already abstracted; keep it that way.
- **No emdashes in external-facing output.** Applies to anything a visitor reads: site copy, JSON-LD `description`, manifest strings, generated images. Does NOT apply to specs, plans, commit messages, or PR bodies.
- **All emitted colors are 6-digit hex.** `src/lib/bark/draw2d.ts` `parseColor` falls back to white on anything else.
- **`Disallow` is not `noindex`.** Never add a `Disallow` line for a page that carries a `noindex` tag; blocking the crawl prevents the tag from ever being seen.
- **Astro version floor: 5.18.2.** `experimental.csp` does not exist below 5.9. `package.json` declares `^5.7.0`; the installed version is what matters.
- **Verify before every commit:** `npx vitest run`, `npx astro check`, `npm run build`. All three clean.
- **Branch and PR.** Never commit directly to `main`. After a PR merges, sync `main` and delete the merged branch.

---

## File Structure

**PR 1 (branch `seo/markup-and-content`)**

| File | Responsibility |
|---|---|
| `public/robots.txt` | Crawl policy and sitemap pointer. Static. |
| `src/lib/seo/organization.ts` | Pure builder returning the Organization JSON-LD object. Unit tested. |
| `src/components/StructuredData.astro` | Renders the builder's output as a JSON-LD script tag. |
| `src/layouts/BaseLayout.astro` | Gains a named `head` slot so pages can inject head content. |
| `src/pages/index.astro` | Passes `StructuredData` into the head slot. |
| `scripts/og/logo.ts` | Renders the 512x512 logo PNG. Separate from `render.ts`, which owns OG cards. |
| `scripts/og/generate.ts` | Also writes the logo. |
| `src/layouts/ExperimentLayout.astro` | Emits the visually hidden `<h1>`; gains the sitemap link. |
| `src/layouts/StudyLayout.astro` | Gains the sitemap link. |
| `src/experiments/bdl-002/Experiment.astro` | Existing `<h1>` demotes to `<h2>`. |
| `src/pages/styleguide.astro` | Second `<h1>` demotes to `<h2>`. |
| `public/site.webmanifest` | Web app manifest. |
| `docs/deploy.md` | Corrected wrangler account note; www redirect recorded. |
| `CLAUDE.md` | PR workflow. |
| `tests/seo-organization.test.ts` | Tests the JSON-LD builder. |
| `tests/og-logo.test.ts` | Tests the logo render. |
| `tests/robots.test.ts` | Tests robots.txt contents. |

**PR 2 (branch `seo/response-headers`)**

| File | Responsibility |
|---|---|
| `astro.config.mjs` | `experimental.csp` configuration. |
| `public/_headers` | The four headers a meta CSP cannot express. |
| `docs/deploy.md` | Records the Worker header obligation and dashboard steps. |

`src/lib/seo/` is a new directory. It exists so SEO data construction is unit-testable without a build, matching how `src/lib/og/manifest.ts` separates data from rendering.

---

# PR 1: Markup and content

Branch from an up-to-date `main`.

```bash
git checkout main && git pull --ff-only && git checkout -b seo/markup-and-content
```

---

### Task 1: robots.txt

**Files:**
- Create: `public/robots.txt`
- Test: `tests/robots.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `public/robots.txt`, served at `/robots.txt`. No other task depends on it.

- [ ] **Step 1: Write the failing test**

Create `tests/robots.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const robots = readFileSync('public/robots.txt', 'utf8');

describe('robots.txt', () => {
  it('allows every crawler', () => {
    expect(robots).toMatch(/^User-agent: \*$/m);
    expect(robots).toMatch(/^Allow: \/$/m);
  });

  it('points at the sitemap index with an absolute URL', () => {
    expect(robots).toMatch(/^Sitemap: https:\/\/birchdesignlab\.com\/sitemap-index\.xml$/m);
  });

  it('disallows nothing, because Disallow would hide the noindex tag', () => {
    expect(robots).not.toMatch(/^Disallow:\s*\S/m);
  });

  it('ends with a trailing newline', () => {
    expect(robots.endsWith('\n')).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/robots.test.ts`
Expected: FAIL with `ENOENT: no such file or directory, open 'public/robots.txt'`

- [ ] **Step 3: Create the file**

Create `public/robots.txt`:

```
User-agent: *
Allow: /

Sitemap: https://birchdesignlab.com/sitemap-index.xml
```

Note the deliberate absence of `Disallow`. `/styleguide` and `/lab/bdl-006` carry `noindex` and must stay crawlable for that tag to be honoured.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/robots.test.ts`
Expected: PASS, 4 tests

- [ ] **Step 5: Confirm it reaches the build**

Run: `npm run build && cat dist/robots.txt`
Expected: the file contents printed. Astro copies `public/` to `dist/` verbatim.

- [ ] **Step 6: Commit**

```bash
git add public/robots.txt tests/robots.test.ts
git commit -m "feat(seo): robots.txt allowing all crawlers, with a sitemap pointer"
```

---

### Task 2: Generated logo PNG

Google's Organization `logo` property does not accept SVG, and `public/favicon.svg` is the only mark that exists. This renders a raster from the same three-lenticel geometry so the two cannot drift.

**Files:**
- Create: `scripts/og/logo.ts`
- Modify: `scripts/og/generate.ts`
- Test: `tests/og-logo.test.ts`

**Interfaces:**
- Consumes: `@napi-rs/canvas`, already a devDependency used by `scripts/og/render.ts`.
- Produces: `renderLogo(): Buffer` and `LOGO_SIZE: number` from `scripts/og/logo.ts`. Writes `public/og/logo.png` at prebuild. Task 3 references the file by URL only.

- [ ] **Step 1: Write the failing test**

Create `tests/og-logo.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { renderLogo, LOGO_SIZE } from '../scripts/og/logo';

describe('renderLogo', () => {
  it('produces a square PNG at the size Google wants', () => {
    const png = renderLogo();
    expect(png.subarray(1, 4).toString('ascii')).toBe('PNG');
    expect(png.readUInt32BE(16)).toBe(LOGO_SIZE);
    expect(png.readUInt32BE(20)).toBe(LOGO_SIZE);
  });

  it('is at least 112px, Google\'s documented minimum', () => {
    expect(LOGO_SIZE).toBeGreaterThanOrEqual(112);
  });

  it('is deterministic', () => {
    expect(renderLogo().equals(renderLogo())).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/og-logo.test.ts`
Expected: FAIL, cannot resolve `../scripts/og/logo`

- [ ] **Step 3: Write the implementation**

Create `scripts/og/logo.ts`. The geometry is a direct port of `public/favicon.svg`, whose viewBox is `0 0 32 32`, scaled by `LOGO_SIZE / 32`:

```ts
/** Renders the square logo mark: three lenticel dashes on the dark face.
 *  Geometry is a direct port of public/favicon.svg (viewBox 0 0 32 32) so the
 *  favicon and the structured-data logo cannot drift apart.
 *
 *  Placeholder: there is no real logo yet. When one exists it replaces the
 *  generated file and nothing else changes. */
import { createCanvas } from '@napi-rs/canvas';

export const LOGO_SIZE = 512;

const BG = '#1c1a17';
const MARK = '#f4f0e6';

/** x, y, width, height, in the favicon's 32-unit coordinate space. */
const DASHES = [
  [6, 9, 14, 2],
  [12, 15, 14, 2],
  [6, 21, 10, 2],
] as const;

export function renderLogo(): Buffer {
  const canvas = createCanvas(LOGO_SIZE, LOGO_SIZE);
  const ctx = canvas.getContext('2d');
  const scale = LOGO_SIZE / 32;

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, LOGO_SIZE, LOGO_SIZE);

  ctx.fillStyle = MARK;
  for (const [x, y, w, h] of DASHES) {
    const radius = (h * scale) / 2;
    ctx.beginPath();
    ctx.roundRect(x * scale, y * scale, w * scale, h * scale, radius);
    ctx.fill();
  }

  return canvas.toBuffer('image/png');
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/og-logo.test.ts`
Expected: PASS, 3 tests

- [ ] **Step 5: Write it at prebuild**

Modify `scripts/og/generate.ts`. Add the import beneath the existing `renderOgCard` import:

```ts
import { renderLogo } from './logo';
```

Then after the existing `for (const page of OG_PAGES)` loop, append:

```ts
writeFileSync(join(outDir, 'logo.png'), renderLogo());
console.log('og: wrote logo.png');
```

- [ ] **Step 6: Verify the file is produced**

Run: `npm run og && ls -l public/og/logo.png`
Expected: the file exists and is non-empty.

Note: `public/og/` is gitignored, so the PNG is never committed. It is regenerated on every build, including on Cloudflare.

- [ ] **Step 7: Commit**

```bash
git add scripts/og/logo.ts scripts/og/generate.ts tests/og-logo.test.ts
git commit -m "feat(seo): generate a 512x512 logo PNG from the favicon geometry"
```

---

### Task 3: Organization structured data

**Files:**
- Create: `src/lib/seo/organization.ts`, `src/components/StructuredData.astro`
- Modify: `src/layouts/BaseLayout.astro`, `src/pages/index.astro`
- Test: `tests/seo-organization.test.ts`

**Interfaces:**
- Consumes: `renderLogo` output at `/og/logo.png` from Task 2.
- Produces: `buildOrganization(site: URL | string): OrganizationJsonLd` from `src/lib/seo/organization.ts`. `StructuredData.astro` takes no props. `BaseLayout` gains a named slot called `head`.

- [ ] **Step 1: Write the failing test**

Create `tests/seo-organization.test.ts`:

```ts
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
    expect(org.logo).toBe('https://birchdesignlab.com/og/logo.png');
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/seo-organization.test.ts`
Expected: FAIL, cannot resolve `../src/lib/seo/organization`

- [ ] **Step 3: Write the implementation**

Create `src/lib/seo/organization.ts`:

```ts
/**
 * Organization structured data.
 *
 * Per Google's documentation this markup disambiguates the organization in
 * search results and feeds the knowledge-panel logo. It is not a ranking
 * factor and no rich result is guaranteed. Organization has no required
 * properties, so a small honest block carries no penalty.
 *
 * Deliberately absent: `founder`, `address`, `telephone`. The founder stays
 * abstracted from the brand, and there is no local-search intent yet.
 *
 * `sameAs` is omitted rather than emitted empty. When the Birch Design Lab
 * accounts exist, add them as a string array here and the markup follows.
 */

export interface OrganizationJsonLd {
  '@context': 'https://schema.org';
  '@type': 'Organization';
  name: string;
  url: string;
  logo: string;
  description: string;
}

const NAME = 'Birch Design Lab';

/** External-facing copy: no emdashes. */
const DESCRIPTION =
  'A design lab building custom software and custom websites for businesses that want to grow.';

export function buildOrganization(site: URL | string): OrganizationJsonLd {
  const base = typeof site === 'string' ? new URL(site) : site;
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: NAME,
    url: new URL('/', base).href,
    logo: new URL('/og/logo.png', base).href,
    description: DESCRIPTION,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/seo-organization.test.ts`
Expected: PASS, 6 tests

- [ ] **Step 5: Write the component**

Create `src/components/StructuredData.astro`:

```astro
---
import { buildOrganization } from '../lib/seo/organization';

// Astro.site comes from `site` in astro.config.mjs.
const organization = buildOrganization(Astro.site!);
---
<script type="application/ld+json" is:inline set:html={JSON.stringify(organization)} />
```

`is:inline` matters: without it Astro would try to process the tag as a script module. `set:html` avoids escaping the JSON.

- [ ] **Step 6: Add the head slot to BaseLayout**

Modify `src/layouts/BaseLayout.astro`. Find:

```astro
    {noindex && <meta name="robots" content="noindex, nofollow" />}
    <ThemeBootstrap />
  </head>
```

Replace with:

```astro
    {noindex && <meta name="robots" content="noindex, nofollow" />}
    <slot name="head" />
    <ThemeBootstrap />
  </head>
```

- [ ] **Step 7: Wire it on the home page**

Modify `src/pages/index.astro`. Add to the frontmatter imports:

```astro
import StructuredData from '../components/StructuredData.astro';
```

Then, as the first child inside `<BaseLayout ...>`, before `<section class="hero">`:

```astro
  <StructuredData slot="head" />
```

Home page only. It is the entity's canonical page, and repeating the block sitewide adds nothing.

- [ ] **Step 8: Verify the built output**

Run:

```bash
npm run build && node -e "const h=require('fs').readFileSync('dist/index.html','utf8'); const m=h.match(/<script type=\"application\/ld\+json\">([\s\S]*?)<\/script>/); console.log(JSON.stringify(JSON.parse(m[1]), null, 2));"
```

Expected: a parsed Organization object with `name`, `url`, `logo`, `description`, and no `founder` or `sameAs`.

Then confirm it appears on the home page only:

```bash
grep -rl 'application/ld+json' dist --include=*.html
```

Expected: exactly `dist/index.html`.

- [ ] **Step 9: Run the full suite and commit**

```bash
npx vitest run && npx astro check
git add src/lib/seo/organization.ts src/components/StructuredData.astro src/layouts/BaseLayout.astro src/pages/index.astro tests/seo-organization.test.ts
git commit -m "feat(seo): Organization JSON-LD on the home page"
```

---

### Task 4: One h1 per page

`dist/lab/bdl-001/index.html` currently contains zero heading elements, and `bdl-006` starts at `<h3>`. The cause is structural: `SpecimenPlate.astro` renders the designation and title inside a `<summary>` as `<span>`s, so an experiment page's only `<h1>` is whatever its experiment component happens to provide. Fixing it in the layout covers every experiment, including BDL-003 when it goes live.

**Files:**
- Modify: `src/layouts/ExperimentLayout.astro`, `src/pages/lab/[slug].astro`, `src/experiments/bdl-002/Experiment.astro`, `src/pages/styleguide.astro`

**Interfaces:**
- Consumes: `designation`, already a prop on `ExperimentLayout`.
- Produces: a new required `heading` prop on `ExperimentLayout`, the specimen's own title. **Do not reuse the existing `title` prop for this.** `title` is the full page title, built in `[slug].astro` as `` `${designation} ${title} · Birch Design Lab` ``, so a heading built from it would read `BDL-006 · BDL-006 The Regulator · Birch Design Lab`.
- Every built page ends with exactly one `<h1>`.

- [ ] **Step 1: Record the current failure**

Run:

```bash
npm run build
for f in $(find dist -name '*.html' | sort); do printf "%-45s %s\n" "$f" "$(grep -o '<h1' "$f" | wc -l)"; done
```

Expected before the fix: `dist/lab/bdl-001/index.html` and `dist/lab/bdl-006/index.html` show `0`, `dist/styleguide/index.html` shows `2`, everything else shows `1`.

Keep this output. Step 6 reruns it.

- [ ] **Step 2: Add the heading prop to ExperimentLayout**

Modify `src/layouts/ExperimentLayout.astro`. Find:

```astro
interface Props { title: string; description: string; designation: string; noindex?: boolean }
const { title, description, designation, noindex = false } = Astro.props;
```

Replace with:

```astro
/** `title` is the full page title; `heading` is the specimen's own title,
    which is what the h1 says. Keeping them separate stops the heading from
    reading "BDL-006 · BDL-006 The Regulator · Birch Design Lab". */
interface Props {
  title: string;
  description: string;
  designation: string;
  heading: string;
  noindex?: boolean;
}
const { title, description, designation, heading, noindex = false } = Astro.props;
```

Then find:

```astro
    <a class="hatch smallcaps" href="/lab">&larr; Lab &middot; {designation}</a>
    <main id="main">
```

Replace with:

```astro
    <a class="hatch smallcaps" href="/lab">&larr; Lab &middot; {designation}</a>
    <main id="main">
      {/* The stages are deliberately immersive, so the page's real heading is
          available to screen readers and crawlers without intruding on the
          design. SpecimenPlate renders the title inside a summary element,
          which is not a heading. */}
      <h1 class="visually-hidden">{designation} &middot; {heading}</h1>
```

The `.visually-hidden` helper already exists in `src/styles/base.css`.

- [ ] **Step 3: Pass the heading from the route**

Modify `src/pages/lab/[slug].astro`. `title` is already destructured from `entry.data` in the frontmatter. Find the `ExperimentLayout` opening tag:

```astro
  <ExperimentLayout title={pageTitle} description={summary} designation={designation} noindex={entry.data.noindex}>
```

Replace with:

```astro
  <ExperimentLayout title={pageTitle} description={summary} designation={designation} heading={title} noindex={entry.data.noindex}>
```

- [ ] **Step 4: Demote BDL-002's competing h1**

Modify `src/experiments/bdl-002/Experiment.astro`. It renders its own visible `<h1>The Styleguide</h1>`, which would now be a second one. Change the opening and closing tags from `<h1>` to `<h2>`.

Find: `<h1>The Styleguide</h1>`
Replace: `<h2>The Styleguide</h2>`

If the exact text differs, locate the single `<h1>` in that file and demote it. Do not change the visible wording.

- [ ] **Step 5: Fix the styleguide's second h1 without shrinking the specimen**

Modify `src/pages/styleguide.astro`. It renders two `<h1>` elements:

- Line 33, `<h1>Styleguide</h1>` in the `.intro` header. This is the page's real heading. **Leave it.**
- Line 78, `<h1>The shining tree</h1>`. This is a **type specimen** inside a block labelled `h1 / h2 / h3`, demonstrating the heading scale.

Do not demote the specimen to `<h2>`: the block already contains an `<h2>`, so that would show the same size twice and destroy what the sample demonstrates. Convert it to a paragraph styled identically instead, which preserves every rendered pixel while removing the duplicate heading from the document outline.

Find:

```astro
      <h1>The shining tree</h1>
```

Replace with:

```astro
      <!-- Styled as h1 rather than being one: this is a type specimen, and a
           second h1 on the page is a document-outline bug. Rendering is
           identical, so the sample still shows the real h1 scale. -->
      <p class="h1-spec">The shining tree</p>
```

Then add the matching rule to the page's `<style>` block, next to the existing `.specimens` rules near line 191. The values are copied from `base.css`, where `h1, h2, h3` share the display family and `h1` is `--text-2xl`:

```css
  /* Mirrors base.css h1 exactly, so the specimen keeps showing h1's real scale. */
  .specimens .h1-spec {
    font-family: var(--font-display);
    font-weight: 400;
    line-height: 1.15;
    font-size: var(--text-2xl);
    margin-top: var(--space-2);
  }
```

Note the existing selector `.specimens h1, .specimens h3 { margin-top: var(--space-2); }` near line 196. Leaving it is harmless, since `.specimens h3` still matches, but the `h1` half is now dead. Remove just the `.specimens h1` from that selector list, leaving `.specimens h3 { margin-top: var(--space-2); }`.

- [ ] **Step 6: Rebuild**

Run: `npm run build`
Expected: build succeeds. If `astro check` complains that `heading` is missing on `ExperimentLayout`, Step 3 was skipped.

- [ ] **Step 7: Verify exactly one h1 everywhere**

Run:

```bash
for f in $(find dist -name '*.html' | sort); do printf "%-45s %s\n" "$f" "$(grep -o '<h1' "$f" | wc -l)"; done
```

Expected: every file shows exactly `1`. Compare against Step 1's output.

Then confirm the hidden heading carries real content:

```bash
grep -o '<h1 class="visually-hidden">[^<]*' dist/lab/bdl-001/index.html
```

Expected: `<h1 class="visually-hidden">BDL-001 · The Bark Engine`

- [ ] **Step 8: Confirm it is hidden, not invisible-to-everyone**

`.visually-hidden` in `base.css` uses the clip-path technique, which keeps the text in the accessibility tree. Confirm the rule is unchanged:

```bash
grep -A3 '\.visually-hidden' src/styles/base.css
```

Expected: `position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap;`

Do not use `display: none` or `visibility: hidden`; both remove the heading from the accessibility tree and defeat the purpose.

- [ ] **Step 9: Commit**

```bash
npx vitest run && npx astro check
git add src/layouts/ExperimentLayout.astro src/pages/lab/[slug].astro src/experiments/bdl-002/Experiment.astro src/pages/styleguide.astro
git commit -m "fix(a11y): exactly one h1 per page, emitted by ExperimentLayout"
```

---

### Task 5: Icons, manifest, and the sitemap link

**Files:**
- Create: `public/site.webmanifest`, `src/components/HeadCommon.astro`
- Modify: `src/layouts/BaseLayout.astro`, `src/layouts/ExperimentLayout.astro`, `src/layouts/StudyLayout.astro`, `src/pages/lab/[slug].astro`

**Interfaces:**
- Consumes: `/og/logo.png` from Task 2; the `<slot name="head" />` added to `BaseLayout` in Task 3.
- Produces: `HeadCommon.astro` with props `{ title: string; description: string; noindex?: boolean }`, rendering the head content every layout shares. `StudyLayout` gains a `noindex?: boolean` prop.

**Two decisions folded in from the pre-flight review, agreed with the founder:**

1. **Extract rather than duplicate.** The three layouts already repeat five to six head lines each. Adding three more to every one would take it to eight or nine. A shared component holds them once.
2. **`StudyLayout` gains `noindex`.** The `noindex` field lives on the lab schema's shared base, so it applies to studies as well as experiments, but `StudyLayout` has no handling for it and `[slug].astro` never passes it. A study marked `noindex: true` renders indexable today. That is a latent bug, fixed here because this task already edits both files.

- [ ] **Step 1: Write the manifest**

Create `public/site.webmanifest`. All strings here are external-facing, so no emdashes:

```json
{
  "name": "Birch Design Lab",
  "short_name": "Birch Design Lab",
  "description": "A design lab building custom software and custom websites for businesses that want to grow.",
  "start_url": "/",
  "display": "browser",
  "background_color": "#1c1a17",
  "theme_color": "#1c1a17",
  "icons": [
    { "src": "/favicon.svg", "type": "image/svg+xml", "sizes": "any" },
    { "src": "/og/logo.png", "type": "image/png", "sizes": "512x512" }
  ]
}
```

`display: browser` is deliberate. This is a website, not an installable app, and claiming `standalone` invites an install prompt nobody wants.

- [ ] **Step 2: Create the shared head component**

Create `src/components/HeadCommon.astro`. This is every line the three layouts had in common, plus the three new ones:

```astro
---
/** The head content every layout shares. Extracted when the manifest and
    touch-icon links would have made it a third copy of the same block.
    Layout-specific tags stay in the layout. */
import Seo from './Seo.astro';
import ThemeBootstrap from './ThemeBootstrap.astro';

interface Props { title: string; description: string; noindex?: boolean }
const { title, description, noindex = false } = Astro.props;
---
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<link rel="apple-touch-icon" href="/og/logo.png" />
<link rel="manifest" href="/site.webmanifest" />
<link rel="sitemap" href="/sitemap-index.xml" />
<Seo title={title} description={description} />
{noindex && <meta name="robots" content="noindex, nofollow" />}
<ThemeBootstrap />
```

- [ ] **Step 3: Use it in BaseLayout**

Modify `src/layouts/BaseLayout.astro`. Replace the `Seo` and `ThemeBootstrap` imports with:

```astro
import HeadCommon from '../components/HeadCommon.astro';
```

Then replace the entire `<head>` block with:

```astro
  <head>
    <HeadCommon title={title} description={description} noindex={noindex} />
    <slot name="head" />
  </head>
```

`<slot name="head" />` was added in Task 3 and carries the Organization JSON-LD. It must survive this refactor. Rendering it after `HeadCommon` is fine; head tag order does not matter here.

- [ ] **Step 4: Use it in ExperimentLayout**

Modify `src/layouts/ExperimentLayout.astro`. Replace the `Seo` and `ThemeBootstrap` imports with:

```astro
import HeadCommon from '../components/HeadCommon.astro';
```

Then replace the entire `<head>` block with:

```astro
  <head>
    <HeadCommon title={title} description={description} noindex={noindex} />
  </head>
```

- [ ] **Step 5: Use it in StudyLayout, which also gains noindex**

`StudyLayout` has no `noindex` handling, but the `noindex` field lives on the lab schema's shared base and therefore applies to studies. A study marked `noindex: true` currently renders indexable.

Modify `src/layouts/StudyLayout.astro`. Replace the `Seo` and `ThemeBootstrap` imports with:

```astro
import HeadCommon from '../components/HeadCommon.astro';
```

Change the Props interface and destructuring:

```astro
interface Props { title: string; description: string; designation: string; noindex?: boolean }
const { title, description, designation, noindex = false } = Astro.props;
```

Then replace the entire `<head>` block with:

```astro
  <head>
    <HeadCommon title={title} description={description} noindex={noindex} />
  </head>
```

- [ ] **Step 6: Pass noindex to StudyLayout from the route**

Modify `src/pages/lab/[slug].astro`. Find the `StudyLayout` opening tag:

```astro
  <StudyLayout title={pageTitle} description={summary} designation={designation}>
```

Replace with:

```astro
  <StudyLayout title={pageTitle} description={summary} designation={designation} noindex={entry.data.noindex}>
```

- [ ] **Step 7: Verify every page carries the head links**

Run:

```bash
npm run build
for f in $(find dist -name '*.html' | sort); do printf "%-45s manifest=%s sitemap=%s touch=%s\n" "$f" "$(grep -c 'rel="manifest"' "$f")" "$(grep -c 'rel="sitemap"' "$f")" "$(grep -c 'apple-touch-icon' "$f")"; done
```

Expected: every file shows `1` for all three.

- [ ] **Step 8: Verify the refactor changed nothing else**

The noindex pages must still be noindexed, and the JSON-LD must still be present after BaseLayout's head was rewritten:

```bash
grep -l 'noindex, nofollow' dist/styleguide/index.html dist/contact/sent/index.html dist/lab/bdl-006/index.html
grep -c 'application/ld+json' dist/index.html
```

Expected: all three files listed, and `1` for the JSON-LD.

- [ ] **Step 9: Confirm the manifest is valid JSON and reachable**

Run: `node -e "console.log(JSON.parse(require('fs').readFileSync('dist/site.webmanifest','utf8')).name)"`
Expected: `Birch Design Lab`

- [ ] **Step 10: Commit**

```bash
npx vitest run && npx astro check
git add public/site.webmanifest src/components/HeadCommon.astro src/layouts/BaseLayout.astro src/layouts/ExperimentLayout.astro src/layouts/StudyLayout.astro "src/pages/lab/[slug].astro"
git commit -m "feat(seo): shared head component with manifest, touch icon, and sitemap links"
```

---

### Task 6: Documentation, then open PR 1

**Files:**
- Modify: `docs/deploy.md`, `CLAUDE.md`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Correct the stale wrangler account note**

Modify `docs/deploy.md`. Find, in the one-time setup list:

```
1. **Log wrangler into the account that owns `birchdesignlab.com`**
   (`npx wrangler login`). As of 2026-07-29 the local OAuth token points at the
   Cheer and Chatter account.
```

Replace with:

```
1. **Log wrangler into the account that owns `birchdesignlab.com`**
   (`npx wrangler login`). Verified 2026-08-03: the local token authenticates as
   `birchdesignlab@gmail.com` and exposes exactly one account, so there is no
   wrong-account risk when deploying locally. The 2026-07-29 note about the
   Cheer and Chatter account is stale.
```

- [ ] **Step 2: Record the www redirect as a pending dashboard step**

In `docs/deploy.md`, append to the "One-time setup" list:

```
6. **Redirect `www` to the apex.** Verified 2026-08-03: `www.birchdesignlab.com`
   serves the site directly with no redirect, and `http://www` upgrades to
   `https://www` rather than to the apex, so the duplicate host survives the
   HTTPS upgrade. Canonical tags already point at the apex, so Google will
   consolidate, but the clean fix is a Redirect Rule: `www` to apex, 301,
   preserving path and query. Dashboard step, not code.
```

- [ ] **Step 3: Record the deploy pipeline note**

In `docs/deploy.md`, under "Every deploy after that", append:

```
Deploys now follow a pull request: branch, PR, review, merge to `main`, and
Workers Builds deploys the merge. On 2026-08-03 a Cloudflare incident
("Workers Build Failures") left a build stuck in Initialize for 39 minutes;
`npm run deploy` bypasses Workers Builds entirely and was used to ship. It
builds from the **working tree**, not from the commit, so stash anything held
back first. The contact form markup is currently in a named stash for exactly
this reason.
```

- [ ] **Step 4: Add the PR workflow to CLAUDE.md**

Modify `CLAUDE.md`. Append a new section:

```markdown
## Git workflow

Branch and open a PR for review. Do not commit directly to `main`. Merging to
`main` triggers a production deploy through Cloudflare Workers Builds.

This overrides the global instruction to avoid branch ceremony; in this repo,
branches are wanted. Agreed with the founder 2026-08-03.

Keep `main` in sync under normal circumstances: after a PR merges, pull `main`
and delete the merged branch locally and on the remote. Work genuinely in
flight is exempt.

Before opening a PR: `npx vitest run`, `npx astro check`, and `npm run build`
must all be clean.
```

- [ ] **Step 5: Full verification before the PR**

Run all three:

```bash
npx vitest run && npx astro check && npm run build
```

Expected: tests pass with the three new files included, `astro check` reports 0 errors, build completes.

- [ ] **Step 6: Commit and open the PR**

```bash
git add docs/deploy.md CLAUDE.md
git commit -m "docs: correct the stale wrangler note, record the www redirect and PR workflow"
git push -u origin seo/markup-and-content
gh pr create --title "feat(seo): markup and content pass" --body "Implements PR 1 of docs/superpowers/specs/2026-08-03-seo-configuration-pass-design.md. No change to how the server responds.

- robots.txt allowing all crawlers, with a sitemap pointer and deliberately no Disallow lines
- Organization JSON-LD on the home page. No founder, no Person, no sameAs while empty
- A generated 512x512 logo PNG, placeholder until a real mark exists
- Exactly one h1 on every built page. bdl-001 previously shipped with zero heading elements
- Web manifest, apple-touch-icon, and sitemap links on all three layouts
- Corrected the stale wrangler account note; recorded the www redirect and the PR workflow

Verified: vitest, astro check, and build all clean."
```

- [ ] **Step 7: Hand the founder the PR link and stop**

Do not merge. PR 2 branches from `main` after this merges.

---

# PR 2: Response headers

**Do not start until PR 1 has merged.** Then:

```bash
git checkout main && git pull --ff-only && git checkout -b seo/response-headers
```

---

### Task 7: CSP verification gate

This task is a gate, not a deliverable. If `experimental.csp` breaks the Svelte islands or the theme bootstrap, stop and take the fallback in Step 6 rather than shipping a broken site.

**Files:**
- Modify: `astro.config.mjs`

**Interfaces:**
- Consumes: Astro 5.18.2's `experimental.csp`. Confirmed present in the installed config schema.
- Produces: a per-page `<meta http-equiv="content-security-policy">` in every built page.

- [ ] **Step 1: Confirm the Astro version supports it**

Run: `node -p "require('./node_modules/astro/package.json').version"`
Expected: `5.18.2` or higher. Below 5.9, stop; `experimental.csp` does not exist.

- [ ] **Step 2: Enable it**

Modify `astro.config.mjs`. Add an `experimental` block as a sibling of `integrations`:

```js
  // Astro hashes every inline script and style at build time and emits a
  // per-page meta CSP. Hand-maintained hashes were rejected: the home page
  // alone carries three inline scripts, the set differs per page, and any
  // Astro or Vite upgrade reshuffles minified output, so a pinned hash would
  // break theming silently.
  experimental: {
    csp: true,
  },
```

- [ ] **Step 3: Build and confirm the policy is emitted**

Run:

```bash
npm run build
grep -o '<meta http-equiv="content-security-policy" content="[^"]\{0,220\}' dist/index.html
```

Expected: a policy containing `script-src` with one or more `'sha256-...'` values.

- [ ] **Step 4: Serve the built site and check the console**

Run: `npm run preview`

`experimental.csp` does not apply in dev mode, so it must be tested against `build` plus `preview`.

- [ ] **Step 5: Click through every interactive surface**

With the browser console open, visit each and confirm no CSP violation is logged:

| URL | What must still work |
|---|---|
| `/` | Theme toggle flips light and dark; bark animates; reveals settle |
| `/?tune` | The Regulator panel mounts and its crowns respond |
| `/lab/bdl-001` | The Bark Engine island: seed field, density slider, Life toggles |
| `/lab/bdl-003` | Novgorod Letters island renders (status is forthcoming, so it may 404; skip if so) |
| `/lab/bdl-006` | The Regulator: color crown spins, grain crown pulls out and sets |
| `/lab` | The experiment and study filter buttons |
| `/styleguide` | Palette and typeface switching, the bark panel |

A violation looks like: `Refused to execute inline script because it violates the following Content Security Policy directive`.

Pay particular attention to the theme toggle. It is an inline module, and if its hash is missing the page will load looking correct while the toggle silently does nothing.

- [ ] **Step 6: Decide the gate**

**If everything works:** proceed to Task 8.

**If anything is blocked:** revert this task and take the fallback.

```bash
git checkout astro.config.mjs
```

The fallback is a CSP in `public/_headers` with a hash list generated at build from `dist`, never hand-written. Add a `scripts/csp/generate.ts` that scans `dist/**/*.html`, extracts every inline `<script>` body, hashes each with SHA-256, and writes the `Content-Security-Policy` line into `dist/_headers`. Wire it as a postbuild step in `package.json`. Then continue with Task 8 for the remaining four headers.

Record which path was taken in the PR description either way.

- [ ] **Step 7: Commit, only if the gate passed**

```bash
npx vitest run && npx astro check
git add astro.config.mjs
git commit -m "feat(security): CSP via Astro's build-time hash generation"
```

---

### Task 8: Security headers

**Files:**
- Create: `public/_headers`

**Interfaces:**
- Consumes: nothing.
- Produces: four response headers on every static asset.

- [ ] **Step 1: Write the file**

Create `public/_headers`. Cloudflare Workers Static Assets reads this from the static asset directory, the same as Pages did:

```
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  X-Frame-Options: DENY
```

`X-Frame-Options` rather than CSP `frame-ancestors`, because `frame-ancestors` is ignored when the policy arrives in a meta tag, which is how Astro delivers it.

HSTS is deliberately absent. It belongs at the zone level, SSL/TLS then Edge Certificates, where Cloudflare manages preload enrollment and it applies to every response including redirects. Founder dashboard step, tracked in Task 9.

- [ ] **Step 2: Confirm it reaches the build**

Run: `npm run build && cat dist/_headers`
Expected: the file contents. Astro copies `public/` verbatim, and the file is not served as an asset itself.

- [ ] **Step 3: Commit**

```bash
npx vitest run && npx astro check
git add public/_headers
git commit -m "feat(security): nosniff, referrer policy, permissions policy, frame denial"
```

---

### Task 9: Analytics allowances, docs, then open PR 2

Cloudflare injects the Web Analytics beacon at the edge, after Astro has generated the HTML and its CSP meta tag. The beacon's hash is therefore not in the policy, and the site's own CSP would block its own analytics. The policy must allow the beacon host explicitly.

**Files:**
- Modify: `astro.config.mjs`, `docs/deploy.md`

**Interfaces:**
- Consumes: the `experimental.csp` block from Task 7.
- Produces: a policy permitting the Cloudflare Insights beacon.

- [ ] **Step 1: Widen the policy**

Modify `astro.config.mjs`. Replace `csp: true` with the object form. Note that `script-src` and `style-src` are not valid entries in `directives`; Astro owns those and they are extended through `scriptDirective` and `styleDirective`:

```js
  experimental: {
    csp: {
      // Cloudflare injects the Web Analytics beacon at the edge, after this
      // policy is generated, so its hash can never be present. Allow the host
      // explicitly or the site blocks its own analytics.
      scriptDirective: {
        resources: ['https://static.cloudflareinsights.com'],
      },
      directives: [
        "default-src 'self'",
        "img-src 'self' data:",
        "font-src 'self'",
        "connect-src 'self' https://cloudflareinsights.com",
        "form-action 'self'",
        "base-uri 'self'",
        "object-src 'none'",
      ],
    },
  },
```

`form-action 'self'` matters for the held-back contact form, which posts to `/api/contact` on the same origin.

- [ ] **Step 2: Rebuild and inspect the policy**

Run:

```bash
npm run build
node -e "const h=require('fs').readFileSync('dist/index.html','utf8'); const m=h.match(/content-security-policy\" content=\"([^\"]+)/); console.log(m[1].split(';').map(s=>s.trim()).join('\n'));"
```

Expected: each directive on its own line, including `script-src` with hashes plus `https://static.cloudflareinsights.com`, and `connect-src 'self' https://cloudflareinsights.com`.

- [ ] **Step 3: Re-run the full click-through from Task 7 Step 5**

Run: `npm run preview`

Every surface in that table must still work. Widening the policy can only permit more, but the directives added here were not present when `csp: true` generated defaults, so confirm nothing regressed. In particular `default-src 'self'` is new and stricter than the previous default.

Expected: no CSP violations in the console on any page.

- [ ] **Step 4: Record the dashboard steps**

Modify `docs/deploy.md`. Append a section:

```markdown
## Security headers and analytics

Code side, shipped 2026-08-03:

- `public/_headers` sets `X-Content-Type-Options`, `Referrer-Policy`,
  `Permissions-Policy`, and `X-Frame-Options` on every static asset.
- `experimental.csp` in `astro.config.mjs` emits a per-page meta CSP with
  build-time hashes for every inline script and style.

Founder dashboard steps, not code:

1. **HSTS.** SSL/TLS then Edge Certificates. Verified not set on 2026-08-03.
   Always Use HTTPS is already on and is complementary, not a substitute: it
   corrects the request after the browser has sent it in the clear, whereas
   HSTS stops that first insecure request happening at all.
2. **Cloudflare Web Analytics.** Free, cookieless, needs no consent banner.
   The CSP already permits its beacon.
3. **Google Search Console.** Verify the property before 2026-09-01.

### Headers the Worker must set when the contact form ships

`_headers` does not apply to responses generated by Worker code. Static assets
are served by the assets layer before the Worker runs, so every response is
covered today, but `/api/contact` responses come from `worker/index.ts` and
would carry no security headers at all.

When the form ships, after Email Sending onboarding on the paid plan, apply the
same four headers to every path the Worker answers: the 303 redirect to
`/contact/sent/`, the 400 malformed submission page, the 429 rate limit page,
the 405 method-not-allowed response, and the 502 degraded email path.

Use a single helper in `worker/index.ts` that every response passes through,
rather than repeating four literals at five call sites. The contact form markup
is parked in a named git stash, so pick this up at the same time as
`git stash pop`.
```

- [ ] **Step 5: Full verification**

```bash
npx vitest run && npx astro check && npm run build
```

Expected: all clean.

- [ ] **Step 6: Commit and open the PR**

```bash
git add astro.config.mjs docs/deploy.md
git commit -m "feat(security): allow the analytics beacon, document the dashboard steps"
git push -u origin seo/response-headers
gh pr create --title "feat(security): response headers and CSP" --body "Implements PR 2 of docs/superpowers/specs/2026-08-03-seo-configuration-pass-design.md. This is the half that can break the live site, isolated so it reverts alone.

- CSP via Astro's build-time hash generation. Hand-maintained hashes were rejected: the home page alone carries three inline scripts, the set differs per page, and any Astro or Vite upgrade reshuffles minified output
- public/_headers sets nosniff, referrer policy, permissions policy, and frame denial
- The policy permits the Cloudflare Web Analytics beacon, which is injected at the edge after the policy is generated and would otherwise be blocked by the site's own CSP

Verification gate passed: built, previewed, and clicked through the theme toggle, both Regulator surfaces, the Bark Engine, the Lab filters, and the styleguide with the console open. No CSP violations.

Not in this PR, founder dashboard steps recorded in docs/deploy.md: HSTS at the zone, enabling Web Analytics, and verifying Search Console.

Note: _headers does not apply to Worker-generated responses. docs/deploy.md records what worker/index.ts must set when the contact form ships."
```

- [ ] **Step 7: Hand the founder the PR link and stop**

Do not merge.

---

## After both PRs merge

Sync and prune:

```bash
git checkout main && git pull --ff-only
git branch -d seo/markup-and-content seo/response-headers
git push origin --delete seo/markup-and-content seo/response-headers
```

Confirm the headers are live:

```bash
curl -sI https://birchdesignlab.com/ | grep -iE 'x-content-type|referrer-policy|permissions-policy|x-frame'
curl -s https://birchdesignlab.com/robots.txt
curl -s https://birchdesignlab.com/ | grep -o 'application/ld+json'
```

Then paste `https://birchdesignlab.com/` into the Rich Results Test at
`https://search.google.com/test/rich-results` and confirm the Organization
block parses without errors.

## Founder dashboard checklist

Not code. Tracked here so it does not get lost.

- [ ] HSTS at the zone: SSL/TLS then Edge Certificates
- [ ] Redirect Rule: `www` to apex, 301, preserving path and query
- [ ] Enable Cloudflare Web Analytics
- [ ] Verify the property in Google Search Console before 2026-09-01
- [ ] Register the Birch Design Lab brand accounts, then add them to `sameAs`
      in `src/lib/seo/organization.ts`
- [ ] Confirm domain WHOIS privacy at the registrar
