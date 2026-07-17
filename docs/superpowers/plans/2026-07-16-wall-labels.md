# Wall Labels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every experiment page shows an always-visible "How to operate" placard sourced from a new required `howto` frontmatter field.

**Architecture:** One schema field (`howto`, 1-4 imperative lines, required unless the entry has `href`), one shared `WallLabel.astro` component rendered by `src/pages/lab/[slug].astro`, four content entries updated. No JS, no state. Spec: `docs/superpowers/specs/2026-07-16-wall-labels-design.md`.

**Tech Stack:** Astro 5, zod, vitest.

## Global Constraints

- `howto`: 1 to 4 lines, each a non-empty string. Required when the entry has no `href` (zod refine).
- Writing rules: no emdashes anywhere, human voice, museum wall-label register. Title separators are middots.
- Tests in `tests/` at repo root, vitest, `npm test` stays green. `npm run check` and `npm run build` stay clean.
- Schema change and content updates land in the same commit, or the content collection fails the build.
- Commit and push after every task (push deploys production).

---

### Task 1: Schema field and content entries

**Files:**
- Modify: `src/lib/lab-schema.ts`
- Modify: `tests/lab-schema.test.ts`
- Modify: `src/content/lab/bdl-001.md`, `src/content/lab/bdl-002.md`, `src/content/lab/bdl-003.md`, `src/content/lab/bdl-004.md` (frontmatter only)

**Interfaces:**
- Consumes: existing `labSchema` in `src/lib/lab-schema.ts`.
- Produces: `howto?: string[]` on `LabEntryData`, guaranteed present (1-4 lines) whenever `href` is absent. Task 2 reads `entry.data.howto`.

- [ ] **Step 1: Write the failing tests**

In `tests/lab-schema.test.ts`, add `howto` to the shared fixture so existing tests keep passing under the new refine, and add a new describe block. The `valid` fixture becomes:

```ts
const valid = {
  designation: 'BDL-001',
  title: 'The Bark Engine',
  summary: 'The generative birch system, exposed.',
  date: '2026-07-15',
  tech: ['webgl', 'svelte'],
  device: 'universal',
  howto: ['Type a seed and watch the bark regrow.'],
};
```

Append this describe block:

```ts
describe('howto wall label', () => {
  it('requires howto when there is no href', () => {
    const { howto, ...withoutHowto } = valid;
    expect(() => labSchema.parse(withoutHowto)).toThrow();
  });
  it('href entries are exempt', () => {
    const { howto, ...withoutHowto } = valid;
    expect(labSchema.parse({ ...withoutHowto, href: '/styleguide' }).howto).toBeUndefined();
  });
  it('caps lines at four and rejects empty lines', () => {
    expect(() => labSchema.parse({ ...valid, howto: ['a', 'b', 'c', 'd', 'e'] })).toThrow();
    expect(() => labSchema.parse({ ...valid, howto: [''] })).toThrow();
    expect(labSchema.parse({ ...valid, howto: ['a', 'b', 'c', 'd'] }).howto).toHaveLength(4);
  });
});
```

- [ ] **Step 2: Run tests to verify the new block fails**

Run: `npx vitest run tests/lab-schema.test.ts`
Expected: FAIL. "requires howto when there is no href" fails (schema does not know `howto` yet, parse succeeds). The cap test also fails.

- [ ] **Step 3: Add the field to `src/lib/lab-schema.ts`**

Replace the whole file with:

```ts
import { z } from 'zod';

export const labSchema = z
  .object({
    designation: z.string().regex(/^BDL-\d{3}$/),
    title: z.string().min(1),
    summary: z.string().min(1),
    date: z.coerce.date(),
    tech: z.array(z.string()).default([]),
    device: z.enum(['mobile-first', 'desktop-forward', 'universal']),
    status: z.enum(['live', 'forthcoming']).default('live'),
    featured: z.boolean().default(false),
    /** Experiments that live at their own route (e.g. /styleguide) link
        there from the catalog instead of getting a /lab/<id> page. */
    href: z.string().startsWith('/').optional(),
    /** Wall label: how to operate the piece, 1-4 short imperative lines.
        Required for every generated /lab/<id> page; href entries are
        exempt because they never get one. Cap is deliberate: a piece
        that needs five lines is too confusing, and that is the bug. */
    howto: z.array(z.string().min(1)).min(1).max(4).optional(),
  })
  .refine((d) => d.href !== undefined || d.howto !== undefined, {
    message: 'experiments need a howto wall label (or an href)',
  });

export type LabEntryData = z.infer<typeof labSchema>;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/lab-schema.test.ts`
Expected: PASS (10 tests).

- [ ] **Step 5: Add `howto` frontmatter to all four entries**

Copy checked against the actual controls in each component. Frontmatter only; bodies unchanged. Insert the `howto` block directly after `featured:` in each file.

`src/content/lab/bdl-001.md` (controls: seed text input, density slider, wake/gust/grow checkboxes, New tree button):

