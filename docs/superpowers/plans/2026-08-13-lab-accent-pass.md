# Lab Accent Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the loud accent grammar from design frame 1c to the Lab catalog, the experiment stage chrome, and the study page, so green means working and leather means waiting.

**Architecture:** Almost entirely CSS and small markup additions in existing components. One derived token carries the accent-tinted hairline so the `color-mix` is written once. One genuinely new piece of logic, the specimen count string, goes in `src/lib` and is unit-tested; everything else is visual and is verified in a real browser on both faces.

**Tech Stack:** Astro components, plain CSS custom properties, Vitest.

**Spec:** [`2026-08-13-lab-accent-pass-design.md`](../specs/2026-08-13-lab-accent-pass-design.md). Design frame: Claude Design project `027db389-4762-4e10-9ccd-6ab6a7752652`, file `Lab Accent Pass.dc.html`, option 1c.

**The chiaroscuro flip is Task 7 and comes last.** It is the only part of this pass that can break something already working, so it sits behind a task boundary rather than in a separate document: a reviewer can reject Task 7 and merge Tasks 1 through 6 unaffected.

**The flip's mechanism changed while this plan was written, and it got simpler.** The spec describes moving the semantic tokens onto a `data-face` attribute that works anywhere in the tree, so a Lab subtree could invert inside a normally-faced page, and it flags that `BarkField` would need its colour read-target changed as a consequence. That turns out to be unnecessary. Every Lab surface is a whole page, and all three layouts render their own `<html>` element, so the inversion happens at the root. Nothing is nested, so nothing needs subtree scoping, and `BarkField` keeps reading from `document.documentElement`, which now simply carries the Lab's face. The spec has been corrected to match.

## Global Constraints

- Branch and open a PR per task. Never commit to `main`; merging triggers a production deploy.
- `npx vitest run`, `npx astro check`, and `npm run build` must all be clean before a PR.
- **Green is two colours doing two jobs.** Classification (the designation, the type badge) stays accent on every row regardless of status. Status language (the working dash and label, the forthcoming chip) follows working-versus-waiting. Do not strip accent off forthcoming rows.
- **The chip keeps the word "forthcoming."** The design frame says "in progress"; the founder declined it. Treatment changes, wording does not.
- Colors come from existing tokens. This plan adds exactly one derived token and no new palette values.
- Square geometry: no border radius on chips, badges, or filters. House rule, visible throughout the existing components.
- Marcellus is single-weight 400. Never ask for 500+ on `--font-display` or `--font-smallcaps`.
- `--accent-strong` is `--leather-caramel` on dark (6.33:1) and `--leather-brown` on light (~9.6:1). Both are text-legal.
- The 45% accent hairline mix is decorative, never text, and is not held to a text contrast ratio.

## File Structure

| File | Responsibility |
|---|---|
| `src/styles/tokens.css` (modify) | One derived token, `--line-accent` |
| `src/lib/specimen-count.ts` (new) | The count string. Pure, unit-tested. |
| `tests/specimen-count.test.ts` (new) | Its tests |
| `src/components/SpecimenCard.astro` (modify) | Working dash and label, forthcoming chip, accent hairline, row hover, tech chips |
| `src/components/TypeBadge.astro` (modify) | Filled accent |
| `src/components/SpecimenCatalog.astro` (modify) | Count, filled active filter, accent bottom rule |
| `src/pages/index.astro` (modify) | The 1a floor on the home Lab preview |
| `src/components/WallLabel.astro` (modify) | Accent step numerals, accent hairline |
| `src/components/SpecimenPlate.astro` (modify) | Accent hairline, accent tech chips, working dash |
| `src/layouts/ExperimentLayout.astro` (modify) | Accent designation in the hatch pill |
| `src/layouts/StudyLayout.astro` (modify) | Accent designation in the hatch pill |
| `src/pages/lab/[slug].astro` (modify) | Study page: live chip, accent tech chips, accent hairlines, living-specimen dash |
| `src/components/ThemeBootstrap.astro` (modify) | Task 7: computes the face, inverting it in the Lab zone |
| `src/components/ThemeToggle.astro` (modify) | Task 7: keeps face in step with the site preference |
| `src/layouts/BaseLayout.astro` (modify) | Task 7: optional `zone` prop stamped on `<html>` |
| `src/components/BarkField.astro` (modify) | Task 7: one attribute added to an observer filter |

`DeviceBadge.astro` is deliberately untouched. It stays muted on `--line` in every frame, because a device hint is neither classification nor status.

---

### Task 1: The accent grammar on catalog rows

**Files:**
- Modify: `src/styles/tokens.css` (the `:root` block, after the semantic blocks it depends on)
- Modify: `src/components/TypeBadge.astro:11-13`
- Modify: `src/components/SpecimenCard.astro` (markup at :17-29, styles at :31-52)
- Test: none. This task is CSS and markup; Task 2 carries the only testable logic.

