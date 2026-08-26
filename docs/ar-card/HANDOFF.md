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

**A channel is a page.** Each card gets its own URL, and that URL is a real
file: a three-line page passing a channel label to
`src/components/CardLanding.astro`, which is the landing itself.

| Channel | Path | Label | Status |
|---|---|---|---|
| Tier 2 kraft scatter cards | `/hello` | `kraft` | **Live now** |
| BDL card QR in Cheer and Chatter's break showcase | `/showcase` | `showcase` | **Live now** |
| Tier 1 wood cards | ? | ? | **DELIBERATELY UNDECIDED** |

The tier 1 path gets chosen **at tier 1 production time**, because its QR code
is permanently laser-etched into ~$10/ea wood cards. Choosing early and wrong
burns physical inventory; choosing late costs nothing. Decision gate lives in
`BACKLOG.md`. Adding it is one more page file plus a line in the sitemap filter.

The channel label is what per-channel scan counts group on, so it is stable
even if the file is renamed. Renaming a label splits its history in two.

**Put the trailing slash in the QR payload: `birchdesignlab.com/hello/`, not
`/hello`.** Astro builds directory-format pages, so the slashless form works
but costs a 307 canonicalization hop before the page starts loading. One
redirect is a whole round trip on a phone on 4G, spent before the first byte
of the page, and the budget here is under two seconds. The old rewrite version
wired both forms explicitly; a page has no such hook, so the slash belongs in
the payload instead. This matters most for the wood tier, where the URL is
etched permanently.

**No query parameters, and no rewrites.** Both were removed 08-26-26; see
"Simplification" below for why.

## Perf budgets

- Landing interactive **< 2s on 4G**; critical path **~14KB** (one HTML
  document, styles and script inline, no webfonts, no framework, no
  third-party JS, no GA4).
- AR phase (from the prompt pack, for later): AR payload <= 1.5MB, locked
  60fps on mid-tier Android.

## Decisions this session (08-25-26)

- **The landing lives in `src/components/CardLanding.astro`**, rendered by a
  thin page per channel. Fully standalone: no BaseLayout, no site CSS import,
  no GA4. Token values are mirrored by hand from the dark face of
  `src/styles/tokens.css` (charcoal field, bark-warm mark, moss accent) with a
  comment marking the mirror.
- **AR stubbed, not teased.** `AR_ENABLED: false` in the CONFIG renders no AR
  UI at all. Enabling later = flip the flag and ship a module at
  `AR_MODULE_URL` (`/ar/card-ar.js`) exporting `mount(rootEl, channel)`; the
  mount point (`#ar-root`) and the lazy `import()` are already in place. Since
  every channel renders the same component, turning AR on turns it on for all
  of them at once, which is the point of the component doing the work rather
  than the pages. The module is fetched by URL rather than imported so that
  enabling it never pulls AR's weight into the landing's critical path.
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
  point per scan — index = channel, double = client ts. That is the entire
  payload. No cookies, no IP, no UA, no PII. Fail-silent: always an empty 204.
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

## Simplification (08-26-26)

The first build carried machinery for things that turned out not to exist.
Founder's call, and the right one: do not carry weight for a future that has
not been decided.

- **`?c=` card id: removed.** Kraft scatter cards are identical. There is no
  per-card identity to record, so the parameter labelled nothing.
- **`?s=` medium: removed.** NFC is dropped — the wood cards cannot be sourced
  with chips in them — so every scan is a QR scan and the field had one
  possible value.
- **`public/_redirects` and `/ar-card`: removed.** Serving every channel from
  one file behind a 200 rewrite meant a URL existed that nothing explained,
  which is exactly the confusion it caused. A channel is a page now. The path
  is the file, the channel label is a prop, and nothing is parsed at runtime.
- **NFC batch writer: dropped**, not deferred. Nothing else depended on it.

What survived is what earns its place: the channel label (two real channels
today, a third coming when the wood tier is decided), the beacon, the vCard,
and the AR stub.

## Current state

- Landing **done-with-caveat** (AR stubbed; vCard placeholders pending real
  founder details). Tests: `tests/card-landing.test.ts` (source invariants),
  `tests/beacon-worker.test.ts` (endpoint behavior).
- Two channels live: `/hello` (kraft) and `/showcase` (the Cheer and Chatter
  break-screen QR).
- Beacon endpoint **live with the landing**; scans are counted from first
  deploy. Stats view, rate limiting, and durable storage are still open.
- AR experience, asset pipeline, QA pass: not started — see `BACKLOG.md`.

## Deploy

Repo's normal flow, nothing special: branch, PR, merge to `main`; Cloudflare
Workers Builds builds the merge commit and runs `wrangler deploy`. The
`AR_ANALYTICS` binding rides in `wrangler.jsonc`; `worker-configuration.d.ts`
was regenerated (`npm run types`). Local full-stack check: `npm run
dev:worker`.
