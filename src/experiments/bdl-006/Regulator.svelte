<script lang="ts">
  /**
   * BDL-006 · The Regulator. A tuning instrument for the Lab.
   *
   * Three sections, three natures of control: a free-spinning crown for color,
   * a stepped switch for spacing (declarative — it reports the system, it does
   * not change it), and pull-out crowns for texture and motion.
   *
   * Texture and motion are the Lab's two undrawn design passes, and this is
   * where they get tuned: the switches and crowns in section III drive the
   * model in src/lib/lab-presentation.ts live on this page, on the proof rows
   * below them, and (worn) on the real catalog in this browser.
   *
   * Nothing here writes files. Pushing the crowns in prints a diff to paste,
   * in the spirit of the styleguide's "Copy tokens" button.
   */
  import { onMount } from 'svelte';
  import Crown from './Crown.svelte';
  import { anchoredRamp, CONTRAST_TARGETS, type RampStop } from '../../lib/oklch';
  import { rgbToHex } from '../../lib/color';
  import {
    ENTRANCES, ENTRANCE_LABEL, ENTRANCE_NOTE, LAB_PRESENTATION, TEXTURES, TEXTURE_LABEL, TEXTURE_NOTE,
    lockIn, sameSetting, type Entrance, type LabPresentation, type Texture,
  } from '../../lib/lab-presentation';
  import { applyPresentation, playEntrance, readWorn, wear } from '../../lib/lab-presentation-client';

  /** A real catalog row to prove the setting on. */
  interface Proof { designation: string; title: string; summary: string; src: string }

  interface Props {
    /** 'stage' is the lab page; 'overlay' rides the live home page at /?tune */
    surface?: 'stage' | 'overlay';
    /** Catalog rows for the proof under section III; none on the overlay. */
    proofs?: Proof[];
  }
  let { surface = 'stage', proofs = [] }: Props = $props();

  const GRAIN_MIN = 40;
  const GRAIN_MAX = 400;
  const GRAIN_STEP = 5;
  const FALLBACK_GRAIN = 140;
  /** 404 runs coarser than the rest of the site by design; the diff says so. */
  const LOST_GRAIN = 240;

  const STOP_ROLES = ['Hairline', 'Borders, large text', 'Body text', 'Headroom'];

  let accentHex = $state('#a3bd8f');
  let fieldHex = $state('#1c1a17');
  let spin = $state(0);
  let grain = $state(FALLBACK_GRAIN);
  let pulled = $state(false);
  let diff = $state('');
  let copied = $state(false);
  let seededGrain = FALLBACK_GRAIN;

  // The Lab's texture and motion, seeded from what ships (or what this
  // browser is wearing) and applied to this page as it is tuned.
  let texture = $state<Texture>(LAB_PRESENTATION.texture);
  let amount = $state(LAB_PRESENTATION.amount);
  let motion = $state(LAB_PRESENTATION.motion);
  let entrance = $state<Entrance>(LAB_PRESENTATION.entrance);
  let worn = $state(false);
  let mounted = $state(false);
  let proofEl = $state<HTMLElement>();
  const setting = $derived<LabPresentation>({ texture, amount, motion, entrance });
  const changed = $derived(!sameSetting(setting, LAB_PRESENTATION));

  $effect(() => {
    const p = setting;
    if (!mounted) return;
    applyPresentation(p);
    if (worn) wear(p);
  });

  function replay() {
    if (!proofEl) return;
    void playEntrance([...proofEl.querySelectorAll<HTMLElement>('.proof-row')], setting);
  }
  function pickTexture(next: Texture) {
    texture = next;
    // A texture at amount 0 shows nothing: start it where it can be judged.
    if (next !== 'none' && amount === 0) amount = 50;
    diff = '';
  }
  function pickEntrance(next: Entrance) {
    entrance = next;
    if (motion === 0) motion = 50;
    diff = '';
    queueMicrotask(replay);
  }
  function toggleWorn() {
    worn = !worn;
    wear(worn ? setting : null);
  }
  function reset() {
    ({ texture, amount, motion, entrance } = LAB_PRESENTATION);
    diff = '';
  }

  const ramp = $derived(
    anchoredRamp(accentHex, fieldHex, CONTRAST_TARGETS, { chroma: 1, drift: 0.35, spin }),
  );
  const stop = (target: number): RampStop =>
    ramp.find((s) => s.target === target) ?? ramp[ramp.length - 1];

  /** Read the live face. Custom properties come back with var() resolved. */
  function readFace() {
    const cs = getComputedStyle(document.documentElement);
    accentHex = rgbToHex(cs.getPropertyValue('--accent').trim());
    fieldHex = rgbToHex(cs.getPropertyValue('--field').trim());
  }

  function retune(next: number) {
    grain = next;
    diff = '';
    document.dispatchEvent(new CustomEvent('bark:retune', { detail: { density: grain } }));
  }

  function togglePull() {
    pulled = !pulled;
    if (pulled) { diff = ''; return; }
    // Pushed in: print what would have to change, and show the motion once.
    diff = [changed ? lockIn(setting) : '', grain !== seededGrain ? buildDiff(grain) : '']
      .filter(Boolean).join('\n\n');
    replay();
  }

  function buildDiff(value: number): string {
    return [
      `# BDL-006 lock-in: grain ${value}. Paste by hand; the Regulator writes nothing.`,
      `src/components/BarkField.astro:3   density = ${value}`,
      `src/components/BarkField.astro:43  Number(canvas.dataset.density) || ${value}`,
      `src/lib/bark/pattern.ts:15         const DEFAULTS: BarkOptions = { density: ${value}, bands: 12 };`,
      `tests/bark-pattern.test.ts:38      expect(generateBark(5)).toHaveLength(${value});`,
      `src/pages/index.astro:17           <BarkField live />`,
      `src/pages/about.astro:10           <BarkField lockAspect />`,
      `src/pages/404.astro:7              <BarkField density={${LOST_GRAIN}} />`,
      `# OG images change: scripts/og/render.ts calls generateBark(seed) with no`,
      `# opts, so it takes the pattern.ts default. Re-run \`npm run og\`.`,
    ].join('\n');
  }

  async function copyDiff() {
    try {
      await navigator.clipboard.writeText(diff);
      copied = true;
      setTimeout(() => { copied = false; }, 1200);
    } catch {
      /* clipboard blocked: the block is selectable, which is the fallback */
    }
  }

  onMount(() => {
    readFace();
    const wearing = readWorn();
    if (wearing) { ({ texture, amount, motion, entrance } = wearing); worn = true; }
    mounted = true;
    // Seed from whatever the target field is actually running, so the readout
    // is never a polite fiction about the page it is tuning.
    const target = document.querySelector<HTMLCanvasElement>('[data-bark]');
    const seeded = Number(target?.dataset.density);
    if (Number.isFinite(seeded) && seeded > 0) { grain = seeded; seededGrain = seeded; }

    const observer = new MutationObserver(readFace);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-scheme'] });
    return () => observer.disconnect();
  });
