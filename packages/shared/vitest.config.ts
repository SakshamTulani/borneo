import { defineConfig } from 'vitest/config';

// Business rules must stay ≥ 90% covered (ROADMAP Phase D). Enforced by `pnpm check`.
export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/rules/**', 'src/money.ts', 'src/time.ts'],
      exclude: ['**/*.test.ts'],
      reporter: ['text-summary', 'text'],
      thresholds: { lines: 90, branches: 90, functions: 90, statements: 90 },
    },
  },
});
