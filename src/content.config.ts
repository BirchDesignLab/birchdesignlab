import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { labSchema } from './lib/lab-schema';

// Loader indirection is the designated CMS renovation path (spec §6):
// swapping glob() for a Sanity loader later leaves schema and pages untouched.
const lab = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/lab' }),
  schema: labSchema,
});

export const collections = { lab };