**Interfaces:**
- Produces: the `--line-accent` token, used by Tasks 1, 4 and 5. The `.working` dash-and-label markup pattern, reused in Tasks 3, 4 and 5.

- [ ] **Step 1: Add the derived hairline token**

In `src/styles/tokens.css`, inside the first `:root { … }` block (the primitives block, ending at line 57), add:

```css
  /* Derived, not a palette value: the accent-tinted hairline the Lab's loud
     grammar uses in place of --line. Defined once here rather than repeating
     the color-mix at eight call sites. It resolves per face for free, because
     var() substitutes the winning --accent on the same element, and the
     face blocks below redefine --accent on :root. Decorative only, never text,
     so the 45% mix is not held to a text contrast ratio. */
  --line-accent: color-mix(in srgb, var(--accent) 45%, transparent);
```

- [ ] **Step 2: Fill the type badge**

Replace the `.badge` rule in `src/components/TypeBadge.astro`:

```css
  .badge {
    font-family: var(--font-smallcaps);
    letter-spacing: var(--tracking-wide); text-transform: uppercase;
    font-size: 0.68rem; line-height: 1;
    /* Filled, not outlined: type is classification, and the loud grammar
       gives classification the most solid treatment on the row. */
    color: var(--on-accent); background: var(--accent);
    border: 1px solid var(--accent);
    padding: 0.35em 0.8em 0.25em; white-space: nowrap;
  }
```

- [ ] **Step 3: Rewrite the card markup**

Replace the whole `<article>` block in `src/components/SpecimenCard.astro` (lines 17-29):

```astro
<article class="card" data-type={entry.data.type}>
  <p class="status">
    <span class="designation smallcaps">{designation}</span>
    {live
      ? <span class="working">
          <span class="dash" aria-hidden="true"></span>
          <span class="working-label">working specimen</span>
        </span>
      : <span class="soon">forthcoming</span>}
  </p>
  <Heading>
    {live ? <a href={href}>{title}</a> : <span>{title}</span>}
  </Heading>
  <p class="summary">{summary}</p>
  <p class="meta">
    <TypeBadge type={entry.data.type} />
    {entry.data.type === 'experiment' && <DeviceBadge device={entry.data.device} />}
    {tech.map((t) => <span class="tag">{t}</span>)}
    <time datetime={date.toISOString().slice(0, 10)}>{dateLabel}</time>
  </p>
</article>
```

Two things moved. The status line is new and holds the designation alongside either the working marker or the forthcoming chip. And the title no longer carries an inline "forthcoming" em, because that word is now a chip on the line above; a forthcoming title is still a plain `<span>` rather than a link, exactly as before.

- [ ] **Step 4: Rewrite the card styles**

Replace the whole `<style>` block in `src/components/SpecimenCard.astro`:

```css
<style>
  /* Loose density: gallery pacing. --space-6 is fluid (clamp 2.5-4rem), so
     narrow viewports rest on the 2.5rem floor. The inline padding plus its
     negative margin lets the row hover bleed past the text column. */
  .card {
    padding-block: var(--space-6);
    padding-inline: var(--space-3);
    margin-inline: calc(var(--space-3) * -1);
    border-top: 1px solid var(--line-accent);
    transition: background-color var(--dur-1) var(--ease-weighted);
  }
  .card:hover { background: var(--green-surface); }

  /* Status line. The designation is CLASSIFICATION and stays accent on every
     row, forthcoming included; only the marker beside it carries state. */
  .status { display: flex; align-items: baseline; gap: var(--space-3); flex-wrap: wrap; }
  .designation { color: var(--accent); font-size: var(--text-sm); }
  .working { display: flex; align-items: center; gap: var(--space-2); color: var(--accent); }
  .working .dash { display: inline-block; width: 0.85em; height: 2px; background: var(--accent); }
  /* Chip typography is declared in full rather than borrowing the global
     .smallcaps utility, because that utility also sets font-size: 0.82em and
     these chips are pinned at 0.68rem. Every chip across this pass is written
     the same way, in five files, which is what makes them comparable. */
  .working-label, .soon, .tag {
    font-family: var(--font-smallcaps);
    letter-spacing: var(--tracking-wide); text-transform: uppercase;
    font-size: 0.68rem; line-height: 1;
  }
  /* Leather, not green: waiting is not working. The word stays "forthcoming"
     because "in progress" would be a claim about right now. */
  .soon {
    color: var(--accent-strong); border: 1px solid var(--accent-strong);
    padding: 0.35em 0.8em 0.25em; white-space: nowrap;
  }

  .card h2, .card h3 { margin-top: var(--space-1); }
  h2 a, h3 a { color: var(--mark); text-decoration: none; }
  h2 a:hover, h3 a:hover { color: var(--accent); }
  .summary { color: var(--mark-muted); max-width: 52ch; margin-top: var(--space-2); }
  .meta {
    display: flex; gap: var(--space-3); align-items: center; flex-wrap: wrap;
    margin-top: var(--space-4); font-size: var(--text-sm); color: var(--mark-muted);
  }
  /* Tech goes from dot-separated text to chips, so the meta row reads as one
     family of tags rather than badges followed by prose. */
  .tag {
    color: var(--accent); border: 1px solid var(--line-accent);
    padding: 0.35em 0.8em 0.25em; white-space: nowrap;
  }
</style>
```

