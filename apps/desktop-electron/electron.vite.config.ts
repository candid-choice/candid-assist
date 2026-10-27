/** Human Assist — electron-vite config.

  main/preload: this package's electron/ sources (CJS output to out/)
  renderer: REUSES the existing UI from ../desktop/src/views unchanged
            (same index.html entry; Vite is allowed to read the sibling
            workspace package)
*/

import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

const RENDERER_ROOT = path.resolve(__dirname, '../desktop/src/views');

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'out/main',
      lib: { entry: 'electron/main/index.ts', formats: ['cjs'] },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'out/preload',
      lib: { entry: 'electron/preload/index.ts', formats: ['cjs'] },
    },
  },
  renderer: {
    root: RENDERER_ROOT,
    base: './',
    plugins: [react(), tailwindcss()],
    server: {
      port: 5174,
      strictPort: true,
      fs: { allow: [RENDERER_ROOT, path.resolve(__dirname)] },
    },
    build: {
      outDir: path.resolve(__dirname, 'out/renderer'),
      emptyOutDir: true,
      rollupOptions: {
        input: path.join(RENDERER_ROOT, 'index.html'),
      },
    },
  },
});
