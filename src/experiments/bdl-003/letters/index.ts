/** Table order: homework, love note, list (the founding record's trinity). */
import { onfim } from './onfim';
import { loveLetter } from './love-letter';
import { householdList } from './household-list';
import type { LetterData } from '../../../lib/scratch/letter-schema';

export const letters: LetterData[] = [onfim, loveLetter, householdList];
