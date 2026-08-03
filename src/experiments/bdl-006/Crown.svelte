<script lang="ts">
  /**
   * A watch crown. Drag it round, or use the keyboard; a full turn of the
   * pointer sweeps the whole range.
   *
   * Two natures, set by `wrap`: free-spinning (hue, no ends to hit) and
   * bounded (grain, which stops where it stops). Detents live in `step`.
   */
  interface Props {
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    /** free-spinning: the value wraps instead of clamping */
    wrap?: boolean;
    /** pulled out for tuning; drives the stem, the only green in the tool */
    pulled?: boolean;
    /** capped: rendered, inoperable, no handlers at all */
    capped?: boolean;
    readout?: string;
    onchange?: (value: number) => void;
  }

  let {
    label,
    value,
    min,
    max,
    step = 1,
    wrap = false,
    pulled = false,
    capped = false,
    readout = '',
    onchange,
  }: Props = $props();

  let el: HTMLDivElement;
  let dragging = $state(false);
  let lastAngle = 0;

  const span = max - min;
  /** live when the crown is free-spinning, or when a bounded one is pulled out */
  const live = $derived(!capped && (wrap || pulled));
  /** indicator angle: the whole range over one turn */
  const angle = $derived((((value - min) / span) * 360) % 360);

  function commit(next: number) {
    if (wrap) {
      const rel = (((next - min) % span) + span) % span;
      next = min + rel;
    } else {
      next = Math.min(max, Math.max(min, next));
    }
    const snapped = min + Math.round((next - min) / step) * step;
    const settled = wrap && snapped >= max ? min : snapped;
    if (settled !== value) onchange?.(settled);
  }

  function angleOf(event: PointerEvent): number {
    const rect = el.getBoundingClientRect();
    return Math.atan2(
      event.clientY - (rect.top + rect.height / 2),
      event.clientX - (rect.left + rect.width / 2),
    );
  }

  function onPointerDown(event: PointerEvent) {
    if (!live) return;
    dragging = true;
    lastAngle = angleOf(event);
    el.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent) {
    if (!dragging) return;
    const now = angleOf(event);
    let delta = now - lastAngle;
    // shortest way round, so crossing the seam doesn't fling the value
    while (delta > Math.PI) delta -= 2 * Math.PI;
    while (delta < -Math.PI) delta += 2 * Math.PI;
    lastAngle = now;
    commit(value + (delta / (2 * Math.PI)) * span);
  }

  function onPointerUp(event: PointerEvent) {
    if (!dragging) return;
    dragging = false;
    el.releasePointerCapture(event.pointerId);
  }

  function onKeyDown(event: KeyboardEvent) {
    if (!live) return;
    const jump =
      { ArrowUp: step, ArrowRight: step, ArrowDown: -step, ArrowLeft: -step,
        PageUp: step * 10, PageDown: step * -10 }[event.key];
    if (jump !== undefined) {
      event.preventDefault();
      commit(value + jump);
      return;
    }
    if (event.key === 'Home') { event.preventDefault(); commit(min); }
    if (event.key === 'End') { event.preventDefault(); commit(max - (wrap ? step : 0)); }
  }
</script>

<div class="crown-set" class:pulled class:capped>
  <span class="stem" aria-hidden="true"></span>
  <div
    bind:this={el}
    class="crown"
    class:live
    class:dragging
    role="slider"
    tabindex={capped ? -1 : 0}
    aria-label={label}
    aria-valuemin={min}
    aria-valuemax={max}
    aria-valuenow={value}
    aria-valuetext={readout || String(value)}
    aria-disabled={!live}
    onpointerdown={onPointerDown}
    onpointermove={onPointerMove}
    onpointerup={onPointerUp}
    onpointercancel={onPointerUp}
    onkeydown={onKeyDown}
  >
    <span class="knurl" aria-hidden="true"></span>
    <span class="index" style={`rotate: ${angle}deg`} aria-hidden="true"></span>
    {#if capped}<span class="cap" aria-hidden="true"></span>{/if}
  </div>
</div>

<style>
  .crown-set {
    position: relative;
    display: grid;
    place-items: center;
    width: 5.5rem; height: 5.5rem;
  }
  /* The stem: hidden until the crown is pulled, then the one green thing in
     the instrument, because a pulled crown is a control actually running. */
  .stem {
    position: absolute; left: 50%; top: 50%;
    width: 0; height: 2px;
    background: var(--accent);
    transform: translate(-50%, -50%);
    transition: width var(--dur-1) var(--ease-weighted);
  }
  .pulled .stem { width: 4.6rem; }

  .crown {
    position: relative;
    width: 3.6rem; height: 3.6rem;
    border-radius: 50%;
    border: 1px solid var(--line);
    background: var(--field-raised);
    cursor: default;
    transition: translate var(--dur-1) var(--ease-weighted),
                border-color var(--dur-1) var(--ease-weighted);
  }
  .crown.live { cursor: grab; border-color: var(--mark-muted); }
  .crown.dragging { cursor: grabbing; }
  .pulled .crown { translate: 0.9rem 0; }

  /* Knurling: engraved teeth, not a gradient toy. */
  .knurl {
    position: absolute; inset: 0; border-radius: 50%;
    background: repeating-conic-gradient(
      from 0deg,
      color-mix(in srgb, var(--mark) 22%, transparent) 0deg 2deg,
      transparent 2deg 9deg
    );
    -webkit-mask: radial-gradient(circle, transparent 62%, #000 63%);
    mask: radial-gradient(circle, transparent 62%, #000 63%);
  }
  .index {
    position: absolute; left: 50%; top: 0.42rem;
    width: 1px; height: 0.9rem;
    background: var(--mark);
    transform-origin: 50% 1.36rem;
    translate: -50% 0;
  }
  .cap {
    position: absolute; inset: 0.55rem; border-radius: 50%;
    border: 1px solid var(--line);
    background:
      repeating-linear-gradient(
        45deg,
        color-mix(in srgb, var(--mark) 12%, transparent) 0 2px,
        transparent 2px 6px
      );
  }
  .capped .crown { opacity: 0.55; }

  .crown:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }

  @media (prefers-reduced-motion: reduce) {
    .stem, .crown { transition: none; }
  }
</style>
