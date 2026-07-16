# BDL-003 Novgorod Letters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `/lab/bdl-003`: a scratch-to-reveal reader for three real Novgorod birch-bark letters, per `docs/superpowers/specs/2026-07-16-bdl-003-novgorod-letters-design.md`.

**Architecture:** Pure scratch math (`src/lib/scratch/`) tested with vitest; canvas2D layer compositing for the reveal (stroke layer and translation layer, each masked by a painted scratch mask); the living bark underneath reuses `src/lib/bark/`. Svelte 5 islands per house pattern (BDL-001 precedent), Astro wrapper, registry line, content entry flips live.

**Tech Stack:** Astro 5, Svelte 5 (runes), TypeScript, canvas2D, existing bark renderer, vitest, zod.

## Global Constraints

- Writing rules: NO emdash characters anywhere, ever (copy, code comments, commit messages). Human voice. Title separators are middots (·).
- Core site holds WCAG AA; Lab experiments are exempt with the specimen plate as the accessible fallback.
- Reduced motion: no lift/bloom animation; scratching still works; completion swaps layers without glow.
- All translations written in-house, plain English (originals are public domain; modern scholarly translations are not).
- Run `npm run check` and `npm test` before every commit; push after committing (founder standing order).
- Follow existing file/naming patterns: experiment folder `src/experiments/bdl-003/`, pure math in `src/lib/`, tests in `tests/`.

---

### Task 1: Letter data schema

**Files:**
- Create: `src/lib/scratch/letter-schema.ts`
- Test: `tests/letter-schema.test.ts`

**Interfaces:**
- Produces: `letterSchema` (zod object), `type LetterData = z.infer<typeof letterSchema>` with fields `{ id: string; gramota: number; caption: string; circa: string; transcription: string; translation: string; viewBox: string; strokes: string[] }`. Tasks 4, 5, 6 consume `LetterData`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/letter-schema.test.ts
import { describe, expect, it } from 'vitest';
import { letterSchema } from '../src/lib/scratch/letter-schema';

const valid = {
  id: 'onfim',
  gramota: 202,
  caption: "a child's homework",
  circa: 'c. 1260',
  transcription: 'невѣжѧ писа недума каза',
  translation: 'Ignoramus wrote it, dimwit showed it.',
  viewBox: '0 0 100 60',
  strokes: ['M10 10 L20 12', 'M22 10 L30 14'],
};

