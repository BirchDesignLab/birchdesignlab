# BDL Brand Assets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the dense-bark mark, two lockup SVGs, and the Cheer & Chatter sponsor-card reference assets under `assets/brand/`, per `docs/superpowers/specs/2026-08-08-bdl-brand-lockup-sponsor-card-design.md`.

**Architecture:** Static SVG assets outside the site build. Marks are hand-authored rects. Lockup wordmarks are Marcellus text outlined to paths by a committed build script (`scripts/brand/build-lockups.mjs`, opentype.js), so the SVGs stand alone without the font. The card is a self-contained HTML reference plus a Playwright PNG export. One guard test keeps the assets honest.

**Tech Stack:** SVG, opentype.js (devDependency), Playwright CLI (screenshot only), Vitest.

## Global Constraints

- Colors, verbatim from spec: paper `#f4f0e6`, moss `#a3bd8f`, charcoal `#1c1a17`, C&C paper (QR tile only) `#F6EFE8`, stone `#a89f8f`
- Brand SVGs must contain no `<text>` elements and no `font-family` references (wordmarks outlined to paths)
- Exactly one moss dash per mark/band; all other dashes paper
- Nothing under `assets/` enters the site build; `scripts/og/logo.ts`, favicon, manifest untouched
- Kicker copy is exactly `BUILT BY`; URL is `birchdesignlab.com`; QR encodes `https://birchdesignlab.com`
- Work on branch `docs/bdl-brand-spec` (spec already committed there)
- Before PR: `npx vitest run`, `npx astro check`, `npm run build` all clean
- New dependency policy: newest stable only, no `next`/beta tags

---

### Task 1: Guard test + the two marks

**Files:**
- Create: `tests/brand-assets.test.ts`
- Create: `assets/brand/mark-dense.svg`
- Create: `assets/brand/mark-small.svg`

**Interfaces:**
- Produces: `assets/brand/` directory; the test that every later SVG task must keep green. Rect geometry consumed verbatim by Task 2's script for the side-by-side lockup.

- [ ] **Step 1: Write the failing test**

```ts
// tests/brand-assets.test.ts
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(process.cwd(), 'assets', 'brand');

function svgFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return svgFiles(p);
    return name.endsWith('.svg') ? [p] : [];
  });
}

describe('brand assets', () => {
  it('at least the two marks exist', () => {
    const names = svgFiles(ROOT).map((p) => p.split(/[\\/]/).pop());
    expect(names).toContain('mark-dense.svg');
    expect(names).toContain('mark-small.svg');
  });

  it('no live text or font dependencies in any brand svg', () => {
    for (const file of svgFiles(ROOT)) {
      const svg = readFileSync(file, 'utf8');
      expect(svg, file).not.toMatch(/<text[\s>]/);
      expect(svg, file).not.toMatch(/font-family/);
    }
  });

  it('marks and lockups use only brand fills, exactly one moss each', () => {
    const brandOnly = svgFiles(ROOT).filter((p) =>
      /(?:mark-|lockup-)[^\\/]*\.svg$/.test(p),
    );
    for (const file of brandOnly) {
      const svg = readFileSync(file, 'utf8');
      const fills = [...svg.matchAll(/fill="([^"]+)"/g)].map((m) => m[1].toLowerCase());
      for (const f of fills) expect(['#f4f0e6', '#a3bd8f', 'none'], file).toContain(f);
      expect(fills.filter((f) => f === '#a3bd8f'), file).toHaveLength(1);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/brand-assets.test.ts`
Expected: FAIL — `ENOENT ... assets\brand` (directory does not exist yet)

- [ ] **Step 3: Author the two marks**

