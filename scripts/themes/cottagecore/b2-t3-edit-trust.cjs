const edit = require('./edit-helper.cjs');
edit('src/themes/cottagecore/pages/Contact.astro', [[`  @media (max-width: 640px) {
    /* Below the trust line`, `  @media (max-width: 640px) {
    /* The trust line breaks at the flower, never inside 'A reply within...'. */
    .trust .tp { white-space: nowrap; }
    /* Below the trust line`]]);
