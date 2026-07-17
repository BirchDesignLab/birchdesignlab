/** Zod validation for yarn, draft, and preset data files. */
import { z } from 'zod';

export const yarnSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  hex: z.string().regex(/^#[0-9a-f]{6}$/i),
});
export type Yarn = z.infer<typeof yarnSchema>;

export const stripeSchema = z.object({
  yarn: z.string().min(1),
  count: z.number().int().positive(),
});

export const draftSchema = z
  .object({
    shafts: z.number().int().positive(),
    treadles: z.number().int().positive(),
    threading: z.array(z.number().int().nonnegative()).min(1),
    tieUp: z.array(z.array(z.boolean())),
    treadling: z.array(z.number().int().nonnegative()).min(1),
  })
  .refine((d) => d.threading.every((s) => s < d.shafts), { message: 'threading indexes a missing shaft' })
  .refine((d) => d.treadling.every((t) => t < d.treadles), { message: 'treadling indexes a missing treadle' })
  .refine((d) => d.tieUp.length === d.treadles && d.tieUp.every((row) => row.length === d.shafts), {
    message: 'tie-up must be treadles x shafts',
  });

export const presetSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  draft: draftSchema,
  defaultWarp: z.array(stripeSchema).min(1),
  defaultWeft: z.array(stripeSchema).min(1),
});
export type Preset = z.infer<typeof presetSchema>;
