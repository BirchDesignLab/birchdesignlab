# Deploying birchdesignlab.com

Host: Cloudflare **Pages** (domain already on Cloudflare).
Repo: `BirchDesignLab/birchdesignlab` (moved from `THobbs23/`; the old URL still
redirects, but the remote should point at the new one).

## One-time setup (founder, in dashboard)
1. Push this repo to GitHub (private is fine).
2. Cloudflare dashboard → Workers & Pages → Create → Pages →
   Connect to Git → select the repo.
3. Build settings:
   - Framework preset: **None** is correct as long as the two fields below are
     right. The Astro preset only prefills them; it does nothing else.
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: leave empty (`package.json` is at the repo root).
4. Custom domain: add `birchdesignlab.com` (and `www` redirect).

## Node version
Pinned by `.nvmrc` at the repo root to **22.16.0**.

This matters: `package.json` requires `>=20.11`, and `prebuild` runs
`npm run og`, which needs `tsx` plus the native `@napi-rs/canvas` binary. On
Cloudflare's build image v3 the Node default is 22.16.0 (fine), but on v2 it is
18.17.1, which would fail the engines check and take the whole build down. The
pin makes it deterministic regardless of which image the project lands on, and
22.16.0 is the v3 preinstalled version so there is no extra download step.

Local dev currently runs Node 24. That one-major gap is deliberate and harmless
for this stack; if it ever stops being harmless, bump `.nvmrc` rather than
unpinning it.

## Every deploy after that
`git push` to main. Cloudflare builds and publishes automatically.
Preview deployments are created for other branches.

## Known future change: Pages → Workers
The contact form will force this. See `docs/lab-backlog.md` for the details and
the trigger.
