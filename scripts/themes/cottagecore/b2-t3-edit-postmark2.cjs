const edit = require('./edit-helper.cjs');
edit('src/themes/cottagecore/pages/Contact.astro', [
[`    justify-self: end;
    margin: -1.5rem`, `    order: 1;
    justify-self: end;
    margin: -1.5rem`],
[`  .address { display: grid;`, `  .address, .fine { order: 2; }
  .address { display: grid;`],
[`    .invite { padding-right: 0; }`, `    .invite { padding-right: 0; min-height: 0; }`],
]);
