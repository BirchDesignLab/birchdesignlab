const edit = require('./edit-helper.cjs');
edit('src/themes/cottagecore/pages/Contact.astro', [
[`margin: -1.5rem 2.8rem 0 0;`, `margin: -1rem 2.8rem 0 0;`],
[`    min-height: 5.6rem;`, `    min-height: 5.9rem;`],
]);
edit('src/themes/cottagecore/Footer.astro', [
[`@media (max-width: 1000px) {
    .grid { grid-template-columns: 1fr auto;`, `@media (max-width: 1100px) {
    .grid { grid-template-columns: 1fr auto;`],
]);
