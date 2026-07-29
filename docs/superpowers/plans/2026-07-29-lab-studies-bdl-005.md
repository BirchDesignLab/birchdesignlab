# Lab Studies + BDL-005 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the `study` entry type to the Lab (discriminated-union schema, three-route catalog, hybrid study page) and ship BDL-005, the Cheer and Chatter case study.

**Architecture:** One content collection (`lab`) with a Zod discriminated union on `type`. Experiments render exactly as today; studies get a new StudyLayout (stage hero, in-flow plate, prose with commentary asides, loud CTA). Catalog grows a type chip, a CSS-driven filter toggle, and two thin filtered index pages.

**Tech Stack:** Astro 5 content collections (glob loader), Zod 3, `astro:assets` `<Image>`, Vitest, vanilla CSS tokens. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-07-29-lab-studies-bdl-005-design.md`

## Global Constraints

- **NO emdashes anywhere in any copy, ever** (founder writing rule; an emdash is a rejection).
- **Zero dollar figures, zero mention of engagement terms or discounts** in BDL-005 content.
- All new copy is first-draft and marked `<!-- first-draft copy -->` for the founder's content pass.
- `data-reveal` is exclusive to `.loud` sitewide; do not add it elsewhere.
- Marcellus ships weight 400 only; never ask display type for 500+.
- Square geometry: no border-radius on new chips/badges (hatch pill is the one rounded exception).
- Push after every commit (repo rule: push = prod deploy; the site is on Workers, static output, so these changes are safe to ship as they land).
- Run commands from repo root `C:\git\birchdesignlab`.

---

### Task 1: Discriminated-union schema

**Files:**
- Modify: `src/lib/lab-schema.ts` (full rewrite below)
- Modify: `src/content.config.ts:7-10`
- Modify: `src/content/lab/bdl-001.md`, `bdl-002.md`, `bdl-003.md` (one line each)
- Test: `tests/lab-schema.test.ts` (full rewrite below)

**Interfaces:**
- Produces: `makeLabSchema(image: () => z.ZodTypeAny): ZodEffects` factory; `labTestSchema` (factory instantiated with a string stub, for tests and type derivation); `export type LabEntryData`.
- Consumers: `src/content.config.ts` calls `makeLabSchema(image)` inside `schema: ({ image }) => ...`. Templates keep using `CollectionEntry<'lab'>`; `entry.data.type === 'study'` narrows.

Zod 3 gotcha the design depends on: `z.discriminatedUnion` only accepts plain `ZodObject`s, so the experiment branch cannot carry its own `.refine()` (that wraps it in `ZodEffects`). The howto/href rule therefore moves to a `.superRefine` on the union result. Both branches are `.strict()` so an experiment carrying study fields (or vice versa) fails the build.

- [ ] **Step 1: Rewrite the test file (failing first)**

Replace `tests/lab-schema.test.ts` entirely:

```ts
import { describe, it, expect } from 'vitest';
import { labTestSchema as labSchema } from '../src/lib/lab-schema';

const experiment = {
  type: 'experiment',
  designation: 'BDL-001',
  title: 'The Bark Engine',
  summary: 'The generative birch system, exposed.',
  date: '2026-07-15',
  tech: ['webgl', 'svelte'],
  device: 'universal',
  howto: ['Type a seed and watch the bark regrow.'],
};

const study = {
  type: 'study',
  designation: 'BDL-005',
  title: 'Cheer and Chatter Social Club',
  summary: 'A ticketing site and a live event application.',
  date: '2026-07-28',
  tech: ['astro', 'react', 'sanity'],
  client: 'Cheer and Chatter Social Club',
  liveUrl: 'https://cheerandchatter.com',
  hero: { src: './bdl-005/hero.png', alt: 'The Cheer and Chatter homepage.' },
};

describe('shared base', () => {
  it('accepts both branches and applies defaults', () => {
    expect(labSchema.parse(experiment).status).toBe('live');
    expect(labSchema.parse(study).status).toBe('live');
    expect(labSchema.parse(study).date).toBeInstanceOf(Date);
  });
  it('requires an explicit type', () => {
    const { type, ...untyped } = experiment;
    expect(() => labSchema.parse(untyped)).toThrow();
  });
  it('rejects malformed designations on both branches', () => {
    expect(() => labSchema.parse({ ...experiment, designation: 'BDL-1' })).toThrow();
    expect(() => labSchema.parse({ ...study, designation: 'bdl-005' })).toThrow();
  });
  it('rejects unknown status values', () => {
    expect(() => labSchema.parse({ ...study, status: 'draft' })).toThrow();
  });
});

