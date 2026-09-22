import { defineConfig } from 'vitest/config'

/**
 * The rules test talks to a running Firestore emulator (`pnpm emulators`), so it
 * lives outside the default `pnpm test` run. Run with `pnpm test:rules`.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    // One emulator, one test environment: no parallel files.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
})
