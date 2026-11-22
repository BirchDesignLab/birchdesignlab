/**
 * Stage 6 wave 3, task 24: the hero shader's frame cost before and after the
 * VCR remote, at 1440 on the GPU, both schemes.
 *
 * Takes the live hero context (canvas.getContext returns the page's own) and
 * its program in use, and times batches of full-screen draws, each batch
 * fenced by a 1px readPixels (a round trip that waits for the GPU). The GPU
 * clocks are warmed first, then PLAY and FF/REW batches alternate over many
 * rounds; medians and minimums are reported. PLAY is the main program alone
 * (fx.ts FRAG). FF and REW add the blended noise pass (fx.ts NOISE_FRAG,
 * compiled here from the source text into the same context) over each frame.
 * Run once per snapshot:
 *   node scripts/themes/snap.mjs --name t24-before --reuse --port 4470 -- node scripts/themes/stage6/w3-t24-cost.mjs before
 *   node scripts/themes/snap.mjs --name t24-after --reuse --port 4470 -- node scripts/themes/stage6/w3-t24-cost.mjs after
 * ("before" skips the noise pass: that snapshot has none.)
 * Output: scripts/themes/.out/stage6/w3/t24/cost-<label>.json.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { OUT, launch, open } from './w3-t24-lib.mjs';

const label = process.argv[2] || 'run';
const src = await readFile(new URL('../../../src/themes/vaporwave/fx.ts', import.meta.url), 'utf8');
const between = (name) => {
  const start = src.indexOf(`const ${name} = ` + '`');
  if (start < 0) return null;
  const from = src.indexOf('`', start) + 1;
  return src.slice(from, src.indexOf('`', from));
};
const VERT = between('VERT');
const NOISE_FRAG = label === 'before' ? null : between('NOISE_FRAG');

const { browser, renderer } = await launch();
const R = { label, renderer, schemes: {} };
for (const scheme of ['dark', 'light']) {
  const { ctx, page } = await open(browser, { path: '/t/vaporwave/', width: 1440, scheme, settle: 1500 });
  R.schemes[scheme] = await page.evaluate(({ VERT, NOISE_FRAG }) => {
    const canvas = document.querySelector('canvas[data-vw-horizon]');
    const gl = canvas.getContext('webgl');
    const prog = gl.getParameter(gl.CURRENT_PROGRAM);
    const px = new Uint8Array(4);
    const fence = () => gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    let np = null;
    if (NOISE_FRAG) {
      const sh = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); return x; };
      np = gl.createProgram();
      gl.attachShader(np, sh(gl.VERTEX_SHADER, VERT));
      gl.attachShader(np, sh(gl.FRAGMENT_SHADER, NOISE_FRAG));
      gl.bindAttribLocation(np, gl.getAttribLocation(prog, 'aPos'), 'aPos');
      gl.linkProgram(np);
      if (!gl.getProgramParameter(np, gl.LINK_STATUS)) throw new Error('noise link failed');
      gl.useProgram(np);
      gl.uniform2f(gl.getUniformLocation(np, 'uRes'), canvas.width, canvas.height);
      gl.uniform1f(gl.getUniformLocation(np, 'uTime'), 12.3);
      gl.useProgram(prog);
    }
    const batch = (n) => { fence(); const t = performance.now(); for (let i = 0; i < n; i++) gl.drawArrays(gl.TRIANGLES, 0, 3); fence(); return (performance.now() - t) / n; };
    const noisyBatch = (n) => {
      fence();
      const t = performance.now();
      for (let i = 0; i < n; i++) {
        gl.useProgram(prog); gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.useProgram(np); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.drawArrays(gl.TRIANGLES, 0, 3); gl.disable(gl.BLEND);
      }
      gl.useProgram(prog);
      fence();
      return (performance.now() - t) / n;
    };
    const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
    for (let k = 0; k < 10; k++) batch(300);
    const play = [];
    const noise = [];
    for (let k = 0; k < 15; k++) {
      play.push(batch(300));
      if (np) noise.push(noisyBatch(300));
    }
    const pack = (a) => ({ medianMs: +median(a).toFixed(4), minMs: +Math.min(...a).toFixed(4), trials: a.map((t) => +t.toFixed(4)) });
    const out = { canvas: [canvas.width, canvas.height], hasNoisePass: !!np, play: pack(play) };
    if (np) out.noise = pack(noise);
    return out;
  }, { VERT, NOISE_FRAG });
  const s = R.schemes[scheme];
  console.log(label, scheme, JSON.stringify({ canvas: s.canvas, play: s.play.medianMs, playMin: s.play.minMs, noise: s.noise?.medianMs, noiseMin: s.noise?.minMs }));
  await ctx.close();
}
await writeFile(join(OUT, `cost-${label}.json`), JSON.stringify(R, null, 2));
await browser.close();
