import { defineConfig } from '../../../frontend/node_modules/vitest/dist/config.js';
import { fileURLToPath } from 'node:url';
const project = fileURLToPath(new URL('../../../', import.meta.url));
export default defineConfig({
  resolve: { alias: {
    'vitest': `${project}frontend/node_modules/vitest/dist/index.js`,
    '@testing-library/react': `${project}frontend/node_modules/@testing-library/react/dist/index.js`,
  } },
  test: {
    root: project,
    environment: 'jsdom',
    include: ['scripts/qa/pwa/*.test.ts'],
    fileParallelism: false,
  },
});
