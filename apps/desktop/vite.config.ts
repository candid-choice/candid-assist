import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

const __dirname = dirname(fileURLToPath(import.meta.url));
const devkitRoot = resolve(__dirname, "../.hutch/devkit");

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
    alias: {
      electrobun: `${devkitRoot}/api/sdks/main/index.ts`,
      "electrobun/main": `${devkitRoot}/api/sdks/main/index.ts`,
      "electrobun/view": `${devkitRoot}/api/browser/index.ts`,
      "electrobun/events": `${devkitRoot}/api/sdks/main/entries/events.ts`,
      "electrobun/rpc": `${devkitRoot}/api/sdks/main/entries/rpc.ts`,
      "electrobun/bun": `${devkitRoot}/api/sdks/main/index.ts`,
    },
  },
  define: {
    "process.env.ELECTROBUN_BUILD_ENVIRONMENT": JSON.stringify("development"),
  },
});
