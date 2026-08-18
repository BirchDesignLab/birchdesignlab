import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import sitemap from '@astrojs/sitemap';

/**
 * three's DRACOLoader carries module-scope `new URL('../libs/draco/...',
 * import.meta.url)` defaults. Vite resolves those eagerly at build time and
 * emits ~1.3MB of decoder copies into _astro/, even though BDL-007 calls
 * setDecoderPath('/draco/') and every real fetch goes to the copy in
 * public/draco/. Nothing ever requests the emitted ones; they are pure
 * deploy weight. Drop them from the bundle.
 *
 * Deliberately narrow: it matches the decoder filenames only, and throws if
 * the pattern stops matching anything, so a three upgrade that renames or
 * removes these cannot leave this silently pruning nothing (or worse,
 * something else).
 */
function dropUnusedDracoDecoder() {
  const DECODER = /^draco_(decoder|wasm_wrapper)\..*\.(js|wasm)$/;
  return {
    name: 'bdl-drop-unused-draco-decoder',
    apply: 'build',
    generateBundle(_options, bundle) {
      let dropped = 0;
      let bytes = 0;
      for (const [file, chunk] of Object.entries(bundle)) {
        const name = file.split('/').pop();
        if (!DECODER.test(name)) continue;
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

export default defineConfig({
  site: 'https://birchdesignlab.com',
  integrations: [
    svelte(),
    sitemap({
      // styleguide and the Regulator are internal instruments; /contact/sent is
      // a redirect target with no standalone meaning. None belong in the sitemap.
      filter: (page) =>
        !page.includes('/styleguide') &&
        !page.includes('/lab/bdl-006') &&
        !page.includes('/contact/sent'),
    }),
  ],
  vite: {
    plugins: [dropUnusedDracoDecoder()],
  },
});