describe('experiment branch', () => {
  it('rejects unknown device values', () => {
    expect(() => labSchema.parse({ ...experiment, device: 'tablet' })).toThrow();
  });
  it('requires howto when there is no href, and exempts href entries', () => {
    const { howto, ...bare } = experiment;
    expect(() => labSchema.parse(bare)).toThrow();
    expect(labSchema.parse({ ...bare, href: '/styleguide' }).howto).toBeUndefined();
  });
  it('caps howto at four lines and rejects empty lines', () => {
    expect(() => labSchema.parse({ ...experiment, howto: ['a', 'b', 'c', 'd', 'e'] })).toThrow();
    expect(() => labSchema.parse({ ...experiment, howto: [''] })).toThrow();
  });
  it('rejects study fields on an experiment', () => {
    expect(() => labSchema.parse({ ...experiment, client: 'Somebody' })).toThrow();
  });
});

describe('study branch', () => {
  it('requires client, liveUrl, and hero', () => {
    for (const key of ['client', 'liveUrl', 'hero'] as const) {
      const { [key]: _omitted, ...bare } = study;
      expect(() => labSchema.parse(bare)).toThrow();
    }
  });
  it('requires liveUrl to be a full URL', () => {
    expect(() => labSchema.parse({ ...study, liveUrl: '/lab' })).toThrow();
  });
  it('requires hero alt text', () => {
    expect(() => labSchema.parse({ ...study, hero: { src: './x.png', alt: '' } })).toThrow();
  });
  it('rejects experiment fields on a study', () => {
    expect(() => labSchema.parse({ ...study, device: 'universal' })).toThrow();
    expect(() => labSchema.parse({ ...study, howto: ['Look at it.'] })).toThrow();
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npm test -- --run tests/lab-schema.test.ts`
Expected: FAIL, `labTestSchema` is not exported.

- [ ] **Step 3: Rewrite the schema**

Replace `src/lib/lab-schema.ts` entirely:

```ts
import { z } from 'zod';

/**
 * The Lab collection schema: a discriminated union on `type`.
 * - experiment: self-initiated work with an interactive stage (howto/href rule).
 * - study: client work; narrative page with a hero image and a live URL.
 *
 * Exported as a factory because the study branch needs Astro's image()
 * helper, which only exists inside content.config's schema context. Tests
 * instantiate it with a string stub (labTestSchema below).
 *
 * Zod constraint that shaped this file: discriminatedUnion only accepts
 * plain ZodObjects, so the experiment howto/href rule lives in a
 * superRefine on the union, not a .refine on the branch.
 */
export function makeLabSchema(image: () => z.ZodTypeAny) {
  const base = {
    designation: z.string().regex(/^BDL-\d{3}$/),
    title: z.string().min(1),
    summary: z.string().min(1),
    date: z.coerce.date(),
    tech: z.array(z.string()).default([]),
    status: z.enum(['live', 'forthcoming']).default('live'),
  };

  const experiment = z
    .object({
      ...base,
      type: z.literal('experiment'),
      device: z.enum(['mobile-first', 'desktop-forward', 'universal']),
      /** Experiments that live at their own route (e.g. /styleguide) link
          there from the catalog instead of getting a /lab/<id> page. */
      href: z.string().startsWith('/').optional(),
      /** Wall label: how to operate the piece, 1-4 short imperative lines.
          Cap is deliberate: a piece that needs five lines is too confusing,
          and that is the bug. */
      howto: z.array(z.string().min(1)).min(1).max(4).optional(),
    })
    .strict();

  const study = z
    .object({
      ...base,
      type: z.literal('study'),
      client: z.string().min(1),
      liveUrl: z.string().url(),
      hero: z.object({ src: image(), alt: z.string().min(1) }),
    })
    .strict();

  return z.discriminatedUnion('type', [experiment, study]).superRefine((d, ctx) => {
    if (d.type === 'experiment' && d.href === undefined && d.howto === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'experiments need a howto wall label (or an href)',
      });
    }
  });
}

/** Schema instantiated with a plain-string image stub: what the unit tests
    parse against, and the source of the shared entry type. */
export const labTestSchema = makeLabSchema(() => z.string());
export type LabEntryData = z.infer<typeof labTestSchema>;
```

- [ ] **Step 4: Point content.config at the factory**

In `src/content.config.ts`, change the import and collection definition:

```ts
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { makeLabSchema } from './lib/lab-schema';

// Loader indirection is the designated CMS renovation path (spec §6):
// swapping glob() for a Sanity loader later leaves schema and pages untouched.
const lab = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/lab' }),
  schema: ({ image }) => makeLabSchema(image),
});

