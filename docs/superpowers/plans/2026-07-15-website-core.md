# Birch Design Lab Website (Core + Lab Framework + BDL-001) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy the Birch Design Lab public site — Home, Services, About, Contact, 404, the Lab specimen catalog, and experiment BDL-001 (The Bark Engine) — per `docs/superpowers/specs/2026-07-15-birchdesignlab-website-design.md`.

**Architecture:** Astro 5 static site. One WebGL generative-bark module split into a pure seeded pattern core (unit-tested) and a shader draw layer (canvas2D static fallback). Vanilla CSS with a two-layer token system (primitives + per-theme semantics), dark default. Lab experiments are content-collection entries plus an optional per-designation component from a registry; adding one is one folder.

**Tech Stack:** Astro 5, TypeScript (strict), vanilla CSS custom properties, WebGL2, Svelte 5 (island for BDL-001 controls only), Vitest, @fontsource (self-hosted fonts), @astrojs/sitemap, Cloudflare Pages.

## Global Constraints

- Spec is authority: `docs/superpowers/specs/2026-07-15-birchdesignlab-website-design.md`. Brand authority: `docs/birch-design-lab-founding-record.md`.
- Dark theme is the default face; light theme is a true inverse; both first-class. Honor `prefers-color-scheme`; manual toggle persisted in `localStorage` key `theme`.
- All colors/spacing/type via CSS custom properties in `src/styles/tokens.css`. Palette and type values are **provisional by design** — components must reference semantic tokens only, never raw hex.
- Motion: 300–600ms, easing `var(--ease-weighted)`, no scroll-jacking, `prefers-reduced-motion` respected everywhere (bark renders a single static frame; reveals appear instantly).
- Bark module: pure pattern core (seeded PRNG, renderer-agnostic) + draw layer. Seed support mandatory. Default seed strategy is the single constant `DEFAULT_SEED_STRATEGY` in `src/lib/bark/seed.ts` (ships as `'date'`).
- No GSAP, no Tailwind, no CMS, no scroll-jacking, no stock/literal birch photography.
- Core pages must work with JS disabled (bark canvas simply absent; all content readable).
- Copy marked `<!-- provisional copy -->` is expected to be rewritten by the founder; layout must not depend on specific lines.
- Naming: the business name is always "Birch Design Lab" in full where formal. Never stack workplace suffixes when naming new things.
- Site URL: `https://birchdesignlab.com`. Host: Cloudflare Pages.
- Node 22+. Run all commands from repo root `C:\git\birchdesignlab`. PowerShell 5.1: chain with `;`, not `&&`.
- Commit after every task (messages below). Commit trailer: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>` (add to every commit in this plan; omitted from the blocks below for brevity).

## File Structure (final state)

```
astro.config.mjs            Astro config: svelte + sitemap, site URL
package.json / tsconfig.json / vitest.config.ts / .gitignore
public/favicon.svg
src/
  styles/tokens.css         Primitive + semantic tokens, both themes
  styles/base.css           Reset, type rhythm, reveal classes, utilities
  lib/bark/pattern.ts       PRNG, hashString, generateBark (pure)
  lib/bark/seed.ts          Seed strategies + DEFAULT_SEED_STRATEGY
  lib/bark/renderer.ts      WebGL2 instanced renderer + canvas2D fallback
  lib/bark/index.ts         Barrel export
  lib/lab-schema.ts         Zod schema for lab entries (unit-testable)
  content.config.ts         Lab collection wired to lab-schema
  content/lab/bdl-001.md    Bark Engine entry (live, featured)
  content/lab/bdl-002.md    Novgorod Letters entry (forthcoming)
  components/BarkField.astro    Canvas + init/fallback/theme-reactivity
  components/ThemeToggle.astro
  components/SiteHeader.astro
  components/SiteFooter.astro
  components/Seo.astro          Head meta (title/desc/canonical/OG)
  components/DeviceBadge.astro
  components/SpecimenCard.astro Lab card used by index + Home featured
  components/SpecimenPlate.astro Collapsible notebook panel
  layouts/BaseLayout.astro      Chrome pages (header/footer)
  layouts/ExperimentLayout.astro Full-bleed, escape hatch only
  experiments/registry.ts       designation → component map
  experiments/bdl-001/Experiment.astro
  experiments/bdl-001/BarkEngine.svelte
  pages/index.astro, services.astro, about.astro, contact.astro, 404.astro
  pages/lab/index.astro, lab/[slug].astro
tests/bark-pattern.test.ts
tests/lab-schema.test.ts
```

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`, `public/favicon.svg`, `src/pages/index.astro` (placeholder, replaced in Task 10)

**Interfaces:**
- Produces: working `npm run dev|build|test|check` scripts; `@` alias not used (relative imports throughout).

- [ ] **Step 1: Write config files**

`package.json`:

```json
{
  "name": "birchdesignlab",
  "type": "module",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "check": "astro check",
    "test": "vitest run"
  },
  "dependencies": {
    "@astrojs/sitemap": "^3.2.0",
    "@astrojs/svelte": "^7.0.0",
    "@fontsource-variable/cormorant": "^5.1.0",
    "@fontsource/cormorant-sc": "^5.1.0",
    "@fontsource/spectral": "^5.1.0",
    "astro": "^5.7.0",
    "svelte": "^5.0.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "@astrojs/check": "^0.9.0",
    "typescript": "^5.6.0",
    "vitest": "^3.0.0"
  }
}
```

`astro.config.mjs`:

```js
import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://birchdesignlab.com',
  integrations: [svelte(), sitemap()],
});
```

`tsconfig.json`:

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "src/**/*", "tests/**/*"],
  "exclude": ["dist"]
}
```

`vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['tests/**/*.test.ts'] },
});
```

`.gitignore`:

```
node_modules/
dist/
.astro/
```

`src/pages/index.astro` (temporary — replaced in Task 10):

```astro
---
---
<html lang="en"><head><meta charset="utf-8" /><title>Birch Design Lab</title></head>
<body><h1>Birch Design Lab</h1></body></html>
```

`public/favicon.svg` (three lenticel dashes — placeholder mark):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="4" fill="#1C1B19"/>
  <rect x="6" y="9"  width="14" height="2" rx="1" fill="#F4F1EA"/>
  <rect x="12" y="15" width="14" height="2" rx="1" fill="#F4F1EA"/>
  <rect x="6" y="21" width="10" height="2" rx="1" fill="#F4F1EA"/>
</svg>
```

- [ ] **Step 2: Install and verify build**

Run: `npm install; npm run build`
Expected: install succeeds; build outputs `dist/index.html` with no errors. (If a peer-dependency major mismatch errors on `@astrojs/svelte`, install whatever major `npm` suggests — integration majors track Astro majors.)

- [ ] **Step 3: Verify tests run empty**

Run: `npm test`
Expected: Vitest exits 0 reporting "no test files found" (passWithNoTests default) or similar non-error.
If Vitest exits non-zero on zero tests, add `passWithNoTests: true` to `vitest.config.ts` test block.

- [ ] **Step 4: Commit**

```powershell
git add -A; git commit -m "build: scaffold Astro 5 project with svelte, sitemap, vitest"
```

---

### Task 2: Design tokens, base styles, theme mechanism

**Files:**
- Create: `src/styles/tokens.css`, `src/styles/base.css`

**Interfaces:**
- Produces: semantic custom properties used by every later task: `--field`, `--field-raised`, `--mark`, `--mark-muted`, `--accent`, `--accent-strong`, `--green-field`, `--line`, `--font-display`, `--font-smallcaps`, `--font-body`, `--ease-weighted`, `--dur-1` (300ms), `--dur-2` (600ms), spacing `--space-1..7`, type `--text-sm/base/lg/xl/2xl/hero`, `--max-content`. Theme switching contract: `document.documentElement.dataset.theme` is `'dark'` or `'light'`; CSS keys off `:root[data-theme="light"]`.

- [ ] **Step 1: Write `src/styles/tokens.css`**

