/**
 * Contrast table for the glass palette proof's injected tokens, which the
 * site's checker (scripts/themes/check-contrast.ts) never sees because they
 * live outside src/.
 *
 * Written 09-25-26 for Tier 3 stage 3 (Tier A proofs). Reads theme.css plus
 * one variant sheet (warm.css or blue.css, appended so its tokens win on
 * specificity exactly as they do in the page), then runs the same
 * checkTheme() the tests run: the required pairs, glassmorphism's own
 * meta.contrast pairs, and a few proof-only pairs for text that could land
 * on the bare wallpaper (kickers and links outside a pane, E3) and for glass
 * over the wallpaper's own extreme stops. Loads the registry through Vite as
 * check-contrast.ts does, so meta.contrast is the real list.
 *
 * Usage:
 *   npx tsx scripts/themes/proofs/stage3-palette/check-palette-contrast.ts [--variant warm|blue|today]
 * Prints a table per variant; exit 1 if any meta or required pair fails
 * (proof-only wallpaper pairs are reported, never fail the run).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { checkTheme, type ContrastPair } from '../../../../src/lib/contrast';
import type { ThemeMeta } from '../../../../src/themes/types';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
const here = fileURLToPath(new URL('./', import.meta.url));
const at = process.argv.indexOf('--variant');
const variants = at === -1 ? ['today', 'warm', 'blue'] : [process.argv[at + 1]];

const server = await createServer({
  root, configFile: false, logLevel: 'error', appType: 'custom',
  server: { middlewareMode: true, hmr: false, watch: null },
  optimizeDeps: { noDiscovery: true, include: [] },
});
const { ALL_THEMES } = (await server.ssrLoadModule('/src/themes/registry.ts')) as { ALL_THEMES: readonly ThemeMeta[] };
await server.close();
const meta = ALL_THEMES.find((t) => t.id === 'glassmorphism')!;
const base = readFileSync(root + 'src/themes/glassmorphism/theme.css', 'utf8');

/* Proof-only pairs: tagged so they report but do not fail the run. */
const PROOF = 'proof: ';
const wallStops = ['--wp-blue', '--wp-orange', '--wp-coral', '--wp-amber', '--wp-deep', '--wp-base-a', '--wp-base-b'];
/* Tier A fix round, finding 2: the darkest light-wallpaper stop composited
   with its own vignette on top (--wp-edge over --wp-deep) is the "composited
   edge" the notes talk about — what a reader actually sees toward the page
   edge, not the bare stop colour. Test text over that composited edge both
   bare and under the glass layers, for every token the notes cite (--mark,
   --mark-muted, --accent, --link), so each number in the notes traces here. */
const compositedEdge = ['--wp-edge', '--wp-deep'];
const glassOverCompositedEdge = ['--sheen', '--glass', '--wp-edge', '--wp-deep'];
const proofPairs: ContrastPair[] = [
  ...wallStops.map((s) => ({ fg: '--mark', bg: [s], min: 4.5, note: `${PROOF}bare-wallpaper text on ${s}` })),
  ...wallStops.map((s) => ({ fg: '--mark-muted', bg: [s], min: 4.5, note: `${PROOF}bare-wallpaper text on ${s}` })),
  ...wallStops.map((s) => ({ fg: '--accent', bg: [s], min: 4.5, note: `${PROOF}bare-wallpaper kicker on ${s}` })),
  ...wallStops.map((s) => ({ fg: '--link', bg: [s], min: 4.5, note: `${PROOF}bare-wallpaper link on ${s}` })),
  ...wallStops.map((s) => ({ fg: '--mark', bg: ['--sheen', '--glass', s], min: 4.5, note: `${PROOF}pane text over wallpaper ${s}` })),
  { fg: '--mark', bg: compositedEdge, min: 4.5, note: `${PROOF}composited edge: bare wallpaper text, vignette over --wp-deep` },
  { fg: '--mark-muted', bg: compositedEdge, min: 4.5, note: `${PROOF}composited edge: bare wallpaper text, vignette over --wp-deep` },
  { fg: '--accent', bg: compositedEdge, min: 4.5, note: `${PROOF}composited edge: bare wallpaper kicker, vignette over --wp-deep` },
  { fg: '--link', bg: compositedEdge, min: 4.5, note: `${PROOF}composited edge: bare wallpaper link, vignette over --wp-deep` },
  { fg: '--mark-muted', bg: glassOverCompositedEdge, min: 4.5, note: `${PROOF}pane text over glass over the composited edge (vignette over --wp-deep)` },
  { fg: '--accent', bg: glassOverCompositedEdge, min: 4.5, note: `${PROOF}pane kicker over glass over the composited edge (vignette over --wp-deep)` },
  { fg: '--link', bg: glassOverCompositedEdge, min: 4.5, note: `${PROOF}pane link over glass over the composited edge (vignette over --wp-deep)` },
  { fg: '--btn-ink', bg: ['--btn-a'], min: 4.5, note: `${PROOF}pill button, gradient start` },
];

let failed = 0;
for (const v of variants) {
  const css = v === 'today' ? base : base + '\n' + readFileSync(here + `${v}.css`, 'utf8');
  const rows = checkTheme(css, { id: 'glassmorphism', contrast: [...(meta.contrast ?? []), ...(v === 'today' ? [] : proofPairs)] });
  console.log(`\n=== ${v} ===`);
  for (const r of rows) {
    const proof = r.pair.note?.startsWith(PROOF);
    if (!r.ok && !proof) failed++;
    const ratio = r.error ? `n/a (${r.error})` : r.ratio.toFixed(2);
    console.log(`${r.ok ? 'ok  ' : proof ? 'low ' : 'FAIL'} ${r.scheme.padEnd(5)} ${ratio.padStart(6)} (min ${r.pair.min})  ${r.pair.fg} on ${r.pair.bg.join(' over ')}  ${r.pair.note ?? ''}`);
  }
}
console.log(failed ? `\n${failed} meta/required pairs fail.` : '\nall meta/required pairs pass.');
process.exitCode = failed ? 1 : 0;