The `.tag::before { content: '·' }` rule is gone on purpose: the dot separator existed because tech was loose text, and chips do not need it.

- [ ] **Step 5: Look at it**

Start the dev server and open `/lab`. Confirm on both faces, using the theme toggle:

- Row hairlines are visibly green-tinted, not neutral grey.
- Hovering a row tints its whole width, bleeding past the text column on both sides.
- Live rows show the dash and "working specimen"; BDL-003 shows a leather "forthcoming" chip and no green status marker.
- Every row, including BDL-003, still has an accent designation and a filled accent type badge. That is correct.

- [ ] **Step 6: Verify and commit**

Run: `npx vitest run` — expect the existing suite green, unchanged count.
Run: `npx astro check` — expect 0 errors.
Run: `npm run build` — expect clean.

```bash
git add src/styles/tokens.css src/components/TypeBadge.astro src/components/SpecimenCard.astro
git commit -m "feat(lab): loud accent grammar on catalog rows"
```

---

### Task 2: The specimen count

The one piece of real logic in this pass, and the home of the `aria-live` announcement the BDL-005 review asked for.

**Files:**
- Create: `src/lib/specimen-count.ts`
- Create: `tests/specimen-count.test.ts`
- Modify: `src/components/SpecimenCatalog.astro`

**Interfaces:**
- Consumes: `--line-accent` from Task 1.
- Produces: `specimenCountLabel(total: number, working: number): string`

**Why this needs JavaScript, when the filter is CSS.** The filter hides cards with a CSS attribute selector and every card ships in the HTML, which is deliberate for SEO. CSS can hide rows but it cannot recount them, so the label would go stale the moment somebody filtered. The filter UI is already JS-gated (`.filter` is `display: none` until `html.js`), so updating the count in the same click handler adds no new dependency: without JS there is no filtering, and the server-rendered "all" count stays true.

- [ ] **Step 1: Write the failing test**

Create `tests/specimen-count.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { specimenCountLabel } from '../src/lib/specimen-count';

describe('specimenCountLabel', () => {
  it('reads as a sentence a person would say', () => {
    expect(specimenCountLabel(6, 3)).toBe('6 specimens · 3 working');
  });

  it('goes singular at one specimen', () => {
    expect(specimenCountLabel(1, 1)).toBe('1 specimen · 1 working');
  });

  it('handles a filter that matched nothing', () => {
    // Reachable: filter to Studies before any study is published.
    expect(specimenCountLabel(0, 0)).toBe('0 specimens · 0 working');
  });

  it('does not pluralise the working half, which is a count not a noun', () => {
    expect(specimenCountLabel(4, 1)).toBe('4 specimens · 1 working');
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run specimen-count`
Expected: FAIL, cannot resolve `../src/lib/specimen-count`.

- [ ] **Step 3: Implement**

Create `src/lib/specimen-count.ts`:

```ts
// The Lab catalog's count line. Pure and separate from the component so the
// pluralisation is testable without rendering Astro, and so the server render
// and the client-side filter update can never word it differently.
export function specimenCountLabel(total: number, working: number): string {
  return `${total} specimen${total === 1 ? '' : 's'} · ${working} working`;
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `npx vitest run specimen-count`
Expected: PASS, four cases.

- [ ] **Step 5: Render it, and keep it true under filtering**

Replace the whole of `src/components/SpecimenCatalog.astro`:

```astro
---
import type { CollectionEntry } from 'astro:content';
import SpecimenCard from './SpecimenCard.astro';
import { specimenCountLabel } from '../lib/specimen-count';

