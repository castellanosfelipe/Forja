export default {
  resolve: { alias: { 'react/jsx-dev-runtime': `${process.cwd().replaceAll('\\', '/')}/frontend/node_modules/react/jsx-dev-runtime.js`, 'react/jsx-runtime': `${process.cwd().replaceAll('\\', '/')}/frontend/node_modules/react/jsx-runtime.js` } },
  test: {
    environment: 'jsdom',
    include: ['scripts/qa/business/business.test.tsx'],
    maxWorkers: 1,
    testTimeout: 20000,
  },
};
