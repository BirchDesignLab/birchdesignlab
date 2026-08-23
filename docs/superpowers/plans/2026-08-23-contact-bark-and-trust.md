# Contact Bark + Trust Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fill the empty `/contact` right column with the living BDL-001 bark, add a quiet trust line under the form, and extract a reusable `BarkCredit` used by home and `/contact/sent`.

**Architecture:** A two-column grid on `/contact` (form left 60%, bark rail right 40%, reflowing to a bark band above the form on mobile) using one existing `BarkField` instance with `lockAspect`. The home hero's inline bark credit is extracted into `BarkCredit.astro` (type + hover only; each page owns placement) and reused on `/contact/sent`.

**Tech Stack:** Astro components, scoped CSS, the existing `BarkField` WebGL component, `vitest` source-scan guard tests.

## Global Constraints

- Work on branch `feat/contact-bark-trust`; open a PR, never commit to `main` (merge to main = prod deploy).
- Pre-PR gates, all clean: `npx vitest run`, `npx astro check`, `npm run build`.
- `/contact` and `/contact/sent` are business pages: quiet luxury, hold Lighthouse 100s. `BarkField` is already perf-guarded (pause off-screen, 30fps ambient, pixelRatio cap) — add nothing heavier.
- External copy: no emdashes; use middot `·`. Do NOT use an HTML comment containing the words "provisional copy" or "first-draft" — `tests/no-draft-markers.test.ts` fails the build on those. Mark provisional copy in a frontmatter `//` comment instead.
- One `BarkField` instance on `/contact`, `lockAspect` on. Never two instances toggled by CSS.
- Breakpoint: `720px` (repo convention).
- The form markup, its `/api/contact` action, honeypot, and the Worker/validation are UNTOUCHED — only the surrounding layout changes.
- `/contact` (the form page) gets NO bark credit link (conversion focus). Credit link is `/contact/sent` and home only.
- WebGL cannot be composited in the preview pane, so the final visual/GPU check is a founder device pass, not an automated step.

---

### Task 1: Extract `BarkCredit.astro`, refactor the home hero onto it

**Files:**
- Create: `src/components/BarkCredit.astro`
- Modify: `src/pages/index.astro` (frontmatter import; hero anchor at line 28; `.bark-credit` style block ~lines 125-143)
- Test: `tests/contact-bark-credit.test.ts` (create)

**Interfaces:**
- Produces: `BarkCredit.astro` with `Props { href: string; label: string; class?: string }`, rendering `<a class="bark-credit smallcaps [class]" href={href}>{label}</a>`. It owns the hairline type + muted→accent hover; it does NOT position itself. Consumers wrap it in a positioned element (e.g. `.bark-credit-pin`).

- [ ] **Step 1: Write the failing test**

Create `tests/contact-bark-credit.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';

const src = (p: string) =>
  new URL(`../src/${p}`, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const read = (p: string) => readFileSync(src(p), 'utf8');

describe('BarkCredit extraction + home refactor', () => {
  it('BarkCredit component exists and takes href + label props', () => {
    expect(existsSync(src('components/BarkCredit.astro'))).toBe(true);
    const c = read('components/BarkCredit.astro');
    expect(c).toMatch(/href/);
    expect(c).toMatch(/label/);
    // owns the shared hover treatment, not positioning
    expect(c).toMatch(/focus-visible/);
    expect(c).not.toMatch(/position:\s*absolute/);
  });

  it('home hero credits BDL-001 through BarkCredit, not an inline anchor', () => {
    const home = read('pages/index.astro');
    expect(home).toMatch(/import BarkCredit from '\.\.\/components\/BarkCredit\.astro'/);
    expect(home).toMatch(/<BarkCredit[^>]*href="\/lab\/bdl-001"/);
    expect(home).toMatch(/BDL-001 · The Bark Engine, live/);
    // the old inline credit anchor is gone
    expect(home).not.toMatch(/<a class="bark-credit smallcaps"/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/contact-bark-credit.test.ts`
Expected: FAIL — `BarkCredit.astro` does not exist; home still has the inline anchor.

- [ ] **Step 3: Create `src/components/BarkCredit.astro`**

