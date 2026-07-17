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
  let wake = $state(true);
  let gust = $state(true);
  let grow = $state(true);

  const markColor = () =>
    getComputedStyle(document.documentElement).getPropertyValue('--mark').trim();
  const barkAlphas = (): [number, number] => {
    const cs = getComputedStyle(document.documentElement);
    return [
      parseFloat(cs.getPropertyValue('--bark-alpha-lo')) || 0.05,
      parseFloat(cs.getPropertyValue('--bark-alpha-hi')) || 0.22,
    ];
  };

  let reduced: MediaQueryList;

  function rebuild() {
    const dashes = generateBark(hashString(seedText), { density });
    if (renderer) {
      renderer.setDashes(dashes);
      renderer.setColors(markColor());
      renderer.setAlpha(...barkAlphas());
      if (reduced?.matches) renderer.renderOnce();
    } else {
      renderBark2D(canvas, dashes, markColor(), ...barkAlphas());
    }
  }

  function randomSeed() {
    seedText = Math.random().toString(36).slice(2, 8);
    rebuild();
    if (grow && !reduced?.matches) renderer?.growTree();
  }

  function setGust(on: boolean) {
    gust = on;
    renderer?.setGust(on);
  }

  let lastPointer = { x: 0.5, y: 0.5 };
  let pulseTimer: ReturnType<typeof setTimeout>;
  // Tap pulse: a bloom of light at the tap that holds a beat and fades.
  // When the bark-peel round lands, this tap becomes the shed trigger.
  function onPointerDown(e: PointerEvent) {
    if (!wake || !renderer || reduced?.matches) return;
    if ((e.target as Element).closest('.controls')) return; // panel clicks don't pulse
    const r = canvas.getBoundingClientRect();
    lastPointer = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
    renderer.setPointer(lastPointer.x, lastPointer.y, 1.8);
    clearTimeout(pulseTimer);
    pulseTimer = setTimeout(() => renderer?.setPointer(lastPointer.x, lastPointer.y, 0), 280);
  }
  function onPointerMove(e: PointerEvent) {
    if (!wake || !renderer || reduced?.matches) return;
    const r = canvas.getBoundingClientRect();
    lastPointer = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
    renderer.setPointer(lastPointer.x, lastPointer.y, 1);
  }
  function onPointerLeave() {
    // keep the last position so the wake fades in place instead of sliding off
    renderer?.setPointer(lastPointer.x, lastPointer.y, 0);
  }

  onMount(() => {
    reduced = matchMedia('(prefers-reduced-motion: reduce)');
    renderer = createBarkRenderer(canvas, generateBark(hashString(seedText), { density }));
    if (renderer) {
      renderer.setColors(markColor());
      renderer.setAlpha(...barkAlphas());
      renderer.setGust(gust);
      if (reduced.matches) renderer.renderOnce();
      else {
        renderer.start();
        if (grow) renderer.growTree();
      }
      const ro = new ResizeObserver(() => {
        renderer?.resize();
        if (reduced.matches) renderer?.renderOnce();
      });
      ro.observe(canvas);
      const mo = new MutationObserver(() => {
        renderer?.setColors(markColor());
        renderer?.setAlpha(...barkAlphas());
        if (reduced.matches) renderer?.renderOnce();
      });
      mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
      const onReducedChange = () => {
        if (reduced.matches) { renderer?.stop(); renderer?.renderOnce(); } else renderer?.start();
      };
      reduced.addEventListener('change', onReducedChange);
      return () => {
        ro.disconnect(); mo.disconnect();
        reduced.removeEventListener('change', onReducedChange);
        renderer?.destroy();
      };
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

<div class="stage" onpointerdown={onPointerDown} onpointermove={onPointerMove} onpointerleave={onPointerLeave}>
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
    {#if webgl}
      <fieldset class="life">
        <legend class="smallcaps">Life</legend>
        <label class="check"><input type="checkbox" bind:checked={wake}
          onchange={() => { if (!wake) onPointerLeave(); }} /> Wake</label>
        <label class="check"><input type="checkbox" checked={gust}
          onchange={(e) => setGust(e.currentTarget.checked)} /> Gust</label>
        <label class="check"><input type="checkbox" bind:checked={grow} /> Grow</label>
      </fieldset>
    {/if}
    <button type="button" onclick={randomSeed}>New tree</button>
    {#if !webgl}<p class="note">WebGL unavailable. Static render.</p>{/if}
  </form>
</div>

<style>
  .stage { position: relative; min-height: 100vh; }
  canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
  .controls {
    /* Bottom-right, clear of the wall label (bottom-left) and above the
       specimen plate's summary strip. */
    position: fixed; bottom: 4.5rem; right: var(--space-3); z-index: 20;
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
  .life { border: none; padding: 0; margin: 0; display: flex; gap: var(--space-3); }
  .life legend { font-size: var(--text-sm); color: var(--mark-muted); margin-bottom: var(--space-1); }
  .check { display: flex; flex-direction: row; align-items: center; gap: var(--space-1); }
  .check input { accent-color: var(--accent); }
  button {
    background: none; color: var(--accent); border: 1px solid var(--accent);
    border-radius: 999px; padding: var(--space-1) var(--space-3);
    cursor: pointer; font-family: var(--font-body); font-size: var(--text-sm);
    transition: all var(--dur-1) var(--ease-weighted);
  }
  button:hover { background: var(--accent); color: var(--field); }
  .note { font-size: var(--text-sm); color: var(--mark-muted); }
</style>
