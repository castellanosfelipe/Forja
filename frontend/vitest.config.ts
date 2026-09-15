import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    // Bound DOM workers so local/CI runs do not exhaust memory or starve UI events.
    maxWorkers: 2,
    setupFiles: ['./src/test/setup.ts'],
  },
});
