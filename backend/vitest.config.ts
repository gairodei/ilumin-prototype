import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    globalSetup: ['tests/support/global-setup.ts'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    // Each integration file gets its own database cloned from a migrated template, so files can run in parallel.
    pool: 'forks',
  },
});