export const collections = { lab };
```

- [ ] **Step 5: Add `type: experiment` to the three entries**

In each of `src/content/lab/bdl-001.md`, `bdl-002.md`, `bdl-003.md`, add one line directly under `designation:`:

```yaml
type: experiment
```

- [ ] **Step 6: Check for other LabEntryData/labSchema consumers**

Run: `grep -rn "labSchema\|LabEntryData" src/ tests/ --include="*.ts" --include="*.astro"`
Expected: only `lab-schema.ts`, `content.config.ts`, and `tests/lab-schema.test.ts`. If anything else imports the old `labSchema` name, update it to `labTestSchema` (tests/types) or the factory (config).

- [ ] **Step 7: Run tests and build**

Run: `npm test -- --run` then `npm run build`
Expected: all tests pass (schema suite green, everything else untouched); build emits 10 pages exactly as before.

- [ ] **Step 8: Commit and push**

```bash
git add src/lib/lab-schema.ts src/content.config.ts src/content/lab/bdl-001.md src/content/lab/bdl-002.md src/content/lab/bdl-003.md tests/lab-schema.test.ts
git commit -m "feat(lab): discriminated-union schema, experiment/study types"
git push
```

---

### Task 2: Catalog — type chip, card list component, filter toggle, index routes

**Files:**
- Create: `src/components/TypeBadge.astro`
- Create: `src/components/SpecimenCatalog.astro`
- Modify: `src/components/SpecimenCard.astro`
- Modify: `src/pages/lab/index.astro`
- Create: `src/pages/lab/experiments.astro`
- Create: `src/pages/lab/studies.astro`

**Interfaces:**
- Consumes: `CollectionEntry<'lab'>` with the Task 1 union (`entry.data.type` narrows).
- Produces: `SpecimenCatalog` props `{ entries: CollectionEntry<'lab'>[]; filterable?: boolean }` (filterable adds the toggle; default false). `TypeBadge` props `{ type: 'experiment' | 'study' }`.

No unit tests here (Astro components; the repo has no component test rig and this plan does not introduce one). The build plus the Task 5 browser pass are the verification.

- [ ] **Step 1: Create TypeBadge**

`src/components/TypeBadge.astro` (visual family of DeviceBadge; only this file changes when the theme pass restyles chips):

```astro
---
interface Props { type: 'experiment' | 'study' }
const { type } = Astro.props;
---
<span class="badge">{type}</span>

<style>
  .badge {
    font-family: var(--font-smallcaps);
    letter-spacing: var(--tracking-wide); text-transform: uppercase;
    font-size: 0.68rem; line-height: 1; color: var(--accent);
    border: 1px solid var(--accent);
    padding: 0.35em 0.8em 0.25em; white-space: nowrap;
  }
</style>
```

(Accent border/text instead of DeviceBadge's muted treatment, so the type reads as the primary chip.)

- [ ] **Step 2: Add the chip to SpecimenCard**

In `src/components/SpecimenCard.astro`:
- Add `import TypeBadge from './TypeBadge.astro';` under the DeviceBadge import.
- The destructure on line 10 currently pulls `device`; remove `device` from it (it no longer exists on studies): `const { designation, title, summary, date, tech, status } = entry.data;`
- Replace the `<p class="meta">` block with:

```astro
  <p class="meta">
    <TypeBadge type={entry.data.type} />
    {entry.data.type === 'experiment' && <DeviceBadge device={entry.data.device} />}
    {tech.map((t) => <span class="tag">{t}</span>)}
    <time datetime={date.toISOString().slice(0, 10)}>{dateLabel}</time>
  </p>
```

- Add `data-type={entry.data.type}` to the root `<article class="card">` so the catalog filter can target cards: `<article class="card" data-type={entry.data.type}>`.

- [ ] **Step 3: Create SpecimenCatalog**

`src/components/SpecimenCatalog.astro` — the card list shared by all three index pages, with an optional filter toggle. Mechanism: buttons set `data-filter` on the list; CSS hides non-matching cards. No JS, no filtering: all cards visible, toggle hidden (gated on `html.js`, which ThemeBootstrap sets).

```astro
---
import type { CollectionEntry } from 'astro:content';
import SpecimenCard from './SpecimenCard.astro';

