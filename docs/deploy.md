# Deploying birchdesignlab.com

Host: Cloudflare **Workers** (Workers Builds + Static Assets). Migrated from
Cloudflare Pages 2026-07-29; the contact form was the trigger, as predicted in
`docs/lab-backlog.md`.
Repo: `BirchDesignLab/birchdesignlab`.

## How it works

- `astro build` emits the static site into `dist/` (unchanged; Astro stays
  `output: 'static'`, no adapter).
- `wrangler.jsonc` serves `dist/` as Workers Static Assets and runs
  `worker/index.ts` only for requests that match no file. In practice that is
  `POST /api/contact`: honeypot, then per-IP rate limit (5/min), then
  validation (`src/lib/contact/validate.ts`), then an email to
  `hello@birchdesignlab.com` via the Email Sending binding (from
  `forms@birchdesignlab.com`), then a 303 to `/contact/sent/`.
- 404s serve Astro's `dist/404.html` via `not_found_handling`.

## One-time setup (founder, in dashboard / CLI)

1. **Log wrangler into the account that owns `birchdesignlab.com`**
   (`npx wrangler login`). As of 2026-07-29 the local OAuth token points at the
   Cheer and Chatter account.
2. **Enable Email Sending for the domain** (adds SPF/DKIM DNS records):
   `npx wrangler email sending enable birchdesignlab.com`
   (or dashboard: Compute & AI → Email Service → Email Sending → Onboard
   Domain). Email Routing on `hello@` is already active and untouched;
   sending is a separate onboarding.
3. **Create the Worker from git**: dashboard → Workers & Pages → Create →
   Workers → Import a repository → select the repo.
   - Build command: `npm run build`
   - Deploy command: `npx wrangler deploy`
   (`wrangler.jsonc` supplies everything else.)
4. **Move the custom domain**: remove `birchdesignlab.com` (and `www`) from
   the old Pages project, add them to the Worker (Settings → Domains & Routes).
5. **Delete the Pages project** once the Worker serves the domain.

## Every deploy after that

`git push` to main. Workers Builds runs the build and `wrangler deploy`.
Manual escape hatch: `npm run deploy` (builds, then deploys with local
wrangler auth).

## Local dev

- `npm run dev` — Astro dev server, no Worker (form POSTs will 404).
- `npm run dev:worker` — full stack: builds, then `wrangler dev` serves
  assets + Worker. Local email sends are simulated by miniflare and logged to
  `.wrangler/tmp/email/` (add `"remote": true` to the `send_email` binding to
  send real mail in dev; remove it before committing).
- After changing `wrangler.jsonc` bindings, run `npm run types` to regenerate
  `worker-configuration.d.ts` (committed).

## Node version

Pinned by `.nvmrc` at the repo root to **22.16.0**.

This matters: `package.json` requires `>=20.11`, and `prebuild` runs
`npm run og`, which needs `tsx` plus the native `@napi-rs/canvas` binary.
Workers Builds respects `.nvmrc` the same way Pages did; the pin keeps the
build deterministic regardless of image defaults.

Local dev currently runs Node 24. That one-major gap is deliberate and
harmless for this stack; if it ever stops being harmless, bump `.nvmrc`
rather than unpinning it.
