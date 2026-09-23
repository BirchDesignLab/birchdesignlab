import { defineConfig } from 'vitest/config';

export default defineConfig({
  // tests/built/ reads the built site and runs after the build, from
  // vitest.dist.config.ts (`npm run test:dist`).
  test: { include: ['tests/**/*.test.ts'], exclude: ['tests/built/**', 'node_modules/**'] },
});
