# AR Card · HANDOFF

Session context for the WebAR business card system. Every session working on
this project reads this file and `BACKLOG.md` first and updates both last.
Companion design reference: `docs/bdl-ar-card-prompt-pack-v4.md` (untracked,
founder working doc) carries the AR-phase constraints (multi-target `.mind`,
tracking-target rules, vendoring policy).

## Purpose

WebAR business card system: a physical card (QR or NFC) opens a URL on this
site; the card artwork is a MindAR image target and a 3D logo rises out of the
card. **This session (08-25-26) shipped the interim landing page** — the
permanent page every channel resolves to, built before the AR experience
exists so the AR app later *adds to it and replaces nothing*.

## URL scheme

**Path = channel label.** One physical page, many channel paths, each wired as
a one-line 200 rewrite in `public/_redirects`.

| Channel | Path | Status |
|---|---|---|
| Tier 2 kraft scatter cards | `/hello` | **Live now** |
| Tier 1 wood cards | ? | **DELIBERATELY UNDECIDED** |
| Any digital channel | ? | **DELIBERATELY UNDECIDED** |

The tier 1 path gets chosen **at tier 1 production time**, because its QR code
is permanently laser-etched into ~$10/ea wood cards, while NFC chips stay
rewritable. Choosing early and wrong burns physical inventory; choosing late
costs nothing. Decision gate lives in `BACKLOG.md`.

The page parses its channel generically off `location.pathname` (slashes
trimmed, empty = `root`), so a future channel is a rewrite line and zero code
changes. Unknown paths and the canonical `/ar-card/` itself resolve to the
same page and are simply logged under their own channel label.

**Query params:** `?c=` card id, `?s=` medium. Parsed on load, carried in the
beacon, otherwise unused today.

## Perf budgets

- Landing interactive **< 2s on 4G**; critical path **~14KB** (one HTML
  document, styles and script inline, no webfonts, no framework, no
  third-party JS, no GA4).
- AR phase (from the prompt pack, for later): AR payload <= 1.5MB, locked
  60fps on mid-tier Android.

## Decisions this session (08-25-26)

- **Page lives at `src/pages/ar-card.astro`** — an Astro page (so `astro
  check`, the build, and the test suite cover it) but fully standalone: no
  BaseLayout, no site CSS import, no GA4. Token values are mirrored by hand
  from the dark face of `src/styles/tokens.css` (charcoal field, bark-warm
  mark, moss accent) with a comment marking the mirror. Builds to
  `dist/ar-card/index.html`.
- **Rewrites wired from the repo** via `public/_redirects` — Workers Static
  Assets supports the file natively, including 200 rewrites (URL stays on the
  channel path). No dashboard changes needed. Caveat for later: `_redirects`
  rules do NOT apply to worker-served responses, but only `/api/*` is
  worker-first here, so channel paths are always asset-served.
- **`/hello` and `/hello/` both wired** — QR payloads will omit the trailing
  slash; both forms rewrite so no canonicalization hop ever shows a 404.
- **AR stubbed, not teased.** `AR_ENABLED: false` in the page's CONFIG renders
  no AR UI at all. Enabling later = flip the flag and ship a module at
  `AR_MODULE_URL` exporting `mount(rootEl, {channel, c, s})`; the mount point
  (`#ar-root`) and lazy `import()` are already in place.
- **vCard is generated client-side** as a Blob download, with a no-JS `data:`
  URI fallback rendered at build time. CRLF line endings (iOS is strict).
  Contact fields sit in the page's CONFIG object, **placeholder-marked**: the
  studio identity (name/company/email/url) is live-safe, but the founder fills
  name/title/phone with real values before any card is printed or etched.
  Empty fields are omitted from the vCard.
- **vCard building lives in `src/lib/vcard.ts`** (unit-tested in
  `tests/vcard.test.ts`), after the pre-merge adversarial review confirmed two
  defects in the inline first draft: no RFC 2426 escaping (a founder-filled
  title like "Founder, Principal" would silently corrupt the card at exactly
  the moment the URL is committed to physical inventory) and the whole display
  name landing in N's given-name slot (surname sorting breaks once a personal
  name goes in). The builder now escapes every value, puts the org identity in
  the family slot with `X-ABShowAs:COMPANY`, and splits a personal name on its
  last space when `card.isOrg` is set false.
- **Beacon endpoint stood up now** (chose the "small job" fork): `POST
  /api/beacon` in `worker/index.ts` writes one Workers Analytics Engine data
  point per scan — index = channel, blobs = [path, c, s], double = client ts.
  No cookies, no IP, no UA, no PII. Fail-silent contract: always an empty 204.
  Binding `AR_ANALYTICS`, dataset `ar_card_scans`, auto-created on first
  write, currently unbilled. **Caveat: AE retention is ~3 months** — fine for
  the per-tier comparison that matters, but the durable-storage decision is a
  backlog item for the real analytics task. Query anytime via the AE SQL API
  (`SELECT index1, count() FROM ar_card_scans GROUP BY index1`, remember
  `_sample_interval` weighting for exact counts).
- **noindex + sitemap-excluded.** The landing is reached by scanning a card,
  not by search. OG/Twitter meta still ship (reusing `/og/home.png`) so a
  shared link unfurls cleanly.
- **No GA4 on this page** — the site's GA4 stays on business pages; the card
  landing's only analytics is the first-party beacon.

## Current state

- Landing **done-with-caveat** (AR stubbed; vCard placeholders pending real
  founder details). Tests: `tests/ar-card-landing.test.ts` (source
  invariants), `tests/beacon-worker.test.ts` (endpoint behavior).
- Beacon endpoint **live with the landing**; scans are counted from first
  deploy. Stats view, rate limiting, and durable storage are still open.
- AR experience, asset pipeline, NFC writer, QA pass: not started — see
  `BACKLOG.md`.

## Deploy

Repo's normal flow, nothing special: branch, PR, merge to `main`; Cloudflare
Workers Builds builds the merge commit and runs `wrangler deploy`. The
`AR_ANALYTICS` binding rides in `wrangler.jsonc`; `worker-configuration.d.ts`
was regenerated (`npm run types`). Local full-stack check: `npm run
dev:worker`.
