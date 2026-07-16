# Bark-Generated OG Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build-time bark-textured OpenGraph cards (1200x630 PNG per page) so every shared birchdesignlab.com link shows the tree of the deploy.

**Architecture:** The existing pure bark pattern (`generateBark`) plus a shared canvas2D dash-drawing routine render onto a `@napi-rs/canvas` in a prebuild Node script, which writes PNGs to `public/og/`. `Seo.astro` maps each pathname to its card. Spec: `docs/superpowers/specs/2026-07-16-bark-og-images-design.md`.

**Tech Stack:** Astro 5, TypeScript, vitest, `@napi-rs/canvas` (prebuilt native canvas), `tsx` (run TS scripts in Node).

## Global Constraints

- Dark face always: background `#1c1a17`, bark mark `#f4f0e6`, muted title `#a89f8f` (locked palette).
- Canvas2D alpha treatment matches the existing 2D fallback defaults: `alphaLo = 0.05`, `alphaHi = 0.22`.
- Card size exactly 1200x630.
- Seed = FNV hash of the build date string `YYYY-MM-DD`, same derivation as the site's `'date'` strategy in `src/lib/bark/seed.ts`.
- Writing rules: no emdashes in any copy or comments. Wordmark text is `BIRCH DESIGN LAB`.
- Lab experiment pages (`/lab/bdl-001` etc.) share the `/lab` card. Unknown routes (404, styleguide) fall back to the home card.
- Tests live in `tests/` at repo root, vitest, run with `npm test` (34 tests currently green; keep them green).
- Site URL is `https://birchdesignlab.com` (`Astro.site` is set in `astro.config.mjs`).

---

### Task 1: Extract shared dash-drawing into `draw2d.ts`

The browser 2D fallback (`renderBark2D` in `src/lib/bark/renderer.ts:246`) contains the exact drawing loop the OG script needs, but it is welded to `HTMLCanvasElement` (`clientWidth`, `devicePixelRatio`). Extract the loop into a renderer-agnostic module both paths share. `parseColor` moves too (it currently lives in `renderer.ts:89`, and `draw2d.ts` needs it; moving it avoids a circular import).

**Files:**
- Create: `src/lib/bark/draw2d.ts`
- Modify: `src/lib/bark/renderer.ts` (delegate `renderBark2D`, re-export `parseColor`)
- Test: `tests/draw2d.test.ts`

**Interfaces:**
- Consumes: `Dash` from `src/lib/bark/pattern.ts`.
- Produces: `drawBarkDashes(ctx: Ctx2DLike, dashes: Dash[], mark: string, W: number, H: number, alphaLo?: number, alphaHi?: number): void` and `parseColor(css: string): [number, number, number]`, both exported from `src/lib/bark/draw2d.ts`. `renderBark2D` keeps its exact current signature. `renderer.ts` re-exports `parseColor` so existing imports stay valid.

- [ ] **Step 1: Write the failing test**

Create `tests/draw2d.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { drawBarkDashes, parseColor } from '../src/lib/bark/draw2d';
import type { Dash } from '../src/lib/bark/pattern';

function mockCtx() {
  const calls: string[] = [];
  const ctx = {
    alphas: [] as number[],
    set globalAlpha(v: number) { this.alphas.push(v); },
    get globalAlpha() { return this.alphas[this.alphas.length - 1] ?? 1; },
    fillStyle: '',
    save: () => calls.push('save'),
    restore: () => calls.push('restore'),
    translate: (_x: number, _y: number) => calls.push('translate'),
    rotate: (_r: number) => calls.push('rotate'),
    beginPath: () => calls.push('beginPath'),
    roundRect: (_x: number, _y: number, _w: number, _h: number, _r: number) => calls.push('roundRect'),
    fill: () => calls.push('fill'),
  };
  return { ctx, calls };
}

const dash = (shade: number): Dash => ({ x: 0.5, y: 0.5, w: 0.1, h: 0.005, rot: 0, shade });

describe('drawBarkDashes', () => {
  it('draws one rounded rect per dash', () => {
    const { ctx, calls } = mockCtx();
    drawBarkDashes(ctx as never, [dash(0), dash(1)], '#f4f0e6', 1200, 630);
    expect(calls.filter((c) => c === 'roundRect')).toHaveLength(2);
    expect(calls.filter((c) => c === 'save')).toHaveLength(2);
    expect(calls.filter((c) => c === 'restore')).toHaveLength(2);
  });

  it('maps shade through the alpha range', () => {
    const { ctx } = mockCtx();
    drawBarkDashes(ctx as never, [dash(0), dash(1)], '#f4f0e6', 1200, 630, 0.05, 0.22);
    expect(ctx.alphas[0]).toBeCloseTo(0.05);
    expect(ctx.alphas[1]).toBeCloseTo(0.22);
  });
});

describe('parseColor re-home', () => {
  it('still parses hex', () => {
    expect(parseColor('#f4f0e6')[0]).toBeCloseTo(0xf4 / 255);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/draw2d.test.ts`