interface Props {
  entries: CollectionEntry<'lab'>[];
  filterable?: boolean;
}
const { entries, filterable = false } = Astro.props;
---
{filterable && (
  <div class="filter smallcaps" role="group" aria-label="Filter specimens">
    <button type="button" data-set="all" aria-pressed="true">All</button>
    <button type="button" data-set="experiment" aria-pressed="false">Experiments</button>
    <button type="button" data-set="study" aria-pressed="false">Studies</button>
  </div>
)}
<div class="catalog" data-filter="all">
  {entries.map((entry) => <SpecimenCard entry={entry} level="h2" />)}
</div>

{filterable && (
  <script>
    for (const group of document.querySelectorAll('.filter')) {
      const catalog = group.nextElementSibling as HTMLElement;
      group.addEventListener('click', (e) => {
        const btn = (e.target as HTMLElement).closest('button[data-set]');
        if (!btn || !catalog) return;
        catalog.dataset.filter = (btn as HTMLElement).dataset.set!;
        for (const b of group.querySelectorAll('button')) {
          b.setAttribute('aria-pressed', String(b === btn));
        }
      });
    }
  </script>
)}

<style>
  .catalog { border-bottom: 1px solid var(--line); }
  /* Filter: pure show/hide of already-rendered DOM (SEO: every card ships
     in the HTML regardless of state). Square geometry per house rules. */
  .filter { display: none; gap: var(--space-2); margin-bottom: var(--space-3); }
  :global(html.js) .filter { display: flex; }
  .filter button {
    font: inherit; font-family: var(--font-smallcaps);
    text-transform: uppercase; letter-spacing: var(--tracking-wide);
    font-size: var(--text-sm); line-height: 1;
    color: var(--mark-muted); background: transparent;
    border: 1px solid var(--line); padding: 0.5em 1em 0.4em;
    cursor: pointer;
  }
  .filter button[aria-pressed='true'] { color: var(--accent); border-color: var(--accent); }
  .catalog[data-filter='experiment'] :global(.card[data-type='study']),
  .catalog[data-filter='study'] :global(.card[data-type='experiment']) { display: none; }
</style>
```

- [ ] **Step 4: Rewire /lab to the component**

Replace the body of `src/pages/lab/index.astro` (keep frontmatter sort, swap the catalog markup):

```astro
---
import { getCollection } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';
import SpecimenCatalog from '../../components/SpecimenCatalog.astro';

const entries = (await getCollection('lab')).sort((a, b) =>
  b.data.designation.localeCompare(a.data.designation),
);
---
<BaseLayout
  title="The Lab · Birch Design Lab"
  description="Numbered experiments and client studies in design and web engineering. A specimen catalog."
>
  <section class="wrap">
    <header class="intro">
      <h1>The Lab</h1>
      <!-- first-draft copy -->
      <p>
        Numbered specimens, all working. Experiments are things we build to
        learn in the open; studies are client work, shown the same way.
      </p>
    </header>
    <SpecimenCatalog entries={entries} filterable />
  </section>
</BaseLayout>

<style>
  .intro { padding-block: var(--space-6) var(--space-5); max-width: 52ch; }
  .intro p { color: var(--mark-muted); margin-top: var(--space-3); }
</style>
```

- [ ] **Step 5: Create the filtered index pages**

`src/pages/lab/experiments.astro`:

```astro
---
import { getCollection } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';
import SpecimenCatalog from '../../components/SpecimenCatalog.astro';

const entries = (await getCollection('lab', ({ data }) => data.type === 'experiment')).sort(
  (a, b) => b.data.designation.localeCompare(a.data.designation),
);
---
<BaseLayout
  title="Experiments · The Lab · Birch Design Lab"
  description="Self-initiated experiments in design and web engineering."
>
  <section class="wrap">
    <header class="intro">
      <p class="smallcaps kicker"><a href="/lab">The Lab</a></p>
      <h1>Experiments</h1>
      <!-- first-draft copy -->
      <p>Self-initiated work. Everything we sell, practiced in the open.</p>
    </header>
    <SpecimenCatalog entries={entries} />
  </section>
</BaseLayout>

<style>
  .intro { padding-block: var(--space-6) var(--space-5); max-width: 52ch; }
  .intro p { color: var(--mark-muted); margin-top: var(--space-3); }
  .kicker a { color: var(--accent); text-decoration: none; }
  .kicker a:hover { text-decoration: underline; }
</style>
```

`src/pages/lab/studies.astro` (same construction, filter `data.type === 'study'`):

```astro
---
import { getCollection } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';
import SpecimenCatalog from '../../components/SpecimenCatalog.astro';

