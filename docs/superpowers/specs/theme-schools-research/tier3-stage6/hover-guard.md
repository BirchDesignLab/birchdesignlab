# The hover guard

`tests/hover-guard.test.ts` enforces the Stage 6 hover rule: every `:hover`
rule a school ships sits inside a media query that only a mouse or trackpad
matches, so a tap on a phone never leaves a stuck hover colour, and focus is
never gated with it. Written in wave 2 (task 17), tightened in wave 3
(task 18) once the shared business-site CSS was gated at the source.

## What it checks

- **Scope.** Every `.css` file and every `<style>` block of every `.astro`
  file under `src/themes/`, the portal switcher's shadow-root stylesheet
  (the `STYLE` template literal in `src/themes/portal/switcher.ts`, found by
  its name so a stray backtick elsewhere in the file cannot shift it), and
  the three shared files the quiet school ships from the root site:
  `src/styles/base.css`, `src/components/ThemeToggle.astro` and
  `src/components/BarkCredit.astro`.
- **The gate.** A rule whose selector list has a `:hover` passes only when
  some `@media` in its chain is a mouse gate: every top-level comma branch
  carries both `(hover: hover)` and `(pointer: fine)`, no branch starts with
  `not`, and no branch uses a level-4 `or`. Nested `@media` blocks intersect,
  so one gate anywhere in the chain is enough. So
  `(hover: hover) and (pointer: fine), (max-width: 640px)` fails (the second
  branch matches phones), as do `not all and (hover: hover) and (pointer:
  fine)` and `((hover: hover) and (pointer: fine)) or (max-width: 640px)`.
- **Focus stays ungated.** A gated rule that lists `:focus` or
  `:focus-visible` beside the `:hover` fails: split it.
- **No touch-only allowance.** Wave 2 let a `(hover: none)` rule through so
  quiet's `portal.css` could undo the shared hovers on touch. Task 18 gated
  those hovers in the shared files themselves and deleted the undo block, so
  the allowance is gone: a `:hover` inside `(hover: none)` is ungated like
  any other.
- **Exceptions.** `ALLOW` names `file::selector` exceptions with a reason.
  It is empty. An entry whose rule no longer violates (it was gated, split
  or removed) fails the stale-entry test, which is computed from the raw
  violations before exceptions, so a fixed rule cannot leave its exception
  behind.
- **Canaries.** The switcher scan must yield at least 3 hover rules, and the
  whole scan must find more than 60 gated hover rules (75 at task 18). A
  scope that silently shrinks (a moved file, a parser that stops seeing a
  block) fails here instead of passing with nothing checked.

## Sources, not dist

The guard reads the sources, not the built CSS in `dist/`. It needs no
build, so it runs in the first seconds of `npm run verify`, and a failure
names the source file and selector a fix belongs in. The cost is that it
trusts the minifier to keep a media query's meaning; the hovers are plain
`@media` blocks, which lightningcss carries through unchanged (checked in
the task 18 build: `@media (hover:hover) and (pointer:fine){a:hover{...}}`
in the footer chunk). The known lightningcss hazards in this repo are
`animation-timeline` shorthands and an `or` between prefixed and unprefixed
`@supports` names, neither of which a hover gate uses.

## The mutation check (task 18)

Run on the task 18 working tree, then reverted:

1. An ungated rule appended to `src/styles/base.css`:
   `.mutant:hover { color: red; }`. `npx vitest run tests/hover-guard.test.ts`
   failed one test, "every :hover rule is gated and focus is never in its
   list", with
   `"ungated :hover: styles/base.css::.mutant:hover"`
   (1 failed, 7 passed). Reverted: 8 passed.
2. ThemeToggle's gate put back to the old `@media (hover: hover)` (no
   `pointer: fine`). The same test failed with
   `"ungated :hover: components/ThemeToggle.astro::button:hover"`
   (1 failed, 7 passed). Reverted: 8 passed.

The scanner's own failure modes (the comma branch, `not`, `or`,
`(hover: none)`, focus in the list, a quoted brace) and the stale-entry and
switcher-literal checks are self-tests inside the file, so they run on every
gate.