Expected: FAIL, cannot resolve `../src/lib/bark/draw2d`.

- [ ] **Step 3: Write `src/lib/bark/draw2d.ts`**

Move the body of `parseColor` from `renderer.ts:89` verbatim into this file, then add the extracted loop. The `Ctx2DLike` structural type is the subset both `CanvasRenderingContext2D` and `@napi-rs/canvas`'s context satisfy:

```ts
/** Renderer-agnostic 2D dash drawing, shared by the browser fallback and the OG build script. */
import type { Dash } from './pattern';

export interface Ctx2DLike {
  globalAlpha: number;
  fillStyle: string;
  save(): void;
  restore(): void;
  translate(x: number, y: number): void;
  rotate(r: number): void;
  beginPath(): void;
  roundRect(x: number, y: number, w: number, h: number, r: number): void;
  fill(): void;
}

/** Parse '#rgb', '#rrggbb', or 'rgb(a,b,c)' → [0..1] floats. */
export function parseColor(css: string): [number, number, number] {
  const s = css.trim();
  if (s.startsWith('#')) {
    const hex = s.length === 4 ? s.slice(1).split('').map((c) => c + c).join('') : s.slice(1);
    const n = parseInt(hex, 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }
  const m = s.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const [r, g, b] = m[1].split(',').map((v) => parseFloat(v));
    return [r / 255, g / 255, b / 255];
  }
  return [1, 1, 1];
}

export function drawBarkDashes(
  ctx: Ctx2DLike,
  dashes: Dash[],
  mark: string,
  W: number,
  H: number,
  alphaLo = 0.05,
  alphaHi = 0.22,
): void {
  const [mr, mg, mb] = parseColor(mark);
  const fill = `rgb(${Math.round(mr * 255)} ${Math.round(mg * 255)} ${Math.round(mb * 255)})`;
  for (const d of dashes) {
    ctx.save();
    ctx.translate(d.x * W, d.y * H);
    ctx.rotate(d.rot);
    ctx.globalAlpha = alphaLo + d.shade * (alphaHi - alphaLo);
    ctx.fillStyle = fill;
    const w = d.w * W, h = Math.max(1.5, d.h * H);
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, h / 2);
    ctx.fill();
    ctx.restore();
  }
}
```

In `renderer.ts`: delete the `parseColor` function body and the dash loop inside `renderBark2D`; add at the top `import { drawBarkDashes, parseColor } from './draw2d';` and `export { parseColor } from './draw2d';` (keep internal uses working via the import). `renderBark2D` becomes:

```ts
/** Static canvas2D fallback: same pattern, one frame, no motion. */
export function renderBark2D(
  canvas: HTMLCanvasElement,
  dashes: Dash[],
  mark: string,
  alphaLo = 0.05,
  alphaHi = 0.22,
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(canvas.clientWidth * dpr);
  canvas.height = Math.round(canvas.clientHeight * dpr);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBarkDashes(ctx, dashes, mark, canvas.width, canvas.height, alphaLo, alphaHi);
}
```

- [ ] **Step 4: Run the full suite**

Run: `npm test` and `npm run check`
Expected: all tests pass (34 existing + 3 new), typecheck clean. `tests/parse-color.test.ts` must still pass via the re-export; if it imports from `renderer`, do not change it.

- [ ] **Step 5: Commit**

```bash
git add src/lib/bark/draw2d.ts src/lib/bark/renderer.ts tests/draw2d.test.ts
git commit -m "refactor(bark): extract renderer-agnostic 2D dash drawing"
git push
```

---

### Task 2: OG page manifest and pathname mapping

**Files:**
- Create: `src/lib/og/manifest.ts`
- Test: `tests/og-manifest.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `OG_PAGES: OgPage[]` where `OgPage = { name: string; route: string; title: string | null }`, and `ogImageFor(pathname: string): string` returning a manifest `name`. Task 4 iterates `OG_PAGES`; Task 5's `Seo.astro` calls `ogImageFor`.

- [ ] **Step 1: Write the failing test**

Create `tests/og-manifest.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { OG_PAGES, ogImageFor } from '../src/lib/og/manifest';