```astro
---
/** Names a living BDL-001 bark field and links to the specimen. Owns the
 *  hairline smallcaps type + muted→accent hover only; each consumer positions
 *  it (the field's hero/rail differs per page) by wrapping it in its own
 *  positioned element. Lifted from the home hero's original inline `.bark-credit`. */
interface Props { href: string; label: string; class?: string }
const { href, label, class: className } = Astro.props;
---
<a class:list={['bark-credit', 'smallcaps', className]} href={href}>{label}</a>

<style>
  .bark-credit {
    z-index: 1;
    color: var(--mark-muted);
    text-decoration: none;
    white-space: nowrap;
    opacity: 0.72;
    transition: opacity var(--dur-2) var(--ease-weighted),
                color var(--dur-2) var(--ease-weighted);
  }
  .bark-credit:hover,
  .bark-credit:focus-visible { opacity: 1; color: var(--accent); }
</style>
```

- [ ] **Step 4: Refactor `src/pages/index.astro`**

Add the import to the frontmatter (after the existing `BarkField` import at the top of the `---` block):

```astro
import BarkCredit from '../components/BarkCredit.astro';
```

Replace the hero credit anchor (line 28):

```astro
    <a class="bark-credit smallcaps" href="/lab/bdl-001">BDL-001 &middot; The Bark Engine, live</a>
```

with a positioned wrapper around the component:

```astro
    <span class="bark-credit-pin"><BarkCredit href="/lab/bdl-001" label="BDL-001 · The Bark Engine, live" /></span>
```

Replace the `.bark-credit` style block (the comment + `.bark-credit { … }` + `:hover,:focus-visible`, ~lines 125-143) with just the positioning wrapper (the type + hover now live in the component):

```css
  /* Quiet signature: the hero bark is BDL-001 rendered live, credited by the
     shared BarkCredit component. This only pins the credit low-centre over the
     hero; the type + hover treatment live in BarkCredit.astro. */
  .bark-credit-pin {
    position: absolute;
    left: 50%;
    bottom: var(--space-4);
    transform: translateX(-50%);
    z-index: 1;
  }
```

- [ ] **Step 5: Run the guard test + the full gates**

Run: `npx vitest run tests/contact-bark-credit.test.ts`
Expected: PASS (both `it`s).

Run: `npx astro check && npm run build`
Expected: 0 errors; build completes; `/index.html` builds.

- [ ] **Step 6: Commit**

```bash
git add src/components/BarkCredit.astro src/pages/index.astro tests/contact-bark-credit.test.ts
git commit -m "refactor(brand): extract BarkCredit, refactor home hero onto it"
```

---

### Task 2: Credit BDL-001 on `/contact/sent`

**Files:**
- Modify: `src/pages/contact/sent.astro` (frontmatter import; `.hero` block lines 12-15; add `.bark-credit-pin` style)
- Test: `tests/contact-bark-credit.test.ts` (add one `it`)

**Interfaces:**
- Consumes: `BarkCredit` from Task 1.

- [ ] **Step 1: Add the failing test**

Append inside the top-level `describe` (or add a new `describe`) in `tests/contact-bark-credit.test.ts`:

```ts
  it('/contact/sent credits BDL-001 with a link', () => {
    const sent = read('pages/contact/sent.astro');
    expect(sent).toMatch(/import BarkCredit from '\.\.\/\.\.\/components\/BarkCredit\.astro'/);
    expect(sent).toMatch(/<BarkCredit[^>]*href="\/lab\/bdl-001"/);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/contact-bark-credit.test.ts -t "contact/sent credits"`
Expected: FAIL — sent.astro does not import or use BarkCredit.

- [ ] **Step 3: Modify `src/pages/contact/sent.astro`**

Add to the frontmatter (after the `BarkField` import):

```astro
import BarkCredit from '../../components/BarkCredit.astro';
```

Add the pinned credit inside the `.hero` header (after the `<h1>Sent.</h1>` line):

```astro
    <span class="bark-credit-pin"><BarkCredit href="/lab/bdl-001" label="BDL-001 · The Bark Engine, live" /></span>
```

Add the positioning wrapper style inside the page's `<style>` block (after the `.hero h1` rule):

```css
  .bark-credit-pin {
    position: absolute;
    left: 50%;
    bottom: var(--space-4);
    transform: translateX(-50%);
    z-index: 1;
  }
```

- [ ] **Step 4: Run the guard test + gates**

Run: `npx vitest run tests/contact-bark-credit.test.ts`
Expected: PASS (all three `it`s).

Run: `npx astro check && npm run build`
Expected: 0 errors; `/contact/sent/index.html` builds.

- [ ] **Step 5: Commit**

```bash
git add src/pages/contact/sent.astro tests/contact-bark-credit.test.ts
git commit -m "feat(contact): credit BDL-001 on the sent page bark hero"
```