interface Props {
  entries: CollectionEntry<'lab'>[];
  filterable?: boolean;
}
const { entries, filterable = false } = Astro.props;
const working = entries.filter((e) => e.data.status === 'live').length;
---
<p class="count smallcaps" aria-live="polite">{specimenCountLabel(entries.length, working)}</p>
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
    import { specimenCountLabel } from '../lib/specimen-count';

    for (const group of document.querySelectorAll('.filter')) {
      const catalog = group.nextElementSibling as HTMLElement;
      // The count sits above the filter row, so it is the group's previous
      // sibling. Recounted from the DOM rather than from a passed-in figure:
      // the cards are the source of truth and cannot drift from it.
      const count = group.previousElementSibling as HTMLElement | null;
      group.addEventListener('click', (e) => {
        const btn = (e.target as HTMLElement).closest('button[data-set]');
        if (!btn || !catalog) return;
        const set = (btn as HTMLElement).dataset.set!;
        catalog.dataset.filter = set;
        for (const b of group.querySelectorAll('button')) {
          b.setAttribute('aria-pressed', String(b === btn));
        }
        if (count) {
          const shown = [...catalog.querySelectorAll<HTMLElement>('.card')]
            .filter((c) => set === 'all' || c.dataset.type === set);
          const live = shown.filter((c) => c.dataset.status === 'live').length;
          count.textContent = specimenCountLabel(shown.length, live);
        }
      });
    }
  </script>
)}

<style>
  /* Accent-tinted, matching the row hairlines above it. */
  .catalog { border-bottom: 1px solid var(--line-accent); }
  .count { color: var(--accent); font-size: var(--text-sm); margin-bottom: var(--space-4); }
  /* Filter: pure show/hide of already-rendered DOM (SEO: every card ships
     in the HTML regardless of state). Square geometry per house rules. */
  .filter { display: none; gap: var(--space-2); margin-bottom: var(--space-4); }
  :global(html.js) .filter { display: flex; }
  .filter button {
    font: inherit; font-family: var(--font-smallcaps);
    text-transform: uppercase; letter-spacing: var(--tracking-wide);
    font-size: var(--text-sm); line-height: 1;
    color: var(--mark-muted); background: transparent;
    border: 1px solid var(--line);
    border-radius: 0;
    padding: 0.5em 1em 0.4em;
    cursor: pointer;
    transition: color var(--dur-1) var(--ease-weighted),
                background-color var(--dur-1) var(--ease-weighted),
                border-color var(--dur-1) var(--ease-weighted);
  }
  /* Filled when active, the loud grammar's strongest control state. */
  .filter button[aria-pressed='true'] {
    color: var(--on-accent); background: var(--accent); border-color: var(--accent);
  }
  .catalog[data-filter='experiment'] :global(.card[data-type='study']),
  .catalog[data-filter='study'] :global(.card[data-type='experiment']) { display: none; }
</style>
```

- [ ] **Step 6: Give the card the status attribute the recount reads**

The script above counts live cards by `data-status`, which does not exist yet. In `src/components/SpecimenCard.astro`, change the opening tag:

```astro
<article class="card" data-type={entry.data.type} data-status={status}>
```

- [ ] **Step 7: Check it in a browser, including the announcement**

Open `/lab`. Confirm the count reads `6 specimens · 3 working` or whatever is true today, sitting above the filter row in accent smallcaps. Click Experiments and Studies; the count must change to match what is visible, and clicking All must restore it.

Then confirm the count element is what changed, not the whole region: inspect it and check `aria-live="polite"` is on the element whose `textContent` the handler rewrites. A live region that is replaced rather than updated does not announce.

- [ ] **Step 8: Verify and commit**

Run: `npx vitest run` — expect the suite green, four cases added.
Run: `npx astro check` — expect 0 errors.
Run: `npm run build` — expect clean.

```bash
git add src/lib/specimen-count.ts tests/specimen-count.test.ts src/components/SpecimenCatalog.astro src/components/SpecimenCard.astro
git commit -m "feat(lab): specimen count that stays true under filtering"
```

- [ ] **Step 9: Fix the copy the count contradicts**

`/lab`'s intro reads "Numbered specimens, all working." With BDL-003 forthcoming, the count directly below it would say `6 specimens · 3 working` and contradict it on screen.

**The founder settled this on 08-13-26: the sentence becomes "Numbered specimens."** The claim moves out of the prose and into the count, which is the thing that can actually stay true.

In `src/pages/lab/index.astro`:

```astro
      <p>
        Numbered specimens. Experiments are things we build to
        learn in the open; studies are client work, shown the same way.
      </p>