describe('letterSchema', () => {
  it('accepts a complete letter', () => {
    expect(letterSchema.parse(valid)).toEqual(valid);
  });
  it('rejects empty strokes array', () => {
    expect(() => letterSchema.parse({ ...valid, strokes: [] })).toThrow();
  });
  it('rejects empty translation', () => {
    expect(() => letterSchema.parse({ ...valid, translation: '' })).toThrow();
  });
  it('rejects a malformed viewBox', () => {
    expect(() => letterSchema.parse({ ...valid, viewBox: 'wide' })).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/letter-schema.test.ts`
Expected: FAIL, cannot resolve `../src/lib/scratch/letter-schema`

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/scratch/letter-schema.ts
/** Data contract for one Novgorod letter. One file per letter (spec §3). */
import { z } from 'zod';

export const letterSchema = z.object({
  id: z.string().min(1),
  gramota: z.number().int().positive(),
  caption: z.string().min(1),        // plate label, e.g. "a child's homework"
  circa: z.string().min(1),          // e.g. "c. 1260"
  transcription: z.string().min(1),  // original text, public domain
  translation: z.string().min(1),    // ours, plain English, house writing rules
  viewBox: z.string().regex(/^\d+ \d+ \d+ \d+$/),
  strokes: z.array(z.string().min(1)).min(1), // SVG path d strings, hand-traced
});

export type LetterData = z.infer<typeof letterSchema>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/letter-schema.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Full check and commit**

Run: `npm run check && npm test`
Expected: 0 errors, all tests pass (26 existing + 4 new)

```bash
git add src/lib/scratch/letter-schema.ts tests/letter-schema.test.ts
git commit -m "feat(bdl-003): letter data schema"
git push
```

---

### Task 2: Scratch coverage math and dig phases

**Files:**
- Create: `src/lib/scratch/coverage.ts`
- Test: `tests/scratch-coverage.test.ts`

**Interfaces:**
- Produces (Task 5 consumes all of these):
  - `createGrid(cols: number, rows: number): CoverageGrid` where `interface CoverageGrid { cols: number; rows: number; cells: Uint8Array; painted: number }`
  - `paintCircle(grid: CoverageGrid, cx: number, cy: number, r: number): number` (coords and radius normalized 0..1 of grid space; returns count of newly painted cells)
  - `fractionPainted(grid: CoverageGrid, over?: Uint8Array): number` (0..1; when `over` given, fraction of that cell mask painted)
  - `type DigPhase = 'dig' | 'complete' | 'bloom'`
  - `advancePhase(phase: DigPhase, strokeProgress: number, rubSinceComplete: number): DigPhase` with thresholds `STROKE_DONE = 0.85`, `BLOOM_RUB = 0.12` (both exported)

- [ ] **Step 1: Write the failing test**

```ts
// tests/scratch-coverage.test.ts
import { describe, expect, it } from 'vitest';
import {
  createGrid, paintCircle, fractionPainted,
  advancePhase, STROKE_DONE, BLOOM_RUB,
} from '../src/lib/scratch/coverage';

describe('coverage grid', () => {
  it('starts empty', () => {
    const g = createGrid(10, 10);
    expect(fractionPainted(g)).toBe(0);
  });
  it('painting the center covers cells once', () => {
    const g = createGrid(10, 10);
    const first = paintCircle(g, 0.5, 0.5, 0.2);
    expect(first).toBeGreaterThan(0);
    expect(paintCircle(g, 0.5, 0.5, 0.2)).toBe(0); // idempotent repaint
    expect(fractionPainted(g)).toBeCloseTo(first / 100, 5);
  });
  it('a huge circle paints everything', () => {
    const g = createGrid(8, 8);
    paintCircle(g, 0.5, 0.5, 2);
    expect(fractionPainted(g)).toBe(1);
  });
  it('fractionPainted over a mask counts only masked cells', () => {
    const g = createGrid(2, 2);
    const mask = new Uint8Array([1, 0, 0, 1]); // two stroke cells
    paintCircle(g, 0.25, 0.25, 0.3); // paints top-left region
    expect(fractionPainted(g, mask)).toBeCloseTo(0.5, 5);
  });
  it('clamps circles at the edges without crashing', () => {
    const g = createGrid(4, 4);
    expect(() => paintCircle(g, -0.1, 1.2, 0.3)).not.toThrow();
  });
});

describe('advancePhase', () => {
  it('stays in dig below the stroke threshold', () => {
    expect(advancePhase('dig', STROKE_DONE - 0.01, 0)).toBe('dig');
  });
  it('moves dig to complete at the stroke threshold', () => {
    expect(advancePhase('dig', STROKE_DONE, 0)).toBe('complete');
  });
  it('moves complete to bloom after enough further rubbing', () => {
    expect(advancePhase('complete', 1, BLOOM_RUB)).toBe('bloom');
    expect(advancePhase('complete', 1, BLOOM_RUB - 0.01)).toBe('complete');
  });
  it('bloom is terminal', () => {
    expect(advancePhase('bloom', 0, 0)).toBe('bloom');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/scratch-coverage.test.ts`
Expected: FAIL, cannot resolve `../src/lib/scratch/coverage`

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/scratch/coverage.ts
/** Pure scratch math: renderer-agnostic by spec (mirrors bark's pattern core). */

export interface CoverageGrid {
  cols: number;
  rows: number;
  cells: Uint8Array; // 0 untouched, 1 painted
  painted: number;
}

export function createGrid(cols: number, rows: number): CoverageGrid {
  return { cols, rows, cells: new Uint8Array(cols * rows), painted: 0 };
}

/** Paint a circle (normalized coords/radius). Returns newly painted cell count. */
export function paintCircle(g: CoverageGrid, cx: number, cy: number, r: number): number {
  const px = cx * g.cols, py = cy * g.rows;
  const rx = r * g.cols, ry = r * g.rows;
  const x0 = Math.max(0, Math.floor(px - rx)), x1 = Math.min(g.cols - 1, Math.ceil(px + rx));
  const y0 = Math.max(0, Math.floor(py - ry)), y1 = Math.min(g.rows - 1, Math.ceil(py + ry));
  let added = 0;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = (x + 0.5 - px) / rx, dy = (y + 0.5 - py) / ry;
      if (dx * dx + dy * dy > 1) continue;
      const i = y * g.cols + x;
      if (!g.cells[i]) { g.cells[i] = 1; added++; }
    }
  }
  g.painted += added;
  return added;
}

/** Painted fraction of the whole grid, or of the cells set in `over`. */
export function fractionPainted(g: CoverageGrid, over?: Uint8Array): number {
  if (!over) return g.painted / (g.cols * g.rows);
  let total = 0, hit = 0;
  for (let i = 0; i < over.length; i++) {
    if (!over[i]) continue;
    total++;
    if (g.cells[i]) hit++;
  }
  return total === 0 ? 0 : hit / total;
}

export type DigPhase = 'dig' | 'complete' | 'bloom';

/** Dig completes at 85% of stroke cells; bloom needs 12% more rubbing after. */
export const STROKE_DONE = 0.85;
export const BLOOM_RUB = 0.12;

export function advancePhase(
  phase: DigPhase,
  strokeProgress: number,
  rubSinceComplete: number,
): DigPhase {
  if (phase === 'dig') return strokeProgress >= STROKE_DONE ? 'complete' : 'dig';
  if (phase === 'complete') return rubSinceComplete >= BLOOM_RUB ? 'bloom' : 'complete';
  return 'bloom';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/scratch-coverage.test.ts`
Expected: PASS (9 tests)

- [ ] **Step 5: Full check and commit**

Run: `npm run check && npm test`
Expected: 0 errors, all tests pass

```bash
git add src/lib/scratch/coverage.ts tests/scratch-coverage.test.ts
git commit -m "feat(bdl-003): scratch coverage math and dig phases"
git push
```

---

### Task 3: Provisional letter data files

The engine builds and tunes against provisional strokes; Task 8 replaces them with museum-grade traces. Provisional strokes are simple legible path sets so the dig is exercised end to end, and each file carries a `PROVISIONAL` note that Task 8 removes.

**Files:**
- Create: `src/experiments/bdl-003/letters/onfim.ts`
- Create: `src/experiments/bdl-003/letters/love-letter.ts`
- Create: `src/experiments/bdl-003/letters/household-list.ts`
- Create: `src/experiments/bdl-003/letters/index.ts`
- Test: `tests/bdl-003-letters.test.ts`

**Interfaces:**
- Consumes: `letterSchema`, `LetterData` from Task 1.
- Produces: `letters: LetterData[]` (ordered: onfim, love-letter, household-list) exported from `src/experiments/bdl-003/letters/index.ts`. Tasks 5 and 6 consume this.

- [ ] **Step 1: Write the failing test**

```ts
// tests/bdl-003-letters.test.ts
import { describe, expect, it } from 'vitest';
import { letterSchema } from '../src/lib/scratch/letter-schema';
import { letters } from '../src/experiments/bdl-003/letters';

describe('bdl-003 letters', () => {
  it('ships exactly three letters', () => {
    expect(letters).toHaveLength(3);
  });
  it('every letter validates against the schema', () => {
    for (const l of letters) expect(() => letterSchema.parse(l)).not.toThrow();
  });
  it('ids are unique and expected', () => {
    expect(letters.map((l) => l.id)).toEqual(['onfim', 'love-letter', 'household-list']);
  });
  it('translations contain no emdash', () => {
    for (const l of letters) {
      expect(l.translation).not.toMatch(/—|–/);
      expect(l.caption).not.toMatch(/—|–/);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/bdl-003-letters.test.ts`
Expected: FAIL, cannot resolve letters index

- [ ] **Step 3: Write the three letter files and the index**

```ts
// src/experiments/bdl-003/letters/onfim.ts
// PROVISIONAL STROKES: replaced by hand-traced paths in the asset pass (Task 8).
// Transcription is the public-domain gramota 202 text; translation is ours.
import type { LetterData } from '../../../lib/scratch/letter-schema';

export const onfim: LetterData = {
  id: 'onfim',
  gramota: 202,
  caption: "a child's homework",
  circa: 'c. 1260',
  transcription: 'абвгдежѕзиіклмнопрстуфхцчшщъыьѣюѫѧ',
  translation:
    'Alphabet practice by Onfim, a boy of about seven. In the margin he drew himself as a warrior on horseback, spearing an enemy, and signed it with his name.',
  viewBox: '0 0 400 240',
  strokes: [
    'M20 40 L48 36 M52 38 L74 42', 'M84 34 L110 44', 'M120 36 L150 40',
    'M20 80 L60 78 M66 80 L98 84', 'M110 76 L160 82',
    'M20 120 L54 118 M60 122 L92 118', 'M104 120 L148 124',
    'M240 60 C260 40 300 44 316 70 M250 120 L250 180 M250 140 L300 130 L320 96',
    'M250 180 L230 220 M250 180 L274 220',
  ],
};
```

```ts
// src/experiments/bdl-003/letters/love-letter.ts
// PROVISIONAL STROKES: replaced by hand-traced paths in the asset pass (Task 8).
// Transcription is the public-domain gramota 752 text (opening lines);
// translation is ours.
import type { LetterData } from '../../../lib/scratch/letter-schema';

export const loveLetter: LetterData = {
  id: 'love-letter',
  gramota: 752,
  caption: 'a love note',
  circa: 'c. 1100',
  transcription: 'к тобѣ трижь а въ сю недѣлю цьто до мьнь зъла имееши оже еси къ мънѣ нь приходилъ',
  translation:
    'I sent to you three times. What ill will do you hold against me, that you did not come to me this week? I treated you like a brother. Does it please you when I suffer? If you had cared, you would have torn yourself from company and come.',
  viewBox: '0 0 400 200',
  strokes: [
    'M18 40 L58 36 M64 40 L96 44 M104 38 L140 42', 'M150 36 L196 44',
    'M210 40 L252 38 M258 42 L300 40', 'M310 36 L370 44',
    'M18 100 L70 96 M78 100 L120 104', 'M132 98 L188 104 M196 100 L240 98',
    'M252 102 L310 96', 'M320 100 L376 104',
    'M18 160 L64 156 M72 160 L118 164 M128 158 L180 162',
  ],
};
```

```ts
// src/experiments/bdl-003/letters/household-list.ts
// PROVISIONAL STROKES: replaced by hand-traced paths in the asset pass (Task 8).
// The specific gramota is confirmed at trace time (spec §3); gramota 682's
// household instructions are the working choice. Translation is ours.
import type { LetterData } from '../../../lib/scratch/letter-schema';

export const householdList: LetterData = {
  id: 'household-list',
  gramota: 682,
  caption: 'a household list',
  circa: 'c. 1180',
  transcription: 'поклоно ѿ харитании ко софии',
  translation:
    'A note about household money and goods: sums owed, cloth to be bought, and a reminder to send it all quickly.',
  viewBox: '0 0 400 160',
  strokes: [
    'M20 36 L64 40 M72 36 L110 42', 'M120 38 L170 34 M180 40 L224 36',
    'M20 80 L58 84 M66 80 L104 86 M114 82 L156 78', 'M168 84 L220 80',
    'M20 124 L70 120 M80 126 L128 122', 'M140 124 L200 128',
  ],
};
```

```ts
// src/experiments/bdl-003/letters/index.ts
/** Table order: homework, love note, list (the founding record's trinity). */
import { onfim } from './onfim';
import { loveLetter } from './love-letter';
import { householdList } from './household-list';
import type { LetterData } from '../../../lib/scratch/letter-schema';

export const letters: LetterData[] = [onfim, loveLetter, householdList];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/bdl-003-letters.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Full check and commit**

Run: `npm run check && npm test`
Expected: 0 errors, all tests pass

```bash
git add src/experiments/bdl-003/letters tests/bdl-003-letters.test.ts
git commit -m "feat(bdl-003): three letters, provisional strokes"
git push
```

---

### Task 4: DigCanvas component (the scratch reveal)

One letter's dig: bark surface underneath (existing renderer), stroke layer and translation layer composited through painted masks, pointer scratching, phase transitions.

**Files:**
- Create: `src/experiments/bdl-003/DigCanvas.svelte`

**Interfaces:**
- Consumes: `LetterData` (Task 1); `createGrid`, `paintCircle`, `fractionPainted`, `advancePhase`, `DigPhase` (Task 2); `generateBark`, `hashString`, `createBarkRenderer`, `renderBark2D` from `src/lib/bark`.
- Produces: Svelte component with props `{ letter: LetterData, onphase?: (phase: DigPhase) => void }`. Exposes its dig state only through `onphase`. Task 5 consumes it.

- [ ] **Step 1: Write the component**

```svelte
<!-- src/experiments/bdl-003/DigCanvas.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import type { LetterData } from '../../lib/scratch/letter-schema';
  import {
    createGrid, paintCircle, fractionPainted, advancePhase,
    STROKE_DONE, type CoverageGrid, type DigPhase,
  } from '../../lib/scratch/coverage';
  import { generateBark, hashString, createBarkRenderer, renderBark2D } from '../../lib/bark';

  let { letter, onphase }: { letter: LetterData; onphase?: (p: DigPhase) => void } = $props();

  let barkCanvas: HTMLCanvasElement;
  let digCanvas: HTMLCanvasElement;

  const GRID = 96;             // coverage grid resolution per axis
  const BRUSH = 0.045;         // scratch radius, normalized
  let grid: CoverageGrid;
  let strokeCells: Uint8Array; // which grid cells contain stroke ink
  let phase: DigPhase = 'dig';
  let rubSinceComplete = 0;
  let bloomAt = 0;             // timestamp of bloom start, for the crossfade

  let strokeLayer: HTMLCanvasElement;      // rasterized incisions
  let translationLayer: HTMLCanvasElement; // rasterized caption text
  let maskLayer: HTMLCanvasElement;        // painted scratch mask
  let reduced: MediaQueryList;

  const markColor = () =>
    getComputedStyle(document.documentElement).getPropertyValue('--mark').trim();
  const accentColor = () =>
    getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();

  function rasterizeStrokes(w: number, h: number): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d')!;
    const [, , vw, vh] = letter.viewBox.split(' ').map(Number);
    ctx.scale(w / vw, h / vh);
    ctx.strokeStyle = markColor();
    ctx.lineWidth = Math.max(1.5, vw / 220);
    ctx.lineCap = 'round';
    for (const d of letter.strokes) ctx.stroke(new Path2D(d));
    return c;
  }

  function rasterizeTranslation(w: number, h: number): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = markColor();
    const size = Math.max(14, Math.round(w / 34));
    ctx.font = `italic ${size}px Spectral, Georgia, serif`;
    ctx.textBaseline = 'top';
    const pad = size * 1.5;
    const words = letter.translation.split(' ');
    let line = '', y = pad;
    for (const word of words) {
      const probe = line ? line + ' ' + word : word;
      if (ctx.measureText(probe).width > w - pad * 2 && line) {
        ctx.fillText(line, pad, y);
        y += size * 1.5;
        line = word;
      } else line = probe;
    }
    ctx.fillText(line, pad, y);
    return c;
  }

  /** Sample the stroke layer down to the coverage grid: cell = 1 if any ink. */
  function sampleStrokeCells(layer: HTMLCanvasElement): Uint8Array {
    const c = document.createElement('canvas');
    c.width = GRID; c.height = GRID;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(layer, 0, 0, GRID, GRID);
    const data = ctx.getImageData(0, 0, GRID, GRID).data;
    const cells = new Uint8Array(GRID * GRID);
    for (let i = 0; i < cells.length; i++) if (data[i * 4 + 3] > 8) cells[i] = 1;
    return cells;
  }

  function composite() {
    const ctx = digCanvas.getContext('2d')!;
    const { width: w, height: h } = digCanvas;
    ctx.clearRect(0, 0, w, h);

    // strokes, visible only where scratched
    const scratched = document.createElement('canvas');
    scratched.width = w; scratched.height = h;
    const sctx = scratched.getContext('2d')!;
    sctx.drawImage(strokeLayer, 0, 0);
    sctx.globalCompositeOperation = 'destination-in';
    sctx.drawImage(maskLayer, 0, 0);

    if (phase === 'bloom') {
      const t = reduced.matches ? 1 : Math.min(1, (performance.now() - bloomAt) / 900);
      ctx.globalAlpha = 1 - t;
      ctx.drawImage(scratched, 0, 0);
      ctx.globalAlpha = t;
      ctx.drawImage(translationLayer, 0, 0);
      ctx.globalAlpha = 1;
      if (t < 1) requestAnimationFrame(composite);
    } else {
      ctx.drawImage(scratched, 0, 0);
      if (phase === 'complete' && !reduced.matches) {
        // brief glow: strokes redrawn in accent at low alpha
        ctx.globalAlpha = 0.35;
        ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(scratched, 0, 0);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
      }
    }
  }

  function scratch(e: PointerEvent) {
    if (e.buttons === 0 && e.pointerType === 'mouse') return; // mouse must press
    const r = digCanvas.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width;
    const ny = (e.clientY - r.top) / r.height;
    const mctx = maskLayer.getContext('2d')!;
    mctx.fillStyle = '#fff';
    mctx.beginPath();
    mctx.arc(nx * maskLayer.width, ny * maskLayer.height,
      BRUSH * maskLayer.width, 0, Math.PI * 2);
    mctx.fill();
    const added = paintCircle(grid, nx, ny, BRUSH);
    if (phase === 'complete') rubSinceComplete += added / (GRID * GRID) / (1 - STROKE_DONE);
    const next = advancePhase(phase, fractionPainted(grid, strokeCells), rubSinceComplete);
    if (next !== phase) {
      phase = next;
      if (phase === 'bloom') bloomAt = performance.now();
      onphase?.(phase);
    }
    composite();
  }

  onMount(() => {
    reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = Math.round(digCanvas.clientWidth * dpr);
    const h = Math.round(digCanvas.clientHeight * dpr);
    digCanvas.width = w; digCanvas.height = h;

    // living bark beneath the dig
    const dashes = generateBark(hashString(letter.id), { density: 130 });
    const gl = createBarkRenderer(barkCanvas, dashes);
    if (gl) {
      gl.setColors(markColor());
      if (reduced.matches) gl.renderOnce(); else gl.start();
    } else {
      renderBark2D(barkCanvas, dashes, markColor());
    }

    strokeLayer = rasterizeStrokes(w, h);
    translationLayer = rasterizeTranslation(w, h);
    maskLayer = document.createElement('canvas');
    maskLayer.width = w; maskLayer.height = h;
    grid = createGrid(GRID, GRID);
    strokeCells = sampleStrokeCells(strokeLayer);
    composite();

    const mo = new MutationObserver(() => {
      strokeLayer = rasterizeStrokes(w, h);
      translationLayer = rasterizeTranslation(w, h);
      gl?.setColors(markColor());
      composite();
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => { mo.disconnect(); gl?.destroy(); };
  });
</script>

<div class="dig">
  <canvas bind:this={barkCanvas} class="bark" aria-hidden="true"></canvas>
  <canvas
    bind:this={digCanvas}
    class="surface"
    onpointermove={scratch}
    onpointerdown={scratch}
    aria-label={`Scratch to reveal: ${letter.caption}`}
  ></canvas>
</div>

<style>
  .dig { position: relative; width: 100%; height: 100%; touch-action: none; }
  canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
  .surface { cursor: crosshair; }
</style>
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run check`
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add src/experiments/bdl-003/DigCanvas.svelte
git commit -m "feat(bdl-003): DigCanvas scratch reveal"
git push
```

---

### Task 5: The dig site scene

Three fragments on the table, lift to center, return, in-visit state memory.

**Files:**
- Create: `src/experiments/bdl-003/NovgorodLetters.svelte`

**Interfaces:**
- Consumes: `letters` (Task 3), `DigCanvas.svelte` (Task 4), `DigPhase` (Task 2).
- Produces: self-contained Svelte island, no props. Task 6 mounts it.

- [ ] **Step 1: Write the component**

```svelte
<!-- src/experiments/bdl-003/NovgorodLetters.svelte -->
<script lang="ts">
  import { letters } from './letters';
  import DigCanvas from './DigCanvas.svelte';
  import type { DigPhase } from '../../lib/scratch/coverage';

  let active: number | null = $state(null);
  // in-visit memory: phases survive returning to the table (spec §2)
  let phases: DigPhase[] = $state(letters.map(() => 'dig'));

  const status = (p: DigPhase) =>
    p === 'bloom' ? 'read' : p === 'complete' ? 'uncovered' : 'undug';
</script>

<div class="site">
  {#if active === null}
    <p class="smallcaps intro">Three letters from the mud of Novgorod. Choose one and dig.</p>
    <div class="table">
      {#each letters as letter, i}
        <button class="fragment" onclick={() => (active = i)}>
          <span class="frag-shape" aria-hidden="true"></span>
          <span class="plate smallcaps">{letter.caption} · {letter.circa}</span>
          <span class="state">{status(phases[i])}</span>
        </button>
      {/each}
    </div>
  {:else}
    {#key active}
      <div class="stage">
        <DigCanvas
          letter={letters[active]}
          onphase={(p) => { phases[active!] = p; }}
        />
        <p class="plate smallcaps stage-plate">
          {letters[active].caption} · {letters[active].circa} · gramota {letters[active].gramota}
        </p>
        <button class="back" onclick={() => (active = null)}>return to table</button>
      </div>
    {/key}
  {/if}
</div>

<style>
  .site { min-height: 100vh; display: grid; place-items: center; padding: var(--space-5); }
  .intro { color: var(--mark-muted); margin-bottom: var(--space-5); text-align: center; }
  .table { display: flex; flex-wrap: wrap; gap: var(--space-5); justify-content: center; }
  .fragment {
    background: none; border: none; cursor: pointer; display: grid;
    gap: var(--space-2); justify-items: center; color: var(--mark);
    font-family: var(--font-body);
  }
  .frag-shape {
    width: min(16rem, 70vw); height: 9rem; background: var(--field-raised);
    border: 1px solid var(--line);
    border-radius: 45% 55% 52% 48% / 58% 44% 56% 42%; /* torn bark silhouette */
    transition: transform var(--dur-1) var(--ease-weighted);
  }
  .fragment:hover .frag-shape { transform: translateY(-4px); }
  @media (prefers-reduced-motion: reduce) {
    .frag-shape, .fragment:hover .frag-shape { transition: none; transform: none; }
  }
  .plate { color: var(--mark-muted); font-size: var(--text-sm); }
  .state { color: var(--accent); font-size: var(--text-sm); }
  .stage { position: relative; width: min(64rem, 94vw); height: min(70vh, 40rem); }
  .stage-plate { position: absolute; bottom: -2rem; left: 0; }
  .back {
    position: absolute; bottom: -2.2rem; right: 0; background: none;
    color: var(--accent); border: 1px solid var(--accent); border-radius: 999px;
    padding: var(--space-1) var(--space-3); cursor: pointer;
    font-family: var(--font-body); font-size: var(--text-sm);
  }
  .back:hover { background: var(--accent); color: var(--field); }
</style>
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run check`
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add src/experiments/bdl-003/NovgorodLetters.svelte
git commit -m "feat(bdl-003): dig site scene"
git push
```

---

### Task 6: Wire-up, plate content, go live

**Files:**
- Create: `src/experiments/bdl-003/Experiment.astro`
- Modify: `src/experiments/registry.ts`
- Modify: `src/content/lab/bdl-003.md`

**Interfaces:**
- Consumes: `NovgorodLetters.svelte` (Task 5).
- Produces: `/lab/bdl-003` renders live; catalog and plate updated.

- [ ] **Step 1: Astro wrapper (house pattern, BDL-001 precedent)**

```astro
---
// src/experiments/bdl-003/Experiment.astro
import NovgorodLetters from './NovgorodLetters.svelte';
---
<NovgorodLetters client:load />
```

- [ ] **Step 2: Registry line**

In `src/experiments/registry.ts`, add the import and entry:

```ts
import BDL003 from './bdl-003/Experiment.astro';
```

```ts
export const experimentComponents: Record<string, any> = {
  'BDL-001': BDL001,
  'BDL-002': BDL002,
  'BDL-003': BDL003,
};
```

- [ ] **Step 3: Flip the content entry live and write the plate body**

Replace `src/content/lab/bdl-003.md` with (frontmatter `status: live`, `tech` corrected to canvas2d, body carries transcription + translation as the accessible fallback):

```markdown
---
designation: BDL-003
title: Novgorod Letters
summary: 'The oldest paper of the north: medieval birch-bark letters, resurfaced. Scratch to read.'
date: 2026-07-16
tech: [canvas2d, svelte]
device: desktop-forward
status: live
featured: false
---

In the mud of Novgorod, archaeologists keep finding letters scratched
into birch bark eight hundred years ago: shopping lists, love notes, a
child's homework. This experiment puts three of them back under your
stylus. Scratch the bark to uncover the original strokes; keep rubbing
and the strokes give way to plain English.

The letters, for readers who prefer them as text:

**A child's homework · c. 1260 · gramota 202.** Alphabet practice by
Onfim, a boy of about seven. In the margin he drew himself as a warrior
on horseback, spearing an enemy, and signed it with his name.

**A love note · c. 1100 · gramota 752.** "I sent to you three times.
What ill will do you hold against me, that you did not come to me this
week? I treated you like a brother. Does it please you when I suffer?
If you had cared, you would have torn yourself from company and come."

**A household list · c. 1180.** A note about household money and goods:
sums owed, cloth to be bought, and a reminder to send it all quickly.

The originals are public domain; the translations are ours.
```

- [ ] **Step 4: Verify end to end**

Run: `npm run check && npm test && npm run build`
Expected: 0 errors, all tests pass, 10 pages built (was 9; `/lab/bdl-003` added)

Then `npm run dev` and confirm by hand at `http://localhost:4321/lab/bdl-003`:
- table shows three fragments with plates
- clicking a fragment opens the dig; scratching reveals strokes
- continued rubbing past completion blooms the translation
- return to table preserves each letter's state
- theme toggle re-renders layers in the new theme

- [ ] **Step 5: Commit**

```bash
git add src/experiments/bdl-003/Experiment.astro src/experiments/registry.ts src/content/lab/bdl-003.md
git commit -m "feat(bdl-003): Novgorod Letters goes live"
git push
```

---

### Task 7: Dev tuning knobs (founder fiddle round prep)

Feel is locked by hand (spec §6). Expose brush radius, completion threshold and bloom timing as URL params read once at mount, dev-only affordance, no UI.

**Files:**
- Modify: `src/experiments/bdl-003/DigCanvas.svelte`

**Interfaces:**
- Consumes/produces: nothing new outside the component. URL contract: `?brush=0.045&glow=900` on `/lab/bdl-003` overrides defaults for a tuning session.

- [ ] **Step 1: Read overrides at mount**

In `DigCanvas.svelte`, replace the constant declarations:

```ts
  const GRID = 96;             // coverage grid resolution per axis
  const BRUSH = 0.045;         // scratch radius, normalized
```

with:

```ts
  const GRID = 96; // coverage grid resolution per axis
  // Tuning knobs for the founder fiddle round: /lab/bdl-003?brush=0.06&glow=600
  const params = new URLSearchParams(location.search);
  const BRUSH = Number(params.get('brush')) || 0.045; // scratch radius, normalized
  const BLOOM_MS = Number(params.get('glow')) || 900; // bloom crossfade duration
```

and in `composite()` replace the literal `900` with `BLOOM_MS`.

- [ ] **Step 2: Verify**

Run: `npm run check && npm test`
Expected: 0 errors, all pass. By hand: `/lab/bdl-003?brush=0.1` digs with a visibly larger brush.

- [ ] **Step 3: Commit**

```bash
git add src/experiments/bdl-003/DigCanvas.svelte
git commit -m "feat(bdl-003): tuning knobs for the fiddle round"
git push
```

---

### Task 8: Asset pass, hand-traced strokes (human-in-loop)

Museum-grade traces replace the provisional strokes. This task needs artifact drawing references and founder eyes; it cannot be completed autonomously.

**Files:**
- Modify: `src/experiments/bdl-003/letters/onfim.ts`
- Modify: `src/experiments/bdl-003/letters/love-letter.ts`
- Modify: `src/experiments/bdl-003/letters/household-list.ts`

**Interfaces:**
- Consumes/produces: same `LetterData` shape; only `strokes`, `viewBox`, and (for the household list) `gramota`/`transcription` values change. Tests from Task 3 keep guarding the schema.

- [ ] **Step 1: Gather references.** Published line drawings of gramoty 202 and 752, and confirm the household-list gramota (682 is the working choice; swap if a better list surfaces). gramoty.ru hosts the corpus with drawings.
- [ ] **Step 2: Trace.** For each letter, trace the drawing's letterforms into SVG paths (any vector tool; export path `d` strings; viewBox matches the traced document). Onfim's warrior doodle is part of the trace. Shapes are traced, photographs are never embedded.
- [ ] **Step 3: Replace `strokes` and `viewBox`** in each letter file; delete the `PROVISIONAL` comment lines. Update `transcription` for the household list if the gramota changed.
- [ ] **Step 4: Verify.** `npm run check && npm test` (schema tests still pass), then a by-hand dig of all three letters in both themes.
- [ ] **Step 5: Founder review of the dig feel** (Task 7 knobs), lock values into the component defaults if changed.
- [ ] **Step 6: Commit**

```bash
git add src/experiments/bdl-003/letters
git commit -m "feat(bdl-003): museum-grade traced strokes"
git push
```
