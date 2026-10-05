/* Stage 5 B2 task 2: the dark butter note reads as lit paper on the 0.14 check. */
const edit = require('./edit-helper.cjs');
edit('src/themes/cottagecore/theme.css', [
[`[data-theme='cottagecore'][data-scheme='dark'] .cc-torn-lift {
  filter: drop-shadow(0 16px 20px rgba(0, 0, 0, 0.6));
}`,
`/* By lamplight a torn sheet is lit paper laid on the cloth, not a hole in it:
   a warm cast spills onto the check around it (under the dark shadow), and the
   sheet itself takes a lit lip along its torn top edge and the lamp from the
   upper left. The lamp is held at 0.08 so the sage-light kicker on the note
   keeps 4.5:1. */
[data-theme='cottagecore'][data-scheme='dark'] .cc-torn-lift {
  filter: drop-shadow(0 16px 20px rgba(0, 0, 0, 0.6)) drop-shadow(0 0 14px rgba(240, 165, 80, 0.16));
}
[data-theme='cottagecore'][data-scheme='dark'] :is(.note, .method-sheet) {
  background-image:
    linear-gradient(180deg, rgba(255, 222, 160, 0.14), transparent 30px),
    linear-gradient(165deg, rgba(255, 200, 120, 0.08), transparent 60%);
}`],
]);