</script>

<section class="regulator" class:overlay={surface === 'overlay'}>
  <header class="head">
    <p class="smallcaps desig">BDL-006</p>
    <p class="name">The Regulator</p>
  </header>

  <!-- I. COLOR -->
  <section class="plate">
    <header class="plate-head">
      <p class="smallcaps numeral">I</p>
      <h2 class="smallcaps">Color</h2>
      <p class="nature">Free-spinning · no detents</p>
    </header>

    <div class="row">
      <Crown
        label="Color, hue offset in degrees"
        value={spin}
        min={0}
        max={360}
        step={1}
        wrap
        readout={`${Math.round(spin)} degrees`}
        onchange={(v) => (spin = v)}
      />
      <div class="stack">
        <p class="note">
          Seeded from the live <code>--accent</code>, re-seeded when the face flips.
          Stops solve against <code>--field</code> for WCAG, not for taste.
        </p>
        <table class="stops">
          <thead>
            <tr>
              <th class="smallcaps" scope="col">Target</th>
              <th class="smallcaps" scope="col">Actual</th>
              <th class="smallcaps" scope="col">Hex</th>
              <th class="smallcaps" scope="col">Role</th>
            </tr>
          </thead>
          <tbody>
            {#each ramp as s, i (s.target)}
              <tr>
                <td>{s.target.toFixed(1)}:1</td>
                <td>{s.ratio.toFixed(2)}:1</td>
                <td class="hex">{s.hex}</td>
                <td class="role">{STOP_ROLES[i] ?? ''}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>

    <div
      class="demo"
      style={`--link: ${stop(4.5).hex}; --accent: ${stop(7).hex}; --on-accent: ${fieldHex}; --line: ${stop(1.5).hex}`}
    >
      <p class="smallcaps demo-label">Under the ramp</p>
      <p class="demo-copy">
        Running text with <a href="#regulator-demo">a link at 4.5:1</a>, sitting on the
        hairline this ramp would draw.
      </p>
      <a class="cta-engraved" href="#regulator-demo" id="regulator-demo">
        <span class="fill" aria-hidden="true"></span>
        <span class="lbl">Sample control</span>
      </a>
      <p class="note">No lock-in here. Color is looked at, not set.</p>
    </div>
  </section>

  <!-- II. SPACING & ACCENT -->
  <section class="plate">
    <header class="plate-head">
      <p class="smallcaps numeral">II</p>
      <h2 class="smallcaps">Spacing &amp; accent</h2>
      <p class="nature">Stepped · detented · declarative</p>
    </header>

    <div class="row">
      <div class="switch" role="group" aria-label="Spacing, currently loose" aria-disabled="true">
        {#each ['Tight', 'Medium', 'Loose'] as position}
          <span class="position" class:current={position === 'Loose'}>
            <span class="detent" aria-hidden="true"></span>
            <span class="smallcaps">{position}</span>
          </span>
        {/each}
      </div>
      <div class="stack">
        <p class="note">
          The switch reports where the catalog sits; it does not move it. Spacing is
          decided in the stylesheet and read here.
        </p>
        <div class="rule">
          <p class="smallcaps rule-head">Accent rule</p>
          <p>
            Accent green marks what is running, and nothing else. A green pixel that
            maps to no live state is a bug in the instrument, not a decoration.
          </p>
        </div>
      </div>
    </div>
  </section>

  <!-- III. TEXTURE & MOTION -->
  <section class="plate">
    <header class="plate-head">
      <p class="smallcaps numeral">III</p>
      <h2 class="smallcaps">Texture &amp; motion</h2>
      <p class="nature">Pull out to tune · push in to set</p>
    </header>

    <div class="row">
      <div class="stack">
        <p class="smallcaps group-head">Texture</p>
        <div class="choices" role="group" aria-label="Texture">
          {#each TEXTURES as t}
            <button type="button" class="choice" aria-pressed={texture === t} onclick={() => pickTexture(t)}>
              <span class="detent" aria-hidden="true"></span>
              <span class="smallcaps">{TEXTURE_LABEL[t]}</span>
            </button>
          {/each}
        </div>
        <p class="note">{TEXTURE_NOTE[texture]}</p>
      </div>
      <div class="stack">
        <p class="smallcaps group-head">Entrance</p>
        <div class="choices" role="group" aria-label="Entrance">
          {#each ENTRANCES as e}
            <button type="button" class="choice" aria-pressed={entrance === e} onclick={() => pickEntrance(e)}>
              <span class="detent" aria-hidden="true"></span>
              <span class="smallcaps">{ENTRANCE_LABEL[e]}</span>
            </button>
          {/each}
        </div>
        <p class="note">{ENTRANCE_NOTE[entrance]}</p>
      </div>
    </div>

    <div class="row crowns">
      <div class="stack tight">
        <Crown
          label="Texture amount, percent"
          value={amount}
          min={0}
          max={100}
          step={1}
          {pulled}
          readout={`${amount} percent`}
          onchange={(v) => { amount = v; diff = ''; }}
        />
        <p class="readout">Amount <span class="figure">{amount}</span></p>
      </div>

      <div class="stack tight">
        <Crown
          label="Motion budget, percent"
          value={motion}
          min={0}
          max={100}
          step={1}
          {pulled}
          readout={motion === 0 ? 'still' : `${motion} percent`}
          onchange={(v) => { motion = v; diff = ''; }}
        />
        <p class="readout">Motion <span class="figure">{motion === 0 ? 'still' : motion}</span></p>
      </div>

      <div class="stack tight">
        <Crown
          label="Grain, dashes per field"
          value={grain}
          min={GRAIN_MIN}
          max={GRAIN_MAX}
          step={GRAIN_STEP}
          {pulled}
          readout={`${grain} grain`}
          onchange={retune}
        />
        <p class="readout">Grain <span class="figure">{grain}</span></p>
      </div>

      <div class="stack">
        <div class="actions">
          <button type="button" class="engraved primary" onclick={togglePull} aria-pressed={pulled}>
            {pulled ? 'Push in to set' : 'Pull out to tune'}
          </button>
          <button type="button" class="engraved" onclick={replay} disabled={motion === 0 || !proofs.length}>Replay</button>
          <button type="button" class="engraved" onclick={reset} disabled={!changed}>Reset</button>
        </div>
        <p class="note">
          Amount and Motion tune the whole Lab. One budget sets how long, how far and
          how staggered every entrance is. Grain tunes the living bark
          {#if surface === 'overlay'}on this page.{:else}behind this page; the flagship
          field is tuned in place at <a href="/?tune">/?tune</a>.{/if}
        </p>
      </div>
    </div>

    {#if proofs.length}
      <div class="proof" bind:this={proofEl}>
        <div class="proof-head">
          <p class="smallcaps">Proof · three rows from the catalog</p>
          <p class="note">This page is wearing the texture now. Replay shows the entrance.</p>
        </div>
        {#each proofs as row (row.designation)}
          <div class="proof-row">
            <div class="proof-text" data-lab-text>
              <p class="smallcaps proof-desig">{row.designation}</p>
              <p class="proof-title">{row.title}</p>
              <p class="proof-summary">{row.summary}</p>
            </div>
            <div class="proof-thumb" data-lab-thumb>
              <img src={row.src} alt="" loading="lazy" decoding="async" />
            </div>
          </div>
        {/each}
        <div class="actions">
          <button type="button" class="engraved" onclick={toggleWorn} aria-pressed={worn}>
            {worn ? 'Worn on the catalog' : 'Wear it on the catalog'}
          </button>
          <a class="engraved link" href="/lab/">Open the catalog</a>
        </div>
        <p class="note">
          {#if worn}
            The catalog is wearing this setting in this browser only. Nobody else sees it.
          {:else}
            Wearing puts this setting on the real catalog, in this browser only, so it
            can be judged on every row before anything ships.
          {/if}
        </p>
      </div>
    {/if}

    {#if diff}
      <div class="lockin">
        <div class="lockin-head">
          <p class="smallcaps">Lock-in</p>
          <button type="button" class="engraved" onclick={copyDiff}>
            {copied ? 'Copied' : 'Copy diff'}
          </button>
        </div>
        <pre>{diff}</pre>
        <p class="note">Nothing was written. Paste it if you mean it.</p>
      </div>
    {/if}
  </section>
</section>

<style>
  /* Instrument, not a dev panel: engraved plates, hairline seams, dark face
     first. Every rule leans on the house tokens. */
  .regulator {
    position: relative; z-index: 1;
    display: grid; gap: var(--space-4);
    font-size: var(--text-sm);
    color: var(--mark-muted);
  }
  .head { display: flex; align-items: baseline; gap: var(--space-3); }
  .desig { color: var(--mark-muted); }
  .name { font-family: var(--font-display); font-size: var(--text-lg); color: var(--mark); }

  .plate {
    border: 1px solid var(--line);
    /* Near-opaque: at 70% the bark behind ran through the words. */
    background: color-mix(in srgb, var(--field-raised) 94%, transparent);
    padding: var(--space-4);
    display: grid; gap: var(--space-3);
  }
  .plate-head {
    display: flex; align-items: baseline; gap: var(--space-3);
    border-bottom: 1px solid var(--line);
    padding-bottom: var(--space-2);
  }
  .plate-head h2 { font-size: var(--text-sm); color: var(--mark); font-weight: 400; margin: 0; }
  .numeral { color: var(--mark-muted); min-width: 2ch; }
  .nature { margin-left: auto; font-size: var(--text-sm); opacity: 0.75; }

  .row { display: flex; flex-wrap: wrap; gap: var(--space-4); align-items: flex-start; }
  .crowns { align-items: flex-start; }
  .stack { display: grid; gap: var(--space-2); flex: 1 1 16rem; min-width: 0; }
  .stack.tight { flex: 0 0 auto; justify-items: center; gap: var(--space-1); }
  .note { line-height: 1.5; max-width: 46ch; }
  .note code { font-family: inherit; color: var(--mark); }

  /* Stop table: numbers, no swatches. The demo below is where color is judged. */
  .stops { border-collapse: collapse; width: 100%; font-variant-numeric: tabular-nums; }
  .stops th, .stops td {
    text-align: left; padding: 0.35em 0.75em 0.35em 0;
    border-bottom: 1px solid var(--line);
  }
  .stops th { color: var(--mark-muted); font-weight: 400; }
  .stops td { color: var(--mark); }
  /* Lowercase, matching tokens.css: a hex read off this table gets pasted. */
  .hex { letter-spacing: 0.04em; }
  .role { color: var(--mark-muted); }

  .demo {
    border: 1px solid var(--line);
    padding: var(--space-3);
    display: grid; gap: var(--space-3); justify-items: start;
  }
  .demo-label { color: var(--mark-muted); }
  .demo-copy { color: var(--mark); max-width: 52ch; line-height: 1.6; }
  .demo-copy a { color: var(--link); }

  /* Selector switch: engraved positions, detents, indicator parked. Reports
     the system; it is not wired to anything. */
  .switch {
    display: grid; gap: var(--space-2);
    border: 1px solid var(--line);
    padding: var(--space-3);
    flex: 0 0 auto;
  }
  .position { display: flex; align-items: center; gap: var(--space-2); color: var(--mark-muted); }
  .detent {
    width: 0.5rem; height: 0.5rem; border: 1px solid var(--line); border-radius: 50%;
  }
  .position.current { color: var(--mark); }
  .position.current .detent { background: var(--mark); border-color: var(--mark); }

  .rule { border-left: 2px solid var(--line); padding-left: var(--space-3); }
  .rule-head { color: var(--mark-muted); }
  .rule p { line-height: 1.5; max-width: 46ch; }

  .readout { color: var(--mark-muted); font-size: var(--text-sm); }
  .figure { color: var(--mark); font-variant-numeric: tabular-nums; }

  /* Stepped choices: real buttons, one pressed. The detent fills on the
     pressed one. Mark, not accent: a choice is a setting, not a running state. */
  .group-head { color: var(--mark-muted); }
  .choices { display: flex; flex-wrap: wrap; gap: var(--space-2); }
  .choice {
    display: inline-flex; align-items: center; gap: var(--space-2);
    font: inherit; color: var(--mark-muted); background: none;
    border: 1px solid var(--line); border-radius: 0;
    padding: 0.55em 0.9em 0.45em; cursor: pointer; line-height: 1;
    transition: border-color var(--dur-1) var(--ease-weighted), color var(--dur-1) var(--ease-weighted);
  }
  .choice[aria-pressed='true'] { color: var(--mark); border-color: var(--mark-muted); }
  .choice[aria-pressed='true'] .detent { background: var(--mark); border-color: var(--mark); }
  @media (hover: hover) and (pointer: fine) {
    .choice:hover { color: var(--mark); }
  }
  .choice:focus-visible, .engraved:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }

  .actions { display: flex; flex-wrap: wrap; gap: var(--space-2); align-items: center; }
  .engraved:disabled { opacity: 0.45; cursor: default; }
  .engraved.primary { border-color: var(--mark-muted); }
  .engraved.link { text-decoration: none; display: inline-block; }

  /* Proof: three real catalog rows, loose like the catalog itself, with no
     fill of their own so the plate shows under them. */
  .proof { display: grid; gap: var(--space-3); border-top: 1px solid var(--line); padding-top: var(--space-3); }
  .proof-head { display: grid; gap: var(--space-1); }
  .proof-head .smallcaps { color: var(--mark); }
  .proof-row {
    display: grid; gap: var(--space-3); align-items: center;
    border-top: 1px solid var(--line-accent); padding-block: var(--space-4);
  }
  @media (min-width: 40rem) {
    .proof-row { grid-template-columns: minmax(0, 1fr) 14rem; gap: var(--space-4); }
  }
  .proof-text { display: grid; gap: var(--space-1); }
  .proof-desig { color: var(--accent); }
  .proof-title { font-family: var(--font-display); font-size: var(--text-lg); color: var(--mark); }
  .proof-summary { line-height: 1.5; max-width: 46ch; }
  .proof-thumb { border: 1px solid var(--line-accent); aspect-ratio: 16 / 10; overflow: hidden; background: var(--field); }
  .proof-thumb img { display: block; width: 100%; height: 100%; object-fit: cover; object-position: top center; }

  .engraved {
    font-family: var(--font-smallcaps);
    text-transform: uppercase; letter-spacing: var(--tracking-wide);
    font-size: var(--text-sm); line-height: 1;
    color: var(--mark); background: none;
    border: 1px solid var(--line); border-radius: 0;
    padding: 0.5em 1em 0.4em; cursor: pointer;
    transition: border-color var(--dur-1) var(--ease-weighted);
  }
  @media (hover: hover) and (pointer: fine) {
    .engraved:hover { border-color: var(--mark-muted); }
  }

  .lockin { display: grid; gap: var(--space-2); border-top: 1px solid var(--line); padding-top: var(--space-3); }
  .lockin-head { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); }
  .lockin pre {
    margin: 0; padding: var(--space-3);
    border: 1px solid var(--line);
    background: color-mix(in srgb, var(--field) 60%, transparent);
    color: var(--mark);
    font-size: var(--text-sm); line-height: 1.6;
    overflow-x: auto; white-space: pre; tab-size: 2;
  }

  /* Overlay: rides the live page it is tuning, clear of the theme toggle. */
  .overlay {
    position: fixed; top: var(--space-3); right: var(--space-3); z-index: 30;
    width: min(30rem, 92vw);
    max-height: calc(100vh - var(--space-5));
    overflow-y: auto;
    padding: var(--space-3);
    background: color-mix(in srgb, var(--field) 88%, transparent);
    backdrop-filter: blur(8px);
    border: 1px solid var(--line);
  }
  @media (max-width: 720px) {
    .overlay { inset: auto var(--space-3) var(--space-3); width: auto; max-height: 70vh; }
    .nature { margin-left: 0; flex-basis: 100%; }
  }

  @media (prefers-reduced-motion: reduce) {
    .engraved, .choice { transition: none; }
  }
</style>
