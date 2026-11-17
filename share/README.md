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

## What it serves

Not listed here: this repo is public, so the client paths stay off it. The
current list, with each page's source, lives in `docs/private/share-pages.md`
on the deploying machine (gitignored), and the pages `build.mjs` generates are
listed in `share/pages.local.json` (gitignored, same machine).

## Deploy, add, remove

```bash
node share/build.mjs
```

```bash
npx wrangler deploy --config share/wrangler.jsonc
```

- **Add a page:** add an entry to `share/pages.local.json` (`src`, `out`,
  optional `with`; source in its own repo, never here), build, deploy. A
  hand-copied page goes straight into `public/<client>/<page>/`; note it in
  the private list.
- **Take a page down:** delete its folder from `public/` and deploy again.
  Deploys upload the whole `public/` folder, so anything deleted locally is gone
  from the site.
- **Remove the whole Worker:** `npx wrangler delete --config share/wrangler.jsonc`.

Because the pages are not in git, a fresh clone **cannot** redeploy the current
site: a deploy from a clone would publish only the 404, headers and robots
files and take every shared page down. Deploy from this machine, or rebuild the
pages first.
