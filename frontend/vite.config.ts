import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

export default defineConfig({
  plugins: [react(), tailwindcss(), {
    name: 'forja-offline-shell',
    apply: 'build',
    generateBundle(_options, bundle) {
      const assets = Object.keys(bundle).filter((name) => /\.(js|css|woff2?)$/.test(name)).sort().map((name) => `/${name}`);
      const precache = ['/', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/maskable-512.png', ...assets];
      const worker = readFileSync(new URL('./public/service-worker.js', import.meta.url), 'utf8');
      const version = createHash('sha256').update(JSON.stringify(precache) + worker).digest('hex').slice(0, 12);
      this.emitFile({
        type: 'asset',
        fileName: 'service-worker.js',
        source: `self.__FORJA_PRECACHE = ${JSON.stringify(precache)};\n${worker.replace('forja-shell-v4', `forja-shell-${version}`)}`,
      });
    },
  }],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: false,
      },
    },
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
});
