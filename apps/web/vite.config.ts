import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const isTest = process.env.VITEST === 'true';

export default defineConfig({
  server: {
    port: 5173,
    proxy: { '/api': { target: 'http://localhost:3000', rewrite: (p) => p.replace(/^\/api/, '') } },
  },
  // Start's plugin owns the app build; unit tests only need React.
  plugins: isTest ? [react()] : [tailwindcss(), tanstackStart(), react()],
  test: { environment: 'jsdom', setupFiles: ['./src/test/setup.ts'] },
});