const entries = (await getCollection('lab', ({ data }) => data.type === 'study')).sort(
  (a, b) => b.data.designation.localeCompare(a.data.designation),
);
---
<BaseLayout
  title="Studies · The Lab · Birch Design Lab"
  description="Client work, catalogued like everything else in the Lab."
>
  <section class="wrap">
    <header class="intro">
      <p class="smallcaps kicker"><a href="/lab">The Lab</a></p>
      <h1>Studies</h1>
      <!-- first-draft copy -->
      <p>Client work, catalogued like everything else here. Real projects, real constraints, shown with the same candor as the experiments.</p>
    </header>
    <SpecimenCatalog entries={entries} />
  </section>
</BaseLayout>

<style>
  .intro { padding-block: var(--space-6) var(--space-5); max-width: 52ch; }
  .intro p { color: var(--mark-muted); margin-top: var(--space-3); }
  .kicker a { color: var(--accent); text-decoration: none; }
  .kicker a:hover { text-decoration: underline; }
</style>
```

- [ ] **Step 6: Build and eyeball**

Run: `npm run build`
Expected: 12 pages now (the 10 prior plus /lab/experiments and /lab/studies). No schema errors.

- [ ] **Step 7: Commit and push**

```bash
git add src/components/TypeBadge.astro src/components/SpecimenCatalog.astro src/components/SpecimenCard.astro src/pages/lab/index.astro src/pages/lab/experiments.astro src/pages/lab/studies.astro
git commit -m "feat(lab): type chips, filter toggle, experiments/studies index routes"
git push
```

---

### Task 3: StudyLayout and the [slug] branch

**Files:**
- Create: `src/layouts/StudyLayout.astro`
- Modify: `src/pages/lab/[slug].astro`

**Interfaces:**
- Consumes: study entries from the Task 1 union (`entry.data.type === 'study'` narrows to `client`, `liveUrl`, `hero`).
- Produces: `StudyLayout` props `{ title: string; description: string; designation: string }` (same contract as ExperimentLayout, plus footer and slot). The hero/plate/prose live in the `[slug]` template, not the layout.

- [ ] **Step 1: Create StudyLayout**

`src/layouts/StudyLayout.astro` — ExperimentLayout's shell (no SiteHeader, hatch pill) plus SiteFooter, because studies end at the door:

```astro
---
import '@fontsource/marcellus';
import '@fontsource/spectral/400.css';
import '@fontsource/spectral/400-italic.css';
import '@fontsource/spectral/600.css';
import '../styles/tokens.css';
import '../styles/base.css';
import Seo from '../components/Seo.astro';
import ThemeBootstrap from '../components/ThemeBootstrap.astro';
import SiteFooter from '../components/SiteFooter.astro';

interface Props { title: string; description: string; designation: string }
const { title, description, designation } = Astro.props;
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <Seo title={title} description={description} />
    <ThemeBootstrap />
  </head>
  <body>
    <a class="hatch smallcaps" href="/lab">&larr; Lab &middot; {designation}</a>
    <main id="main">
      <slot />
    </main>
    <SiteFooter />
  </body>
</html>

<style>
  .hatch {
    position: fixed; top: var(--space-3); left: var(--space-3); z-index: 20;
    color: var(--mark-muted); text-decoration: none; font-size: var(--text-sm);
    background: color-mix(in srgb, var(--field) 70%, transparent);
    padding: var(--space-1) var(--space-3); border-radius: 999px;
    backdrop-filter: blur(6px);
  }
  .hatch:hover { color: var(--mark); }
</style>
```

- [ ] **Step 2: Branch [slug].astro**

Replace `src/pages/lab/[slug].astro` entirely:

```astro
---
import { getCollection, render } from 'astro:content';
import { Image } from 'astro:assets';
import ExperimentLayout from '../../layouts/ExperimentLayout.astro';
import StudyLayout from '../../layouts/StudyLayout.astro';
import SpecimenPlate from '../../components/SpecimenPlate.astro';
import WallLabel from '../../components/WallLabel.astro';
import { experimentComponents } from '../../experiments/registry';

export async function getStaticPaths() {
  // Every live entry generates, except experiments with their own route (href).
  const entries = await getCollection(
    'lab',
    ({ data }) => data.status === 'live' && !(data.type === 'experiment' && data.href),
  );
  return entries.map((entry) => ({ params: { slug: entry.id }, props: { entry } }));
}

