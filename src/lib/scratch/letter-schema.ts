/** Data contract for one Novgorod letter. One file per letter (spec §3). */
import { z } from 'zod';

export const letterSchema = z.object({
  id: z.string().min(1),
  gramota: z.number().int().positive(),
  caption: z.string().min(1),        // plate label, e.g. "a child's homework"
  circa: z.string().min(1),          // e.g. "c. 1260"
  transcription: z.string().min(1),  // original text, public domain
  translation: z.string().min(1),    // ours, plain English, house writing rules
  viewBox: z.string().regex(/^\d+ \d+ \d+ \d+$/),
  strokes: z.array(z.string().min(1)).min(1), // SVG path d strings, hand-traced
});

export type LetterData = z.infer<typeof letterSchema>;