```xml
<!-- assets/brand/mark-dense.svg -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <rect x="14" y="16" width="48" height="3" rx="1.5" fill="#f4f0e6"/>
  <rect x="70" y="18" width="24" height="2.5" rx="1.25" fill="#f4f0e6"/>
  <rect x="34" y="34" width="62" height="3.5" rx="1.75" fill="#f4f0e6"/>
  <rect x="10" y="52" width="26" height="3" rx="1.5" fill="#f4f0e6"/>
  <rect x="48" y="54" width="40" height="4" rx="2" fill="#a3bd8f"/>
  <rect x="20" y="72" width="52" height="2.5" rx="1.25" fill="#f4f0e6"/>
  <rect x="82" y="74" width="20" height="3" rx="1.5" fill="#f4f0e6"/>
  <rect x="30" y="92" width="38" height="3.5" rx="1.75" fill="#f4f0e6"/>
  <rect x="76" y="94" width="14" height="2.5" rx="1.25" fill="#f4f0e6"/>
</svg>
```

```xml
<!-- assets/brand/mark-small.svg -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <rect x="14" y="20" width="52" height="7" rx="3.5" fill="#f4f0e6"/>
  <rect x="36" y="44" width="62" height="7" rx="3.5" fill="#f4f0e6"/>
  <rect x="10" y="68" width="30" height="7" rx="3.5" fill="#a3bd8f"/>
  <rect x="26" y="92" width="48" height="7" rx="3.5" fill="#f4f0e6"/>
</svg>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/brand-assets.test.ts`
Expected: PASS, 3 tests

- [ ] **Step 5: Visual check**

Open both files in a browser (`file:///C:/git/birchdesignlab/assets/brand/mark-dense.svg`). Backgrounds are transparent, so check on a dark browser theme or a charcoal page: nine off-grid dashes (dense), four heavier dashes (small), one moss dash each.

- [ ] **Step 6: Commit**

```bash
git add tests/brand-assets.test.ts assets/brand/mark-dense.svg assets/brand/mark-small.svg
git commit -m "feat(brand): dense-bark marks with guard test"
```

---

### Task 2: Lockup build script + the two lockups

**Files:**
- Create: `scripts/brand/build-lockups.mjs`
- Create: `assets/brand/lockup-sideby.svg` (generated)
- Create: `assets/brand/lockup-canopy.svg` (generated)
- Modify: `package.json` (add `opentype.js` devDependency)
- Modify: `.gitignore` (add `scripts/brand/.cache/`)

**Interfaces:**
- Consumes: dense-mark rect geometry from Task 1 (inlined in the script — the SVG file is not parsed).
- Produces: the two lockup SVG files consumed by Task 4's README and by any future site adoption. Script is rerunnable: `node scripts/brand/build-lockups.mjs` regenerates both files deterministically.

- [ ] **Step 1: Install opentype.js (newest stable)**

Run: `npm install --save-dev opentype.js`
Expected: clean install, no majors dragged along. Check `npm ls opentype.js` shows one version.

- [ ] **Step 2: Write the build script**

