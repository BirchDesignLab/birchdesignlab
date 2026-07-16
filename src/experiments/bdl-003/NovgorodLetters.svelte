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
