# W1 task 5: bauhaus, the questionnaire card

Shared rules: `w1-common.md`. Source: `../a1-critic-bauhaus.md` ("The
questionnaire card": placement, look, interaction, accessibility), stop 1
call 5 (words approved with one change).

Build the card exactly as specced there, on About between `.founder` and
`.manifesto`, in `src/themes/bauhaus/parts/Questionnaire.astro` and
`parts/questionnaire.ts` (`initQuestionnaire(root)` returning cleanup, wired
with `onMount` as Home wires `initLoose`). Memory only: nothing stored, reset
each visit.

**Approved words** (lowercase on screen by text-transform; source case
here; every visible string inside `aria-hidden` spans, controls labelled as
the spec says):

- Title: "The one questionnaire we hand out." (the approved wink), with the
  designation "no. 1"
- Subline: "After Kandinsky, Weimar, around 1923"
- Instruction: "Give each shape one colour."
- Hint: "Pick a shape, then a colour."
- Shapes: "triangle", "square", "circle"; colours: "yellow", "red", "blue"
- Inert label: "Reason, if you have one"
- Skip: "Show the answer"; reset: "Again"
- Reveal heading: "Kandinsky's answer"
- Tally: "You and Kandinsky agree on 3 of 3." / "2 of 3." / "1 of 3." /
  "You and Kandinsky agree on none."
- House line: **"This room builds on his answer."** (replaces the draft's
  "Every shape on this site keeps his answer", which was untrue)
- Status messages as in the spec.

The approved words are new copy for this school only: word parity must
still pass (they sit under `aria-hidden`, with the `role="status"` empty in
the build). Add the contrast pair `--ink` on `--paper` ("questionnaire
card").

**Owns:** `src/themes/bauhaus/parts/Questionnaire.astro`,
`src/themes/bauhaus/parts/questionnaire.ts`, `src/themes/bauhaus/pages/About.astro`,
`src/themes/bauhaus/meta.ts`, `src/themes/bauhaus/theme.css`,
`tests/bauhaus-*.test.ts`, `scripts/themes/stage6/w1-t5-*.mjs`.

**Films:** About at 1440, 820, 390, both schemes: pair all three by tap
(right and wrong), by drag, by keyboard; "show the answer"; "again"; the
reveal; a vertical swipe over the card scrolls on touch.