```js
// scripts/brand/build-lockups.mjs
// Generates assets/brand/lockup-sideby.svg and lockup-canopy.svg with the
// Marcellus wordmark outlined to paths, so the SVGs render with no font
// installed. Rerun after any geometry or tracking change; output is
// deterministic. Font is fetched once into scripts/brand/.cache (gitignored).
//
// Live-text source of truth (kept here, echoed as a comment in each SVG):
//   side-by-side: BIRCH / DESIGN / LAB, 30px, tracking 0.16em, line-height 1.4
//   canopy:       BIRCH DESIGN LAB, 26px, tracking 0.24em
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import opentype from 'opentype.js';

const CACHE = path.join('scripts', 'brand', '.cache');
const TTF = path.join(CACHE, 'Marcellus-Regular.ttf');
const FONT_URL =
  'https://raw.githubusercontent.com/google/fonts/main/ofl/marcellus/Marcellus-Regular.ttf';
const OUT = path.join('assets', 'brand');

const PAPER = '#f4f0e6';
const MOSS = '#a3bd8f';

// x, y, w, h, moss? — spec geometry, verbatim.
const DENSE = [
  [14, 16, 48, 3], [70, 18, 24, 2.5], [34, 34, 62, 3.5],
  [10, 52, 26, 3], [48, 54, 40, 4, true], [20, 72, 52, 2.5],
  [82, 74, 20, 3], [30, 92, 38, 3.5], [76, 94, 14, 2.5],
];
const CANOPY = [
  [18, 6, 58, 3], [94, 8, 30, 2.5], [140, 6, 52, 3.5], [206, 8, 20, 2.5],
  [42, 24, 34, 3], [92, 22, 48, 4, true], [156, 24, 40, 2.5],
  [26, 42, 24, 2.5], [66, 40, 56, 3], [138, 42, 30, 3.5], [184, 40, 38, 2.5],
];

const rect = ([x, y, w, h, moss], dx = 0, dy = 0, s = 1) =>
  `<rect x="${x * s + dx}" y="${y * s + dy}" width="${w * s}" height="${h * s}" ` +
  `rx="${(h * s) / 2}" fill="${moss ? MOSS : PAPER}"/>`;

async function ensureFont() {
  try { await access(TTF, constants.F_OK); return; } catch {}
  const res = await fetch(FONT_URL);
  if (!res.ok) throw new Error(`font fetch failed: ${res.status}`);
  await mkdir(CACHE, { recursive: true });
  await writeFile(TTF, Buffer.from(await res.arrayBuffer()));
}

function line(font, text, x, baseline, size, tracking) {
  const opts = { kerning: true, letterSpacing: tracking };
  const d = font.getPath(text, x, baseline, size, opts).toPathData(2);
  const w = font.getAdvanceWidth(text, size, opts);
  return { d, w };
}

function svg(viewW, viewH, body, comment) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewW} ${viewH}">\n` +
    `<!-- ${comment} -->\n${body}\n</svg>\n`;
}

async function main() {
  await ensureFont();
  const buf = await readFile(TTF);
  const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));

  // --- side-by-side: mark | hairline | BIRCH / DESIGN / LAB ---
  {
    const size = 30, track = 0.16, lead = size * 1.4;
    const textX = 160;
    const lines = ['BIRCH', 'DESIGN', 'LAB'].map((t, i) =>
      line(font, t, textX, 30 + i * lead, size, track));
    const width = Math.ceil(textX + Math.max(...lines.map((l) => l.w)) + 6);
    const body = [
      ...DENSE.map((r) => rect(r)),
      `<rect x="136" y="8" width="1" height="104" fill="${PAPER}" opacity="0.2"/>`,
      ...lines.map((l) => `<path d="${l.d}" fill="${PAPER}"/>`),
    ].join('\n');
    await writeFile(path.join(OUT, 'lockup-sideby.svg'),
      svg(width, 120, body, 'BIRCH / DESIGN / LAB — Marcellus 30px, tracking 0.16em, outlined'));
  }

  // --- canopy: bark band over BIRCH DESIGN LAB ---
  {
    const size = 26, track = 0.24;
    const word = line(font, 'BIRCH DESIGN LAB', 0, 0, size, track);
    const bandW = word.w * 1.15;
    const s = bandW / 240;                    // scale 240-unit band to bandW
    const bandH = 54 * s;
    const gap = 18;
    const baseline = bandH + gap + size * 0.75;
    const height = Math.ceil(baseline + size * 0.28);
    const wordX = (bandW - word.w) / 2;
    const placed = line(font, 'BIRCH DESIGN LAB', wordX, baseline, size, track);
    const body = [
      ...CANOPY.map((r) => rect(r, 0, 0, s)),
      `<path d="${placed.d}" fill="${PAPER}"/>`,
    ].join('\n');
    await writeFile(path.join(OUT, 'lockup-canopy.svg'),
      svg(Math.ceil(bandW), height, body, 'BIRCH DESIGN LAB — Marcellus 26px, tracking 0.24em, outlined'));
  }

  console.log('wrote lockup-sideby.svg, lockup-canopy.svg');
}

