import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: ['src/test/globalSetup.ts'],
    // Each test file opens a pool of up to 10 connections; 6 at a time stays well under
    // Postgres's 100 alongside a running dev server.
    maxWorkers: 6,
  },
});
