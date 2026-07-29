## graphify (lives in the vault, not this repo)

The knowledge graph moved to `C:\vault\graphify\birchdesignlab\graphify-out\` (its `.graphify_root` points back at this repo). Nothing graphify-related belongs inside this repo; `graphify-out/` is blanket-gitignored.

- Query: `graphify query "<question>" --graph C:\vault\graphify\birchdesignlab\graphify-out\graph.json` (same `--graph` flag for `path`/`explain`)
- Rebuild after code changes: `graphify update C:\vault\graphify\birchdesignlab` (AST-only, no API cost)

## Shared Memory

- Zettelkasten (cross-project decisions, patterns, infra standards): C:\vault\zettelkasten\
- This project's knowledge graph: C:\vault\graphify\birchdesignlab\

After significant decisions, log an atomic note in C:\vault\zettelkasten\ and link it back to this project.
