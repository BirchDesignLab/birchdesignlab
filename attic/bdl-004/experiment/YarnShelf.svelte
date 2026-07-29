<script lang="ts">
  /** The curated shelf plus stripe-sequence editors for warp and weft.
   *  Tap a stripe chip to select it, tap a shelf swatch to recolor it. */
  import { YARNS, yarnHex } from './data/yarns';
  import type { Stripe } from '../../lib/weave/stripes';

  let {
    label,
    seq,
    onChange,
  }: {
    label: string;
    seq: Stripe[];
    onChange: (seq: Stripe[]) => void;
  } = $props();

  let selected = $state(0);

  function recolor(yarnId: string) {
    const next = seq.map((s, i) => (i === selected ? { ...s, yarn: yarnId } : { ...s }));
    onChange(next);
  }

  function bump(delta: number) {
    const next = seq.map((s, i) =>
      i === selected ? { ...s, count: Math.max(1, Math.min(12, s.count + delta)) } : { ...s },
    );
    onChange(next);
  }

  function addStripe() {
    if (seq.length >= 6) return;
    onChange([...seq.map((s) => ({ ...s })), { yarn: YARNS[0].id, count: 2 }]);
    selected = seq.length;
  }

  function removeStripe() {
    if (seq.length <= 1) return;
    onChange(seq.filter((_, i) => i !== selected).map((s) => ({ ...s })));
    selected = 0;
  }
</script>

<section aria-label={`${label} yarns`}>
  <h3>{label}</h3>
  <div class="stripes" role="listbox" aria-label={`${label} stripe sequence`}>
    {#each seq as s, i}
      <button
        class="chip"
        class:selected={selected === i}
        role="option"
        aria-selected={selected === i}
        style={`--c:${yarnHex(s.yarn)}`}
        onclick={() => (selected = i)}
      >{s.count}</button>
    {/each}
    <button class="mini" onclick={addStripe} aria-label={`Add ${label} stripe`}>+</button>
    <button class="mini" onclick={removeStripe} aria-label={`Remove selected ${label} stripe`}>-</button>
  </div>
  <div class="counts">
    <button class="mini" onclick={() => bump(-1)} aria-label="Fewer threads">-1</button>
    <button class="mini" onclick={() => bump(1)} aria-label="More threads">+1</button>
  </div>
  <div class="shelf" role="group" aria-label="Yarn shelf">
    {#each YARNS as y}
      <button class="swatch" style={`--c:${y.hex}`} title={y.name} aria-label={y.name} onclick={() => recolor(y.id)}></button>
    {/each}
  </div>
</section>

<style>
  section { display: grid; gap: 0.4rem; }
  h3 { font-size: 0.8rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); margin: 0.75rem 0 0; }
  .stripes, .shelf, .counts { display: flex; flex-wrap: wrap; gap: 0.3rem; }
  .chip {
    min-inline-size: 2rem;
    block-size: 1.6rem;
    background: var(--c);
    color: #fff;
    text-shadow: 0 1px 2px rgb(0 0 0 / 0.55);
    border: 2px solid transparent;
    border-radius: 0.3rem;
    cursor: pointer;
  }
  .chip.selected { border-color: var(--accent); }
  .swatch {
    inline-size: 1.5rem;
    block-size: 1.5rem;
    background: var(--c);
    border: 1px solid rgb(0 0 0 / 0.25);
    border-radius: 50%;
    cursor: pointer;
  }
  .mini {
    padding: 0 0.5rem;
    block-size: 1.6rem;
    background: transparent;
    color: var(--muted);
    border: 1px solid var(--muted);
    border-radius: 0.3rem;
    cursor: pointer;
  }
</style>
