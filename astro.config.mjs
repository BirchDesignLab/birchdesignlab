import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://birchdesignlab.com',
  integrations: [
    svelte(),
    sitemap({
      // styleguide is an internal instrument; /contact/sent is a redirect
      // target with no standalone meaning. Neither belongs in the sitemap.
      filter: (page) => !page.includes('/styleguide') && !page.includes('/contact/sent'),
    }),
  ],
});
