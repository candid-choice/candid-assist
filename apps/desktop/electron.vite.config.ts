/** Human Assist — electron-vite config.

  main/preload: this package's electron/ sources (CJS output to out/)

  NOTE: there is no renderer here anymore. The UI lives in
  apps/desktop-renderer (Next.js) and is served over HTTP; the main
  process loads it via DESKTOP_UI_URL (dev default
  http://localhost:3616). Packaging will point at a `next export`
  output (Phase P6).
*/

import { defineConfig, externalizeDepsPlugin } from 'electron-vite';

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
});
