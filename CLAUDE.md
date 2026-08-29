## graphify (lives in the vault, not this repo)

The knowledge graph moved to `C:\vault\graphify\birchdesignlab\graphify-out\` (its `.graphify_root` points back at this repo). Nothing graphify-related belongs inside this repo; `graphify-out/` is blanket-gitignored.

- Query: `graphify query "<question>" --graph C:\vault\graphify\birchdesignlab\graphify-out\graph.json` (same `--graph` flag for `path`/`explain`)
- Rebuild after code changes: run `graphify update C:\git\birchdesignlab` (the real repo path, NOT the vault path — `update` always treats its path arg as the literal scan root and ignores `.graphify_root`, so pointing it at the vault re-extracts the vault's own exported `.md` notes and corrupts `graph.json`). This writes to the repo-local `graphify-out\` (AST-only, no API cost). Then copy `graph.json`, `graph.html`, `GRAPH_REPORT.md`, `.graphify_labels.json`, `manifest.json` into the vault folder and confirm `graphify-out\.graphify_root` there still reads `C:\git\birchdesignlab` (the copy doesn't touch it, but check anyway).

## Shared Memory

- Zettelkasten (cross-project decisions, patterns, infra standards): C:\vault\zettelkasten\birchdesignlab\
- This project's knowledge graph: C:\vault\graphify\birchdesignlab\

After significant decisions, log an atomic note in C:\vault\zettelkasten\birchdesignlab\ and link it back to this project.

## Scripts stay in the repo, not in temp

Founder direction 2026-08-13, carried over from the Cheer & Chatter repo.

**No scratchpad, no temp directories.** Anything worth running is worth keeping:
one-off scripts, migrations, backfills, rasterisers, ops probes. They go in
`scripts/`, in a subfolder when there is a natural grouping
(`scripts/brand/`, `scripts/og/`, `scripts/migrations/`), and they get
committed.

The reason is insurance. If a run goes wrong, or the same job comes back in six
months, the script and the reasoning behind it still exist. A script that lived
in `%TEMP%` is gone the moment it would have been useful.

**Scope: scripts.** Genuinely disposable working files are fine in a scratch
directory. Commit-message drafts, diff dumps, notes to self. The rule is about
executable work that could ever be run twice, not about every byte written.

## Git workflow

Branch and open a PR for review. Do not commit directly to `main`. Merging to
`main` triggers a production deploy through Cloudflare Workers Builds.


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

## AR card

WebAR business card system: read `docs/ar-card/HANDOFF.md` first; work items live in `docs/lab-backlog.md` under "AR card".
