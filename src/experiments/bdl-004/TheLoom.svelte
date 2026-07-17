<script lang="ts">
  /** The bench: owns all loom state. Children are dumb views. */
  import { onMount } from 'svelte';
  import ClothCanvas from './ClothCanvas.svelte';
  import TreadleBar from './TreadleBar.svelte';
  import DraftPanel from './DraftPanel.svelte';
  import YarnShelf from './YarnShelf.svelte';
  import { PRESETS } from './data/presets';
  import { DAILY_WARPS, yarnHex } from './data/yarns';
  import { pickDaily } from '../../lib/weave/daily';
  import { hashString } from '../../lib/bark/pattern';
  import { treadleAt, type Draft } from '../../lib/weave/draft';
  import { yarnAt, type Stripe } from '../../lib/weave/stripes';
  import type { ClothPick, ClothView } from '../../lib/weave/render2d';
  import { THREAD_PX } from '../../lib/weave/render2d';
  import { renderTile, tileSizePx } from '../../lib/weave/export';

  /* Feel knobs: founder fiddle round adjusts these. */
  const BEAT_MS = 140;        // throw button dips this long after a pick
  const AUTO_PACE_MS = 420;   // one pick per this interval when the loom runs
  const PREWOVEN_PICKS = 48;  // cloth already on the beam under reduced motion
  const MAX_PICKS = 600;      // picks kept in memory; older cloth has scrolled off anyway

  const today = new Date().toISOString().slice(0, 10);
  const daily = DAILY_WARPS[pickDaily(today, DAILY_WARPS.length)];
  const dailyPreset = PRESETS.findIndex((p) => p.id === daily.preset);

  let presetIndex = $state(dailyPreset);
  let draft = $state<Draft>(structuredClone(PRESETS[dailyPreset].draft));
  let warpSeq = $state<Stripe[]>(structuredClone(daily.warp));
  let weftSeq = $state<Stripe[]>(structuredClone(daily.weft));
  let picks = $state<ClothPick[]>([]);
  let shed = $state<number | null>(null);
  let beating = $state(false);
  let autoWeaving = $state(false);
  let reducedMotion = $state(false);
  let thrown = 0; // total picks ever thrown; keeps weft stripes honest past MAX_PICKS

  const view = $derived<ClothView>({
    draft,
    warp: warpSeq,
    picks,
    yarnHex,
    seed: hashString(today),
  });

  let beatTimer: ReturnType<typeof setTimeout> | undefined;
  let autoTimer: ReturnType<typeof setInterval> | undefined;

  function weavePick(treadle: number) {
    const next = [...picks, { treadle, weftYarn: yarnAt(weftSeq, thrown) }];
    picks = next.length > MAX_PICKS ? next.slice(-MAX_PICKS) : next;
    thrown++;
    if (!reducedMotion) {
      beating = true;
      clearTimeout(beatTimer);
      beatTimer = setTimeout(() => (beating = false), BEAT_MS);
    }
  }

  /** The two-step per spec: a treadle opens the shed, the shuttle weaves. */
  function pressTreadle(t: number) {
    shed = shed === t ? null : t; // press again to let the shed close
  }

  function throwShuttle() {
    if (shed === null) return;
    weavePick(shed);
  }

  function toggleAuto() {
    autoWeaving = !autoWeaving;
    if (autoWeaving) {
      autoTimer = setInterval(() => weavePick(treadleAt(draft, thrown)), AUTO_PACE_MS);
    } else {
      clearInterval(autoTimer);
    }
  }

  function cutCloth() {
    const scale = Math.min(devicePixelRatio || 1, 2) * 2; // crisp at wallpaper sizes
    const px = THREAD_PX * scale;
    const size = tileSizePx(draft, warpSeq, weftSeq, px);
    const off = document.createElement('canvas');
    off.width = size.w;
    off.height = size.h;
    const ctx = off.getContext('2d');
    if (!ctx) return;
    renderTile(ctx, draft, warpSeq, weftSeq, yarnHex, px);
    off.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `bdl-004-cloth-${today}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    }, 'image/png');
  }

  /** Reduced motion opens on woven cloth instead of an empty warp. */
  function preweave() {
    picks = Array.from({ length: PREWOVEN_PICKS }, (_, i) => ({
      treadle: treadleAt(draft, i),
      weftYarn: yarnAt(weftSeq, i),
    }));
    thrown = PREWOVEN_PICKS;
  }

  /** Task 6 calls these when the draft panel or yarn shelf changes. */
  export function applyPreset(i: number) {
    presetIndex = i;
    draft = structuredClone(PRESETS[i].draft);
    warpSeq = structuredClone(PRESETS[i].defaultWarp);
    weftSeq = structuredClone(PRESETS[i].defaultWeft);
    picks = [];
    thrown = 0;
    shed = null;
    if (reducedMotion) preweave();
  }

  onMount(() => {
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => {
      reducedMotion = mq.matches;
      if (reducedMotion) {
        if (autoWeaving) toggleAuto();
        if (picks.length === 0) preweave();
      }
    };
    apply();
    mq.addEventListener('change', apply);
    return () => {
      mq.removeEventListener('change', apply);
      clearTimeout(beatTimer);
      clearInterval(autoTimer);
    };
  });
</script>

<div class="bench">
  <div class="cloth"><ClothCanvas {view} /></div>
  <aside class="panel">
    <DraftPanel
      {draft}
      {presetIndex}
      onPreset={applyPreset}
      onDraftChange={(d) => (draft = d)}
    />
    <YarnShelf label="Warp" seq={warpSeq} onChange={(s) => (warpSeq = s)} />
    <YarnShelf label="Weft" seq={weftSeq} onChange={(s) => (weftSeq = s)} />
  </aside>
  <TreadleBar
    treadles={draft.treadles}
    {shed}
    {beating}
    {autoWeaving}
    {reducedMotion}
    onTreadle={pressTreadle}
    onThrow={throwShuttle}
    onLever={toggleAuto}
    onCut={cutCloth}
  />
</div>

<style>
  .bench {
    display: grid;
    grid-template: 'cloth panel' 1fr 'bar bar' auto / 1fr minmax(16rem, 22rem);
    block-size: 100%;
    min-block-size: 70vh;
  }
  .cloth { grid-area: cloth; min-block-size: 0; }
  .panel { grid-area: panel; overflow-y: auto; padding: 1rem; }
  .bench > :global(.bar) { grid-area: bar; }
  @media (max-width: 720px) {
    .bench { grid-template: 'cloth' 1fr 'panel' auto 'bar' auto / 1fr; }
    .panel { max-block-size: 35vh; }
  }
</style>