```

Amend the commit from Step 8 rather than adding a second one; it is the same change.

---

### Task 3: The 1a floor on the home page

**Files:**
- Modify: `src/pages/index.astro` (the loud Lab preview block and its styles)

**Interfaces:**
- Consumes: the `.working` dash pattern from Task 1.

**Read this before implementing.** The home preview already filters to `data.status === 'live'`, so every line it renders is a working specimen and the dash marks all of them equally. It carries no information here. It ships anyway, deliberately: the dash is vocabulary, and the home page is where a visitor meets it before it starts distinguishing things in the catalog. If the founder would rather the home preview stay clean, this is the one task in the plan to drop, and dropping it changes nothing else.

- [ ] **Step 1: Add the dash to each previewed specimen**

The preview line is designation, a middot separator, then the summary. There is no title on it, so the dash goes beside the designation, which is also where the catalog puts it.

In `src/pages/index.astro`, replace the `featured.map` block:

```astro
          {featured.map((entry) => (
            <li class="specimen">
              <span class="designation smallcaps">{entry.data.designation}</span>
              <span class="dash" aria-hidden="true"></span>
              <span class="sep" aria-hidden="true">&middot;</span>
              <span class="spec-summary">{entry.data.summary}</span>
            </li>
          ))}
```

- [ ] **Step 2: Style it to match the catalog**

Add to the page's `<style>` block:

```css
  /* Same working-specimen dash as the Lab catalog. Inside .loud, accent is
     --gf-accent: the loud band runs its own token set. */
  .specimen .dash {
    display: inline-block; width: 0.85em; height: 2px;
    background: var(--gf-accent); margin-left: var(--space-2);
    vertical-align: middle;
  }
```

Note the token. Inside a `.loud` band the accent is `--gf-accent`, not `--accent`; using `--accent` here would be invisible on one of the two faces. This is the trap recorded in the 07-18 handoff.

Both motion tokens this plan leans on are real and already defined: `--dur-1` is 300ms and `--ease-weighted` is `cubic-bezier(0.22, 1, 0.36, 1)`.

- [ ] **Step 3: Check both faces**

Open `/`. The dash must be visible against the green field on both dark and light. Toggle and confirm; this is exactly where `--accent` would have failed.

- [ ] **Step 4: Verify and commit**

Run: `npx astro check` then `npm run build`. Both clean.

```bash
git add src/pages/index.astro
git commit -m "feat(home): working-specimen dash on the Lab preview"
```

---

### Task 4: Stage chrome

Frame 1e, extended to loud per the spec.

**Files:**
- Modify: `src/components/WallLabel.astro`
- Modify: `src/components/SpecimenPlate.astro`
- Modify: `src/layouts/ExperimentLayout.astro:28`

- [ ] **Step 1: Number the how-to-operate steps**

In `src/components/WallLabel.astro`, replace the `<ol>`:

```astro
  <ol>
    {lines.map((line, i) => (
      <li>
        <span class="step smallcaps" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
        {line}
      </li>
    ))}
  </ol>
```

The numerals are `aria-hidden` because the `<ol>` already conveys order to assistive technology; announcing "01" before every step is noise.

Add to its styles, and change the label's border:

```css
  .label {
    /* Bottom-left, resting just above the specimen plate's summary strip. */
    position: fixed; bottom: 4.5rem; left: var(--space-4); z-index: 20;
    max-width: 30ch;
    background: color-mix(in srgb, var(--field) 88%, transparent);
    backdrop-filter: blur(8px);
    border: 1px solid var(--line-accent);
  }
  .step { color: var(--accent); font-size: 0.75em; margin-right: var(--space-2); }
```

- [ ] **Step 2: Bring the plate up to loud**

In `src/components/SpecimenPlate.astro`, add the working dash to the summary, after the `.id` span:

```astro
    <span class="dash" aria-hidden="true"></span>
```

Then change three rules in its styles:

```css
  .plate {
    position: fixed; inset: auto 0 0 0; z-index: 20;
    background: color-mix(in srgb, var(--field) 88%, transparent);
    backdrop-filter: blur(8px);
    border-top: 1px solid var(--line-accent);
  }
  .dash {
    display: inline-block; width: 0.85em; height: 2px;
    background: var(--accent); align-self: center;
  }
  .tech span {
    font-family: var(--font-smallcaps);
    letter-spacing: var(--tracking-wide); text-transform: uppercase;
    font-size: 0.68rem; line-height: 1;
    color: var(--accent);
    border: 1px solid var(--line-accent);
    padding: 0.35em 0.8em 0.25em; margin-right: var(--space-2);
  }
```

A plate only ever renders on a live specimen's page, so the dash needs no condition: `[slug].astro`'s `getStaticPaths` filters to `status === 'live'`.

- [ ] **Step 3: Accent the designation in the hatch**

In `src/layouts/ExperimentLayout.astro`, replace the hatch link:

```astro
    <a class="hatch smallcaps" href="/lab">&larr; Lab &middot; <span class="hatch-id">{designation}</span></a>
```

and add to its styles:

```css
  .hatch-id { color: var(--accent); }
