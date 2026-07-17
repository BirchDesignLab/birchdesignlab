import { z } from 'zod';

export const labSchema = z
  .object({
    designation: z.string().regex(/^BDL-\d{3}$/),
    title: z.string().min(1),
    summary: z.string().min(1),
    date: z.coerce.date(),
    tech: z.array(z.string()).default([]),
    device: z.enum(['mobile-first', 'desktop-forward', 'universal']),
    status: z.enum(['live', 'forthcoming']).default('live'),
    /** Experiments that live at their own route (e.g. /styleguide) link
        there from the catalog instead of getting a /lab/<id> page. */
    href: z.string().startsWith('/').optional(),
    /** Wall label: how to operate the piece, 1-4 short imperative lines.
        Required for every generated /lab/<id> page; href entries are
        exempt because they never get one. Cap is deliberate: a piece
        that needs five lines is too confusing, and that is the bug. */
    howto: z.array(z.string().min(1)).min(1).max(4).optional(),
  })
  .refine((d) => d.href !== undefined || d.howto !== undefined, {
    message: 'experiments need a howto wall label (or an href)',
  });

export type LabEntryData = z.infer<typeof labSchema>;
