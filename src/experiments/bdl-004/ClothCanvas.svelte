<script lang="ts">
  /** Thin canvas host: all drawing logic lives in src/lib/weave/render2d.ts. */
  import { drawCloth, type ClothView } from '../../lib/weave/render2d';

  let { view }: { view: ClothView } = $props();

  let canvas: HTMLCanvasElement;

  function paint() {
    if (!canvas) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(dpr, dpr);
    drawCloth(ctx, view, w, h);
    ctx.restore();
  }

  $effect(() => {
    void view.picks.length; // repaint when a pick lands
    void view.draft;
    void view.warp;
    paint();
  });

  $effect(() => {
    const ro = new ResizeObserver(paint);
    ro.observe(canvas);
    return () => ro.disconnect();
  });
</script>

<canvas bind:this={canvas} aria-hidden="true"></canvas>

<style>
  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }
</style>
