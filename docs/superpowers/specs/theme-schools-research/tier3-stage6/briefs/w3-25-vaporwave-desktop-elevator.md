# W3 task 25: vaporwave, the Sent desktop that works and the elevator

Shared rules: `w3-common.md`. Source: `../a1-critic-vaporwave.md`
("Interactables" 2 and 3), stop 1 call 7 (no elevator sound), stop 3 answer
3 (words approved). Task 24 made windows activate on press: build on its
`windows.ts`.

1. **A Sent desktop that works.** The desktop icons select on a click or
   tap, drag on a snap grid, and open on a double-click (a double tap on
   touch, or Enter when focused) into small draggable Windows 95 windows:
   - "My Computer": a window of drives (icons only, no new words beyond the
     approved list);
   - "Recycle Bin": an empty window reading "0 object(s)";
   - "readme.txt": a Notepad window listing the site's own file names (the
     page paths as files, e.g. `index.htm`, `about.htm`, `services.htm`,
     `contact.htm`, as the school already styles file names);
   - "birch.exe": an hourglass, then the screensaver full-window; any key,
     click or tap ends it.
   **Approved words, exactly:** "My Computer", "Recycle Bin", "readme.txt",
   "birch.exe", "0 object(s)". Each icon is a real button with its visible
   name as label; windows close with their × (a button) and Escape. On
   tablet the icons fill today's empty desktop; on phones the icons sit as
   a top row and windows open full width. The "Sent." message window stays
   on top on arrival and is never hidden by a drag.
2. **The elevator directory on the kiosk.** The B1 / 1F / 2F plaque becomes
   bevelled floor buttons. A press lights the button, steps a floor readout
   (an LED digit beside the plaque) to that floor, and activates the
   matching window on the page (2F flips the CRT to its Lab list). It
   navigates nowhere. Real buttons with the floor names as labels,
   `aria-pressed` on the lit floor. **No sound** (founder: no ding).

**Owns:** `src/themes/vaporwave/**`, `tests/vaporwave-*.test.ts`,
`scripts/themes/vaporwave/**`, `scripts/themes/stage6/w3-t25-*.mjs`.

**Films:** Sent at 1440, 820 and 390, both schemes: select, drag to the
grid, open each icon by double-click, double tap and keyboard, close by ×
and Escape, birch.exe's screensaver and its exit; the elevator on Home and
Services at 1440, 820 and 390, every floor, by press and keyboard; arrival
and in-school swap at 1440 and 390 with a window open (torn down, closed on
return).
