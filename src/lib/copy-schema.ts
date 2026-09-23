import { z } from 'astro/zod';

/**
 * Schema for the `copy` collection (src/content/copy/*.yaml): the words on
 * the five business pages plus the shared chrome, kept apart from any
 * design so every school on /t/ renders the same text as the root site.
 *
 * One strict object per page, discriminated on `page`, so a misspelt key or
 * a field a page does not have fails the build instead of rendering nothing.
 *
 * Fields typed `rich` may carry *emphasis* and **strong** (src/lib/copy.ts
 * rich() renders them and escapes everything else). Every other field is
 * plain text. No raw HTML anywhere.
 *
 * Deliberately absent: the home page's meta description and its opener
 * subline. Both are SITE_DESCRIPTION (src/lib/seo/site.ts), and
 * getCopy('home') injects it, so the sentence lives in exactly one place
 * (F049).
 */
const text = z.string().min(1);
const rich = z.string().min(1).brand<'rich'>();
const meta = { title: text, description: text };

/** Pages and the Lab, as link targets copy can name without knowing any URL. */
export const LINK_TARGETS = ['home', 'about', 'services', 'contact', 'lab', 'privacy'] as const;
const target = z.enum(LINK_TARGETS);

const home = z.strictObject({
  page: z.literal('home'),
  title: text,
  opener: z.strictObject({ lead: text }),
  doors: z.strictObject({
    kicker: text,
    items: z.array(z.strictObject({ title: text, body: text })).min(1),
    more: text,
  }),
  lab: z.strictObject({ kicker: text, pull: text, more: text }),
  closer: z.strictObject({ lead: text, cta: text }),
});

const about = z.strictObject({
  page: z.literal('about'),
  ...meta,
  heading: text,
  etymology: z.array(rich).min(1),
  founder: z.strictObject({ heading: text, body: z.array(text).min(1) }),
  manifesto: text,
  cta: text,
});

const services = z.strictObject({
  page: z.literal('services'),
  ...meta,
  kicker: text,
  heading: text,
  sublines: z.array(text).min(1),
  offerings: z.array(z.strictObject({ heading: text, body: z.array(text).min(1) })).min(1),
  process: z.strictObject({
    heading: text,
    steps: z.array(z.strictObject({ title: text, body: text })).min(1),
  }),
  pull: text,
  cta: text,
});

const contact = z.strictObject({
  page: z.literal('contact'),
  ...meta,
  kicker: text,
  heading: text,
  subline: text,
  labels: z.strictObject({ name: text, email: text, message: text, honeypot: text }),
  submit: text,
  /** Rendered with a decorative separator between the parts. */
  trust: z.array(text).min(1),
  invite: text,
  email: z.email(),
  fine: text,
});

const sent = z.strictObject({
  page: z.literal('sent'),
  ...meta,
  heading: text,
  body: text,
  back: text,
});

const chrome = z.strictObject({
  page: z.literal('chrome'),
  name: text,
  /** The header wordmark, split where it may break onto two lines. */
  wordmark: z.array(text).min(1),
  skip: text,
  nav: z.array(z.strictObject({ to: target, label: text })).min(1),
  location: text,
  privacy: text,
  /** Credit for the quiet school's bark field (BDL-001). Quiet renders it; other schools have no bark. */
  barkCredit: text,
});

export const copySchema = z.discriminatedUnion('page', [home, about, services, contact, sent, chrome]);
export type CopyEntry = z.infer<typeof copySchema>;
export type CopyPage = CopyEntry['page'];
export type LinkTarget = (typeof LINK_TARGETS)[number];