---

### Task 3: `/contact` two-column layout — bark rail + trust line

**Files:**
- Modify: `src/pages/contact.astro` (frontmatter: add `BarkField` import + provisional-copy note; markup: wrap intro+form in a grid with a bark rail, add the trust line; styles: grid + rail + trust)
- Test: `tests/contact-bark-credit.test.ts` (add contact `it`)

**Interfaces:**
- Consumes: `BarkField` (existing), props used: `live`, `lockAspect`, `density`.

- [ ] **Step 1: Add the failing test**

Append to `tests/contact-bark-credit.test.ts`:

```ts
  it('/contact has the living bark + trust line, but no BDL-001 credit link', () => {
    const contact = read('pages/contact.astro');
    expect(contact).toMatch(/<BarkField[^>]*lockAspect/);          // living bark present
    expect(contact).toMatch(/Mississippi Gulf Coast/);            // trust line (provisional)
    expect(contact).toMatch(/A reply within one business day/);
    expect(contact).not.toMatch(/\/lab\/bdl-001/);                 // no credit off the form page
    expect(contact).not.toMatch(/BarkCredit/);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/contact-bark-credit.test.ts -t "living bark"`
Expected: FAIL — contact.astro has no BarkField or trust line yet.

- [ ] **Step 3: Rewrite the first section of `src/pages/contact.astro`**

Add to the frontmatter (below the existing `const email` line):

```astro
import BarkField from '../components/BarkField.astro';
// Trust line copy is provisional; founder finalises the wording + reply promise live.
```

Replace the current first `<section class="wrap"> … </section>` (the one holding `.intro` and the form) with a two-column grid whose source order is bark-first (so mobile reads bark → form), reordered on desktop to put the form left and the bark rail right:

```astro
  <section class="contact wrap">
    <div class="bark-rail">
      <BarkField live lockAspect density={300} />
    </div>
    <div class="form-col">
      <header class="intro">
        <p class="smallcaps kicker">Contact</p>
        <h1>Start a conversation</h1>
        <p class="subline">Tell us what you're trying to build, fix, or grow. Plain English is the house language.</p>
      </header>

      <!-- No-JS-first: a plain POST the Worker answers with a redirect to
           /contact/sent. The `company` field is the honeypot; humans never see
           it, bots autofill it and get silently dropped (worker/index.ts). -->
      <form class="contact-form" method="post" action="/api/contact">
        <div class="field">
          <label for="cf-name">Name</label>
          <input id="cf-name" name="name" type="text" required maxlength="200" autocomplete="name" />
        </div>
        <div class="field">
          <label for="cf-email">Email</label>
          <input id="cf-email" name="email" type="email" required maxlength="254" autocomplete="email" />
        </div>
        <div class="field">
          <label for="cf-message">What are you working on?</label>
          <textarea id="cf-message" name="message" required maxlength="5000" rows="7"></textarea>
        </div>
        <div class="field hp" aria-hidden="true">
          <label for="cf-company">Leave this field empty</label>
          <input id="cf-company" name="company" type="text" tabindex="-1" autocomplete="off" />
        </div>
        <button class="cta-engraved" type="submit"
          ><span class="fill" aria-hidden="true"></span><span class="lbl">Send it</span></button>
      </form>

      <p class="trust">Mississippi Gulf Coast <span aria-hidden="true">&middot;</span> A reply within one business day.</p>
    </div>
  </section>
```

Leave the second `<section class="loud"> … </section>` (the email alternative) exactly as it is.

- [ ] **Step 4: Replace the layout styles in `src/pages/contact.astro`**

Keep the existing `.intro`, `.kicker`, `.contact-form`, `.field`, `.hp`, and `.loud`/`.invite`/`.mail`/`.fine` rules. Add the grid, rail, and trust rules (put them at the top of the `<style>` block). Change the `.contact-form` rule so it no longer sets its own bottom padding (the grid gap now owns spacing):

```css
  /* Two columns on desktop: form left, living bark rail anchored right. Source
     order is bark-first so mobile reads bark band -> form; `order` swaps them on
     desktop. Quiet luxury: the form keeps its comfortable measure and is not
     stretched to fill its column. */
  .contact {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-5);
    padding-block: var(--space-6) var(--space-6);
  }
  .bark-rail { order: 1; position: relative; min-height: 34vh; overflow: hidden; }
  .form-col { order: 2; }
  @media (min-width: 720px) {
    .contact { grid-template-columns: 60% 40%; gap: var(--space-6); align-items: stretch; }
    .form-col { order: 1; }
    .bark-rail { order: 2; min-height: 0; }   /* stretch to the form column's height */
  }

  .trust {
    margin-top: var(--space-4);
    color: var(--mark-muted); font-size: var(--text-sm);
  }
```