```css
/* ============================================================
   Birch Design Lab — design tokens.
   ALL values provisional; components consume SEMANTIC tokens only.
   ============================================================ */

:root {
  /* --- primitives (provisional palette) --- */
  --bark-white: #f4f1ea;
  --bark-white-dim: #e6e1d5;
  --charcoal: #1c1b19;
  --charcoal-raised: #262420;
  --birchwood-tan: #cbb593;
  --leather-brown: #4a3a2c;
  --stone-gray: #8b867c;
  --stone-dark: #55524b;
  --green-kelly-soft: #8fb59a;   /* bright green for dark fields */
  --green-hunter: #33523f;      /* deep green for light fields */
  --green-pine-deep: #22322a;   /* deep green field/surface */
  --green-moss-tint: #2b3a31;   /* surface tint on dark */
  --green-sage-tint: #e3e9e0;   /* surface tint on light */

  /* --- type --- */
  --font-display: 'Cormorant Variable', 'Iowan Old Style', Georgia, serif;
  --font-smallcaps: 'Cormorant SC', 'Iowan Old Style', Georgia, serif;
  --font-body: 'Spectral', Georgia, 'Times New Roman', serif;
  --text-sm: 0.875rem;
  --text-base: 1.0625rem;
  --text-lg: 1.25rem;
  --text-xl: 1.625rem;
  --text-2xl: 2.25rem;
  --text-hero: clamp(2.5rem, 7vw, 4.5rem);
  --tracking-wide: 0.12em;

  /* --- rhythm --- */
  --space-1: 0.25rem; --space-2: 0.5rem; --space-3: 1rem;
  --space-4: 1.5rem;  --space-5: 2.5rem; --space-6: 4rem; --space-7: 7rem;
  --max-content: 68rem;

  /* --- motion: luxury moves slowly --- */
  --ease-weighted: cubic-bezier(0.22, 1, 0.36, 1);
  --dur-1: 300ms;
  --dur-2: 600ms;
}

/* --- semantic: dark (the default face) --- */
:root, :root[data-theme='dark'] {
  color-scheme: dark;
  --field: var(--charcoal);
  --field-raised: var(--charcoal-raised);
  --green-field: var(--green-pine-deep);
  --green-surface: var(--green-moss-tint);
  --mark: var(--bark-white);
  --mark-muted: color-mix(in srgb, var(--bark-white) 62%, var(--charcoal));
  --accent: var(--green-kelly-soft);
  --accent-strong: var(--birchwood-tan);
  --line: color-mix(in srgb, var(--bark-white) 18%, transparent);
}

/* --- semantic: light (the true inverse) --- */
:root[data-theme='light'] {
  color-scheme: light;
  --field: var(--bark-white);
  --field-raised: var(--bark-white-dim);
  --green-field: var(--green-sage-tint);
  --green-surface: var(--green-sage-tint);
  --mark: var(--charcoal);
  --mark-muted: var(--stone-dark);
  --accent: var(--green-hunter);
  --accent-strong: var(--leather-brown);
  --line: color-mix(in srgb, var(--charcoal) 20%, transparent);
}
```

- [ ] **Step 2: Write `src/styles/base.css`**

```css
/* Reset + rhythm + shared primitives. */
*, *::before, *::after { box-sizing: border-box; margin: 0; }

html { scroll-behavior: smooth; }
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
}

body {
  background: var(--field);
  color: var(--mark);
  font-family: var(--font-body);
  font-size: var(--text-base);
  line-height: 1.65;
  -webkit-font-smoothing: antialiased;
  transition: background-color var(--dur-1) var(--ease-weighted),
              color var(--dur-1) var(--ease-weighted);
}

h1, h2, h3 { font-family: var(--font-display); font-weight: 500; line-height: 1.15; }
h1 { font-size: var(--text-2xl); }
h2 { font-size: var(--text-xl); }
h3 { font-size: var(--text-lg); }

a { color: var(--accent); text-decoration-thickness: 1px; text-underline-offset: 0.2em; }
a:hover { color: var(--mark); }

:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }

img, canvas, svg, video { max-width: 100%; display: block; }

.wrap { max-width: var(--max-content); margin-inline: auto; padding-inline: var(--space-4); }
.smallcaps {
  font-family: var(--font-smallcaps);
  letter-spacing: var(--tracking-wide);
  text-transform: lowercase; /* Cormorant SC renders lowercase as small caps */
}
.visually-hidden {
  position: absolute; width: 1px; height: 1px; overflow: hidden;
  clip-path: inset(50%); white-space: nowrap;
}

/* Quiet weighted reveals: elements tagged data-reveal fade/rise on entry. */
[data-reveal] {
  opacity: 0;
  translate: 0 14px;
  transition: opacity var(--dur-2) var(--ease-weighted),
              translate var(--dur-2) var(--ease-weighted);
}
[data-reveal].is-revealed { opacity: 1; translate: 0 0; }
@media (prefers-reduced-motion: reduce) {
  [data-reveal] { opacity: 1; translate: none; transition: none; }
}
/* No-JS: reveals must not hide content. Script adds .js to <html>. */
html:not(.js) [data-reveal] { opacity: 1; translate: none; }
```

- [ ] **Step 3: Verify build still passes**

Run: `npm run build`
Expected: success (styles not yet imported anywhere — imported by BaseLayout in Task 5; this step only catches syntax-level tooling failures).

- [ ] **Step 4: Commit**

```powershell
git add -A; git commit -m "feat(styles): design tokens and base styles, dark-default dual theme"
```

---

### Task 3: Bark pattern core (TDD)

**Files:**
- Create: `src/lib/bark/pattern.ts`, `src/lib/bark/seed.ts`, `src/lib/bark/index.ts`
- Test: `tests/bark-pattern.test.ts`

**Interfaces:**
- Produces (exact, consumed by Tasks 4 & 9):

```ts
// pattern.ts
export interface Dash { x: number; y: number; w: number; h: number; rot: number; shade: number; }
export interface BarkOptions { density: number; bands: number; }
export function mulberry32(seed: number): () => number;
export function hashString(s: string): number;          // 32-bit unsigned
export function generateBark(seed: number, opts?: Partial<BarkOptions>): Dash[];
// seed.ts
export type SeedStrategy = 'date' | 'page' | 'visit';
export const DEFAULT_SEED_STRATEGY: SeedStrategy;        // 'date'
export function resolveSeed(strategy?: SeedStrategy, pathname?: string): number;
```

All Dash fields normalized: `x,y ∈ [0,1]`, `w ∈ [0.02,0.14]`, `h ∈ [0.002,0.01]`, `rot ∈ [-0.06,0.06]` radians, `shade ∈ [0,1]`.

- [ ] **Step 1: Write the failing tests** — `tests/bark-pattern.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { mulberry32, hashString, generateBark } from '../src/lib/bark/pattern';
import { resolveSeed, DEFAULT_SEED_STRATEGY } from '../src/lib/bark/seed';

describe('mulberry32', () => {
  it('is deterministic for a given seed', () => {
    const a = mulberry32(42), b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
  it('yields values in [0,1)', () => {
    const r = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('hashString', () => {
  it('is deterministic and unsigned 32-bit', () => {
    expect(hashString('birch')).toBe(hashString('birch'));
    expect(hashString('birch')).toBeGreaterThanOrEqual(0);
    expect(hashString('birch')).toBeLessThanOrEqual(0xffffffff);
    expect(hashString('birch')).not.toBe(hashString('fathom'));
  });
});

describe('generateBark', () => {
  it('same seed → identical pattern', () => {
    expect(generateBark(123)).toEqual(generateBark(123));
  });
  it('different seeds → different patterns', () => {
    expect(generateBark(1)).not.toEqual(generateBark(2));
  });
  it('respects density', () => {
    expect(generateBark(5, { density: 40 })).toHaveLength(40);
    expect(generateBark(5)).toHaveLength(140);
  });
  it('keeps every dash within documented bounds', () => {
    for (const d of generateBark(99, { density: 300 })) {
      expect(d.x).toBeGreaterThanOrEqual(0); expect(d.x).toBeLessThanOrEqual(1);
      expect(d.y).toBeGreaterThanOrEqual(0); expect(d.y).toBeLessThanOrEqual(1);
      expect(d.w).toBeGreaterThanOrEqual(0.02); expect(d.w).toBeLessThanOrEqual(0.14);
      expect(d.h).toBeGreaterThanOrEqual(0.002); expect(d.h).toBeLessThanOrEqual(0.01);
      expect(Math.abs(d.rot)).toBeLessThanOrEqual(0.06);
      expect(d.shade).toBeGreaterThanOrEqual(0); expect(d.shade).toBeLessThanOrEqual(1);
    }
  });
});

describe('resolveSeed', () => {
  it('defaults to the date strategy', () => {
    expect(DEFAULT_SEED_STRATEGY).toBe('date');
    expect(resolveSeed()).toBe(resolveSeed('date'));
  });
  it('page strategy hashes the pathname deterministically', () => {
    expect(resolveSeed('page', '/lab')).toBe(resolveSeed('page', '/lab'));
    expect(resolveSeed('page', '/lab')).not.toBe(resolveSeed('page', '/about'));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — cannot resolve `../src/lib/bark/pattern`.

- [ ] **Step 3: Implement** — `src/lib/bark/pattern.ts`

```ts
/** Pure pattern core: seeded math only. Renderer-agnostic by spec. */

export interface Dash {
  x: number; y: number;   // center, normalized [0,1]
  w: number; h: number;   // size, normalized
  rot: number;            // radians
  shade: number;          // 0..1 tonal variation
}

export interface BarkOptions {
  density: number; // dash count
  bands: number;   // horizontal banding rows (lenticels cluster in bands)
}

