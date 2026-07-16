<!-- src/experiments/bdl-003/DigCanvas.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import type { LetterData } from '../../lib/scratch/letter-schema';
  import {
    createGrid, paintCircle, fractionPainted, advancePhase,
    STROKE_DONE, BLOOM_RUB, type CoverageGrid, type DigPhase,
  } from '../../lib/scratch/coverage';
  import { generateBark, hashString, createBarkRenderer, renderBark2D } from '../../lib/bark';

  let { letter, onphase }: { letter: LetterData; onphase?: (p: DigPhase) => void } = $props();

  let barkCanvas: HTMLCanvasElement;
  let digCanvas: HTMLCanvasElement;

  const GRID = 96;             // coverage grid resolution per axis
  const BRUSH = 0.045;         // scratch radius, normalized
  const BLOOM_MS = 900;        // bloom crossfade duration (Task 7 makes this a knob)
  const rubThreshold = BLOOM_RUB; // extra rub needed to bloom (Task 7 makes this a knob)
  let grid: CoverageGrid;
  let strokeCells: Uint8Array; // grid cells holding stroke ink, dilated 1 cell
  let phase: DigPhase = 'dig';
  let rubSinceComplete = 0;
  let bloomAt = 0;             // timestamp of bloom start, for the crossfade
  let bloomRAF = 0;            // guards against stacking crossfade loops

  let strokeLayer: HTMLCanvasElement;      // rasterized incisions
  let translationLayer: HTMLCanvasElement; // rasterized caption text
  let maskLayer: HTMLCanvasElement;        // painted scratch mask
  let reduced: MediaQueryList;

  const markColor = () =>
    getComputedStyle(document.documentElement).getPropertyValue('--mark').trim();
  const barkAlphas = (): [number, number] => {
    const cs = getComputedStyle(document.documentElement);
    return [
      parseFloat(cs.getPropertyValue('--bark-alpha-lo')) || 0.05,
      parseFloat(cs.getPropertyValue('--bark-alpha-hi')) || 0.22,
    ];
  };

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

  /** Wrap text to a max width for a given ctx font. */
  function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
    const out: string[] = [];
    let line = '';
    for (const word of text.split(' ')) {
      const probe = line ? line + ' ' + word : word;
      if (ctx.measureText(probe).width > maxW && line) { out.push(line); line = word; }
      else line = probe;
    }
    if (line) out.push(line);
    return out;
  }

  /** Museum caption in Spectral italic, shrunk until the wrapped lines clear the
      vertical bound so a long translation never spills past the stage. */
  function rasterizeTranslation(w: number, h: number): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = markColor();
    ctx.textBaseline = 'top';
    let size = Math.max(14, Math.round(w / 34));
    let lines: string[] = [];
    for (; size >= 11; size--) {
      ctx.font = `italic ${size}px Spectral, Georgia, serif`;
      const pad = size * 1.5;
      lines = wrapLines(ctx, letter.translation, w - pad * 2);
      if (pad * 2 + lines.length * size * 1.5 <= h) break;
    }
    const pad = size * 1.5;
    let y = pad;
    for (const line of lines) { ctx.fillText(line, pad, y); y += size * 1.5; }
    return c;
  }

  /** Sample the stroke layer to the coverage grid (cell = 1 if any ink), then
      dilate by one cell. Dilation keeps thin or isolated strokes reachable so
      the 85% completion threshold cannot strand the dig short of finishing. */
  function sampleStrokeCells(layer: HTMLCanvasElement): Uint8Array {
    const c = document.createElement('canvas');
    c.width = GRID; c.height = GRID;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(layer, 0, 0, GRID, GRID);
    const data = ctx.getImageData(0, 0, GRID, GRID).data;
    const raw = new Uint8Array(GRID * GRID);
    for (let i = 0; i < raw.length; i++) if (data[i * 4 + 3] > 8) raw[i] = 1;
    const cells = new Uint8Array(GRID * GRID);
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        if (!raw[y * GRID + x]) continue;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < GRID && ny >= 0 && ny < GRID) cells[ny * GRID + nx] = 1;
          }
        }
      }
    }
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
      const t = reduced.matches ? 1 : Math.min(1, (performance.now() - bloomAt) / BLOOM_MS);
      ctx.globalAlpha = 1 - t;
      ctx.drawImage(scratched, 0, 0);
      ctx.globalAlpha = t;
      ctx.drawImage(translationLayer, 0, 0);
      ctx.globalAlpha = 1;
      // one self-driving crossfade loop; a scratch mid-bloom must not spawn a second
      if (t < 1 && !bloomRAF) {
        bloomRAF = requestAnimationFrame(() => { bloomRAF = 0; composite(); });
      }
    } else {
      ctx.drawImage(scratched, 0, 0);
      if (phase === 'complete' && !reduced.matches) {
        // brief glow: the fresh incisions flare, redrawn additively over themselves
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
    const next = advancePhase(
      phase, fractionPainted(grid, strokeCells), rubSinceComplete, rubThreshold,
    );
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
      gl.setAlpha(...barkAlphas());
      if (reduced.matches) gl.renderOnce(); else gl.start();
    } else {
      renderBark2D(barkCanvas, dashes, markColor(), ...barkAlphas());
    }

    strokeLayer = rasterizeStrokes(w, h);
    translationLayer = rasterizeTranslation(w, h);
    maskLayer = document.createElement('canvas');
    maskLayer.width = w; maskLayer.height = h;
    grid = createGrid(GRID, GRID);
    strokeCells = sampleStrokeCells(strokeLayer);
    composite();

    // Web fonts load async and canvas text does not wait for them: re-rasterize
    // the caption once Spectral italic is ready so a fast dig never blooms in the
    // Georgia fallback. Re-composite in case the bloom already happened.
    document.fonts.ready.then(() => {
      translationLayer = rasterizeTranslation(w, h);
      composite();
    });

    // Refit only the bark on container resize (BarkEngine precedent). The dig
    // canvas keeps its mount-time bitmap; the stage size is effectively fixed.
    const ro = new ResizeObserver(() => {
      gl?.resize();
      if (reduced.matches) gl?.renderOnce();
    });
    ro.observe(barkCanvas);

    const mo = new MutationObserver(() => {
      strokeLayer = rasterizeStrokes(w, h);
      translationLayer = rasterizeTranslation(w, h);
      gl?.setColors(markColor());
      gl?.setAlpha(...barkAlphas());
      if (reduced.matches) gl?.renderOnce();
      composite();
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => { ro.disconnect(); mo.disconnect(); gl?.destroy(); };
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
