import { bundleBudget } from './scripts/bundle-budget.ts';
import { defineConfig } from 'vite';
import path from 'node:path';
import { readFileSync } from 'node:fs';
const galaxyLicense = readFileSync(
  new URL('./licenses/galaxy-view-MIT.txt', import.meta.url),
  'utf8',
);
export default defineConfig(({ mode }) => ({
  base: mode === 'pages' ? './' : '/',
  plugins: [
    bundleBudget(),
    {
      name: 'galaxy-license',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'licenses/galaxy-view-MIT.txt',
          source: galaxyLicense,
        });
      },
    },
  ],
  define: { __STATIC_PAGES__: JSON.stringify(mode === 'pages') },
  build: {
    outDir: mode === 'pages' ? 'dist-pages' : 'dist',
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'CIRCULAR_CHUNK') throw new Error(warning.message);
        warn(warning);
      },
      output: {
        // Preserve lazy diagram imports; do not pull their dependencies into the entry chunk.
        onlyExplicitManualChunks: true,
        manualChunks(id) {
          if (id.includes('/three/build/three.core.js')) return 'three-core';
          if (id.includes('/three/build/three.module.js')) return 'three-webgl';
          // Preserve diagram entry modules too: merging them with their shared
          // dependencies creates cycles between otherwise lazy Mermaid chunks.
          if (id.includes('/mermaid/dist/chunks/mermaid.core/'))
            return `mermaid-${path.basename(id, '.mjs')}`;
          if (id.includes('/@mermaid-js/parser/')) return 'mermaid-parser';
          if (id.includes('/elkjs/')) return 'mermaid-elk';
        },
      },
    },
  },
}));
