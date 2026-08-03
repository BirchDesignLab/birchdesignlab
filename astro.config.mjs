import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import sitemap from '@astrojs/sitemap';

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
});
