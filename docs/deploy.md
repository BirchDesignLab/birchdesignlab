# Deploying birchdesignlab.com

Host: Cloudflare Pages (domain already on Cloudflare).

## One-time setup (founder, in dashboard)
1. Push this repo to GitHub (private is fine).
2. Cloudflare dashboard → Workers & Pages → Create → Pages →
   Connect to Git → select the repo.
3. Build settings: framework preset **Astro**;
   build command `npm run build`; output directory `dist`.
4. Custom domain: add `birchdesignlab.com` (and `www` redirect).

## Every deploy after that
`git push` to main. Cloudflare builds and publishes automatically.
Preview deployments are created for other branches.