const DEFAULTS: BarkOptions = { density: 140, bands: 12 };

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s: string): number {
  let h = 2166136261; // FNV-1a
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function generateBark(seed: number, opts?: Partial<BarkOptions>): Dash[] {
  const { density, bands } = { ...DEFAULTS, ...opts };
  const rnd = mulberry32(seed);
  const dashes: Dash[] = [];
  for (let i = 0; i < density; i++) {
    const band = Math.floor(rnd() * bands);
    const y = clamp01((band + 0.5) / bands + (rnd() - 0.5) * (1.2 / bands));
    dashes.push({
      x: rnd(),
      y,
      w: lerp(0.02, 0.14, rnd() * rnd()), // bias toward short dashes
      h: lerp(0.002, 0.01, rnd()),
      rot: (rnd() - 0.5) * 0.12,
      shade: rnd(),
    });
  }
  return dashes;
}
```

`src/lib/bark/seed.ts`:

```ts
import { hashString } from './pattern';

export type SeedStrategy = 'date' | 'page' | 'visit';

/** THE one-line default deferred by the spec. Change here and only here. */
export const DEFAULT_SEED_STRATEGY: SeedStrategy = 'date';

export function resolveSeed(
  strategy: SeedStrategy = DEFAULT_SEED_STRATEGY,
  pathname?: string,
): number {
  switch (strategy) {
    case 'date': return hashString(new Date().toISOString().slice(0, 10));
    case 'page': return hashString(pathname ?? (typeof location !== 'undefined' ? location.pathname : '/'));
    case 'visit': return (Math.random() * 0xffffffff) >>> 0;
  }
}
```

`src/lib/bark/index.ts`:

```ts
export * from './pattern';
export * from './seed';
export * from './renderer'; // added in Task 4; leave this line commented until then
```

(For this task, keep the renderer line commented: `// export * from './renderer';`)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — all suites green.

- [ ] **Step 5: Commit**

```powershell
git add -A; git commit -m "feat(bark): seeded pattern core with strategy-based seed resolution"
```

---

### Task 4: Bark renderer (WebGL2 + 2D fallback) and BarkField component

**Files:**
- Create: `src/lib/bark/renderer.ts`, `src/components/BarkField.astro`
- Modify: `src/lib/bark/index.ts` (uncomment renderer export)

**Interfaces:**
- Consumes: `generateBark`, `resolveSeed`, `Dash` from Task 3.
- Produces (consumed by Tasks 9, 10):

```ts
export interface BarkRenderer {
  start(): void;            // rAF loop (breathing)
  renderOnce(): void;       // single static frame
  stop(): void;
  resize(): void;
  setColors(mark: string): void;  // CSS color string for the dash marks
  setDashes(dashes: Dash[]): void;
  destroy(): void;
}
export function createBarkRenderer(canvas: HTMLCanvasElement, dashes: Dash[]): BarkRenderer | null; // null → no WebGL2
export function renderBark2D(canvas: HTMLCanvasElement, dashes: Dash[], mark: string): void;        // static fallback
```

- `BarkField.astro` props: `{ seed?: number; density?: number; class?: string }`. Renders a transparent canvas the page's background shows through; marks only.

- [ ] **Step 1: Implement `src/lib/bark/renderer.ts`**

```ts
/** Draw layer. WebGL2 instanced quads; canvas2D static fallback. */
import type { Dash } from './pattern';

const VERT = `#version 300 es
layout(location=0) in vec2 aCorner;             // unit quad corners
layout(location=1) in vec4 aRect;               // x,y,w,h normalized
layout(location=2) in vec2 aRotShade;           // rot, shade
uniform vec2 uResolution;
uniform float uTime;
out vec2 vLocal;
out float vShade;
void main() {
  vLocal = aCorner;
  vShade = aRotShade.y;
  float rot = aRotShade.x;
  vec2 half = aRect.zw * 0.5;
  vec2 p = aCorner * half;
  float c = cos(rot), s = sin(rot);
  p = vec2(p.x * c - p.y * s, p.x * s + p.y * c);
  // breathing: each dash drifts a hair, phased by its shade
  float breathe = sin(uTime * 0.35 + vShade * 6.2831) * 0.0012;
  vec2 center = aRect.xy + vec2(0.0, breathe);
  vec2 pos = (center + p) * 2.0 - 1.0;
  gl_Position = vec4(pos.x, -pos.y, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision mediump float;
in vec2 vLocal;
in float vShade;
uniform vec3 uMark;
uniform float uTime;
out vec4 outColor;
void main() {
  // soft-edged rounded dash
  vec2 d = abs(vLocal);
  float edge = 1.0 - smoothstep(0.72, 1.0, max(d.x, d.y));
  float alpha = edge * mix(0.05, 0.22, vShade);
  alpha *= 1.0 + 0.25 * sin(uTime * 0.3 + vShade * 6.2831); // slow shimmer
  outColor = vec4(uMark, alpha);
}`;

export interface BarkRenderer {
  start(): void;
  renderOnce(): void;
  stop(): void;
  resize(): void;
  setColors(mark: string): void;
  setDashes(dashes: Dash[]): void;
  destroy(): void;
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

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(sh) ?? 'shader compile failed');
  }
  return sh;
}

function dashBuffer(dashes: Dash[]): Float32Array {
  const out = new Float32Array(dashes.length * 6);
  dashes.forEach((d, i) => {
    out.set([d.x, d.y, d.w, d.h, d.rot, d.shade], i * 6);
  });
  return out;
}

export function createBarkRenderer(
  canvas: HTMLCanvasElement,
  dashes: Dash[],
): BarkRenderer | null {
  const gl = canvas.getContext('webgl2', { alpha: true, antialias: true });
  if (!gl) return null;

  const prog = gl.createProgram()!;
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);

  const quad = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
  const quadBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
  gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const instBuf = gl.createBuffer();
  let count = dashes.length;
  const uploadDashes = (ds: Dash[]) => {
    count = ds.length;
    gl.bindBuffer(gl.ARRAY_BUFFER, instBuf);
    gl.bufferData(gl.ARRAY_BUFFER, dashBuffer(ds), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 24, 0);
    gl.vertexAttribDivisor(1, 1);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 24, 16);
    gl.vertexAttribDivisor(2, 1);
  };
  uploadDashes(dashes);

  const uTime = gl.getUniformLocation(prog, 'uTime');
  const uMark = gl.getUniformLocation(prog, 'uMark');
  const uResolution = gl.getUniformLocation(prog, 'uResolution');

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  let raf = 0;
  const t0 = performance.now();

  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = Math.round(canvas.clientWidth * dpr);
    const h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w; canvas.height = h;
    }
    gl.viewport(0, 0, w, h);
    gl.uniform2f(uResolution, w, h);
  };

  const frame = (now: number) => {
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(uTime, (now - t0) / 1000);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
  };

  const loop = (now: number) => { frame(now); raf = requestAnimationFrame(loop); };

  resize();

  return {
    start() { this.stop(); raf = requestAnimationFrame(loop); },
    renderOnce() { resize(); frame(t0); },
    stop() { if (raf) cancelAnimationFrame(raf); raf = 0; },
    resize,
    setColors(mark: string) {
      const [r, g, b] = parseColor(mark);
      gl.uniform3f(uMark, r, g, b);
    },
    setDashes(ds: Dash[]) { uploadDashes(ds); },
    destroy() {
      this.stop();
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}

/** Static canvas2D fallback — same pattern, one frame, no motion. */
export function renderBark2D(canvas: HTMLCanvasElement, dashes: Dash[], mark: string): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(canvas.clientWidth * dpr);
  canvas.height = Math.round(canvas.clientHeight * dpr);
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  for (const d of dashes) {
    ctx.save();
    ctx.translate(d.x * W, d.y * H);
    ctx.rotate(d.rot);
    ctx.globalAlpha = 0.05 + d.shade * 0.17;
    ctx.fillStyle = mark;
    const w = d.w * W, h = Math.max(1.5, d.h * H);
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, h / 2);
    ctx.fill();
    ctx.restore();
  }
}
```

Uncomment in `src/lib/bark/index.ts`: `export * from './renderer';`

- [ ] **Step 2: Verify pattern tests still pass and types check**

Run: `npm test; npm run check`
Expected: tests PASS; `astro check` reports 0 errors (warnings acceptable).

- [ ] **Step 3: Write `src/components/BarkField.astro`**

```astro
---
interface Props { seed?: number; density?: number; class?: string }
const { seed, density = 140, class: className } = Astro.props;
---
<canvas
  class:list={['bark-field', className]}
  data-bark
  data-seed={seed}
  data-density={density}
  aria-hidden="true"></canvas>

<style>
  .bark-field {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }
</style>

<script>
  import { generateBark, resolveSeed, createBarkRenderer, renderBark2D } from '../lib/bark';

  const markColor = () =>
    getComputedStyle(document.documentElement).getPropertyValue('--mark').trim();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  for (const canvas of document.querySelectorAll<HTMLCanvasElement>('[data-bark]')) {
    const seed = canvas.dataset.seed
      ? Number(canvas.dataset.seed)
      : resolveSeed(undefined, location.pathname);
    const dashes = generateBark(seed, { density: Number(canvas.dataset.density) || 140 });

    const gl = createBarkRenderer(canvas, dashes);
    const paint2D = () => renderBark2D(canvas, dashes, markColor());

    if (gl) {
      gl.setColors(markColor());
      if (reducedMotion.matches) gl.renderOnce();
      else gl.start();
      new ResizeObserver(() => {
        gl.resize();
        if (reducedMotion.matches) gl.renderOnce();
      }).observe(canvas);
      new MutationObserver(() => {
        gl.setColors(markColor());
        if (reducedMotion.matches) gl.renderOnce();
      }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
      reducedMotion.addEventListener('change', () => {
        if (reducedMotion.matches) { gl.stop(); gl.renderOnce(); } else gl.start();
      });
    } else {
      paint2D();
      new ResizeObserver(paint2D).observe(canvas);
      new MutationObserver(paint2D).observe(document.documentElement, {
        attributes: true, attributeFilter: ['data-theme'],
      });
    }
  }
</script>
```

- [ ] **Step 4: Smoke-test in the browser**

Temporarily add to the placeholder `src/pages/index.astro` body:

```astro
---
import BarkField from '../components/BarkField.astro';
import '../styles/tokens.css';
import '../styles/base.css';
---
<html lang="en"><head><meta charset="utf-8" /><title>Birch Design Lab</title></head>
<body>
  <div style="position:relative;height:100vh"><BarkField /></div>
</body></html>
```

Run: `npm run dev`, open `http://localhost:4321`.
Expected: charcoal page with faint bark-white lenticel dashes drifting almost imperceptibly. In DevTools, set `document.documentElement.dataset.theme = 'light'` → dashes turn charcoal on bark-white. Toggle "emulate prefers-reduced-motion" → static. No console errors.

- [ ] **Step 5: Commit**

```powershell
git add -A; git commit -m "feat(bark): WebGL2 instanced renderer, 2D fallback, BarkField component"
```

---

### Task 5: Base layout, header, footer, theme toggle, SEO head, reveals

**Files:**
- Create: `src/layouts/BaseLayout.astro`, `src/components/Seo.astro`, `src/components/SiteHeader.astro`, `src/components/SiteFooter.astro`, `src/components/ThemeToggle.astro`

**Interfaces:**
- Produces: `BaseLayout` props `{ title: string; description: string }` — wraps content in header/footer, imports all global CSS + fonts, sets theme before paint. All later chrome pages consume this. `Seo.astro` props `{ title: string; description: string }`.

- [ ] **Step 1: Write `src/components/Seo.astro`**

```astro
---
interface Props { title: string; description: string }
const { title, description } = Astro.props;
const canonical = new URL(Astro.url.pathname, Astro.site);
---
<title>{title}</title>
<meta name="description" content={description} />
<link rel="canonical" href={canonical} />
<meta property="og:title" content={title} />
<meta property="og:description" content={description} />
<meta property="og:type" content="website" />
<meta property="og:url" content={canonical} />
<meta property="og:site_name" content="Birch Design Lab" />
```

- [ ] **Step 2: Write `src/components/ThemeToggle.astro`**

```astro
---
---
<button id="theme-toggle" type="button" aria-label="Switch color theme">
  <span aria-hidden="true" class="dot"></span>
</button>

<style>
  button {
    background: none; border: 1px solid var(--line); border-radius: 999px;
    width: 2.5rem; height: 1.5rem; cursor: pointer; position: relative;
    transition: border-color var(--dur-1) var(--ease-weighted);
  }
  button:hover { border-color: var(--mark-muted); }
  .dot {
    position: absolute; top: 50%; translate: 0 -50%;
    left: 0.2rem; width: 1rem; height: 1rem; border-radius: 50%;
    background: var(--mark);
    transition: left var(--dur-1) var(--ease-weighted);
  }
  :global([data-theme='light']) .dot { left: calc(100% - 1.2rem); }
</style>

<script>
  document.getElementById('theme-toggle')?.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('theme', next);
  });
</script>
```

- [ ] **Step 3: Write `src/components/SiteHeader.astro`**

```astro
---
import ThemeToggle from './ThemeToggle.astro';
const links = [
  ['/services', 'Services'],
  ['/lab', 'Lab'],
  ['/about', 'About'],
  ['/contact', 'Contact'],
];
const path = Astro.url.pathname;
---
<header>
  <a class="skip" href="#main">Skip to content</a>
  <div class="wrap bar">
    <a class="wordmark smallcaps" href="/">Birch Design Lab</a>
    <nav aria-label="Main">
      {links.map(([href, label]) => (
        <a href={href} aria-current={path.startsWith(href) ? 'page' : undefined}>{label}</a>
      ))}
    </nav>
    <ThemeToggle />
  </div>
</header>

<style>
  header { border-bottom: 1px solid var(--line); }
  .bar {
    display: flex; align-items: center; gap: var(--space-4);
    padding-block: var(--space-3);
  }
  .wordmark {
    font-size: var(--text-lg); color: var(--mark); text-decoration: none;
    margin-right: auto;
  }
  nav { display: flex; gap: var(--space-4); flex-wrap: wrap; }
  nav a {
    color: var(--mark-muted); text-decoration: none; font-size: var(--text-sm);
    transition: color var(--dur-1) var(--ease-weighted);
  }
  nav a:hover, nav a[aria-current='page'] { color: var(--mark); }
  .skip {
    position: absolute; left: -100vw; top: 0; background: var(--field-raised);
    color: var(--mark); padding: var(--space-2) var(--space-3);
  }
  .skip:focus { left: 0; z-index: 10; }
  @media (max-width: 640px) {
    .bar { flex-wrap: wrap; }
    nav { order: 3; width: 100%; }
  }
</style>
```

- [ ] **Step 4: Write `src/components/SiteFooter.astro`**

```astro
---
const year = new Date().getFullYear();
---
<footer>
  <div class="wrap grid">
    <p class="smallcaps">Birch Design Lab</p>
    <nav aria-label="Footer">
      <a href="/services">Services</a>
      <a href="/lab">Lab</a>
      <a href="/about">About</a>
      <a href="/contact">Contact</a>
      <!-- Reserved room (spec §8): Work, Field Notes, social handles -->
    </nav>
    <p class="fine">&copy; {year} Birch Design Lab</p>
  </div>
</footer>

<style>
  footer { border-top: 1px solid var(--line); margin-top: var(--space-7); }
  .grid {
    display: flex; flex-wrap: wrap; gap: var(--space-4);
    align-items: baseline; justify-content: space-between;
    padding-block: var(--space-5);
  }
  nav { display: flex; gap: var(--space-4); flex-wrap: wrap; }
  nav a { color: var(--mark-muted); text-decoration: none; font-size: var(--text-sm); }
  nav a:hover { color: var(--mark); }
  .fine { color: var(--mark-muted); font-size: var(--text-sm); }
</style>
```

- [ ] **Step 5: Write `src/layouts/BaseLayout.astro`**

```astro
---
import '@fontsource-variable/cormorant';
import '@fontsource/cormorant-sc/500.css';
import '@fontsource/spectral/400.css';
import '@fontsource/spectral/600.css';
import '../styles/tokens.css';
import '../styles/base.css';
import Seo from '../components/Seo.astro';
import SiteHeader from '../components/SiteHeader.astro';
import SiteFooter from '../components/SiteFooter.astro';

interface Props { title: string; description: string }
const { title, description } = Astro.props;
---
<!doctype html>
<html lang="en" data-theme="dark">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="sitemap" href="/sitemap-index.xml" />
    <Seo title={title} description={description} />
    <script is:inline>
      // Before first paint: apply stored/system theme; mark JS availability.
      document.documentElement.classList.add('js');
      const stored = localStorage.getItem('theme');
      const system = matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
      document.documentElement.dataset.theme = stored || system;
    </script>
  </head>
  <body>
    <SiteHeader />
    <main id="main">
      <slot />
    </main>
    <SiteFooter />
    <script>
      // Quiet weighted reveals.
      const io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) {
              e.target.classList.add('is-revealed');
              io.unobserve(e.target);
            }
          }
        },
        { threshold: 0.12 },
      );
      document.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el));
    </script>
  </body>
</html>
```

- [ ] **Step 6: Point the placeholder home page at the layout**

Replace `src/pages/index.astro` entirely:

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---
<BaseLayout title="Birch Design Lab" description="Custom websites and custom software.">
  <section class="wrap"><h1>Placeholder — real Home in Task 10</h1></section>
</BaseLayout>
```

- [ ] **Step 7: Verify in browser**

Run: `npm run dev`
Expected: header with wordmark + nav + working theme toggle (persists across reload); footer; dark default; system-light machines get light theme when no stored value; `npm run check` → 0 errors.

- [ ] **Step 8: Commit**

```powershell
git add -A; git commit -m "feat(chrome): base layout, header/footer, theme toggle, SEO head, reveals"
```

---

### Task 6: Lab schema + content collection + seed entries (TDD)

**Files:**
- Create: `src/lib/lab-schema.ts`, `src/content.config.ts`, `src/content/lab/bdl-001.md`, `src/content/lab/bdl-002.md`
- Test: `tests/lab-schema.test.ts`

**Interfaces:**
- Produces: collection `lab` with entry `data` typed `{ designation, title, summary, date: Date, tech: string[], device: 'mobile-first'|'desktop-forward'|'universal', status: 'live'|'forthcoming', featured: boolean }`. Entry `id` = filename without extension (e.g. `bdl-001`) — used as URL slug.

- [ ] **Step 1: Write failing tests** — `tests/lab-schema.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { labSchema } from '../src/lib/lab-schema';

const valid = {
  designation: 'BDL-001',
  title: 'The Bark Engine',
  summary: 'The generative birch system, exposed.',
  date: '2026-07-15',
  tech: ['webgl', 'svelte'],
  device: 'universal',
};

describe('labSchema', () => {
  it('accepts a valid entry and applies defaults', () => {
    const parsed = labSchema.parse(valid);
    expect(parsed.status).toBe('live');
    expect(parsed.featured).toBe(false);
    expect(parsed.date).toBeInstanceOf(Date);
  });
  it('rejects malformed designations', () => {
    expect(() => labSchema.parse({ ...valid, designation: 'BDL-1' })).toThrow();
    expect(() => labSchema.parse({ ...valid, designation: 'bdl-001' })).toThrow();
  });
  it('rejects unknown device values', () => {
    expect(() => labSchema.parse({ ...valid, device: 'tablet' })).toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — cannot resolve `../src/lib/lab-schema`.

- [ ] **Step 3: Implement** — `src/lib/lab-schema.ts`

```ts
import { z } from 'zod';

export const labSchema = z.object({
  designation: z.string().regex(/^BDL-\d{3}$/),
  title: z.string().min(1),
  summary: z.string().min(1),
  date: z.coerce.date(),
  tech: z.array(z.string()).default([]),
  device: z.enum(['mobile-first', 'desktop-forward', 'universal']),
  status: z.enum(['live', 'forthcoming']).default('live'),
  featured: z.boolean().default(false),
});

export type LabEntryData = z.infer<typeof labSchema>;
```

`src/content.config.ts`:

```ts
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { labSchema } from './lib/lab-schema';

// Loader indirection is the designated CMS renovation path (spec §6):
// swapping glob() for a Sanity loader later leaves schema and pages untouched.
const lab = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/lab' }),
  schema: labSchema,
});

export const collections = { lab };
```

- [ ] **Step 4: Write the two seed entries**

`src/content/lab/bdl-001.md`:

```markdown
---
designation: BDL-001
title: The Bark Engine
summary: The generative birch system that grows this site's skin, exposed as a playable instrument.
date: 2026-07-15
tech: [webgl, svelte, typescript]
device: universal
status: live
featured: true
---

Every page of this site grows its own bark: a seeded generator places
lenticel dashes the way weather places them on a real birch — clustered
in bands, no two trees alike. This specimen removes the page and leaves
the instrument. Type a seed, pull the density, and watch the same
mathematics that quietly breathes behind the homepage render a tree
that has never existed before and will never exist again — unless you
keep the seed.

**How it works:** a pure pattern core (a seeded Mulberry32 PRNG feeding
band-clustered placement math) emits normalized dash geometry; a WebGL2
instanced renderer draws and animates it on the GPU. The pattern is
deterministic — the seed is the tree.
```

`src/content/lab/bdl-002.md`:

```markdown
---
designation: BDL-002
title: Novgorod Letters
summary: The oldest paper of the north — medieval birch-bark letters, resurfaced. Scratch to read.
date: 2026-07-15
tech: [webgl]
device: desktop-forward
status: forthcoming
featured: false
---

In the mud of Novgorod, archaeologists keep finding letters scratched
into birch bark eight hundred years ago — shopping lists, love notes, a
child's homework. This experiment will put a few of them back under
your stylus: bark you scratch to reveal what an ordinary person wrote
on an ordinary day, eight centuries before pixels.
```

- [ ] **Step 5: Run tests and check**

Run: `npm test; npm run check`
Expected: tests PASS; `astro check` passes (collection types generate; run `npx astro sync` first if types are missing).

- [ ] **Step 6: Commit**

```powershell
git add -A; git commit -m "feat(lab): entry schema, content collection, BDL-001/002 entries"
```

---

### Task 7: Lab index page (specimen catalog)

**Files:**
- Create: `src/components/DeviceBadge.astro`, `src/components/SpecimenCard.astro`, `src/pages/lab/index.astro`

**Interfaces:**
- Consumes: collection `lab` (Task 6).
- Produces: `SpecimenCard.astro` props `{ entry: CollectionEntry<'lab'> }` (also used by Home, Task 10). `DeviceBadge.astro` props `{ device: 'mobile-first'|'desktop-forward'|'universal' }`.

- [ ] **Step 1: Write `src/components/DeviceBadge.astro`**

```astro
---
// Visual treatment is spec'd as TBD — this text chip is the v1; only this
// file changes when the founder picks a final treatment.
interface Props { device: 'mobile-first' | 'desktop-forward' | 'universal' }
const { device } = Astro.props;
const label = { 'mobile-first': 'mobile-first', 'desktop-forward': 'desktop-forward', universal: 'universal' }[device];
---
<span class="badge">{label}</span>

<style>
  .badge {
    font-size: var(--text-sm); color: var(--mark-muted);
    border: 1px solid var(--line); border-radius: 999px;
    padding: 0.1em 0.7em; white-space: nowrap;
  }
</style>
```

- [ ] **Step 2: Write `src/components/SpecimenCard.astro`**

```astro
---
import type { CollectionEntry } from 'astro:content';
import DeviceBadge from './DeviceBadge.astro';

interface Props { entry: CollectionEntry<'lab'> }
const { entry } = Astro.props;
const { designation, title, summary, date, tech, device, status } = entry.data;
const live = status === 'live';
const href = `/lab/${entry.id}`;
const dateLabel = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
---
<article class="card" data-reveal>
  <p class="designation smallcaps">{designation}</p>
  <h3>
    {live ? <a href={href}>{title}</a> : <span>{title} <em class="soon">forthcoming</em></span>}
  </h3>
  <p class="summary">{summary}</p>
  <p class="meta">
    <DeviceBadge device={device} />
    {tech.map((t) => <span class="tag">{t}</span>)}
    <time datetime={date.toISOString().slice(0, 10)}>{dateLabel}</time>
  </p>
</article>

<style>
  .card { padding-block: var(--space-4); border-top: 1px solid var(--line); }
  .designation { color: var(--accent); font-size: var(--text-sm); }
  h3 a { color: var(--mark); text-decoration: none; }
  h3 a:hover { color: var(--accent); }
  .soon { color: var(--mark-muted); font-size: var(--text-sm); font-style: italic; }
  .summary { color: var(--mark-muted); max-width: 52ch; }
  .meta {
    display: flex; gap: var(--space-3); align-items: center; flex-wrap: wrap;
    margin-top: var(--space-2); font-size: var(--text-sm); color: var(--mark-muted);
  }
  .tag::before { content: '·'; margin-right: var(--space-2); }
</style>
```

- [ ] **Step 3: Write `src/pages/lab/index.astro`**

```astro
---
import { getCollection } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';
import SpecimenCard from '../../components/SpecimenCard.astro';

const entries = (await getCollection('lab')).sort((a, b) =>
  b.data.designation.localeCompare(a.data.designation),
);
---
<BaseLayout
  title="The Lab — Birch Design Lab"
  description="Numbered experiments in design and web engineering. A specimen catalog."
>
  <section class="wrap">
    <header class="intro">
      <h1>The Lab</h1>
      <!-- provisional copy -->
      <p>
        Numbered experiments — some artistic, some technical, each one a
        working specimen. This is where the bark gets written on.
      </p>
    </header>
    <div class="catalog">
      {entries.map((entry) => <SpecimenCard entry={entry} />)}
    </div>
  </section>
</BaseLayout>

<style>
  .intro { padding-block: var(--space-6) var(--space-5); max-width: 52ch; }
  .intro p { color: var(--mark-muted); margin-top: var(--space-3); }
  .catalog { border-bottom: 1px solid var(--line); }
</style>
```

- [ ] **Step 4: Verify in browser**

Run: `npm run dev`, open `http://localhost:4321/lab`
Expected: BDL-002 listed first (unlinked, "forthcoming"), BDL-001 linked (404 until Task 8 — expected). Badges and tags render. Both themes look right.

- [ ] **Step 5: Commit**

```powershell
git add -A; git commit -m "feat(lab): specimen catalog index with device badges"
```

---

### Task 8: Experiment layout, slug page, specimen plate, registry

**Files:**
- Create: `src/layouts/ExperimentLayout.astro`, `src/components/SpecimenPlate.astro`, `src/experiments/registry.ts`, `src/pages/lab/[slug].astro`

**Interfaces:**
- Consumes: collection `lab`; `Seo.astro`.
- Produces: `experimentComponents: Record<string, AstroComponent>` keyed by designation (`'BDL-001'`). Adding a future experiment = one content file + one component folder + one registry line.

- [ ] **Step 1: Write `src/layouts/ExperimentLayout.astro`**

Full-bleed: no site header/footer; minimal escape hatch only.

```astro
---
import '@fontsource-variable/cormorant';
import '@fontsource/cormorant-sc/500.css';
import '@fontsource/spectral/400.css';
import '@fontsource/spectral/600.css';
import '../styles/tokens.css';
import '../styles/base.css';
import Seo from '../components/Seo.astro';

interface Props { title: string; description: string; designation: string }
const { title, description, designation } = Astro.props;
---
<!doctype html>
<html lang="en" data-theme="dark">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <Seo title={title} description={description} />
    <script is:inline>
      document.documentElement.classList.add('js');
      const stored = localStorage.getItem('theme');
      const system = matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
      document.documentElement.dataset.theme = stored || system;
    </script>
  </head>
  <body>
    <a class="hatch smallcaps" href="/lab">&larr; Lab &middot; {designation}</a>
    <main id="main">
      <slot />
    </main>
  </body>
</html>

<style>
  .hatch {
    position: fixed; top: var(--space-3); left: var(--space-3); z-index: 20;
    color: var(--mark-muted); text-decoration: none; font-size: var(--text-sm);
    background: color-mix(in srgb, var(--field) 70%, transparent);
    padding: var(--space-1) var(--space-3); border-radius: 999px;
    backdrop-filter: blur(6px);
  }
  .hatch:hover { color: var(--mark); }
</style>
```

- [ ] **Step 2: Write `src/components/SpecimenPlate.astro`**

```astro
---
interface Props { designation: string; title: string; tech: string[] }
const { designation, title, tech } = Astro.props;
---
<details class="plate">
  <summary>
    <span class="smallcaps">Specimen plate</span>
    <span class="id">{designation} — {title}</span>
  </summary>
  <div class="body">
    <slot />
    <p class="tech">
      {tech.map((t) => <span>{t}</span>)}
    </p>
  </div>
</details>

<style>
  .plate {
    position: fixed; inset: auto 0 0 0; z-index: 20;
    background: color-mix(in srgb, var(--field) 88%, transparent);
    backdrop-filter: blur(8px);
    border-top: 1px solid var(--line);
  }
  summary {
    cursor: pointer; list-style: none;
    display: flex; gap: var(--space-3); align-items: baseline;
    padding: var(--space-3) var(--space-4);
    color: var(--mark-muted); font-size: var(--text-sm);
  }
  summary::-webkit-details-marker { display: none; }
  summary:hover { color: var(--mark); }
  .id { color: var(--accent); }
  .body {
    max-height: 45vh; overflow-y: auto;
    padding: 0 var(--space-4) var(--space-4);
    max-width: 62ch;
  }
  .tech { margin-top: var(--space-3); color: var(--mark-muted); font-size: var(--text-sm); }
  .tech span { border: 1px solid var(--line); border-radius: 999px; padding: 0.1em 0.7em; margin-right: var(--space-2); }
</style>
```

- [ ] **Step 3: Write `src/experiments/registry.ts`**

```ts
/**
 * designation → experiment component. One line per experiment.
 * Entries with no component here render specimen plate + notice only
 * (used for `forthcoming` status or copy-only specimens).
 */
import BDL001 from './bdl-001/Experiment.astro';

// Values are Astro component imports; typed loosely because Astro's
// component factory type lives at an internal path that shifts between minors.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const experimentComponents: Record<string, any> = {
  'BDL-001': BDL001,
};
```

And a stub `src/experiments/bdl-001/Experiment.astro` so this task builds (replaced in Task 9):

```astro
---
---
<div class="stage"><p class="wrap">BDL-001 stage — implemented in Task 9.</p></div>
<style>.stage { min-height: 100vh; display: grid; place-items: center; }</style>
```

- [ ] **Step 4: Write `src/pages/lab/[slug].astro`**

```astro
---
import { getCollection, render } from 'astro:content';
import ExperimentLayout from '../../layouts/ExperimentLayout.astro';
import SpecimenPlate from '../../components/SpecimenPlate.astro';
import { experimentComponents } from '../../experiments/registry';

export async function getStaticPaths() {
  const entries = await getCollection('lab', ({ data }) => data.status === 'live');
  return entries.map((entry) => ({ params: { slug: entry.id }, props: { entry } }));
}

const { entry } = Astro.props;
const { designation, title, summary, tech } = entry.data;
const { Content } = await render(entry);
const Experiment = experimentComponents[designation];
---
<ExperimentLayout
  title={`${designation} ${title} — Birch Design Lab`}
  description={summary}
  designation={designation}
>
  {Experiment ? (
    <Experiment />
  ) : (
    <div class="wrap missing"><p>This specimen has no interactive stage yet.</p></div>
  )}
  <SpecimenPlate designation={designation} title={title} tech={tech}>
    <Content />
  </SpecimenPlate>
  <noscript>
    <p class="wrap">This experiment requires JavaScript; the specimen plate below describes it.</p>
  </noscript>
</ExperimentLayout>

<style>
  .missing { min-height: 60vh; display: grid; place-items: center; color: var(--mark-muted); }
</style>
```

- [ ] **Step 5: Verify in browser**

Run: `npm run dev`, open `http://localhost:4321/lab/bdl-001`
Expected: stub stage, fixed "← Lab · BDL-001" hatch top-left, collapsible specimen plate at bottom rendering the markdown body + tech chips. `/lab/bdl-002` → 404 (forthcoming entries get no page). `npm run check` → 0 errors.

- [ ] **Step 6: Commit**

```powershell
git add -A; git commit -m "feat(lab): experiment layout, slug pages, specimen plate, registry"
```

---

### Task 9: BDL-001 — The Bark Engine

**Files:**
- Create: `src/experiments/bdl-001/BarkEngine.svelte`
- Modify: `src/experiments/bdl-001/Experiment.astro` (replace stub)

**Interfaces:**
- Consumes: `generateBark`, `hashString`, `createBarkRenderer`, `renderBark2D` from `src/lib/bark` (Tasks 3–4).

- [ ] **Step 1: Write `src/experiments/bdl-001/BarkEngine.svelte`** (Svelte 5 runes)

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import {
    generateBark, hashString, createBarkRenderer, renderBark2D,
    type BarkRenderer,
  } from '../../lib/bark';

  let canvas: HTMLCanvasElement;
  let renderer: BarkRenderer | null = null;
  let seedText = $state('birch');
  let density = $state(180);
  let webgl = $state(true);

  const markColor = () =>
    getComputedStyle(document.documentElement).getPropertyValue('--mark').trim();

  function rebuild() {
    const dashes = generateBark(hashString(seedText), { density });
    if (renderer) {
      renderer.setDashes(dashes);
      renderer.setColors(markColor());
    } else {
      renderBark2D(canvas, dashes, markColor());
    }
  }

  function randomSeed() {
    seedText = Math.random().toString(36).slice(2, 8);
    rebuild();
  }

  onMount(() => {
    renderer = createBarkRenderer(canvas, generateBark(hashString(seedText), { density }));
    if (renderer) {
      renderer.setColors(markColor());
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) renderer.renderOnce();
      else renderer.start();
      const ro = new ResizeObserver(() => renderer?.resize());
      ro.observe(canvas);
      const mo = new MutationObserver(() => renderer?.setColors(markColor()));
      mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
      return () => { ro.disconnect(); mo.disconnect(); renderer?.destroy(); };
    }
    webgl = false;
    rebuild();
  });
</script>

<div class="stage">
  <canvas bind:this={canvas} aria-label="Generated birch bark pattern"></canvas>
  <form class="controls" onsubmit={(e) => { e.preventDefault(); rebuild(); }}>
    <label>
      <span class="smallcaps">Seed</span>
      <input type="text" bind:value={seedText} oninput={rebuild} maxlength="24" />
    </label>
    <label>
      <span class="smallcaps">Density {density}</span>
      <input type="range" min="30" max="600" step="10" bind:value={density} oninput={rebuild} />
    </label>
    <button type="button" onclick={randomSeed}>New tree</button>
    {#if !webgl}<p class="note">WebGL unavailable — static render.</p>{/if}
  </form>
</div>

<style>
  .stage { position: relative; min-height: 100vh; }
  canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
  .controls {
    position: fixed; top: var(--space-3); right: var(--space-3); z-index: 20;
    display: grid; gap: var(--space-3); width: min(18rem, 80vw);
    background: color-mix(in srgb, var(--field) 82%, transparent);
    backdrop-filter: blur(8px);
    border: 1px solid var(--line); border-radius: 0.5rem;
    padding: var(--space-3);
  }
  label { display: grid; gap: var(--space-1); font-size: var(--text-sm); color: var(--mark-muted); }
  input[type='text'] {
    background: var(--field-raised); color: var(--mark);
    border: 1px solid var(--line); border-radius: 0.25rem;
    padding: var(--space-1) var(--space-2); font-family: var(--font-body);
  }
  input[type='range'] { accent-color: var(--accent); }
  button {
    background: none; color: var(--accent); border: 1px solid var(--accent);
    border-radius: 999px; padding: var(--space-1) var(--space-3);
    cursor: pointer; font-family: var(--font-body); font-size: var(--text-sm);
    transition: all var(--dur-1) var(--ease-weighted);
  }
  button:hover { background: var(--accent); color: var(--field); }
  .note { font-size: var(--text-sm); color: var(--mark-muted); }
</style>
```

- [ ] **Step 2: Replace `src/experiments/bdl-001/Experiment.astro`**

```astro
---
import BarkEngine from './BarkEngine.svelte';
---
<BarkEngine client:load />
```

- [ ] **Step 3: Verify in browser**

Run: `npm run dev`, open `http://localhost:4321/lab/bdl-001`
Expected: full-screen bark; typing in Seed regenerates live; density slider works; "New tree" randomizes; same seed always reproduces the same tree; theme toggle elsewhere (or DevTools `dataset.theme`) recolors marks; specimen plate still opens over it. No console errors.

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: success; `/lab/bdl-001/index.html` in `dist`.

- [ ] **Step 5: Commit**

```powershell
git add -A; git commit -m "feat(lab): BDL-001 Bark Engine — playable generative bark"
```

---

### Task 10: Home page

**Files:**
- Modify: `src/pages/index.astro` (replace placeholder entirely)

**Interfaces:**
- Consumes: `BaseLayout`, `BarkField`, `SpecimenCard`, collection `lab`.

- [ ] **Step 1: Write `src/pages/index.astro`**

```astro
---
import { getCollection } from 'astro:content';
import BaseLayout from '../layouts/BaseLayout.astro';
import BarkField from '../components/BarkField.astro';
import SpecimenCard from '../components/SpecimenCard.astro';

const featured = (await getCollection('lab', ({ data }) => data.featured && data.status === 'live'))
  .sort((a, b) => b.data.designation.localeCompare(a.data.designation))
  .slice(0, 3);
---
<BaseLayout
  title="Birch Design Lab — Custom websites and software"
  description="A design lab building custom websites and custom software for businesses that want to grow. Quiet, fast, built to last."
>
  <section class="hero">
    <BarkField density={170} />
    <div class="wrap hero-copy">
      <h1 class="smallcaps">Birch Design Lab</h1>
      <!-- provisional copy: tagline candidate, founder may replace -->
      <p class="tagline">First green after the fire &mdash; and the bark you write on.</p>
      <p class="lede">Custom websites and custom software, built with care that shows.</p>
      <a class="cta" href="/contact">Start a conversation</a>
    </div>
  </section>

  <section class="wrap teaser">
    <h2 data-reveal>What we build</h2>
    <div class="cols">
      <!-- provisional copy -->
      <article data-reveal>
        <h3>Websites</h3>
        <p>
          A site that loads instantly, reads beautifully, and makes your
          business look like the one to call. Designed and built by hand —
          no templates, no page builders.
        </p>
      </article>
      <article data-reveal>
        <h3>Software</h3>
        <p>
          The tool your business actually needs — the spreadsheet that became
          a monster, the process that eats your Fridays — designed, built,
          and maintained for you.
        </p>
      </article>
    </div>
    <a class="more" href="/services" data-reveal>How we work &rarr;</a>
  </section>

  {featured.length > 0 && (
    <section class="wrap featured">
      <h2 data-reveal>From the Lab</h2>
      <div>
        {featured.map((entry) => <SpecimenCard entry={entry} />)}
      </div>
      <a class="more" href="/lab" data-reveal>The full catalog &rarr;</a>
    </section>
  )}
</BaseLayout>

<style>
  .hero {
    position: relative; min-height: 88vh;
    display: grid; align-items: center;
    border-bottom: 1px solid var(--line);
    overflow: hidden;
  }
  .hero-copy { position: relative; }
  h1 { font-size: var(--text-hero); font-weight: 500; }
  .tagline {
    font-family: var(--font-display); font-size: var(--text-xl);
    color: var(--mark-muted); margin-top: var(--space-3); max-width: 30ch;
  }
  .lede { margin-top: var(--space-4); max-width: 44ch; }
  .cta {
    display: inline-block; margin-top: var(--space-5);
    color: var(--accent); border: 1px solid var(--accent);
    border-radius: 999px; padding: var(--space-2) var(--space-5);
    text-decoration: none;
    transition: all var(--dur-1) var(--ease-weighted);
  }
  .cta:hover { background: var(--accent); color: var(--field); }
  .teaser, .featured { padding-block: var(--space-7) 0; }
  .cols {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
    gap: var(--space-5); margin-top: var(--space-4);
  }
  .cols p { color: var(--mark-muted); margin-top: var(--space-2); max-width: 44ch; }
  .more { display: inline-block; margin-top: var(--space-4); }
  .featured > div { margin-top: var(--space-4); border-bottom: 1px solid var(--line); }
</style>
```

- [ ] **Step 2: Verify in browser**

Run: `npm run dev`, open `http://localhost:4321`
Expected: full-height hero with breathing bark behind wordmark + tagline; BDL-001 card under "From the Lab"; reveals rise gently on scroll; light theme inverts cleanly; reduced-motion → static bark, instant reveals.

- [ ] **Step 3: Commit**

```powershell
git add -A; git commit -m "feat(pages): home — bark hero, services teaser, featured specimens"
```

---

### Task 11: Services page

**Files:**
- Create: `src/pages/services.astro`

- [ ] **Step 1: Write `src/pages/services.astro`**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---
<BaseLayout
  title="Services — Birch Design Lab"
  description="Custom websites and custom software for businesses that want to grow — designed, built, and cared for by one accountable craftsman."
>
  <section class="wrap">
    <header class="intro">
      <h1>Services</h1>
      <!-- provisional copy throughout this page -->
      <p>
        Two things, done properly: websites and software. Both custom,
        both built to last, both explained in plain English.
      </p>
    </header>

    <article class="service" data-reveal>
      <h2>Custom websites</h2>
      <p>
        Your website is the first impression most customers will ever get.
        Ours load fast, read clearly on any phone, and are designed around
        one question: what should a visitor do next? No templates, no
        page-builder bloat — every site is drawn and built for the business
        it belongs to.
      </p>
    </article>

    <article class="service" data-reveal>
      <h2>Custom software</h2>
      <p>
        Every business has one: the spreadsheet held together with tape, the
        process that eats an afternoon a week, the "system" that lives in one
        employee's head. We build the small, sturdy tool that replaces it —
        and we stay around to keep it running.
      </p>
    </article>

    <section class="process" data-reveal>
      <h2>How a project runs</h2>
      <ol>
        <li>
          <h3>Discovery</h3>
          <!-- provisional copy: the retired fathom line, available not required -->
          <p>We take the measure of the problem before proposing anything — your business, your customers, what "working" would actually mean.</p>
        </li>
        <li>
          <h3>Build</h3>
          <p>Design and construction in the open. You see real progress at real intervals, not a big reveal at the end.</p>
        </li>
        <li>
          <h3>Launch</h3>
          <p>Tested, fast, and yours. We handle the technical moving parts — domains, hosting, the lot.</p>
        </li>
        <li>
          <h3>Care</h3>
          <p>Software is a living thing. We offer ongoing care so it stays fast, secure, and current as your business grows.</p>
        </li>
      </ol>
    </section>

    <p class="cta-row" data-reveal>
      <a class="cta" href="/contact">Tell us about your project</a>
    </p>
  </section>
</BaseLayout>

<style>
  .intro { padding-block: var(--space-6) var(--space-5); max-width: 52ch; }
  .intro p { color: var(--mark-muted); margin-top: var(--space-3); }
  .service { padding-block: var(--space-5); border-top: 1px solid var(--line); max-width: 60ch; }
  .service p { color: var(--mark-muted); margin-top: var(--space-3); }
  .process { padding-block: var(--space-5); border-top: 1px solid var(--line); }
  .process ol {
    list-style: none; padding: 0; margin-top: var(--space-4);
    display: grid; grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
    gap: var(--space-5);
    counter-reset: step;
  }
  .process li { counter-increment: step; }
  .process h3::before {
    content: counter(step, decimal-leading-zero);
    display: block; color: var(--accent); font-size: var(--text-sm);
    letter-spacing: var(--tracking-wide); margin-bottom: var(--space-1);
  }
  .process p { color: var(--mark-muted); margin-top: var(--space-2); font-size: var(--text-sm); }
  .cta-row { padding-block: var(--space-6); }
  .cta {
    color: var(--accent); border: 1px solid var(--accent); border-radius: 999px;
    padding: var(--space-2) var(--space-5); text-decoration: none;
    transition: all var(--dur-1) var(--ease-weighted);
  }
  .cta:hover { background: var(--accent); color: var(--field); }
</style>
```

- [ ] **Step 2: Verify in browser** — `http://localhost:4321/services`: intro, two services, numbered process, CTA. Both themes.

- [ ] **Step 3: Commit**

```powershell
git add -A; git commit -m "feat(pages): services with four-step process"
```

---

### Task 12: About page

**Files:**
- Create: `src/pages/about.astro`

- [ ] **Step 1: Write `src/pages/about.astro`** (source: founding record §2; all copy provisional)

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import BarkField from '../components/BarkField.astro';
---
<BaseLayout
  title="About — Birch Design Lab"
  description="Why a birch: the etymology, the founding myth, and the person behind Birch Design Lab."
>
  <section class="wrap">
    <header class="intro">
      <h1>About</h1>
    </header>

    <!-- provisional copy throughout; source of truth: founding record §2 -->
    <article class="epic" data-reveal>
      <p class="etym">
        <em>Birch</em> &mdash; Old English <em>beorc</em>, from a root that
        meant <strong>to shine</strong>: the same ancient syllable that gave
        us <em>bright</em>. The birch is the shining tree &mdash; white
        against the dark wood, first to return after fire, the threshold
        tree of the north.
      </p>
    </article>

    <article class="myth" data-reveal>
      <h2>Two facts about the tree</h2>
      <p>
        First: birch is a pioneer species. After a burn it arrives before
        anything else, stabilizes the ruined ground, and makes the forest
        possible again.
      </p>
      <p>
        Second: birch bark is the oldest paper of the north. The medieval
        letters dug out of Novgorod's mud — shopping lists, love notes, a
        child's homework — were scratched into birch bark and survived eight
        hundred years. The shining tree is also the tree you could write on:
        the original carrier of everyday human messages.
      </p>
      <p>
        For a business that builds the surfaces where small companies speak
        to the world, that is not decoration. That is the job description,
        growing in the yard.
      </p>
    </article>

    <article class="founder" data-reveal>
      <h2>The founder</h2>
      <p>
        Birch Design Lab is one person — a builder of websites and software
        who happens to resemble the namesake: tall, pale, and better suited
        to the north than to the Gulf Coast he currently calls home. Every
        project here is designed, built, and cared for by the same pair of
        hands you shake.
      </p>
    </article>

    <div class="field-strip" data-reveal>
      <BarkField density={90} />
      <!-- provisional copy: credo candidate -->
      <p class="credo smallcaps">First green after the fire &mdash; and the bark you write on.</p>
    </div>
  </section>
</BaseLayout>

<style>
  .intro { padding-block: var(--space-6) var(--space-4); }
  .epic, .myth, .founder { padding-block: var(--space-5); border-top: 1px solid var(--line); max-width: 60ch; }
  .etym { font-family: var(--font-display); font-size: var(--text-xl); line-height: 1.4; }
  .myth p, .founder p { color: var(--mark-muted); margin-top: var(--space-3); }
  .field-strip {
    position: relative; margin-block: var(--space-6);
    min-height: 14rem; display: grid; place-items: center;
    border-block: 1px solid var(--line); overflow: hidden;
  }
  .credo { position: relative; font-size: var(--text-lg); text-align: center; padding-inline: var(--space-4); }
</style>
```

- [ ] **Step 2: Verify in browser** — `http://localhost:4321/about`: etymology in display serif, myth, founder, bark strip with credo. Both themes.

- [ ] **Step 3: Commit**

```powershell
git add -A; git commit -m "feat(pages): about — etymology, founding myth, founder"
```

---

### Task 13: Contact page and 404

**Files:**
- Create: `src/pages/contact.astro`, `src/pages/404.astro`

**Decision of record:** launch with a styled email link, not a form — zero backend, zero spam surface. A form (Cloudflare Pages Functions) is a documented later renovation.

- [ ] **Step 1: Write `src/pages/contact.astro`**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
const email = 'hello@birchdesignlab.com'; // provisional until mailbox exists
---
<BaseLayout
  title="Contact — Birch Design Lab"
  description="Start a conversation with Birch Design Lab about your website or software project."
>
  <section class="wrap">
    <header class="intro">
      <h1>Contact</h1>
      <!-- provisional copy -->
      <p>
        Tell us what you're trying to build, fix, or grow. Plain English is
        the house language — no preparation required.
      </p>
    </header>
    <p class="line" data-reveal>
      <a class="mail" href={`mailto:${email}`}>{email}</a>
    </p>
    <!-- Renovation slot: contact form via Cloudflare Pages Functions when volume justifies it. -->
  </section>
</BaseLayout>

<style>
  .intro { padding-block: var(--space-6) var(--space-4); max-width: 52ch; }
  .intro p { color: var(--mark-muted); margin-top: var(--space-3); }
  .line { padding-block: var(--space-5) var(--space-7); }
  .mail { font-family: var(--font-display); font-size: var(--text-2xl); }
</style>
```

- [ ] **Step 2: Write `src/pages/404.astro`**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import BarkField from '../components/BarkField.astro';
---
<BaseLayout title="Not found — Birch Design Lab" description="This page does not exist.">
  <section class="lost">
    <BarkField density={220} />
    <div class="wrap copy">
      <h1 class="smallcaps">Off the trail</h1>
      <p>This page doesn't exist — but the trees are nice here.</p>
      <a href="/">Back to the clearing &rarr;</a>
    </div>
  </section>
</BaseLayout>

<style>
  .lost {
    position: relative; min-height: 70vh;
    display: grid; align-items: center; overflow: hidden;
  }
  .copy { position: relative; }
  .copy p { color: var(--mark-muted); margin-block: var(--space-3) var(--space-4); }
</style>
```

- [ ] **Step 3: Verify** — `/contact` renders email large in display serif; any bogus URL in `npm run preview` (after `npm run build`) serves the 404 page.

- [ ] **Step 4: Commit**

```powershell
git add -A; git commit -m "feat(pages): contact (email-first) and generative 404"
```

---

### Task 14: Full verification pass + deploy preparation

**Files:**
- Create: `docs/deploy.md`

- [ ] **Step 1: Static checks**

Run: `npm test; npm run check; npm run build`
Expected: all pass, zero errors.

- [ ] **Step 2: Manual pass against spec §9** — `npm run preview`, then verify each:

- Every page in **both themes** (toggle + reload persistence).
- **Reduced motion** (DevTools rendering emulation): bark static, reveals instant, no smooth-scroll.
- **JS disabled** (DevTools): all core-page content readable; nav/footer work; bark canvas simply absent; `/lab/bdl-001` shows specimen plate + noscript notice.
- **Mobile viewport** (375px): header wraps, hero readable, catalog usable, BDL-001 controls usable.
- **Keyboard only:** skip link appears on first Tab; every interactive element reachable with visible focus.
- **Lighthouse** (Chrome DevTools, mobile, each core page): Performance / Accessibility / Best Practices / SEO — expect 95+ each, chase 100s; document any exception and its cause in the commit message. Common fixes: font `display=swap` is default in fontsource CSS; ensure hero canvas doesn't block LCP (it's transparent behind text — LCP is the h1).

- [ ] **Step 3: Contrast audit** — check `--accent` on `--field`, `--mark-muted` on `--field`, in both themes (WebAIM contrast checker or DevTools). All body-size text ≥ 4.5:1; adjust the failing primitive in `tokens.css` only (e.g. lighten `--green-kelly-soft` toward `#9dc2a8` or darken `--green-hunter` toward `#2c4736`), rerun.

- [ ] **Step 4: Write `docs/deploy.md`**

```markdown
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
```

- [ ] **Step 5: Push to GitHub**

If no remote exists yet:

```powershell
gh repo create birchdesignlab --private --source . --push
```

Expected: repo created, main pushed. (Cloudflare Pages connection is a founder dashboard step per `docs/deploy.md` — requires account interaction; stop and hand off there.)

- [ ] **Step 6: Commit any remaining changes**

```powershell
git add -A; git commit -m "docs: deploy runbook; final verification fixes"
```

---

## Post-plan backlog (separate plans, not this one)

- **BDL-002 Novgorod Letters** — full build (scratch-to-reveal WebGL, sourced letter translations). Own spec/plan.
- **BDL-003** — the "view source and gasp" CSS feat. Concept chosen at its own planning time.
- Work/case-studies and Field Notes sections; contact form; Sanity loader swap; OG image generation — all reserved-room items from spec §8.
