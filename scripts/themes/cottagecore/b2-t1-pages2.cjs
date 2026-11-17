/* B2 task 1: the Services and Contact kickers take the same step up as Home's. */
const edit = require('./edit-helper.cjs');
edit('src/themes/cottagecore/pages/Services.astro', [[`.kicker { font-size: clamp(1.9rem, 3vw, 2.4rem); }`, `.kicker { font-size: clamp(2.2rem, 3.4vw, 2.75rem); }`]]);
edit('src/themes/cottagecore/pages/Contact.astro', [[`.kicker { font-size: clamp(1.9rem, 3vw, 2.3rem); }`, `.kicker { font-size: clamp(2.2rem, 3.4vw, 2.7rem); }`]]);