const { entry } = Astro.props;
const { designation, title, summary, tech, date } = entry.data;
const { Content } = await render(entry);
const pageTitle = `${designation} ${title} · Birch Design Lab`;
const dateLabel = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
const Experiment = entry.data.type === 'experiment' ? experimentComponents[designation] : undefined;
---
{entry.data.type === 'study' ? (
  <StudyLayout title={pageTitle} description={summary} designation={designation}>
    <header class="hero">
      <Image src={entry.data.hero.src} alt={entry.data.hero.alt} class="hero-img" widths={[768, 1280, 1920]} sizes="100vw" loading="eager" />
      <div class="hero-veil"></div>
      <div class="hero-text wrap">
        <p class="designation smallcaps">{designation} &middot; Study</p>
        <h1>{title}</h1>
        <p class="hero-summary">{summary}</p>
      </div>
    </header>

    <section class="plate wrap">
      <dl>
        <div><dt class="smallcaps">Client</dt><dd>{entry.data.client}</dd></div>
        <div><dt class="smallcaps">Delivered</dt><dd>{dateLabel}</dd></div>
        <div><dt class="smallcaps">Built with</dt><dd class="chips">{tech.map((t) => <span class="tag">{t}</span>)}</dd></div>
        <div><dt class="smallcaps">Living specimen</dt><dd><a href={entry.data.liveUrl}>{new URL(entry.data.liveUrl).hostname}</a></dd></div>
      </dl>
    </section>

    <article class="prose wrap">
      <Content />
    </article>

    <section class="loud" data-reveal>
      <div class="wrap loud-inner">
        <!-- first-draft copy -->
        <p class="pull">Your project gets this same table. Same hands, same candor.</p>
        <a class="cta-engraved" href="/contact"><span class="fill" aria-hidden="true"></span><span class="lbl">Start a conversation</span></a>
      </div>
    </section>
  </StudyLayout>
) : (
  <ExperimentLayout title={pageTitle} description={summary} designation={designation}>
    {entry.data.howto && <WallLabel lines={entry.data.howto} />}
    {Experiment ? (
      <Experiment />
    ) : (
      <div class="wrap missing"><p>This specimen has no interactive stage yet.</p></div>
    )}
    <SpecimenPlate designation={designation} title={title} tech={tech}>
      <Content />
    </SpecimenPlate>
    <noscript>
      <p class="wrap">This experiment requires JavaScript; the specimen plate below describes it.</p>
    </noscript>
  </ExperimentLayout>
)}

<style>
  .missing { min-height: 60vh; display: grid; place-items: center; color: var(--mark-muted); }

  /* Stage hero: full-bleed image, washed for legibility, identity overlaid.
     About-hero grammar: it scrolls away. */
  .hero { position: relative; min-height: 62vh; display: grid; align-items: end; overflow: hidden; border-bottom: 1px solid var(--line); }
  .hero-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .hero-veil { position: absolute; inset: 0; background: linear-gradient(to top, color-mix(in srgb, var(--field) 88%, transparent), color-mix(in srgb, var(--field) 30%, transparent) 55%, transparent); }
  .hero-text { position: relative; padding-block: var(--space-5); }
  .hero-text .designation { color: var(--accent); }
  .hero-text h1 { font-size: var(--text-3xl); margin-top: var(--space-1); }
  .hero-summary { color: var(--mark-muted); max-width: 44ch; margin-top: var(--space-2); }

  /* Plate block: SpecimenPlate's language, in flow. */
  .plate { padding-block: var(--space-4); border-bottom: 1px solid var(--line); }
  .plate dl { display: flex; flex-wrap: wrap; gap: var(--space-4) var(--space-6); margin: 0; }
  .plate dt { color: var(--accent); font-size: var(--text-sm); }
  .plate dd { margin: 0.35em 0 0; }
  .plate .tag { border: 1px solid var(--line); padding: 0.2em 0.6em; margin-right: var(--space-1); font-size: var(--text-sm); color: var(--mark-muted); white-space: nowrap; }
  .plate a { color: var(--link); }

  /* Narrative column. */
  .prose { max-width: 68ch; padding-block: var(--space-6); display: grid; gap: var(--space-3); }
  .prose :global(h2) { font-size: var(--text-xl); margin-top: var(--space-4); }
  .prose :global(p) { color: var(--mark-muted); line-height: 1.6; }
  .prose :global(img) { max-width: 100%; height: auto; border: 1px solid var(--line); margin-block: var(--space-2); }
  /* Director's commentary: blockquotes are the founder's voice, offset and
     accent-marked so they read as asides, not citations. */
  .prose :global(blockquote) {
    margin: var(--space-3) 0; padding: var(--space-2) var(--space-4);
    border-left: 2px solid var(--accent);
    font-style: italic; color: var(--mark);
  }
  .prose :global(blockquote p) { color: var(--mark); }

  .pull { font-family: var(--font-display); font-size: var(--text-2xl); line-height: 1.2; max-width: 24ch; }
  .loud .cta-engraved { margin-top: var(--space-5); }
