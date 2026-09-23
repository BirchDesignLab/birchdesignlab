import { z } from 'astro/zod';

/**
 * The Lab collection schema: a discriminated union on `type`.
 * - experiment: self-initiated work with an interactive stage (howto/href rule).
 * - study: client work; narrative page with a hero image and a live URL.
 *
 * Exported as a factory because the study branch needs Astro's image()
 * helper, which only exists inside content.config's schema context. Tests
 * instantiate it with a string stub (labTestSchema below).
 *
 * Zod constraint that shaped this file: discriminatedUnion only accepts
 * plain ZodObjects, so the experiment howto/href rule lives in a
 * superRefine on the union, not a .refine on the branch.
 */
export function makeLabSchema<Img extends z.ZodType>(image: () => Img) {
  const base = {
    designation: z.string().regex(/^BDL-\d{3}$/),
    title: z.string().min(1),
    summary: z.string().min(1),
    date: z.coerce.date(),
    tech: z.array(z.string()).default([]),
    status: z.enum(['live', 'forthcoming']).default('live'),
    /** Instruments that ship publicly but stay out of search and the sitemap
        (the /styleguide convention: unlinked, noindexed, filtered). */
    noindex: z.boolean().default(false),
  };

  const experiment = z
    .object({
      ...base,
      type: z.literal('experiment'),
      device: z.enum(['mobile-first', 'desktop-forward', 'universal']),
      /** Experiments that live at their own route (e.g. /styleguide) link
          there from the catalog instead of getting a /lab/<id> page. */
      href: z.string().startsWith('/').optional(),
      /** Wall label: how to operate the piece, 1-4 short imperative lines.
          Cap is deliberate: a piece that needs five lines is too confusing,
          and that is the bug. */
      howto: z.array(z.string().min(1)).min(1).max(4).optional(),
    })
    .strict();

  const study = z
    .object({
      ...base,
      type: z.literal('study'),
      client: z.string().min(1),
      liveUrl: z.url(),
      hero: z.object({ src: image(), alt: z.string().min(1) }),
    })
    .strict();

  return z.discriminatedUnion('type', [experiment, study]).superRefine((d, ctx) => {
    if (d.type === 'experiment' && d.href === undefined && d.howto === undefined) {
      ctx.addIssue({
        code: 'custom',
        message: 'experiments need a howto wall label (or an href)',
      });
    }
  });
}

/** Schema instantiated with a plain-string image stub: what the unit tests
    parse against, and the source of the shared entry type. */
export const labTestSchema = makeLabSchema(() => z.string());
export type LabEntryData = z.infer<typeof labTestSchema>;
