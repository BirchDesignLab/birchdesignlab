import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import sitemap from '@astrojs/sitemap';
import { FontaineTransform } from 'fontaine';

/**
 * three's DRACOLoader carries module-scope `new URL('../libs/draco/...',
 * import.meta.url)` defaults. Vite resolves those eagerly at build time and
 * emits ~1.3MB of decoder copies into _astro/, even though BDL-007 calls
 * setDecoderPath('/draco/') and every real fetch goes to the copy in
 * public/draco/. Nothing ever requests the emitted ones; they are pure
 * deploy weight. Drop them from the bundle.
 *
 * Deliberately narrow: it matches the decoder filenames only, and requires
 * the chunk's originalFileName to show it actually came from three's own
 * draco libs directory, so a three upgrade that renames or removes these
 * cannot leave this silently pruning nothing (or worse, something else) —
 * and a deliberate, unrelated `?url` import that happens to share one of
 * these basenames survives instead of being silently deleted from the
 * bundle. If matches ever drop to zero in both Astro builds, it warns
 * rather than throwing (see the dropped === 0 branch below).
 */
function dropUnusedDracoDecoder() {
  const DECODER = /^draco_(decoder|wasm_wrapper)\..*\.(js|wasm)$/;
  // Provenance check: three's DRACOLoader pulls these from
  // three/examples/jsm/libs/draco/... via module-scope `new URL(...)`.
  // Requiring the resolved source path to pass through that directory
  // (in addition to the filename pattern) means an unrelated file that
  // merely shares a decoder's basename is never dropped.
  const FROM_THREE_DRACO_LIBS = /[\\/]three[\\/]examples[\\/]jsm[\\/]libs[\\/]draco[\\/]/;
  return {
    name: 'bdl-drop-unused-draco-decoder',
    apply: 'build',
    generateBundle(_options, bundle) {
      let dropped = 0;
      let bytes = 0;
      for (const [file, chunk] of Object.entries(bundle)) {
        const name = file.split('/').pop();
        if (!DECODER.test(name)) continue;
        const originalFileName = chunk.type === 'asset' ? chunk.originalFileName : undefined;
        if (!originalFileName || !FROM_THREE_DRACO_LIBS.test(originalFileName)) continue;
        const source = chunk.type === 'asset' ? chunk.source : chunk.code;
        bytes += typeof source === 'string' ? Buffer.byteLength(source) : source.length;
        delete bundle[file];
        dropped++;
      }
      // Astro runs a server build and a client build; only one of them
      // carries the decoder, so a bundle with no matches is normal. Warn
      // rather than throw, so a three upgrade that renames or removes these
      // surfaces in the build log instead of pruning nothing in silence.
      if (dropped === 0) {
        this.warn(
          'bdl-drop-unused-draco-decoder matched nothing in this bundle. Normal ' +
            'for one of the two Astro builds; if it is true for both, either three ' +
            'stopped emitting its decoder defaults (delete this plugin) or the ' +
            'filenames changed (fix the pattern).',
        );
        return;
      }
      this.info(`dropped ${dropped} unused Draco decoder files (${bytes} bytes)`);
    },
  };
}

/**
 * Astro 7.3's CSS build plugin deletes CSS assets it believes the SSR pages
 * already carry, then restores the ones a client chunk still needs by
 * assigning back into the bundle object. Rolldown (Vite 8) ignores that
 * assignment ("This plugin assigns to bundle variable ... will be ignored" in
 * the build log), so the restore never happens. A dynamically imported
 * component whose CSS was deleted is left preloading a file that does not
 * exist, and Vite's preload helper throws: /?tune (BDL-006 mounting the
 * Regulator over the home page) died with "Unable to preload CSS for
 * /_astro/Regulator.*.css". Found by browser-passing the Astro 7 upgrade on
 * 09-22-26.
 *
 * Two halves: snapshot every CSS asset before Astro's plugin runs (enforce
 * 'pre'), then after it (enforce 'post') re-emit, under the same file name,
 * any CSS that a chunk's importedCss still names but the bundle lost. Only
 * files a chunk actually references come back, so nothing Astro correctly
 * inlined is resurrected. Delete once Astro restores via emitFile; the build
 * log line below says when it is doing work.
 */
function restoreReferencedCss() {
  const snapshot = new Map();
  return [
    {
      name: 'bdl-css-snapshot',
      apply: 'build',
      enforce: 'pre',
      generateBundle(_options, bundle) {
        snapshot.clear();
        for (const [file, item] of Object.entries(bundle)) {
          if (item.type === 'asset' && file.endsWith('.css')) snapshot.set(file, item.source);
        }
      },
    },
    {
      name: 'bdl-css-restore',
      apply: 'build',
      enforce: 'post',
      generateBundle(_options, bundle) {
        const restored = [];
        for (const item of Object.values(bundle)) {
          if (item.type !== 'chunk' || !item.viteMetadata) continue;
          for (const css of item.viteMetadata.importedCss) {
            if (bundle[css] || !snapshot.has(css) || restored.includes(css)) continue;
            this.emitFile({ type: 'asset', fileName: css, source: snapshot.get(css) });
            restored.push(css);
          }
        }
        if (restored.length) this.info(`restored ${restored.length} referenced CSS file(s): ${restored.join(', ')}`);
      },
    },
  ];
}

export default defineConfig({
  site: 'https://birchdesignlab.com',
  // Astro 7 changed the default to 'jsx', which drops whitespace that spans a
  // line break between inline elements. The copy relies on the old rule in
  // real places ("survives in\n<em>bright</em>" rendered as "inbright", and
  // the specimen lines lost the gap around their tick), so keep Astro 6's
  // collapse-to-one-space behaviour. Caught by pixel-diffing the upgrade.
  compressHTML: true,
  integrations: [
    svelte(),
    sitemap({
      // styleguide and the Regulator are internal instruments; /contact/sent is
      // a redirect target with no standalone meaning; /hello, /showcase and
      // /greetings are card-scan landings, reached by pointing a phone at a
      // QR code rather than by search (they are noindex too). None belong in
      // the sitemap. A new card channel is a new page, so add it here when
      // you add it.
      filter: (page) =>
        !page.includes('/styleguide') &&
        !page.includes('/lab/bdl-006') &&
        !page.includes('/contact/sent') &&
        !page.includes('/hello') &&
        !page.includes('/showcase') &&
        !page.includes('/greetings'),
    }),
  ],
  vite: {
    plugins: [
      dropUnusedDracoDecoder(),
      ...restoreReferencedCss(),
      // Metric-matched fallback faces for the self-hosted fonts, to kill the
      // FOUT/CLS the billboard (Marcellus, the LCP text) otherwise causes when
      // it swaps in over Georgia. fontaine reads each real font's metrics and
      // emits a `<Family> fallback` @font-face sized to occupy the same space,
      // so the swap does not reflow. The generated names ("Marcellus fallback",
      // "Spectral fallback") are inserted into the --font-* stacks in
      // tokens.css by hand, because our families are referenced through CSS
      // custom properties, which fontaine's usage-rewriter does not touch.
      // resolvePath maps the @fontsource url back to the node_modules file so
      // the metrics can be read at build time.
      FontaineTransform.vite({
        fallbacks: ['Georgia', 'Times New Roman', 'serif'],
        resolvePath: (id) => new URL(`.${id}`, import.meta.url),
      }),
    ],
  },
});
