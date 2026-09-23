# Theme schools: planning handoff (session 09-13-26)

Planning only. No code, no branch, no commits yet. Founder's original plan prompt was critiqued in tiers, then reshaped by founder decisions below. **Decisions here override the original plan prompt.** Do not relitigate them.

Supporting data in this folder (recovered from workflow journals):
- `tier1-merged-findings.json` — 52 deduped critique findings (F001–F052), claims, evidence, recommendations.
- `tier2-verdicts.json` — 17 refuter verdicts, each checked against Astro 5.18.2 and 7.2.9 source.
- `fonts-survey.json` — @fontsource lookups for 7 schools (every candidate exists with latin subset).

Prior research (approach B, parked, for the spine/demos): `C:/git/demo-magnolia-mane-salon/docs/superpowers/specs/09-13-26-theme-packs-approach-b-note.md`.

## Founder decisions

### Architecture
1. **Portal architecture.** Root pages (`/`, `/about/`, `/services/`, `/contact/`, `/contact/sent/`) stay visually untouched; only change is rendering copy from a content collection (guard: built `dist/` text identical before/after). The themed site is entered through the Lab: **BDL-010**. ClientRouter, switcher, per-theme visuals live only on `/t/<theme>/…`.
2. **All four business pages plus contact/sent exist under every theme.** Home, about, services, contact change when you enter the portal.
3. **One attribute contract, migrated repo-wide:** `data-theme` = school, `data-scheme` = light|dark. Today CSS keys on `data-face` (F003: three attributes, nine files, zero tests). Fate of `data-face` decided in spec.
4. **BDL-010 entry form deferred** until one or two themes are toggleable (hall page vs href straight to `/t/quiet/`).
5. **BDL-011 = study type**, the school writeups. Each school card deep-links to `/t/<school>/`. Schema `client` field needs a tweak for a self-study.
6. **No persistent WebGL stage.** Each theme owns its background, created on `astro:page-load`, destroyed on `astro:before-swap`. BarkField only in quiet.
7. **Constants across schools:** text content, links, contact. Nothing visual is constant; wordmark set in each theme's type; locked mark optional. Lab untouched by themes; leaving to the Lab leaves the theme.
8. **SEO:** `/t/` routes noindex + excluded from sitemap (the `/hello` pattern). No cross-canonical. No JSON-LD. OG = lab-experiment card via existing `ogImage` override.
9. **Contact works in every theme**: Worker redirect targets become theme-aware (allowlisted), per-theme sent state (F006, F007).
10. **F016 fix: one route file per theme**, `src/pages/t/<theme>/[...page].astro`, importing only that theme's components. Registry imports only `meta.ts` files. Guard: dist test that each `/t/<theme>/` page links only its own stylesheets. (Pre-existing same bug on `/lab/[slug]`: backlog it, out of scope.)

### Schools
11. **Y2K and Vaporwave are two themes.** Fourteen confirmed; 90s zine and wabi-sabi still undecided.
12. **First tranche of six**, registry open: Vaporwave, Grandmillennial, Swiss-modern, Bauhaus, Cottagecore, Glassmorphism. Second tranche later: Memphis, Art Deco, Art Nouveau, Mid-century, Neo-brutalist, Cyberpunk, Y2K. Build order note: build 2 light-native ornament-heavy, build 3 Glassmorphism, Swiss last.
13. **Distinctness:** `meta.ts` requires `signature` (one sentence a non-designer names in five seconds) and `forbids` (motifs a neighbour owns). No lint.
14. **Multilingual not required here.** Latin-only fonts. Art Deco beats vi coverage.
15. **Font picks** (survey table below). Two corrections **deferred to theme build time**: Art Deco body cannot be Cinzel (caps-only); Vaporwave heading Bodoni Moda collides with Grandmillennial's Playfair (both Didones), candidate swap Libre Caslon Display.

### Guards and process
16. **Contrast:** bdlBase checker abandoned. Write a fresh checker for this repo's tokens, iterating every theme × scheme block. Bauhaus is the contrast-hard school (primaries fail at 2.44, 1.07, 4.27:1); neon on near-black passes easily (F045).
17. **No CI, no Lighthouse CI, no Playwright.** Guards are vitest tests reading built `dist/` (copy parity, per-theme stylesheet isolation). Copy parity must exclude the lab-derived "From the lab" block (F028). One manual Lighthouse baseline of root pages before PR 0.
18. **Reduced motion:** not a concern.
19. **Analytics:** drop GA4 and the Zaraz CMP entirely. Founder removes Zaraz tools in the Cloudflare dashboard; repo updates `/privacy`, `docs/analytics.md`, memory.
20. **Deps first, before PR 0:** (a) `npm audit fix` + all minors; (b) astro 7.3.x + @astrojs/svelte 9 together, real browser pass; (c) typescript 7, vitest 5, zod 4 one at a time (zod 4 vs `lab-schema.ts`, ts 7 vs `@astrojs/check`). Audit on 09-13: 1 critical, 9 high, all cleared by these.
21. **Large PRs fine.**
22. **Voice:** no "engineer learning design" framing. Single unnamed-studio "we".
23. **graphify ditched.** Ignore the hook that demands it.
24. **Process:** stop between phases; bring decisions to the founder; no compute spent on calls that are theirs.

