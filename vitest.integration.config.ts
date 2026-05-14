import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/__tests__/integration/**/*.test.ts'],
    passWithNoTests: true,
    setupFiles: ['./src/__tests__/integration/setup-env.ts'],
    testTimeout: 60_000,
  },
});
