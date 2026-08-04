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