And update the existing `.contact-form` rule — remove its `padding-block` so it reads:

```css
  .contact-form {
    display: grid; gap: var(--space-4);
    max-width: 44rem;
  }
```

Also update the existing `.intro` rule to drop its top padding (the grid now owns the block padding), changing `padding-block: var(--space-6) var(--space-5);` to:

```css
  .intro { padding-block: 0 var(--space-5); max-width: var(--measure-wide); }
```

- [ ] **Step 5: Run the guard test + gates**

Run: `npx vitest run tests/contact-bark-credit.test.ts`
Expected: PASS (all four `it`s).

Run: `npx astro check && npm run build`
Expected: 0 errors; `/contact/index.html` builds.

- [ ] **Step 6: Commit**

```bash
git add src/pages/contact.astro tests/contact-bark-credit.test.ts
git commit -m "feat(contact): living bark rail + on-page trust line"
```

---

### Task 4: Full gates, push, open PR, hand off for device validation

**Files:** none (verification + delivery).

- [ ] **Step 1: Run the full pre-PR gate**

Run: `npx vitest run`
Expected: PASS — all suites, including the untouched `contact-worker` / `contact-validate` tests and the new `contact-bark-credit` tests.

Run: `npx astro check`
Expected: 0 errors.

Run: `npm run build`
Expected: build completes; `/contact/index.html`, `/contact/sent/index.html`, `/index.html` all built.

- [ ] **Step 2: Confirm the built pages (dist grep)**

Run: `grep -o "Mississippi Gulf Coast" dist/contact/index.html && grep -c "lab/bdl-001" dist/contact/index.html`
Expected: the trust line prints; the credit-link count is `0` on `/contact`.

Run: `grep -c "lab/bdl-001" dist/contact/sent/index.html dist/index.html`
Expected: `1` (or more) on each — the credit survived on sent and home.

- [ ] **Step 3: Push and open the PR**

```bash
git push -u origin feat/contact-bark-trust
gh pr create --base main --head feat/contact-bark-trust \
  --title "feat(contact): living bark rail + on-page trust; reusable BarkCredit" \
  --body "Implements docs/superpowers/specs/2026-08-23-contact-bark-and-trust-design.md. Closes the /contact design note (#11). Device pass pending: bark reads in rail + band (no streaking), form posts, sent credit links, GPU sane — preview cannot composite WebGL."
```

- [ ] **Step 4: Hand off for the device pass**

The founder validates on a real device (preview cannot composite WebGL): the bark grain reads in both the tall desktop rail and the short mobile band with no streaking; `density` (300) and the mobile band height (34vh) look right — tune via the `density` prop and `.bark-rail` `min-height` if not; the form still posts; `/contact/sent` credit links to `/lab/bdl-001`; the home hero credit is visually unchanged; GPU draw is sane on the phone.

---

## Self-Review

**Spec coverage:**
- Layout (form left 60% / bark rail 40% anchored right, mobile band, 720px) → Task 3. ✓
- Trust line under form, provisional copy, no emdash → Task 3 (frontmatter note avoids the draft-marker gate). ✓
- Bark reorientation: one instance, `lockAspect`, density ~300, retune fallback noted in spec (not needed unless device pass shows streaking) → Task 3. ✓
- `/contact/sent` BDL-001 link → Task 2. ✓
- `/contact` no credit → Task 3 guard asserts absence. ✓
- Reusable `BarkCredit`, home refactored → Task 1. ✓
- Loud band unchanged, form/Worker untouched → Task 3 leaves the second section and the form fields verbatim. ✓
- Non-goals (About credit, footer geography, testimonial) → not in any task. ✓
- Verification: vitest + astro check + build + dist grep + device pass → Task 4. ✓

**Placeholder scan:** No TBD/TODO; all code blocks are complete; the one provisional item (trust copy) is real text marked by a frontmatter comment, not a placeholder. ✓

**Type consistency:** `BarkCredit` props `{ href, label, class? }` are used identically in Tasks 1 and 2. `.bark-credit-pin` wrapper class is consistent across home and sent. `.bark-rail` / `.form-col` / `.rail-field` / `.trust` names are consistent within Task 3 and its test. ✓
