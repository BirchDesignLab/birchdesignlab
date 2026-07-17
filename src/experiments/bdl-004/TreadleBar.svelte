<script lang="ts">
  /** Six treadles, the shuttle, the auto-weave lever, the cut action.
   *  The loom's two-step per spec: press a treadle to open the shed,
   *  throw the shuttle to weave the pick. All real buttons:
   *  keyboard-operable by construction. */
  let {
    treadles,
    shed,
    beating,
    autoWeaving,
    reducedMotion,
    onTreadle,
    onThrow,
    onLever,
    onCut,
  }: {
    treadles: number;
    shed: number | null;        // treadle currently pressed (shed open)
    beating: boolean;           // true briefly while a pick beats in
    autoWeaving: boolean;
    reducedMotion: boolean;
    onTreadle: (t: number) => void;
    onThrow: () => void;
    onLever: () => void;
    onCut: () => void;
  } = $props();
</script>

<div class="bar">
  <div class="treadles" role="group" aria-label="Treadles">
    {#each Array.from({ length: treadles }, (_, t) => t) as t}
      <button
        class="treadle"
        class:active={shed === t}
        aria-pressed={shed === t}
        onclick={() => onTreadle(t)}
        aria-label={`Treadle ${t + 1}`}
      >{t + 1}</button>
    {/each}
  </div>
  <div class="levers">
    <button class="throw" class:beating disabled={shed === null} onclick={onThrow}>
      Throw the shuttle
    </button>
    {#if !reducedMotion}
      <button class="lever" aria-pressed={autoWeaving} onclick={onLever}>
        {autoWeaving ? 'Stop the loom' : 'Let it run'}
      </button>
    {/if}
    <button class="cut" onclick={onCut}>Cut the cloth</button>
  </div>
</div>

<style>
  .bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
    padding: 0.75rem 1rem;
  }
  .treadles { display: flex; gap: 0.5rem; }
  .treadle {
    inline-size: 2.75rem;
    block-size: 3.25rem;
    font-family: var(--font-smallcaps, inherit);
    background: transparent;
    color: var(--muted);
    border: 1px solid var(--muted);
    border-radius: 0 0 0.6rem 0.6rem;
    cursor: pointer;
  }
  .treadle.active { color: var(--accent); border-color: var(--accent); transform: translateY(2px); }
  .levers { display: flex; gap: 0.75rem; }
  .throw, .lever, .cut {
    padding: 0.5rem 1rem;
    background: transparent;
    color: var(--fg);
    border: 1px solid var(--muted);
    border-radius: 0.4rem;
    cursor: pointer;
  }
  .throw:disabled { opacity: 0.45; cursor: default; }
  .throw.beating { transform: translateY(1px); }
</style>
