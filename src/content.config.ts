import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { makeLabSchema } from './lib/lab-schema';
import { copySchema } from './lib/copy-schema';

// Loader indirection is the designated CMS renovation path (spec §6):
// swapping glob() for a Sanity loader later leaves schema and pages untouched.
const lab = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/lab' }),
  schema: ({ image }) => makeLabSchema(image),
});

// The words on the business pages, one file per page plus the shared chrome,
// read by the root site and every school on /t/ (src/lib/copy.ts). Entry ids
// are the file names: home, about, services, contact, sent, chrome.
const copy = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/copy' }),
  schema: copySchema,
});

export const collections = { lab, copy };
