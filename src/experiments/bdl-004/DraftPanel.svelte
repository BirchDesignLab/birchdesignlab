<script lang="ts">
  /** The draft in weaver's notation: threading, tie-up, treadling.
   *  Every cell is a button. Presets carry visitors; cells reward the curious. */
  import { PRESETS } from './data/presets';
  import type { Draft } from '../../lib/weave/draft';

  let {
    draft,
    presetIndex,
    onPreset,
    onDraftChange,
  }: {
    draft: Draft;
    presetIndex: number;
    onPreset: (i: number) => void;
    onDraftChange: (d: Draft) => void;
  } = $props();

  function cycleThreading(end: number) {
    const next = structuredClone($state.snapshot(draft)) as Draft;
    next.threading[end] = (next.threading[end] + 1) % next.shafts;
    onDraftChange(next);
  }

  function toggleTieUp(treadle: number, shaft: number) {
    const next = structuredClone($state.snapshot(draft)) as Draft;
    next.tieUp[treadle][shaft] = !next.tieUp[treadle][shaft];
    onDraftChange(next);
  }

  function cycleTreadling(pick: number) {
    const next = structuredClone($state.snapshot(draft)) as Draft;
    next.treadling[pick] = (next.treadling[pick] + 1) % next.treadles;
    onDraftChange(next);
  }

  const MAX_REPEAT = 32; // threading or treadling repeat length cap

  /** Grow or shrink a repeat: append a copy of the last entry, or drop it. */
  function resizeRepeat(key: 'threading' | 'treadling', delta: number) {
    const next = structuredClone($state.snapshot(draft)) as Draft;
    const arr = next[key];
    if (delta > 0 && arr.length < MAX_REPEAT) arr.push(arr[arr.length - 1]);
    else if (delta < 0 && arr.length > 1) arr.pop();
    else return;
    onDraftChange(next);
  }
</script>

<section aria-label="Draft">
  <label class="preset">
    <span>Pattern</span>
    <select value={presetIndex} onchange={(e) => onPreset(Number(e.currentTarget.value))}>
      {#each PRESETS as p, i}
        <option value={i}>{p.name}</option>
      {/each}
    </select>
  </label>

  <h3>Threading</h3>
  <div class="grid threading" style={`--cols:${draft.threading.length}`}>
    {#each draft.threading as shaft, end}
      <button onclick={() => cycleThreading(end)} aria-label={`End ${end + 1}, shaft ${shaft + 1}`}>
        {shaft + 1}
      </button>
    {/each}
  </div>
  <div class="resize">
    <button class="mini" onclick={() => resizeRepeat('threading', -1)} aria-label="Remove threading end">-</button>
    <button class="mini" onclick={() => resizeRepeat('threading', 1)} aria-label="Add threading end">+</button>
  </div>

  <h3>Tie-up</h3>
  <div class="grid tieup" style={`--cols:${draft.treadles}`}>
    {#each Array.from({ length: draft.shafts }, (_, s) => s) as shaft}
      {#each Array.from({ length: draft.treadles }, (_, t) => t) as treadle}
        <button
          class:on={draft.tieUp[treadle][shaft]}
          onclick={() => toggleTieUp(treadle, shaft)}
          aria-pressed={draft.tieUp[treadle][shaft]}
          aria-label={`Treadle ${treadle + 1}, shaft ${shaft + 1}`}
        ></button>
      {/each}
    {/each}
  </div>

  <h3>Treadling</h3>
  <div class="grid treadling" style={`--cols:${draft.treadling.length}`}>
    {#each draft.treadling as treadle, pick}
      <button onclick={() => cycleTreadling(pick)} aria-label={`Pick ${pick + 1}, treadle ${treadle + 1}`}>
        {treadle + 1}
      </button>
    {/each}
  </div>
  <div class="resize">
    <button class="mini" onclick={() => resizeRepeat('treadling', -1)} aria-label="Remove treadling pick">-</button>
    <button class="mini" onclick={() => resizeRepeat('treadling', 1)} aria-label="Add treadling pick">+</button>
  </div>
</section>

<style>
  section { display: grid; gap: 0.5rem; }
  h3 { font-size: 0.8rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); margin: 0.5rem 0 0; }
  .preset { display: grid; gap: 0.25rem; }
  .grid {
    display: grid; grid-template-columns: repeat(var(--cols), 1.4rem); gap: 2px;
    max-inline-size: 100%; overflow-x: auto; padding-block-end: 2px;
  }
  .grid button {
    inline-size: 1.4rem;
    block-size: 1.4rem;
    font-size: 0.7rem;
    background: transparent;
    color: var(--muted);
    border: 1px solid color-mix(in srgb, var(--muted) 40%, transparent);
    cursor: pointer;
  }
  .tieup button.on { background: var(--accent); border-color: var(--accent); }
  .resize { display: flex; gap: 0.3rem; }
  .mini {
    padding: 0 0.5rem;
    block-size: 1.4rem;
    background: transparent;
    color: var(--muted);
    border: 1px solid var(--muted);
    border-radius: 0.3rem;
    cursor: pointer;
  }
</style>