```

- [ ] **Step 4: Look at a stage**

Open a live experiment with a wall label, `/lab/bdl-001`. Confirm on both faces: accent numerals down the how-to steps, accent-tinted borders on both the label and the plate, accent tech chips inside the plate, the designation green in the hatch pill and in the plate summary, and the dash beside the plate title.

Then check the mobile path: at 720px or narrower the wall label drops into normal flow and starts collapsed. Confirm the numerals do not break that layout.

- [ ] **Step 5: Verify and commit**

Run: `npx vitest run`, `npx astro check`, `npm run build`. All clean.

```bash
git add src/components/WallLabel.astro src/components/SpecimenPlate.astro src/layouts/ExperimentLayout.astro
git commit -m "feat(lab): loud accent grammar on stage chrome"
```

---

### Task 5: The study page

Frame 1f, extended to loud per the spec.

**Files:**
- Modify: `src/layouts/StudyLayout.astro:20` and its styles
- Modify: `src/pages/lab/[slug].astro` (study branch markup and styles)

- [ ] **Step 1: Accent the designation in the study hatch**

In `src/layouts/StudyLayout.astro`, same change as the experiment layout:

```astro
    <a class="hatch smallcaps" href="/lab">&larr; Lab &middot; <span class="hatch-id">{designation}</span></a>
```

```css
  .hatch-id { color: var(--accent); }
```

- [ ] **Step 2: Add the live chip and the living-specimen dash**

In `src/pages/lab/[slug].astro`, replace the hero designation line:

```astro
        <p class="designation smallcaps">
          {designation} &middot; Study
          <span class="live smallcaps">live</span>
        </p>
```

and the living-specimen definition:

```astro
        <div><dt class="smallcaps">Living specimen</dt><dd><a href={entry.data.liveUrl}>{new URL(entry.data.liveUrl).hostname}</a><span class="dash" aria-hidden="true"></span></dd></div>
```

Studies only generate a page when `status === 'live'`, so the chip is unconditional for the same reason the plate's dash is.

- [ ] **Step 3: Style them, and take the hairlines to accent**

In the same file's `<style>` block, change the hero and plate rules and add the two new ones:

```css
  .hero { position: relative; min-height: 62vh; display: grid; align-items: end; overflow: hidden; border-bottom: 1px solid var(--line-accent); }
```

```css
  .plate { padding-block: var(--space-4); border-bottom: 1px solid var(--line-accent); }
```

```css
  .plate .tag {
    font-family: var(--font-smallcaps);
    letter-spacing: var(--tracking-wide); text-transform: uppercase;
    font-size: 0.68rem; line-height: 1;
    color: var(--accent); border: 1px solid var(--line-accent);
    padding: 0.35em 0.8em 0.25em; margin-right: var(--space-1); white-space: nowrap;
  }
```

```css
  /* Filled, matching the catalog's type badge: a published study is the most
     definite thing on the page. */
  .live {
    font-size: 0.68rem; line-height: 1;
    color: var(--on-accent); background: var(--accent); border: 1px solid var(--accent);
    padding: 0.35em 0.8em 0.25em; margin-left: var(--space-3); white-space: nowrap;
  }
  .dash {
    display: inline-block; width: 0.85em; height: 2px;
    background: var(--accent); margin-left: var(--space-2); vertical-align: middle;
  }
