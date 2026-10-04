# Stage 4 wave B1 (swiss): report for the founder

Written 10-03-26 at the second hard stop. Branch
`feat/theme-schools-tier3-stage4` (draft PR #95), swiss commits b6935ce to
853257e. `npm run verify` clean at 853257e.

## Where it stands

All four swiss tasks are complete; every Opus critic finding of blocker or
important weight was fixed and re-checked (a grid key that collided with the
portal switcher on phones, the Home phone lead hidden under the switcher, a
billboard overlapping its lead on short phones, an invisible emphasis, doors
that were not equal, the rotated word off the frame line, and more). The page
swap, the one-step wordmark and the held header still match Stage 2 on film.

What changed, page by page:
- One giant per page, one font family (Archivo), no drawn grid, a 24px line
  rhythm.
- Colour as full-bleed fields; dark is a true black sheet with the same red
  and white type on red; red is no longer a link or hover colour.
- Home: the billboard alone (the red rectangle is gone), two equal door
  fields. About: the red tree field and the rotated "Birch". Services: the
  1 2 3 4 numerals as the second giant. Contact: a black sheet in light too.
- Phones: the first screen is a poster. Buttons follow one rule. Tablet is its
  own sheet. The footer is a small colophon.
- The grid key: a small square key in the footer; hold it (mouse, touch,
  Space, Enter) and the 12, 6 or 4 columns show over the page.

Cost: 47 agents, about 5.1M subagent tokens, about 3.2 hours. Two tasks
parked on housekeeping (a committed report file, two uncommitted probe
scripts), both settled by the controller, and `bdl-task` now forbids the
first.

## Calls for you

Sheets: `scripts/themes/.out/stage4/s4-b1b-t4/sheets/r1/founder/`
(`whole__<size>__<scheme>.jpg` before against after, `phone-poster__*.jpg`,
`grid-key__*.jpg`, `tablet-sheet__*.jpg`).

1. **Home is much quieter.** The billboard stands alone and the closing "Ready
   when you are." is now lead size on paper. The brief asked for the closer
   as a full-bleed red field with the button as its one block; that part was
   missed. Recommendation: make the closer that red field. It also settles
   call 2.
2. **Two red buttons on light Home** (the lab band's and the closer's). With
   call 1, the closer's button goes black inside red and the page has one red
   field and no red button.
3. **The tree.** The new sharp render is front-on and reads flatter, more like
   a logo, than the soft three-quarter still you approved in the proof.
   Options: keep it until you pick another image (you mentioned a different
   logo), or re-render it sharp at the proof's three-quarter angle.
   Recommendation: re-render at three-quarter.
4. **The Services numerals** are 2.9 times the page title, so they become the
   page's poster. Recommendation: bring them down to about 1.5 times so the
   title stays the first giant.
5. **About's button** sits on the left columns (the tree holds the right),
   where every other page puts it on the right. Recommendation: accept it as
   deliberate.
6. **The grid key** lives in the footer, so it is found at the foot of each
   page, and it shades whole columns rather than drawing hairlines. Fine?

Calls 1, 3 and 4 are small, fully specified CSS and asset changes; done inline
before bauhaus starts, if you agree.

Then your go starts wave B2 (bauhaus, four tasks, about 40 agents).
