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
    const ro = new ResizeObserver(() => rebuild());
    ro.observe(canvas);
    const mo = new MutationObserver(() => rebuild());
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => { ro.disconnect(); mo.disconnect(); };
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