```

`.plate dt` is already `var(--accent)` and needs no change. The prose blockquote's accent left border is already correct and stays.

- [ ] **Step 4: Look at the study**

Open `/lab/bdl-005`. Confirm on both faces: a filled green "live" chip beside the designation in the hero, accent plate labels, accent tech chips with tinted borders, a dash after the cheerandchatter.com link, and green-tinted rules under the hero and the plate block.

The hero image, the commentary body, and the loud green band must be untouched.

- [ ] **Step 5: Verify and commit**

Run: `npx vitest run`, `npx astro check`, `npm run build`. All clean.

```bash
git add src/layouts/StudyLayout.astro src/pages/lab/[slug].astro
git commit -m "feat(lab): loud accent grammar on the study page"
```

---

### Task 6: The pass, seen whole

Every previous task checked one surface. This one checks that they agree with each other, which is the thing a per-task browser pass cannot catch.

- [ ] **Step 1: Walk the whole Lab on both faces**

`/`, `/lab`, `/lab/experiments`, `/lab/studies`, `/lab/bdl-001`, `/lab/bdl-005`, and `/styleguide`. On dark and on light. Looking for:

- Chip geometry identical everywhere: same `0.68rem`, same `0.35em 0.8em 0.25em` padding, same square corners. Chips that disagree by a pixel are the most likely defect in this pass, because they were written in five separate files. Note that none of them uses the global `.smallcaps` utility, deliberately: it sets `font-size: 0.82em`, and a chip that quietly picks that up instead of `0.68rem` is exactly the drift this step is looking for.
- No neutral `--line` hairline left inside the Lab where its neighbours went accent.
- The dash the same width and weight on the home preview, the catalog, the plate, and the study.

- [ ] **Step 2: Check the styleguide honestly**

`/styleguide` is a Lab entry and inherits these components. Confirm nothing there now contradicts itself, and note anything that does rather than fixing it inline; the styleguide has its own opinions and belongs to the theme pass.

- [ ] **Step 3: Full verification**

Run each, and record the real output rather than the expected one:

```bash
npx vitest run
```
```bash
npx astro check
```
```bash
npm run build
```

- [ ] **Step 4: Update the backlog**

In `docs/lab-backlog.md`, record that the accent pass shipped, that density shipped on 07-30, and that texture and motion remain undrawn. Name the design project `027db389-4762-4e10-9ccd-6ab6a7752652` so the next pass does not have to go looking for it. Note that the chiaroscuro flip is specced but unbuilt, with its own plan.

```bash
git add docs/lab-backlog.md
git commit -m "docs: accent pass shipped, two passes left undrawn"
```

---

### Task 7: The chiaroscuro flip

The Lab always renders the opposite face from the site. Last, and separable: if this task is rejected, Tasks 1 through 6 stand on their own.

**Files:**
- Modify: `src/styles/tokens.css:60` and `:86` (two selectors)
- Modify: `src/components/ThemeBootstrap.astro`
- Modify: `src/components/ThemeToggle.astro:23-29`
- Modify: `src/layouts/ExperimentLayout.astro:23`, `src/layouts/StudyLayout.astro:15`, `src/layouts/BaseLayout.astro:11-15`
- Modify: `src/pages/lab/index.astro`, `src/pages/lab/experiments.astro`, `src/pages/lab/studies.astro` (one prop each)
- Modify: `src/components/BarkField.astro` (two observer filters)

**How it works, in one paragraph.** The server stamps `data-zone="lab"` on `<html>` for every Lab page. The existing pre-paint bootstrap reads that, and writes two attributes: `data-theme` stays exactly what it is today, the site preference and the storage contract, and a new `data-face` carries what should actually be painted, which is the inverse inside the Lab zone and identical everywhere else. The semantic token blocks key off `data-face` instead of `data-theme`. Nothing nests, so nothing needs subtree scoping, and there is no second copy of either palette.

- [ ] **Step 1: Point the token blocks at the face**

In `src/styles/tokens.css`, change two selectors only. Line 60:

```css
/* --- semantic: dark (the default face) ---
   Keyed on data-face, not data-theme: data-theme is what the visitor chose,
   data-face is what this page paints. They differ only inside the Lab, which
   answers the site with the opposite face. Before JS runs neither attribute
   exists and bare :root gives the dark default, exactly as before. */
