// PROVISIONAL STROKES: replaced by hand-traced paths in the asset pass (Task 8).
// The specific gramota is confirmed at trace time (spec §3); gramota 682's
// household instructions are the working choice. Translation is ours.
import type { LetterData } from '../../../lib/scratch/letter-schema';

export const householdList: LetterData = {
  id: 'household-list',
  gramota: 682,
  caption: 'a household list',
  circa: 'c. 1180',
  transcription: 'поклоно ѿ харитании ко софии',
  translation:
    'A note about household money and goods: sums owed, cloth to be bought, and a reminder to send it all quickly.',
  viewBox: '0 0 400 160',
  strokes: [
    'M20 36 L64 40 M72 36 L110 42', 'M120 38 L170 34 M180 40 L224 36',
    'M20 80 L58 84 M66 80 L104 86 M114 82 L156 78', 'M168 84 L220 80',
    'M20 124 L70 120 M80 126 L128 122', 'M140 124 L200 128',
  ],
};