main();
```

- [ ] **Step 3: Gitignore the font cache**

Append to `.gitignore`:

```
scripts/brand/.cache/
```

- [ ] **Step 4: Run the script**

Run: `node scripts/brand/build-lockups.mjs`
Expected: `wrote lockup-sideby.svg, lockup-canopy.svg` (first run downloads the TTF; needs network)

- [ ] **Step 5: Run the guard test**

Run: `npx vitest run tests/brand-assets.test.ts`
Expected: PASS — outlined lockups have no `<text>`, no `font-family`, one moss fill each

- [ ] **Step 6: Visual check**

Open both lockups in a browser against a dark background. Side-by-side: mark left, hairline, three-line stack with cap alignment. Canopy: band clearly wider than the wordmark, moss dash inside the band, single-line wordmark centered. If the three-line baselines sit visibly off (Marcellus metrics vs the 30/72/114 grid), adjust the `30 + i * lead` start constant in the script by eye, rerun, recheck — the script is the source of truth, never hand-edit the output.

- [ ] **Step 7: Commit**

```bash
git add scripts/brand/build-lockups.mjs assets/brand/lockup-sideby.svg assets/brand/lockup-canopy.svg package.json package-lock.json .gitignore
git commit -m "feat(brand): outlined lockups and their build script"
```

---

### Task 3: Sponsor card reference (QR, HTML, PNG)

**Files:**
- Create: `assets/brand/sponsor-card/qr-birchdesignlab.svg`
- Create: `assets/brand/sponsor-card/card.html`
- Create: `assets/brand/sponsor-card/card-1920.png` (generated)

**Interfaces:**
- Consumes: canopy geometry (inlined in card.html — the card is deliberately self-contained, no file references, so it can be mailed or dropped into the C&C repo as-is).
- Produces: the reference artifacts the C&C backlog-14 build will translate.

- [ ] **Step 1: Commit the QR svg**

Content, verbatim (generated with `qrcode` 2026-08-08, encodes `https://birchdesignlab.com`; regenerate only if the URL changes — command in the spec):

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 27 27" shape-rendering="crispEdges"><path fill="#F6EFE8" d="M0 0h27v27H0z"/><path stroke="#1c1a17" d="M1 1.5h7m2 0h1m1 0h1m4 0h1m1 0h7M1 2.5h1m5 0h1m3 0h1m1 0h5m1 0h1m5 0h1M1 3.5h1m1 0h3m1 0h1m1 0h1m1 0h1m1 0h1m1 0h2m2 0h1m1 0h3m1 0h1M1 4.5h1m1 0h3m1 0h1m1 0h1m1 0h1m1 0h3m3 0h1m1 0h3m1 0h1M1 5.5h1m1 0h3m1 0h1m1 0h2m1 0h1m1 0h1m2 0h1m1 0h1m1 0h3m1 0h1M1 6.5h1m5 0h1m1 0h1m2 0h1m1 0h4m1 0h1m5 0h1M1 7.5h7m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h7M9 8.5h4M1 9.5h1m1 0h5m2 0h3m1 0h4m1 0h5M1 10.5h2m2 0h1m2 0h1m1 0h1m3 0h1m2 0h1m2 0h1m3 0h1M1 11.5h4m2 0h1m1 0h5m1 0h3m3 0h2m1 0h2M1 12.5h2m2 0h1m3 0h1m2 0h1m3 0h4m5 0h1M3 13.5h2m1 0h3m2 0h1m1 0h4m1 0h2m1 0h1m1 0h3M1 14.5h2m8 0h1m1 0h1m3 0h2m1 0h1m1 0h1m1 0h1M1 15.5h1m4 0h2m2 0h1m5 0h1m2 0h4m1 0h2M1 16.5h1m2 0h3m3 0h2m3 0h3m2 0h2m3 0h1M1 17.5h1m1 0h1m3 0h3m2 0h10m1 0h1M9 18.5h2m1 0h1m3 0h2m3 0h2M1 19.5h7m3 0h1m2 0h1m2 0h1m1 0h1m1 0h1m1 0h3M1 20.5h1m5 0h1m1 0h2m1 0h1m4 0h1m3 0h2M1 21.5h1m1 0h3m1 0h1m1 0h1m2 0h3m1 0h6m1 0h1M1 22.5h1m1 0h3m1 0h1m1 0h2m1 0h1m1 0h1m1 0h1m1 0h2m1 0h5M1 23.5h1m1 0h3m1 0h1m1 0h2m3 0h4m4 0h2m1 0h1M1 24.5h1m5 0h1m3 0h3m2 0h2m1 0h4m2 0h1M1 25.5h7m1 0h3m1 0h3m2 0h1m1 0h6"/></svg>
```

- [ ] **Step 2: Write card.html**

```html
<!doctype html>
<!-- BDL developer-credit slide: reference for the Cheer & Chatter
     Break/Sponsor slideshow (their backlog 14). Self-contained on purpose.
     Spec: docs/superpowers/specs/2026-08-08-bdl-brand-lockup-sponsor-card-design.md -->
