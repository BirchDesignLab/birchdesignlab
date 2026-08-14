<script lang="ts">
  /**
   * BDL-006 · The Regulator. A tuning instrument for the Lab.
   *
   * Three sections, three natures of control: a free-spinning crown for color,
   * a stepped switch for spacing (declarative — it reports the system, it does
   * not change it), and pull-out crowns for texture and motion.
   *
   * Nothing here writes files. Setting the grain crown prints a diff to paste,
   * in the spirit of the styleguide's "Copy tokens" button.
   */
  import { onMount } from 'svelte';
  import Crown from './Crown.svelte';
  import { anchoredRamp, CONTRAST_TARGETS, type RampStop } from '../../lib/oklch';
  import { rgbToHex } from '../../lib/color';

  interface Props {
    /** 'stage' is the lab page; 'overlay' rides the live home page at /?tune */
    surface?: 'stage' | 'overlay';
  }
  let { surface = 'stage' }: Props = $props();

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
  let reduced: MediaQueryList | undefined;

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
    if (pulled) diff = '';
    else diff = buildDiff(grain);
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
    reduced = matchMedia('(prefers-reduced-motion: reduce)');
    readFace();
    // Seed from whatever the target field is actually running, so the readout
    // is never a polite fiction about the page it is tuning.
    const target = document.querySelector<HTMLCanvasElement>('[data-bark]');
    const seeded = Number(target?.dataset.density);
    if (Number.isFinite(seeded) && seeded > 0) grain = seeded;

    const observer = new MutationObserver(readFace);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-face'] });
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
      <h3 class="smallcaps">Color</h3>
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
      <h3 class="smallcaps">Spacing &amp; accent</h3>
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
      <h3 class="smallcaps">Texture &amp; motion</h3>
      <p class="nature">Pull out to tune · push in to set</p>
    </header>

    <div class="row crowns">
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
        <button type="button" class="engraved" onclick={togglePull} aria-pressed={pulled}>
          {pulled ? 'Push in to set' : 'Pull out to tune'}
        </button>
      </div>

      <div class="stack tight">
        <Crown label="Motion, capped" value={0} min={0} max={1} capped />
        <p class="readout">Motion <span class="figure">—</span></p>
        <p class="smallcaps capped-mark">Capped</p>
      </div>

      <div class="stack">
        <p class="note">
          {#if surface === 'overlay'}
            Tuning the live hero on this page. Every bark field here retunes together.
          {:else}
            Tunes the bark on this page. The flagship field is tuned in place at
            <a href="/?tune">/?tune</a>.
          {/if}
        </p>
        <p class="note">
          Motion is capped: the crown is here so the panel tells the truth about what
          the instrument will eventually hold. It does nothing yet.
        </p>
      </div>
    </div>

    {#if diff}
      <div class="lockin">
        <div class="lockin-head">
          <p class="smallcaps">Lock-in · grain {grain}</p>
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
    background: color-mix(in srgb, var(--field-raised) 70%, transparent);
    padding: var(--space-4);
    display: grid; gap: var(--space-3);
  }
  .plate-head {
    display: flex; align-items: baseline; gap: var(--space-3);
    border-bottom: 1px solid var(--line);
    padding-bottom: var(--space-2);
  }
  .plate-head h3 { font-size: var(--text-sm); color: var(--mark); }
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
  .capped-mark { color: var(--mark-muted); opacity: 0.6; }

  .engraved {
    font-family: var(--font-smallcaps);
    text-transform: uppercase; letter-spacing: var(--tracking-wide);
    font-size: var(--text-sm); line-height: 1;
    color: var(--mark); background: none;
    border: 1px solid var(--line); border-radius: 0;
    padding: 0.5em 1em 0.4em; cursor: pointer;
    transition: border-color var(--dur-1) var(--ease-weighted);
  }
  .engraved:hover { border-color: var(--mark-muted); }

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
    .engraved { transition: none; }
  }
</style>
