# Birch Design Lab — Lab Architecture Handoff

Context for Claude Code. This defines how the **Lab** section should be structured in the Astro site. It is the product of design decisions made separately; the *why* is settled, the *how* is yours to implement against the existing codebase. Confirm the open questions before writing files.

---

## Decision: one collection, typed

The Lab is a **single Astro content collection** with a `type` discriminator, not two parallel collections.

- `type: "experiment"` — self-initiated work. Technical/artistic flexing.
- `type: "study"` — client work. Carries a problem → process → outcome narrative.

Both types share the same specimen framing (accession number, wall label, plate) and the same components. One collection means one set of those components to maintain, and it lets the `/lab` landing render a single recency-merged wall where experiments and studies sit together. At current low volume that merge is deliberate — it makes the wall look full.

### Schema (starting point)

```ts
// src/content/config.ts
import { defineCollection, z } from 'astro:content';

const lab = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    accession: z.number().int(),      // permanent, globally sequential, immutable
    type: z.enum(['experiment', 'study']),
    date: z.coerce.date(),            // drives recency sort
    summary: z.string(),
    draft: z.boolean().default(false),

    // study-only, optional so experiments omit them
    client: z.string().optional(),
    problem: z.string().optional(),
    before: z
      .object({
        screenshot: z.string().optional(),
        archiveUrl: z.string().url().optional(),
      })
      .optional(),
    process: z.string().optional(),
    outcome: z.string().optional(),
  }),
});

export const collections = { lab };
```

Optional: a `superRefine` that requires the study fields when `type === 'study'`, so a half-filled study fails at build instead of rendering blank. Worth it once the shape is stable; skip it while iterating.

---

## Routes

- `/lab` — index. Query all, sort by `date` desc, render the full merged wall. A lab-themed **toggle filters already-rendered DOM** (show/hide), it does **not** fetch on click. This keeps every specimen and every link in the initial HTML.
- `/lab/experiments` — filtered index, `type === 'experiment'`.
- `/lab/studies` — filtered index, `type === 'study'`. Must handle the empty state deliberately (see warnings).
- `/lab/[slug]` — detail page. **Flat URLs**, not nested by type. `getStaticPaths` over the whole collection. Flat means an entry's URL never depends on its `type`, so recency-merge and the toggle never fight the path structure.

---

## Accession numbering

Globally sequential across both types, assigned in creation order (Specimen 001, 002, …), and **immutable** — like a real museum, a number is never reused or renumbered, so detail URLs and any external references stay stable. Decide whether the number is authored in frontmatter (simplest, explicit) or derived at build (no manual bookkeeping but harder to keep stable). Frontmatter is the safer default.

---

## SEO notes

The architecture is SEO-neutral-to-positive; nothing here costs rankings, provided:

1. **Each specimen is its own statically-generated URL.** The detail pages are the ranking surface and they rank independently of how `/lab` filters or displays them.
2. **The toggle filters rendered DOM, not fetched content.** Because the full collection ships in `/lab`'s static HTML, crawlers see every specimen and internal link regardless of which filter state a human lands on. More links on the top hub page is a mild positive.
3. **If the toggle uses a query param** (`?type=study`), add `<link rel="canonical" href="/lab">` on those states to avoid duplicate-URL wobble. If the toggle is pure in-page component state with no URL change, no canonical needed.

The recency-merged pile itself is SEO-neutral. Padding the numbers by merging types costs nothing.

---

## Open questions (confirm before building)

1. **Collection name.** `lab`? `specimens`? Affects imports and any typed helpers. Pick one and stay consistent with existing content dirs.
2. **Does single-collection-with-type fit the current content setup?** If there's already a content-collections convention in the repo, match it rather than fighting it.
3. **Detail template.** One shared template with conditional study blocks (before/after, problem, process, outcome), or two templates? Shared is less code; two is cleaner if the layouts diverge a lot. Lean shared until they clearly diverge.
4. **Accession assignment.** Frontmatter or build-derived? (Recommend frontmatter.)
5. **Toggle mechanism.** Pure component state (no URL) or query param (needs the canonical above)? This is a design/interaction call as much as technical.

---

## Warnings

- **Design/Code drift is the live risk.** Visual iteration is happening in Claude Design; this structural work happens here in Code. Keep the boundary explicit: **Code owns the skeleton (collections, routing, data), Design owns the skin (styling, motion).** Before starting, reconcile any page restyles that currently live only in Design so this structural pass doesn't collide with them on merge. Establish which side is source of truth per layer and don't cross the streams.
- **`/lab/studies` must not launch as a blank page.** It starts empty (no client work yet) and that's fine, but render a deliberate empty state — a plinth with a `Specimen 001 — pending accession` label. It should read as *new and rigorous*, not *nobody's been hired*. A literal blank page undoes that.
- **The render-everything landing scales fine now, not forever.** Rendering the full collection and hiding with the toggle is correct at low volume. Past roughly 30–50 entries, shipping the entire wall in one HTML doc starts to bloat the page and can cost the Lighthouse target. Note a future threshold to revisit with pagination or islands; don't build it yet.
- **Motion/perf on the Lab landing.** If the bark engine (WebGL) renders on `/lab`, it inherits the sitewide rules: gate behind `prefers-reduced-motion`, pause when offscreen or the tab is hidden, defer load so it never blocks first paint. The Lighthouse 100 target applies here too.
- **Study before-state is time-sensitive content.** For rescue/client studies, the "before" (screenshot or archive.org capture of the original site) needs capturing *at intake*, before the old site changes or disappears. The schema has a slot for it; the data has to be grabbed early or it's gone.