</style>
```

- [ ] **Step 3: Build (no study exists yet, branch must typecheck)**

Run: `npx astro check && npm run build`
Expected: 0 errors; 12 pages; the study branch compiles but generates nothing until Task 4 adds BDL-005.

- [ ] **Step 4: Commit and push**

```bash
git add src/layouts/StudyLayout.astro src/pages/lab/[slug].astro
git commit -m "feat(lab): StudyLayout and study branch on the specimen page"
git push
```

---

### Task 4: Imagery capture + BDL-005 content

**Files:**
- Create: `src/content/lab/bdl-005/` (images: `hero.png`, `host-console.png`, `tv-screen.png`, `studio-event.png`, `caller-readiness.png`, `site-phone.png`)
- Create: `src/content/lab/bdl-005.md`

**Interfaces:**
- Consumes: the Task 1 study schema and Task 3 study template.
- Produces: the live BDL-005 entry.

Privacy rules for every capture: development dataset only for app/Studio shots; no submissions, no email addresses, no tokens, no account chrome (crop the browser to the content); if anything personal is in frame, recrop or blur before the file enters the repo.

- [ ] **Step 1: Capture the public site**

Public pages need no auth. From repo root:

```bash
npx playwright install chromium
npx playwright screenshot --viewport-size=1440,900 --wait-for-timeout=3000 https://cheerandchatter.com src/content/lab/bdl-005/hero.png
npx playwright screenshot --viewport-size=390,844 --wait-for-timeout=3000 --full-page https://cheerandchatter.com/events src/content/lab/bdl-005/site-phone.png
```

(If `/events` is not the calendar route, check `C:\git\websites\cheerAndChatter\files\src\pages\` for the real one and substitute.)

- [ ] **Step 2: Capture the live app and Studio against the sandbox**

Start the C&C site locally (its repo root is `C:\git\websites\cheerAndChatter\files`): `npm run dev` there, confirm it uses the development dataset (check `.dev.vars` / `.env` for the dataset variable and the live-app password). Then, with the Browser pane or a small Playwright script, log into `/live`, load a demo night, and capture:
- `host-console.png` — host console mid-game (phone viewport, 390x844).
- `tv-screen.png` — the TV route `/live/tv/<code>` with watercolor art on screen (1440x900).
- Sanity Studio (`cheerandchatter.sanity.studio` or local studio dev): `studio-event.png` (an event document open) and `caller-readiness.png` (the Caller readiness tool). Frame to structure, not data.

Exact interaction steps depend on the sandbox's seeded state; the executor drives the browser interactively. Downscale/crop captures to at most 1920px wide, PNG.

- [ ] **Step 3: Write the entry**

`src/content/lab/bdl-005.md`. The narrative below is the complete first draft (founder rewrites in the content pass; commentary asides are blockquotes; no emdashes anywhere):

```markdown
---
designation: BDL-005
type: study
title: Cheer and Chatter Social Club
summary: 'A ticketing site and a live event application for themed game nights on the Gulf Coast: one couple, one phone, one venue TV.'
date: 2026-07-28
tech: [astro, react, sanity, cloudflare, durable-objects]
status: live
client: Cheer and Chatter Social Club
liveUrl: https://cheerandchatter.com
hero:
  src: ./bdl-005/hero.png
  alt: The Cheer and Chatter homepage, warm paper tones with the headline Good Company, Great Times.
---
<!-- first-draft copy throughout: founder rewrite comes with the content pass -->

Cheer and Chatter Social Club runs themed, bingo-based social nights across
the Mississippi Gulf Coast. Plant Night, Blind Date with a Book, music
rounds, private bookings. A couple with three young kids building the kind
of gathering place they wished existed, where people put their phones down
and meet each other.

They came to us as the business was being stood up, needing two things:
a site that sells tickets, and a way to actually run game night.

## The site

A marketing and ticketing site where the owners control every word without
touching code. Events, venues, page copy, and game content all live in
Sanity; the site rebuilds itself nightly and on every publish. Ticketing is
never pasted embed code: the ticket platform is structured content with an
allowlist, so a bad link can degrade gracefully instead of breaking a page.

Every vendor account belongs to the owners. Domain, hosting, content
studio, email, analytics. If we vanished tomorrow, they lose nothing.

