# B2 task 3: cottagecore tablet, Contact, tactile states and the tape corners (items 6, 7, 13; S3)

Shared rules: `b2-common.md`. Brief items 6, 7 and 13 (without its
reduced-motion bullet, S1), and the founder's interactables
(`../stage5-decisions.md`, item 14 and "Answers").

1. **Tablet** (item 6): the footer in two rows below about 1000px (wordmark
   and fine print, then the nav on its own row; nav items never wrap a word
   alone); cards two columns down to about 700px; stacked cards capped at
   about 32rem, dealt left and right with their tilts; the specimen corner
   reserved so sprigs never cross text.
2. **Contact** (item 7): labels about 0.25rem above their writing line, each
   input one ruled line; the textarea continues the ruled lines with no
   dashed box (a `--field-line` focus outline for 3:1); "Send it" scaled to
   the other CTAs and left-aligned to the field edge; the postcard heading
   clear of the postmark ring; both columns end together (a sticky postcard
   or a second mounted object, any loose sprig tucked under the postcard's
   edge); the phone trust line breaks at the flower, never after "A reply".
   Field names, labels, order and behaviour are fixed. Task 4 letters the
   postmark: leave room for it.
3. **Tactile states** (item 13): `.cc-label:active` pressed flat
   (`translate: 0 1px; rotate: 0deg`, a shallower shadow, 80 ms); the hover
   rotate, lift and arrow nudge inside `@media (hover: hover)`; the footer
   nav and Privacy link at 760px and below at least 44px tall, optionally in
   the margin-note hand.
4. **The tape corners** (interactable): on fine pointers a washi tape's free
   corner lifts a little on hover (a small curl with a soft shadow under
   it, translucent material kept) and presses flat on leave; on touch a tap
   lifts and lays it back. Every tape on the page, each with its own corner
   by clip-path variant. Inert: `aria-hidden`, not focusable. Specimens
   still never move.

**Films:** the tape corner (hover at 1440, tap at 390, both schemes); the
Contact form at 1440 and 390 with a field focused; the tablet footer at 820.
