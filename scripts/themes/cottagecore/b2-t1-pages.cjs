/* Stage 5 wave B2 task 1, part 2: the pages and footer. The type voices now
   live in theme.css; this removes the scoped duplicates they replace and
   sets the sizes the widened hands need, plus the hero and About balance. */
const edit = require('./edit-helper.cjs');
const P = 'src/themes/cottagecore/pages/';

edit(P + 'Home.astro', [
  [`  .lead {
    font-family: var(--font-hand);
    font-weight: 600;
    font-size: clamp(2.1rem, 3.3vw, 2.8rem);
    line-height: 1.05;
    color: var(--accent);
    rotate: -2.2deg;
    margin-top: 1.9rem;
    transform-origin: left center;
  }
  .subline {
    max-width: 33rem;
    margin-top: 1.1rem;
    font-size: 1.18rem;
    line-height: 1.7;
    color: var(--mark-muted);
  }`, `  /* Weight, ink and tilt come from the kicker hand (theme.css). */
  .lead {
    font-family: var(--font-hand);
    font-size: clamp(2.3rem, 3.6vw, 3.05rem);
    line-height: 1.05;
    margin-top: 1.9rem;
  }
  /* The one sentence that explains the business: full ink, a step larger. */
  .subline {
    max-width: 33rem;
    margin-top: 1.1rem;
    font-size: 1.3rem;
    line-height: 1.65;
    color: var(--mark);
  }`],
  [`  .kicker { text-align: center; font-size: clamp(2.2rem, 3.6vw, 2.9rem); }`,
   `  .kicker { text-align: center; font-size: clamp(2.5rem, 4vw, 3.3rem); }`],
  [`    font-family: var(--font-hand); font-weight: 600; font-size: 1.5rem;
    color: var(--accent);
  }
  .card h3`, `    font-family: var(--font-hand); font-size: 1.5rem;
  }
  .card h3`],
  [`    font-size: clamp(1.7rem, 3vw, 2.3rem);
    line-height: 1.15;
    font-variation-settings: 'SOFT' 100, 'WONK' 1;
    margin-top: 0.5rem;`, `    font-size: clamp(1.7rem, 3vw, 2.3rem);
    line-height: 1.15;
    margin-top: 0.5rem;`],
  [`    line-height: 1.05;
    font-variation-settings: 'SOFT' 100, 'WONK' 1;
    margin-bottom: 1.8rem;`, `    line-height: 1.05;
    margin-bottom: 1.8rem;`],
]);

edit(P + 'About.astro', [
  [`  .etym-more { margin-top: 1.4rem; color: var(--mark-muted); max-width: var(--measure); }`,
   `  .etym-more { margin-top: 1.4rem; color: var(--mark); font-size: 1.02rem; max-width: var(--measure); }`],
  [`    font-family: var(--font-hand);
    font-weight: 600;
    font-size: 2.6rem;
    line-height: calc(var(--lh) * 2);
    color: var(--accent);
    letter-spacing: 0;
    rotate: -1.5deg;
  }`, `    font-family: var(--font-hand);
    font-size: 2.9rem;
    line-height: calc(var(--lh) * 2);
    letter-spacing: 0;
  }`],
  [`    .letter h2 { font-size: 2.3rem; }`, `    .letter h2 { font-size: 2.6rem; }`],
  [`    font-size: clamp(1.25rem, 2.6vw, 1.75rem);
    line-height: 1.3;
    font-variation-settings: 'SOFT' 100, 'WONK' 1;`, `    font-size: clamp(1.25rem, 2.6vw, 1.75rem);
    line-height: 1.3;`],
]);

edit(P + 'Services.astro', [
  [`    font-family: var(--font-hand); font-weight: 600; font-size: 1.5rem;
    color: var(--accent);
  }
  .recipe h2`, `    font-family: var(--font-hand); font-size: 1.5rem;
  }
  .recipe h2`],
  [`    font-family: var(--font-hand); font-weight: 700; font-size: 2rem; line-height: 1;
    color: var(--accent);
    padding-bottom: 0.15rem;`, `    font-family: var(--font-hand); font-size: 2rem; line-height: 1;
    padding-bottom: 0.15rem;`],
  [`    line-height: 1.1;
    font-variation-settings: 'SOFT' 100, 'WONK' 1;
    max-width: 20ch;`, `    line-height: 1.1;
    max-width: 20ch;`],
]);

edit(P + 'Contact.astro', [
  [`  .field label {
    font-family: var(--font-hand);
    font-weight: 600;
    font-size: 1.55rem;
    line-height: 1.2;
    color: var(--accent);
  }`, `  /* Weight, ink and upright tilt come from the label hand (theme.css). */
  .field label {
    font-family: var(--font-hand);
    line-height: 1.2;
  }`],
  [`    line-height: 1.15;
    font-variation-settings: 'SOFT' 100, 'WONK' 1;
  }
  .address`, `    line-height: 1.15;
  }
  .address`],
]);

edit('src/themes/cottagecore/Footer.astro', [
  [`    font-family: var(--font-hand);
    font-weight: 600;
    font-size: 1.45rem;
    line-height: 1.2;
    color: var(--accent);
  }`, `    font-family: var(--font-hand);
    line-height: 1.2;
  }`],
]);
