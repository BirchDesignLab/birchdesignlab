import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://birchdesignlab.com',
  integrations: [svelte(), sitemap()],
});