describe('OG manifest', () => {
  it('has unique names and routes', () => {
    expect(new Set(OG_PAGES.map((p) => p.name)).size).toBe(OG_PAGES.length);
    expect(new Set(OG_PAGES.map((p) => p.route)).size).toBe(OG_PAGES.length);
  });

  it('home has no title line', () => {
    expect(OG_PAGES.find((p) => p.name === 'home')?.title).toBeNull();
  });
});

describe('ogImageFor', () => {
  it('maps exact routes', () => {
    expect(ogImageFor('/')).toBe('home');
    expect(ogImageFor('/services')).toBe('services');
    expect(ogImageFor('/about')).toBe('about');
    expect(ogImageFor('/contact')).toBe('contact');
    expect(ogImageFor('/lab')).toBe('lab');
  });

  it('experiment pages share the lab card', () => {
    expect(ogImageFor('/lab/bdl-001')).toBe('lab');
    expect(ogImageFor('/lab/bdl-003/')).toBe('lab');
  });

  it('tolerates trailing slashes', () => {
    expect(ogImageFor('/services/')).toBe('services');
  });

  it('unknown routes fall back to home', () => {
    expect(ogImageFor('/styleguide')).toBe('home');
    expect(ogImageFor('/definitely-404')).toBe('home');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/og-manifest.test.ts`
Expected: FAIL, cannot resolve `../src/lib/og/manifest`.

- [ ] **Step 3: Write `src/lib/og/manifest.ts`**

```ts
/** Which pages get OG cards, and how a pathname finds its card. */

export interface OgPage {
  name: string;          // file stem under public/og/
  route: string;         // exact pathname, no trailing slash (except '/')
  title: string | null;  // smallcaps line under the wordmark; null = wordmark only
}

export const OG_PAGES: OgPage[] = [
  { name: 'home', route: '/', title: null },
  { name: 'services', route: '/services', title: 'Services' },
  { name: 'about', route: '/about', title: 'About' },
  { name: 'contact', route: '/contact', title: 'Contact' },
  { name: 'lab', route: '/lab', title: 'The Lab' },
];

export function ogImageFor(pathname: string): string {
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  if (clean === '/lab' || clean.startsWith('/lab/')) return 'lab';
  return OG_PAGES.find((p) => p.route === clean)?.name ?? 'home';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/og-manifest.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/og/manifest.ts tests/og-manifest.test.ts
git commit -m "feat(og): page manifest and pathname mapping"
git push
```

---

### Task 3: Card renderer on Node canvas

**Files:**
- Create: `scripts/og/render.ts`, `scripts/og/fonts/Marcellus-Regular.ttf`, `scripts/og/fonts/OFL.txt`
- Modify: `package.json` (add devDependencies)
- Test: `tests/og-render.test.ts`

**Interfaces:**
- Consumes: `generateBark`, `hashString` from `src/lib/bark/pattern.ts`; `drawBarkDashes` from `src/lib/bark/draw2d.ts` (Task 1).
- Produces: `renderOgCard(seed: number, title: string | null): Buffer` (PNG bytes), `OG_WIDTH = 1200`, `OG_HEIGHT = 630`, exported from `scripts/og/render.ts`. Task 4 calls `renderOgCard`.

- [ ] **Step 1: Install dependencies**

Run: `npm install -D @napi-rs/canvas tsx`
Expected: clean install (both ship prebuilt binaries / plain JS, no node-gyp).

- [ ] **Step 2: Commit the Marcellus TTF**

`@fontsource/marcellus` ships woff2/woff only; `@napi-rs/canvas` font registration wants TTF/OTF. Marcellus is OFL-licensed. Fetch the upstream TTF and its license:

```bash
mkdir -p scripts/og/fonts
curl -L -o scripts/og/fonts/Marcellus-Regular.ttf https://github.com/google/fonts/raw/main/ofl/marcellus/Marcellus-Regular.ttf
curl -L -o scripts/og/fonts/OFL.txt https://github.com/google/fonts/raw/main/ofl/marcellus/OFL.txt
```

Verify: `node -e "const b=require('fs').readFileSync('scripts/og/fonts/Marcellus-Regular.ttf'); console.log(b.length, b.readUInt32BE(0).toString(16))"` prints a size above 50000 and sfnt tag `10000` (TrueType).

- [ ] **Step 3: Write the failing test**

Create `tests/og-render.test.ts`. PNG width and height live in the IHDR chunk at byte offsets 16 and 20, so the test needs no image library:

```ts
import { describe, it, expect } from 'vitest';
import { renderOgCard, OG_WIDTH, OG_HEIGHT } from '../scripts/og/render';
import { hashString } from '../src/lib/bark/pattern';

const seed = hashString('2026-07-16');

describe('renderOgCard', () => {
  it('produces a 1200x630 PNG', () => {
    const png = renderOgCard(seed, 'Services');
    expect(png.subarray(1, 4).toString('ascii')).toBe('PNG');
    expect(png.readUInt32BE(16)).toBe(OG_WIDTH);
    expect(png.readUInt32BE(20)).toBe(OG_HEIGHT);
  });

  it('is deterministic for a given seed', () => {
    expect(renderOgCard(seed, 'Services').equals(renderOgCard(seed, 'Services'))).toBe(true);
  });

  it('differs across seeds', () => {
    expect(renderOgCard(seed, null).equals(renderOgCard(seed + 1, null))).toBe(false);
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npx vitest run tests/og-render.test.ts`
Expected: FAIL, cannot resolve `../scripts/og/render`.

- [ ] **Step 5: Write `scripts/og/render.ts`**

```ts
/** Renders one OG card: dark face, bark field, wordmark, optional smallcaps title. */
import { join } from 'node:path';
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { generateBark } from '../../src/lib/bark/pattern';
import { drawBarkDashes } from '../../src/lib/bark/draw2d';

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

// Locked dark-face palette.
const BG = '#1c1a17';
const MARK = '#f4f0e6';
const MUTED = '#a89f8f';

// Type treatment knobs.
const WORDMARK = 'BIRCH DESIGN LAB';
const WORDMARK_SIZE = 84;
const WORDMARK_TRACKING = 14;  // px between glyphs, billboard spread
const TITLE_SIZE = 34;
const TITLE_TRACKING = 8;
const TITLE_GAP = 72;          // wordmark baseline to title baseline

GlobalFonts.registerFromPath(
  join(import.meta.dirname, 'fonts', 'Marcellus-Regular.ttf'),
  'Marcellus',
);

/** Manual letterspacing: per-glyph draw keeps output identical across canvas versions. */
function drawTracked(
  ctx: ReturnType<ReturnType<typeof createCanvas>['getContext']>,
  text: string,
  centerX: number,
  baselineY: number,
  tracking: number,
): void {
  const widths = [...text].map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + tracking * (text.length - 1);
  let x = centerX - total / 2;
  [...text].forEach((ch, i) => {
    ctx.fillText(ch, x, baselineY);
    x += widths[i] + tracking;
  });
}

export function renderOgCard(seed: number, title: string | null): Buffer {
  const canvas = createCanvas(OG_WIDTH, OG_HEIGHT);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, OG_WIDTH, OG_HEIGHT);

  drawBarkDashes(ctx, generateBark(seed), MARK, OG_WIDTH, OG_HEIGHT);

  ctx.fillStyle = MARK;
  ctx.textBaseline = 'alphabetic';
  ctx.font = `${WORDMARK_SIZE}px Marcellus`;
  const wordmarkY = title ? OG_HEIGHT / 2 : OG_HEIGHT / 2 + WORDMARK_SIZE * 0.35;
  drawTracked(ctx, WORDMARK, OG_WIDTH / 2, wordmarkY, WORDMARK_TRACKING);

  if (title) {
    ctx.fillStyle = MUTED;
    ctx.font = `${TITLE_SIZE}px Marcellus`;
    drawTracked(ctx, title.toUpperCase(), OG_WIDTH / 2, wordmarkY + TITLE_GAP, TITLE_TRACKING);
  }

  return canvas.toBuffer('image/png');
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run tests/og-render.test.ts`
Expected: PASS (3 tests). If font registration fails on this machine, the error will name the path; fix the path, not the test.

- [ ] **Step 7: Eyeball one card**

Run: `npx tsx -e "import { renderOgCard } from './scripts/og/render'; import { hashString } from './src/lib/bark/pattern'; require('fs').writeFileSync('scratch-og.png', renderOgCard(hashString(new Date().toISOString().slice(0,10)), 'Services'))"`
Open `scratch-og.png`, confirm: charcoal field, faint bark dashes, centered pale wordmark, muted SERVICES line. Delete the file after (`rm scratch-og.png`). This is a smoke check; the founder fiddle on type sizes comes after deploy.

- [ ] **Step 8: Commit**

```bash
git add scripts/og/render.ts scripts/og/fonts tests/og-render.test.ts package.json package-lock.json
git commit -m "feat(og): card renderer on node canvas with committed Marcellus TTF"
git push
```

---

### Task 4: Generation script and prebuild wiring

**Files:**
- Create: `scripts/og/generate.ts`
- Modify: `package.json` (scripts), `.gitignore`

**Interfaces:**
- Consumes: `renderOgCard` (Task 3), `OG_PAGES` (Task 2), `hashString` from `src/lib/bark/pattern.ts`.
- Produces: `public/og/<name>.png` for every manifest entry, regenerated on every `npm run build` via the npm `prebuild` lifecycle hook (Cloudflare Pages runs `npm run build`, so deploys get fresh cards automatically).

- [ ] **Step 1: Write `scripts/og/generate.ts`**

```ts
/** Prebuild: writes one OG card per manifest page to public/og/. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { hashString } from '../../src/lib/bark/pattern';
import { OG_PAGES } from '../../src/lib/og/manifest';
import { renderOgCard } from './render';

const seed = hashString(new Date().toISOString().slice(0, 10)); // same derivation as the site's date strategy
const outDir = join(process.cwd(), 'public', 'og');
mkdirSync(outDir, { recursive: true });

for (const page of OG_PAGES) {
  const file = join(outDir, `${page.name}.png`);
  writeFileSync(file, renderOgCard(seed, page.title));
  console.log(`og: wrote ${page.name}.png`);
}
```

- [ ] **Step 2: Wire package.json and .gitignore**

In `package.json` scripts, add:

```json
"og": "tsx scripts/og/generate.ts",
"prebuild": "npm run og",
```

Append to `.gitignore`:

```
public/og/
```

- [ ] **Step 3: Run and verify**

Run: `npm run og`
Expected: five `og: wrote <name>.png` lines; `ls public/og` shows `home.png services.png about.png contact.png lab.png`.

Run: `npm run build`
Expected: prebuild fires first (five og lines), then the astro build succeeds and `dist/og/` contains the five PNGs (Astro copies `public/` into `dist/`).

- [ ] **Step 4: Commit**

```bash
git add scripts/og/generate.ts package.json .gitignore
git commit -m "feat(og): prebuild generation of bark OG cards"
git push
```

---

### Task 5: Seo.astro wiring and build verification

**Files:**
- Modify: `src/components/Seo.astro`

**Interfaces:**
- Consumes: `ogImageFor` from `src/lib/og/manifest.ts` (Task 2); generated files under `/og/` (Task 4).
- Produces: `og:image`, `og:image:width`, `og:image:height`, `twitter:card` meta tags on every page that uses `Seo.astro` (all pages do, via `BaseLayout`). Props interface unchanged; no page edits needed.

- [ ] **Step 1: Update `src/components/Seo.astro`**

Replace the file with:

```astro
---
import { ogImageFor } from '../lib/og/manifest';

interface Props { title: string; description: string }
const { title, description } = Astro.props;
const canonical = new URL(Astro.url.pathname, Astro.site);
const ogImage = new URL(`/og/${ogImageFor(Astro.url.pathname)}.png`, Astro.site);
---
<title>{title}</title>
<meta name="description" content={description} />
<link rel="canonical" href={canonical} />
<meta property="og:title" content={title} />
<meta property="og:description" content={description} />
<meta property="og:type" content="website" />
<meta property="og:url" content={canonical} />
<meta property="og:site_name" content="Birch Design Lab" />
<meta property="og:image" content={ogImage} />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
```

- [ ] **Step 2: Build and verify the tags landed**

Run: `npm run build`
Then: `grep -o 'og:image" content="[^"]*"' dist/index.html dist/services/index.html dist/lab/bdl-001/index.html`
Expected: `https://birchdesignlab.com/og/home.png` on index, `.../og/services.png` on services, `.../og/lab.png` on the experiment page.

- [ ] **Step 3: Run everything**

Run: `npm test` and `npm run check`
Expected: full suite green, typecheck clean.

- [ ] **Step 4: Commit**

```bash
git add src/components/Seo.astro
git commit -m "feat(seo): per-page bark OG cards and twitter card meta"
git push
```

---

### Post-deploy manual check (founder or session, after push)

Not a task, per the spec's testing section: after Cloudflare deploys, run one URL through an OG preview tool (opengraph.xyz or a real Slack/iMessage paste) and confirm the card renders. Platform caches may need a fresh URL variant (`?v=1`) to bust.
