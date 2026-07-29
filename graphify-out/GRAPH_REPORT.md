# Graph Report - birchdesignlab  (2026-07-29)

## Corpus Check
- 108 files · ~66,828 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 30 nodes · 28 edges · 5 communities (3 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3bbaa105`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Handoff 2026-07-18 — design-system port complete & deployed
- ../layouts/BaseLayout.astro
- Handoff: porting the design-system passes into the Astro repo
- What shipped
- CLAUDE.md

## God Nodes (most connected - your core abstractions)
1. `Handoff: porting the design-system passes into the Astro repo` - 7 edges
2. `Handoff 2026-07-18 — design-system port complete & deployed` - 6 edges
3. `What shipped` - 6 edges
4. `../layouts/BaseLayout.astro` - 4 edges
5. `Parked (both in `docs/lab-backlog.md`, sequenced AFTER the Lab pass)` - 2 edges
6. `../components/BarkField.astro` - 2 edges
7. `Shared Memory` - 1 edges
8. `Read first: where the repo is authoritative` - 1 edges
9. `Kit-only scaffolding — do not port` - 1 edges
10. `Pass 1 — tokens (`src/styles/tokens.css`)` - 1 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (5 total, 2 thin omitted)

### Community 0 - "Handoff 2026-07-18 — design-system port complete & deployed"
Cohesion: 0.25
Nodes (6): Gotchas / decisions worth carrying, Handoff 2026-07-18 — design-system port complete & deployed, `lockAspect` — BUILT 2026-07-19, Not touched (deferred to the Lab pass), Parked (both in `docs/lab-backlog.md`, sequenced AFTER the Lab pass), Repo-authoritative — do NOT overwrite (unchanged reminder)

### Community 2 - "Handoff: porting the design-system passes into the Astro repo"
Cohesion: 0.29
Nodes (7): Handoff: porting the design-system passes into the Astro repo, Kit-only scaffolding — do not port, Pass 1 — tokens (`src/styles/tokens.css`), Pass 2 — shared primitives + components, Pass 3 — per-page, Read first: where the repo is authoritative, Rules to carry into your own docs

### Community 3 - "What shipped"
Cohesion: 0.33
Nodes (6): Header mobile, Pass 1 — tokens (`src/styles/tokens.css`), Pass 2 — primitives (`base.css`) + components, Pass 3 — pages, Type fixes, What shipped

## Knowledge Gaps
- **16 isolated node(s):** `Shared Memory`, `Read first: where the repo is authoritative`, `Kit-only scaffolding — do not port`, `Pass 1 — tokens (`src/styles/tokens.css`)`, `Pass 2 — shared primitives + components` (+11 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Handoff 2026-07-18 — design-system port complete & deployed` connect `Handoff 2026-07-18 — design-system port complete & deployed` to `What shipped`?**
  _High betweenness centrality (0.340) - this node is a cross-community bridge._
- **Why does `Handoff: porting the design-system passes into the Astro repo` connect `Handoff: porting the design-system passes into the Astro repo` to `Handoff 2026-07-18 — design-system port complete & deployed`?**
  _High betweenness centrality (0.244) - this node is a cross-community bridge._
- **Why does `What shipped` connect `What shipped` to `Handoff 2026-07-18 — design-system port complete & deployed`?**
  _High betweenness centrality (0.209) - this node is a cross-community bridge._
- **What connects `Shared Memory`, `Read first: where the repo is authoritative`, `Kit-only scaffolding — do not port` to the rest of the system?**
  _16 weakly-connected nodes found - possible documentation gaps or missing edges._