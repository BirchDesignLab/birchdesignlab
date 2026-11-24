/**
 * Capture the Novgorod Letters (BDL-003) still.
 *
 *   src/content/lab/bdl-003/thumb.png   1280x800 CSS px at 1x (16:10)
 *
 * BDL-003 is not built yet, so its List card had no picture and showed a blank
 * box reading "BDL-003". The wall already draws a miniature of it (a sheet of
 * birch bark with letters scratched in), so this renders that same miniature
 * at rest, bundled on a blank page: esbuild turns an entry that imports
 * src/lib/lab-wall/minis/bdl-003.ts into one script, the page sets the
 * miniature's theme, and the page is photographed.
 *
 * The miniature only follows the scheme through its ground colour (the bark
 * sheet itself is fixed), so --scheme picks the ground. The kept still is the
 * light one: it sits in the light List as a sheet on cream, where the dark one
 * is a near-black slab in a pale row.
 *
 *   node scripts/lab/capture-bdl-003-still.mjs [--scheme light|dark] [--out path] [--gpu]
 *
 * Needs no server. Re-run after the miniature changes. Node resolves esbuild,
 * playwright and sharp from the repo's node_modules.
 */
import { build } from 'esbuild';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}
const scheme = arg('scheme', 'light');
if (scheme !== 'light' && scheme !== 'dark') {
  console.error('--scheme must be light or dark');
  process.exit(1);
}
const OUT = arg('out', join(root, 'src', 'content', 'lab', 'bdl-003', 'thumb.png'));
const gpu = process.argv.includes('--gpu');
const W = 1280;
const H = 800;

// The site's own ground tokens (src/styles/tokens.css) for each scheme; the
// wall paints the sheet's surround with --field-raised.
const grounds = {
  light: { dark: false, field: '#f5f1e8', raised: '#e9e1d2', mark: '#1f1b15', muted: '#5a5244' },
  dark: { dark: true, field: '#1c1a17', raised: '#272319', mark: '#f4f0e6', muted: '#a89f8f' },
};

const entry = `
import factory from ${JSON.stringify(join(root, 'src', 'lib', 'lab-wall', 'minis', 'bdl-003.ts').replace(/\\/g, '/'))};
import { T } from ${JSON.stringify(join(root, 'src', 'lib', 'lab-wall', 'draw.ts').replace(/\\/g, '/'))};
window.renderStill = (theme, w, h) => {
  Object.assign(T, theme);
  const canvas = document.getElementById('c');
  canvas.width = w; canvas.height = h;
  const c = canvas.getContext('2d');
  const mini = factory({ img: () => null });
  mini.resize(w, h, 1);
  // The miniature starts with eight seconds already written. Run it a while
  // longer at rest (no pointer, ten frames to the second, the step the
  // miniature's pen speed is capped at) so the sheet carries about two lines
  // of letters and the stylus sits on a stroke.
  const p = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, a: 0 };
  for (let i = 1; i <= 90; i++) mini.draw(c, i / 10, 1 / 10, p);
};
`;
const bundle = await build({
  stdin: { contents: entry, resolveDir: root, loader: 'ts', sourcefile: 'bdl-003-still-entry.ts' },
  bundle: true,
  write: false,
  format: 'iife',
  platform: 'browser',
  target: 'es2022',
  logLevel: 'warning',
});
const script = bundle.outputFiles[0].text;

const browser = await chromium.launch(
  gpu ? { args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] } : {},
);
try {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await page.setContent(
    `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:${grounds[scheme].raised}}canvas{display:block}</style><canvas id="c"></canvas>`,
  );
  await page.addScriptTag({ content: script });
  await page.evaluate(([theme, w, h]) => window.renderStill(theme, w, h), [grounds[scheme], W, H]);
  await mkdir(dirname(OUT), { recursive: true });
  // The browser's PNG is about 470 KB; the same pixels re-encoded at the
  // highest lossless setting are a third of that (sharp comes with Astro).
  const shot = await page.locator('#c').screenshot();
  const { size } = await sharp(shot).png({ compressionLevel: 9, effort: 10 }).toFile(OUT);
  console.log(`[still] ${(size / 1024).toFixed(0)} KB`);
  console.log(`[still] wrote ${OUT} (${W}x${H}, ${scheme})`);
} finally {
  await browser.close();
}