## Verified requirements the spec must cover (Tier 2, all hold on Astro 7.2.9)

- **F001** swap wipes every `<html>` attribute; inline bootstrap never re-runs (dedup by textContent). Re-stamp `data-theme`/`data-scheme`/`.js` via `astro:before-swap` on `event.newDocument.documentElement`.
- **F004** module scripts run once per hard load. Portal code inits on `astro:page-load`, tears down on `astro:before-swap`, idempotent.
- **F010** per-theme `::view-transition` CSS must be global and present in the destination document; scoped `<style>` can't carry it; duplicate `transition:name` aborts the transition.
- **F022** preload target theme fonts before `navigate()`; fontaine fallback list is one global serif list.
- **F023** router scrolls to top before hooks; `scroll-behavior: smooth` animates restore; focus drops to body; randomize uses `history: 'replace'`, drawer pick uses push.
- **F039** `transition:persist` goes on the astro-island itself; persist-props default copies props and re-renders.
- **F040** persisted element keeps its stale scoped class after its stylesheet is removed.
- **F006** ClientRouter swaps the Worker's error page into the document and parks URL on `/api/contact`.
- **F027** copy loader: markdown vs data collection are mutually exclusive for this copy (inline `<em>/<strong>`, structured steps/doors/CTAs).
- **F049** `SITE_DESCRIPTION` stays single-source; collection references it.
- **F047** Nouveau, Deco, Grandmillennial need an asset slot in the theme package.
- **F013** bark renderer has no `webglcontextlost`/`restored` handling; mirror `src/experiments/bdl-007/stage.ts`.

## Font survey picks (all exist on @fontsource, latin)

| School | Heading | Body | Accent |
|---|---|---|---|
| Vaporwave | Bodoni Moda (see #15) | Exo 2 | Dela Gothic One; mono VT323 |
| Grandmillennial | Playfair Display | Cormorant Garamond | Pinyon Script |
| Swiss | Archivo | Public Sans | Literata; mono IBM Plex Mono |
| Bauhaus | League Spartan | Jost | Unbounded |
| Cottagecore | Fraunces | Lora | Caveat |
| Glassmorphism | Plus Jakarta Sans | Inter | Space Grotesk |
| Art Deco | Poiret One | Cinzel (see #15) | Miltonian |

## Where the session stopped

Brainstorming skill, **architectural path**, presenting the design section by section for approval. **Section 1 was presented and NOT yet approved.** Nine planned sections:

1. **Routes, portal entry/exit, quiet duplicate, SEO** — presented (text below), awaiting approval.
2. Theme package contract: files, `meta.ts` (name, era, lesson, signature, forbids, fonts, assets), per-theme route file, registry.
3. Copy collection: loader, schema per page, emphasis policy, parity guard, SITE_DESCRIPTION.
4. Portal runtime: attribute contract + migration, script lifecycle, VT CSS placement, font preload, scroll/history, switcher persist.
5. Contact flow under themes, Worker changes.
6. Guards: contrast checker, dist tests.
7. Schools: first tranche, dark variants, Bauhaus contrast, asset needs, build order.
8. Lab framing: BDL-010, BDL-011, schema tweak.
9. Build order: dep upgrades, analytics removal, PR 0 contents, theme 1.

Then write `docs/superpowers/specs/09-13-26-theme-schools-design.md` (or re-date to the writing day, MM-DD-YY), self-review, founder review, then the writing-plans skill. No code before the spec is approved.

### Section 1 as presented

- **Root stays root.** Root files keep `BaseLayout`, no ClientRouter, no switcher. Only change: bodies read copy from the collection.
- **Theme routes.** `/t/<theme>/`, `/about/`, `/services/`, `/contact/`, `/contact/sent/`. One route file per theme whose `getStaticPaths` returns those five.
- **Quiet as a theme.** Quiet page bodies move to `src/themes/quiet/` as layout-agnostic components. Root routes become thin wrappers rendering them in `BaseLayout`; `/t/quiet/…` renders them inside `PortalLayout` (head, ClientRouter, switcher, exit door). Every theme owns Header, Footer, five page bodies; portal layout owns the rest.
- **Entry.** BDL-010 experiment row, `href` to `/t/quiet/` (final form deferred per #4). Leaving the Lab into `/t/` is a full load. Inside `/t/`, navigation is client-side.
- **Exit.** Switcher "leave" link to the matching root page, full load. Every theme's Lab link goes to `/lab/`, dropping the theme.
- **SEO.** `noindex` prop, sitemap filter adds `/t/`, self canonical, no JSON-LD, lab-experiment OG card. `robots.txt` unchanged (tests forbid Disallow).
- **Accepted edges.** `/404` is quiet everywhere. Trailing slashes match root under Workers Static Assets.