```yaml
howto:
  - 'Type a seed and watch the bark regrow, or ask for a new tree.'
  - 'Pull the density slider; toggle wake, gust, and grow.'
  - 'Same seed, same tree, forever.'
```

`src/content/lab/bdl-002.md` (controls: palette and typeface pickers, live contrast, bark panel):

```yaml
howto:
  - 'Try the palettes and typefaces; contrast grades itself as you switch.'
  - 'Grow a bark panel of your own at the bottom.'
```

`src/content/lab/bdl-003.md` (controls: fragment table, scratch canvas, return button):

```yaml
howto:
  - 'Choose a fragment from the table.'
  - 'Scratch the bark to uncover what was written there.'
  - 'Keep rubbing and the old letters give way to English.'
```

`src/content/lab/bdl-004.md` (controls: treadles, throw, lever, side panel, cut):

```yaml
howto:
  - 'Press a treadle to open the shed, then throw the shuttle to weave.'
  - 'Or pull the lever and the loom weaves itself.'
  - 'Pattern and yarns live in the side panel.'
  - 'Cut the cloth to keep what you wove.'
```

- [ ] **Step 6: Full verify**

Run: `npm test` then `npm run check` then `npm run build`
Expected: all green. The build exercises the content collection against the new schema, so a missing or oversized `howto` in any entry fails here.

- [ ] **Step 7: Commit**

```bash
git add src/lib/lab-schema.ts tests/lab-schema.test.ts src/content/lab
git commit -m "feat(lab): required howto wall-label field, copy for all four pieces"
git push
```

---

### Task 2: WallLabel component and page wiring

**Files:**
- Create: `src/components/WallLabel.astro`
- Modify: `src/pages/lab/[slug].astro`

**Interfaces:**
- Consumes: `entry.data.howto: string[] | undefined` from Task 1 (always defined on generated pages, but guard anyway); CSS variables `--field`, `--line`, `--mark`, `--mark-muted`, `--space-3`, `--space-4`, `--text-sm` already used by `SpecimenPlate.astro`.
- Produces: `<WallLabel lines={string[]} />`, no other exports.

- [ ] **Step 1: Write `src/components/WallLabel.astro`**

```astro
---
interface Props { lines: string[] }
const { lines } = Astro.props;
---
<details class="label" open>
  <summary><span class="smallcaps">How to operate</span></summary>
  <ol>
    {lines.map((line) => <li>{line}</li>)}
  </ol>
</details>

<style>
  .label {
    position: fixed; top: var(--space-4); right: var(--space-4); z-index: 20;
    max-width: 30ch;
    background: color-mix(in srgb, var(--field) 88%, transparent);
    backdrop-filter: blur(8px);
    border: 1px solid var(--line);
  }
  summary {
    cursor: pointer; list-style: none;
    padding: var(--space-3) var(--space-4);
    color: var(--mark-muted); font-size: var(--text-sm);
  }
  summary::-webkit-details-marker { display: none; }
  summary:hover { color: var(--mark); }
  ol {
    margin: 0; padding: 0 var(--space-4) var(--space-3);
    list-style: none;
    display: grid; gap: var(--space-3);
    color: var(--mark-muted); font-size: var(--text-sm);
  }
  @media (max-width: 720px) {
    .label {
      position: static;
      max-width: none;
      border-inline: none;
    }
  }
</style>
```

- [ ] **Step 2: Wire into `src/pages/lab/[slug].astro`**

Add the import after the SpecimenPlate import:

```astro
import WallLabel from '../../components/WallLabel.astro';
```

Add the label before the experiment stage (instructions come first in DOM order for screen readers). Replace:

```astro
  {Experiment ? (
    <Experiment />
  ) : (
```

with:

```astro
  {entry.data.howto && <WallLabel lines={entry.data.howto} />}
  {Experiment ? (
    <Experiment />
  ) : (
```

- [ ] **Step 3: Full verify**

Run: `npm test` then `npm run check` then `npm run build`
Expected: all green. Then grep the build output: `grep -o 'How to operate' dist/lab/bdl-004/index.html` shows the label made it into static HTML (JS-off covered).

- [ ] **Step 4: Browser verify**

Dev server: all four pages `/lab/bdl-001` through `/lab/bdl-004` show the placard open on load, top-right on desktop; clicking the summary folds it; at mobile width (720px or less) it docks in flow at the top; on BDL-004 it does not cover the treadle bar; on BDL-003 it does not cover the fragment table at mobile width.

- [ ] **Step 5: Commit**

```bash
git add src/components/WallLabel.astro src/pages/lab/[slug].astro
git commit -m "feat(lab): wall label placard on every experiment page"
git push
```

---

### Post-launch (not tasks)

- Founder wording pass on the four labels: edit `howto` lines in `src/content/lab/*.md`, save, HMR shows it.
- If a future piece genuinely needs more than four lines, the fix is simplifying the piece, not raising the cap.
