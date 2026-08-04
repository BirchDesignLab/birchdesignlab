## graphify (lives in the vault, not this repo)

The knowledge graph moved to `C:\vault\graphify\birchdesignlab\graphify-out\` (its `.graphify_root` points back at this repo). Nothing graphify-related belongs inside this repo; `graphify-out/` is blanket-gitignored.

- Query: `graphify query "<question>" --graph C:\vault\graphify\birchdesignlab\graphify-out\graph.json` (same `--graph` flag for `path`/`explain`)
- Rebuild after code changes: `graphify update C:\vault\graphify\birchdesignlab` (AST-only, no API cost)

## Shared Memory

- Zettelkasten (cross-project decisions, patterns, infra standards): C:\vault\zettelkasten\
- This project's knowledge graph: C:\vault\graphify\birchdesignlab\

After significant decisions, log an atomic note in C:\vault\zettelkasten\ and link it back to this project.

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

## Dependencies: newest stable and secure

Founder direction 2026-08-04. The standing pattern is **newest stable, and no
sitting on known advisories**. Not bleeding edge, not frozen.

- **Stable, not latest.** Release candidates, betas, and `next` tags stay out.
  A major that shipped last week is fine; a major that shipped last week and
  broke three integrations is not. Check that the integrations this repo uses
  (`@astrojs/svelte`, `@astrojs/sitemap`) have compatible releases first.
- **Upgrade deliberately, never reflexively.** Never run `npm audit fix --force`
  casually; it happily jumps majors. Each major upgrade is its own PR with its
  own verification.
- **`npm audit` findings get triaged, not obeyed.** Check whether the advisory
  is actually reachable in this codebase before treating it as urgent. This is a
  static site that renders no untrusted data, so most advisories about XSS in
  templating are unreachable here. Record the reasoning; a red number that has
  been reasoned about is not the same as one that has been ignored.
- **Non-major fixes are free.** Plain `npm audit fix` can run any time.
- **Verification for a major:** `npx vitest run`, `npx astro check`, and
  `npm run build` all clean, plus a real browser pass. Tests catch structural
  breakage; they do not catch rendering and CSS drift.
- **Do not upgrade majors during a launch run-up** unless the advisory is
  genuinely reachable. Reversibility is the point: revert the commit, redeploy.

Current queue and the reasoning behind it live in `docs/lab-backlog.md`.
