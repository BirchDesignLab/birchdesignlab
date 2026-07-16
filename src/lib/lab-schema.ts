import { z } from 'zod';

export const labSchema = z.object({
  designation: z.string().regex(/^BDL-\d{3}$/),
  title: z.string().min(1),
  summary: z.string().min(1),
  date: z.coerce.date(),
  tech: z.array(z.string()).default([]),
  device: z.enum(['mobile-first', 'desktop-forward', 'universal']),
  status: z.enum(['live', 'forthcoming']).default('live'),
  featured: z.boolean().default(false),
});

export type LabEntryData = z.infer<typeof labSchema>;
