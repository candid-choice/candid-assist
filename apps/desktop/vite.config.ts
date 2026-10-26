import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

const __dirname = dirname(fileURLToPath(import.meta.url));
const devkitRoot = resolve(__dirname, "../.hutch/devkit");

// The Electrobun browser devkit is generated & gitignored. When absent
// (e.g. CI), alias the devkit specifier to a no-op stub so the renderer
// still builds — it is never executed outside Electrobun.
const browserDevkit = resolve(__dirname, ".hutch/devkit/api/browser/index.ts");
const devkitPresent = existsSync(browserDevkit);

export default defineConfig({
  root: "./src/views",
  base: "./",
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    // Relative to root, so output lands in ../../dist for Electrobun.
    outDir: "../../dist",
    emptyOutDir: true,
    rollupOptions: {
      external: [/^electrobun/],
      input: "./src/views/index.html",
    },
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      ...(devkitPresent
        ? []
        : [
            {
              find: /(^|\/)\.hutch\/devkit\/api\/browser\/index(\.js)?$/,
              replacement: resolve(__dirname, "src/views/devkit-stub.ts"),
            },
          ]),
      { find: "electrobun", replacement: `${devkitRoot}/api/sdks/main/index.ts` },
      { find: "electrobun/main", replacement: `${devkitRoot}/api/sdks/main/index.ts` },
      { find: "electrobun/view", replacement: `${devkitRoot}/api/browser/index.ts` },
      { find: "electrobun/events", replacement: `${devkitRoot}/api/sdks/main/entries/events.ts` },
      { find: "electrobun/rpc", replacement: `${devkitRoot}/api/sdks/main/entries/rpc.ts` },
      { find: "electrobun/bun", replacement: `${devkitRoot}/api/sdks/main/index.ts` },
    ],
  },
  define: {
    "process.env.ELECTROBUN_BUILD_ENVIRONMENT": JSON.stringify("development"),
  },
});
