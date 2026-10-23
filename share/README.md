# share.birchdesignlab.com

A static, assets-only Cloudflare Worker (`bdl-share`) for showing client pieces
temporarily: a link to send someone, not part of the site. Separate from the
main site Worker: deployed by hand, never by Workers Builds, and merging to
`main` does not touch it.

## What is in git and what is not

This repo is **public**, so the client pages the Worker serves never go in it.

| Path | In git | What it is |
|---|---|---|
| `wrangler.jsonc` | yes | Worker config: name `bdl-share`, custom domain `share.birchdesignlab.com`, `workers_dev` off. `account_id` is pinned so a multi-account `wrangler login` cannot deploy it to the wrong account (it is the account that holds the birchdesignlab.com zone). |
| `build.mjs` | yes | Wraps artifact-style HTML bodies into full pages with `noindex` and copies them into `public/`. |
| `public/_headers`, `public/robots.txt`, `public/404.html` | yes | Site-wide `noindex`/`nosniff` headers, a disallow-all robots file, and the not-found page. Hand-written. |
| `public/<client>/...` | **no** (gitignored) | The pages being shared. They exist only on this machine and in the deployed Worker. |
| `.wrangler/` | no | Wrangler's local cache. |

## What it serves (as of 10-22-26)

- `/cheer-chatter/data-map/`: Cheer & Chatter data map (10-06-26). Built by
  `build.mjs` from the Cheer & Chatter repo
  (`C:/git/websites/cheerAndChatter/files/docs/data-map/`), so the source of
  truth is that repo. `build.mjs` only runs on a machine with that repo at that
  path.
- `/query-module/design-overview/`: Query Module design overview (10-19-26).
  **Not** built by `build.mjs`: copied into `public/` by hand from another
  session, so this machine's `share/public/` is its only local copy here.
  Record its source here when known.

## Deploy, add, remove

```bash
node share/build.mjs
```

```bash
npx wrangler deploy --config share/wrangler.jsonc
```

- **Add a page:** add an entry to `PAGES` in `build.mjs` (source in its own
  repo, never here), build, deploy. A hand-copied page goes straight into
  `public/<client>/<page>/`; note it in the list above.
- **Take a page down:** delete its folder from `public/` and deploy again.
  Deploys upload the whole `public/` folder, so anything deleted locally is gone
  from the site.
- **Remove the whole Worker:** `npx wrangler delete --config share/wrangler.jsonc`.

Because the pages are not in git, a fresh clone **cannot** redeploy the current
site: a deploy from a clone would publish only the 404, headers and robots
files and take every shared page down. Deploy from this machine, or rebuild the
pages first.