> House rule, and the reason it gets a sentence here: a client should own
> their own shop. We hold keys, not deeds.

Their brand palette came from their own color sheet, and one of its colors
turned out to be genuinely illegible as text. So it became a rule in the
stylesheet: coral is a surface, never a letter. The design system enforces
what the eye would eventually catch.

![The events calendar on a phone.](./bdl-005/site-phone.png)

## The live event application

The interesting half. Game night needs a caller, a board, and a room that
can see both. So the site grew an auth-gated live area: the host runs the
night from a phone, and the venue TV shows the crowd screen. The two are
paired by a five-character code, connect from any network, and stay in sync
through a small realtime worker that costs nothing while idle.

![The host console mid-game.](./bdl-005/host-console.png)

![The venue TV screen, watercolor plant art two meters tall.](./bdl-005/tv-screen.png)

The content pipeline behind it: eight hundred trivia questions and a
hundred twenty pieces of watercolor art, parsed out of the owners' own
documents and catalog PDF by import scripts that refuse to run against
production by accident. Before an event, the night's art caches onto the
device so a venue with bad wifi cannot take the show down.

> We rehearsed the whole thing in a living room with a phone and a smart
> TV before the first real night. That drill caught five bugs no test
> could have seen, including a TV keyboard that capitalizes room codes.
> Rehearsal is part of delivery.

The gaming commission's rules are encoded as constants in exactly one
file, commented with why they exist. Compliance is code, not a memo.

## The controls they keep

The owners run everything through Sanity Studio, including a readiness
tool that counts their question pools per theme so they know a night is
playable before they announce it.

![An event document open in the studio.](./bdl-005/studio-event.png)

![The caller readiness tool counting question pools.](./bdl-005/caller-readiness.png)

## The shape of the work

Three weeks from spec to delivery. Two hundred fifty nine commits across
ninety seven pull requests, two hundred forty two tests green at handoff,
and two owner manuals written so the site and the live app can be run
without calling us. The site launched on day thirteen; the live
application followed nine days later, rehearsed and drilled before their
first event.

> Everything on this page is the same kind of work the Lab practices in
> the open. The experiments are how we sharpen it; this is where it cuts.
```

- [ ] **Step 4: Tests and build**

Run: `npm test -- --run && npm run build`
Expected: tests green; build now emits 13 pages including `/lab/bdl-005/`; image pipeline emits AVIF/WebP variants for the six images (build time goes up; that is sharp working).

- [ ] **Step 5: Commit and push**

```bash
git add src/content/lab/bdl-005.md src/content/lab/bdl-005/
git commit -m "feat(lab): BDL-005 Cheer and Chatter study, first draft"
git push
```

---

### Task 5: Browser verification pass

**Files:** none (verification only; fix-forward commits if defects found).

- [ ] **Step 1: Run the site and walk it**

`npm run dev:worker` (or `npm run dev` if the Worker is irrelevant here), then in the browser verify:
- `/lab`: four cards, type chips correct, toggle filters (All/Experiments/Studies), toggle absent with JS disabled while all cards remain.
- `/lab/experiments` (3 cards), `/lab/studies` (1 card), kicker links back to /lab.
- `/lab/bdl-005/`: hero renders with overlay legible in dark and light themes; plate block correct; commentary blockquotes styled; images load as AVIF/WebP; loud CTA to /contact works; hatch pill back to /lab; footer present.
- `/lab/bdl-001/`: unchanged experiment rendering (regression check).
- Phone width (390px): hero text legible, plate wraps, no horizontal scroll.
- `prefers-reduced-motion`: loud reveal settles instantly, nothing else animates.

- [ ] **Step 2: Sitemap and SEO spot-check**

In `dist/sitemap-0.xml`: `/lab/experiments`, `/lab/studies`, `/lab/bdl-005` present; `/contact/sent` absent.

- [ ] **Step 3: Fix anything found, commit, push**

Fix-forward with small commits (`fix(lab): ...`), push when green.

---

## Self-review notes (already applied)

- Spec coverage: schema union (T1), three routes + toggle + chips (T2), hybrid page (T3), content + imagery + disclosure rules (T4), verification (T5). Home "From the lab" needs no change (two-newest-live logic admits studies; verified intent with founder).
- The spec's `gallery` field was dropped in a spec amendment: body images are standard markdown images through Astro's pipeline.
- Type consistency: `makeLabSchema` / `labTestSchema` / `LabEntryData` used consistently; `SpecimenCatalog` props match all three call sites; `data-type` attribute name matches the CSS selectors.
