import { defineConfig } from 'vitest/config';

// Tests that read the built site. Run after `astro build` via `npm run test:dist`
// (the last step of `npm run verify`); the default `vitest run` excludes them.
export default defineConfig({
  test: { include: ['tests/built/**/*.test.ts'] },
});
