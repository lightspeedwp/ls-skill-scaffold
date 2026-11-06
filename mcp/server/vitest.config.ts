import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    testTimeout: 30000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // LS-4748 D04: these three reports; no numeric threshold is introduced.
      reporter: ['text', 'json-summary', 'lcov'],
    },
  },
});