<html lang="en">
<head>
<meta charset="utf-8">
<title>Built By — Birch Design Lab</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Marcellus&family=Spectral:wght@300;400&display=swap" rel="stylesheet">
<style>
  html, body { margin: 0; height: 100%; }
  .tv {
    width: 100vw; height: 100vh; background: #1c1a17;
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; gap: 2vmin; position: relative; overflow: hidden;
  }
  .word { font-family: 'Marcellus', Georgia, serif; text-transform: uppercase; margin: 0; }
  .kicker { font-size: 1.6vmin; letter-spacing: 0.3em; color: #a3bd8f; }
  .name { font-size: 3.4vmin; letter-spacing: 0.24em; color: #f4f0e6; }
  .url { font-family: 'Spectral', Georgia, serif; font-size: 1.7vmin;
         letter-spacing: 0.06em; color: #a89f8f; margin: 0; }
  .band { width: 46vw; margin-top: 0.5vmin; }
  .qr { position: absolute; right: 2.6vmin; bottom: 2.6vmin;
        width: 11vmin; height: 11vmin; border-radius: 0.8vmin; overflow: hidden; line-height: 0; }
  .qr svg { width: 100%; height: 100%; }
</style>
</head>
<body>
<div class="tv">
  <p class="word kicker">Built By</p>
  <svg class="band" viewBox="0 0 240 54" xmlns="http://www.w3.org/2000/svg">
    <rect x="18" y="6" width="58" height="3" rx="1.5" fill="#f4f0e6"/>
    <rect x="94" y="8" width="30" height="2.5" rx="1.25" fill="#f4f0e6"/>
    <rect x="140" y="6" width="52" height="3.5" rx="1.75" fill="#f4f0e6"/>
    <rect x="206" y="8" width="20" height="2.5" rx="1.25" fill="#f4f0e6"/>
    <rect x="42" y="24" width="34" height="3" rx="1.5" fill="#f4f0e6"/>
    <rect x="92" y="22" width="48" height="4" rx="2" fill="#a3bd8f"/>
    <rect x="156" y="24" width="40" height="2.5" rx="1.25" fill="#f4f0e6"/>
    <rect x="26" y="42" width="24" height="2.5" rx="1.25" fill="#f4f0e6"/>
    <rect x="66" y="40" width="56" height="3" rx="1.5" fill="#f4f0e6"/>
    <rect x="138" y="42" width="30" height="3.5" rx="1.75" fill="#f4f0e6"/>
    <rect x="184" y="40" width="38" height="2.5" rx="1.25" fill="#f4f0e6"/>
  </svg>
  <p class="word name">Birch Design Lab</p>
  <p class="url">birchdesignlab.com</p>
  <div class="qr"><!-- paste qr-birchdesignlab.svg content here verbatim --></div>
</div>
</body>
</html>
```

Then replace the `<!-- paste ... -->` comment with the full QR svg from Step 1.

- [ ] **Step 3: Export the PNG**

```bash
npx playwright install chromium
npx playwright screenshot --viewport-size=1920,1080 --wait-for-timeout=4000 "file:///C:/git/birchdesignlab/assets/brand/sponsor-card/card.html" assets/brand/sponsor-card/card-1920.png
```

Expected: a 1920x1080 PNG. The 4s wait covers the Google Fonts load; if the wordmark renders as fallback Georgia (obvious serif mismatch), rerun with `--wait-for-timeout=8000`.

- [ ] **Step 4: Verify the export**

Open `card-1920.png`: charcoal full bleed, moss BUILT BY kicker, canopy band ~46% width, wordmark, URL, QR bottom-right on its paper tile. Scan the QR from a phone at arm's length off the monitor — must resolve to `https://birchdesignlab.com`.

- [ ] **Step 5: Run the guard test**

Run: `npx vitest run tests/brand-assets.test.ts`
Expected: PASS (QR svg has no text/font; color test skips it by filename)

- [ ] **Step 6: Commit**

```bash
git add assets/brand/sponsor-card/
git commit -m "feat(brand): sponsor-card reference with live QR"
```

---

### Task 4: README, full verification, PR

**Files:**
- Create: `assets/brand/README.md`

**Interfaces:**
- Consumes: everything above.
- Produces: the PR the founder reviews on GitHub.

- [ ] **Step 1: Write the README**

```markdown
# Brand assets

Source of truth for the dense-bark mark and lockups, chosen 2026-08-08
(spec: `docs/superpowers/specs/2026-08-08-bdl-brand-lockup-sponsor-card-design.md`).

- `mark-dense.svg` — the mark. Nine lenticel dashes, one moss.
- `mark-small.svg` — simplified cut for sub-32px placements.
- `lockup-sideby.svg` / `lockup-canopy.svg` — generated by
  `scripts/brand/build-lockups.mjs` (Marcellus outlined to paths; never
  hand-edit these two, edit the script and rerun).
- `sponsor-card/` — reference for the Cheer & Chatter developer-credit
  slide: self-contained `card.html`, its 1920x1080 export, and the QR
  (encodes https://birchdesignlab.com).

Open decisions, deliberately parked for the design sweep: side-by-side vs
canopy as the primary lockup; whether this mark replaces the favicon/OG
pipeline; light-face variants. Nothing here is wired into the site build.
```

- [ ] **Step 2: Full verification**

```bash
npx vitest run
npx astro check
npm run build
```

Expected: all clean. These assets touch no site code, so any failure is pre-existing — investigate before blaming the branch.

- [ ] **Step 3: Commit**

```bash
git add assets/brand/README.md
git commit -m "docs(brand): asset README with parked decisions"
```

- [ ] **Step 4: Push and open the PR**

```bash
git push -u origin docs/bdl-brand-spec
gh pr create --title "feat: BDL brand marks, lockups, and sponsor-card reference" --body "## Summary
- Dense-bark mark + small-size cut, guard-tested (no live text, brand fills only, one moss dash)
- Two lockups (side-by-side, canopy) generated with Marcellus outlined to paths; build script committed
- Cheer & Chatter sponsor-card reference: self-contained card.html, 1920x1080 export, scannable QR to birchdesignlab.com
- Spec + plan included; nothing enters the site build

Chosen interactively in a visual brainstorm session 2026-08-08. Final
side-by-side-vs-canopy call and any favicon/OG adoption are parked for the
design sweep.

## Test plan
- [x] npx vitest run
- [x] npx astro check
- [x] npm run build
- [x] QR scanned from a phone off the rendered PNG

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

Expected: PR URL printed. Founder reviews on GitHub (mobile OK — the PNG shows the whole design in one image).
