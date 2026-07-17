/** The five preset drafts. Adding a preset is one entry here. */
import type { Preset } from '../../../lib/weave/schema';

const noLift = [false, false, false, false];

export const PRESETS: Preset[] = [
  {
    id: 'plain',
    name: 'Plain weave',
    draft: {
      shafts: 4,
      treadles: 6,
      threading: [0, 1, 2, 3],
      tieUp: [
        [true, false, true, false],
        [false, true, false, true],
        noLift, noLift, noLift, noLift,
      ],
      treadling: [0, 1],
    },
    defaultWarp: [{ yarn: 'ecru', count: 1 }],
    defaultWeft: [{ yarn: 'walnut', count: 1 }],
  },
  {
    id: 'twill',
    name: '2/2 twill',
    draft: {
      shafts: 4,
      treadles: 6,
      threading: [0, 1, 2, 3],
      tieUp: [
        [true, true, false, false],
        [false, true, true, false],
        [false, false, true, true],
        [true, false, false, true],
        noLift, noLift,
      ],
      treadling: [0, 1, 2, 3],
    },
    defaultWarp: [{ yarn: 'indigo', count: 1 }],
    defaultWeft: [{ yarn: 'ecru', count: 1 }],
  },
  {
    id: 'herringbone',
    name: 'Herringbone',
    draft: {
      shafts: 4,
      treadles: 6,
      // straight run, then the mirrored run: the chevron break
      threading: [0, 1, 2, 3, 0, 1, 2, 3, 3, 2, 1, 0, 3, 2, 1, 0],
      tieUp: [
        [true, true, false, false],
        [false, true, true, false],
        [false, false, true, true],
        [true, false, false, true],
        noLift, noLift,
      ],
      treadling: [0, 1, 2, 3],
    },
    defaultWarp: [{ yarn: 'grey', count: 1 }],
    defaultWeft: [{ yarn: 'iron', count: 1 }],
  },
  {
    id: 'houndstooth',
    name: 'Houndstooth',
    draft: {
      shafts: 4,
      treadles: 6,
      threading: [0, 1, 2, 3],
      tieUp: [
        [true, true, false, false],
        [false, true, true, false],
        [false, false, true, true],
        [true, false, false, true],
        noLift, noLift,
      ],
      treadling: [0, 1, 2, 3],
    },
    // houndstooth is 2/2 twill plus 4-and-4 color orders in both directions
    defaultWarp: [{ yarn: 'iron', count: 4 }, { yarn: 'ecru', count: 4 }],
    defaultWeft: [{ yarn: 'iron', count: 4 }, { yarn: 'ecru', count: 4 }],
  },
  {
    id: 'goose-eye',
    name: 'Goose eye',
    draft: {
      shafts: 4,
      treadles: 6,
      // point threading and point treadling make the diamond
      threading: [0, 1, 2, 3, 2, 1],
      tieUp: [
        [true, true, false, false],
        [false, true, true, false],
        [false, false, true, true],
        [true, false, false, true],
        noLift, noLift,
      ],
      treadling: [0, 1, 2, 3, 2, 1],
    },
    defaultWarp: [{ yarn: 'flax', count: 1 }],
    defaultWeft: [{ yarn: 'madder', count: 1 }],
  },
];