:root, :root[data-face='dark'] {
```

Line 86:

```css
/* --- semantic: light (the true inverse) --- */
:root[data-face='light'] {
```

Every declaration inside both blocks is untouched. The no-JS `@media (prefers-color-scheme: light)` block at line 117 is untouched too, and keeps its KEEP IN SYNC note.

- [ ] **Step 2: Teach the bootstrap about the zone**

Replace the script in `src/components/ThemeBootstrap.astro`:

```astro
<script is:inline>
  const root = document.documentElement;
  root.classList.add('js');
  let stored = null;
  try { stored = localStorage.getItem('theme'); } catch (e) { /* storage blocked */ }
  const system = matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  const site = stored || system;
  root.dataset.theme = site;
  // Chiaroscuro: the Lab answers the site with the opposite face, so entering
  // it reads as the lights changing. The zone is stamped server-side, so this
  // resolves pre-paint with no flash and without a second palette in CSS.
  root.dataset.face = root.dataset.zone === 'lab'
    ? (site === 'dark' ? 'light' : 'dark')
    : site;
</script>
```

Update the comment above it so the contract line stays honest:

```astro
---
// Shared pre-paint theme bootstrap (single source of truth for the theme
// contract: `data-theme` (what the visitor chose) and `data-face` (what this
// page paints) on <html>, localStorage key 'theme', `.js` marker).
---
```

- [ ] **Step 3: Keep the toggle in step**

Replace the script in `src/components/ThemeToggle.astro`:

```astro
<script>
  document.getElementById('theme-toggle')?.addEventListener('click', () => {
    const root = document.documentElement;
    const next = root.dataset.theme === 'light' ? 'dark' : 'light';
    root.dataset.theme = next;
    // Same inversion rule as the bootstrap. On a Lab page this flips the Lab
    // too, just to the opposite face from the one the visitor picked.
    root.dataset.face = root.dataset.zone === 'lab'
      ? (next === 'dark' ? 'light' : 'dark')
      : next;
    try { localStorage.setItem('theme', next); } catch { /* storage blocked: theme still switches, just not persisted */ }
  });
</script>
```

The dot's position rule at line 20 stays keyed to `data-theme` and must not be changed. The toggle reports the visitor's own choice, not the face of whatever page it happens to be sitting on.

- [ ] **Step 4: Stamp the zone on the Lab's three layouts**

`src/layouts/ExperimentLayout.astro`, line 23:

```astro
<html lang="en" data-zone="lab">
```

`src/layouts/StudyLayout.astro`, line 15:

```astro
<html lang="en" data-zone="lab">
```

`src/layouts/BaseLayout.astro` serves the whole site, so it takes the zone as a prop. Change its props and its html tag:

```astro
interface Props { title: string; description: string; noindex?: boolean; zone?: 'lab' }
const { title, description, noindex = false, zone } = Astro.props;
```

```astro
<html lang="en" data-zone={zone}>
```

An undefined `zone` renders no attribute at all, so every page outside the Lab is byte-identical to today.

- [ ] **Step 5: Pass it from the three Lab catalog pages**

In `src/pages/lab/index.astro`, `src/pages/lab/experiments.astro`, and `src/pages/lab/studies.astro`, add the prop to the `<BaseLayout>` call. For example:

```astro
<BaseLayout
  title="The Lab · Birch Design Lab"
  description="Numbered experiments and client studies in design and web engineering. A specimen catalog."
  zone="lab"
>
```

`/styleguide` is deliberately not in this list. It is a Lab entry by designation but it lives at its own route and its whole purpose is demonstrating the site's own faces; inverting it would make it lie about what it is showing.

- [ ] **Step 6: Widen the bark observers by one attribute**

`BarkField` reads its colour from `document.documentElement`, which is exactly where the face now lives, so its read target is correct with no change. Its two `MutationObserver` filters watch `data-theme` alone, though, and the attribute that now changes what it should paint is `data-face`. In `src/components/BarkField.astro`, at both observer sites (near lines 73 and 116):

```js
attributeFilter: ['data-theme', 'data-face'],
```

In practice both attributes always change together, so this is belt and braces rather than a live bug. Add it anyway: a future page that sets a face without a theme would otherwise leave the bark stranded in the wrong colour, and that failure would be very hard to attribute.

- [ ] **Step 7: Prove there is no flash**

Set the site to light, then navigate from `/` to `/lab`. The Lab must render dark from its very first painted frame. A flash of the site's face before the inversion means the bootstrap is running too late, which would mean it moved out of `<head>`.

Then reload `/lab` directly, hard-refresh, and check again. A direct load is the case a client-side navigation would hide.

- [ ] **Step 8: Walk both directions on both faces**

- `/` dark, `/lab` light. Toggle on `/lab`: the site preference becomes light and the Lab repaints dark.
- Navigate back to `/`: it is light, matching what the toggle now says.
- `/lab/bdl-001` and `/lab/bdl-005`: both inverted, and neither has a toggle of its own, which is correct since only `SiteHeader` renders one.
- The bark on `/` and on `/about` still repaints correctly when toggling. This is the regression most likely to bite, because it is the one thing the flip touches that lives outside the Lab.
- `/styleguide` still follows the site face and does not invert.

- [ ] **Step 9: Check the no-JS path, and confirm it is the accepted behaviour**

Disable JavaScript and load `/lab`. Expect: no inversion, the Lab renders in the system face. This is the outcome the spec accepted rather than solved, and the reason is worth re-reading before anybody decides it is a bug. A CSS-only inversion needs a second full copy of both palettes under the media query, and the file already carries a KEEP IN SYNC warning over the one duplicate it has.

- [ ] **Step 10: Verify and commit**

Run: `npx vitest run` — expect green, unchanged count.
Run: `npx astro check` — expect 0 errors.
Run: `npm run build` — expect clean.

```bash
git add src/styles/tokens.css src/components/ThemeBootstrap.astro src/components/ThemeToggle.astro src/components/BarkField.astro src/layouts/BaseLayout.astro src/layouts/ExperimentLayout.astro src/layouts/StudyLayout.astro src/pages/lab/index.astro src/pages/lab/experiments.astro src/pages/lab/studies.astro
git commit -m "feat(lab): chiaroscuro flip, the Lab answers the site with the opposite face"
```

## Out of scope

- **Texture and motion**, neither of which was ever drawn. Motion has since grown into the Lab presentation-language work in the backlog.
- **Density.** Settled 07-30 and not reopened.
- **The `/lab` intro copy**, which this pass contradicts and deliberately does not rewrite. Founder territory. Raised in Task 2, Step 9.
- **`DeviceBadge`.** Neither classification nor status; muted in every frame.
- **The rest of the BDL-005 theme-pass triage** (shared chrome-free shell, `/lab/studies` empty state). Only the `aria-live` count is picked up here, because the count is where it naturally lives.
