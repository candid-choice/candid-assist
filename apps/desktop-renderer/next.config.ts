import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Packaged desktop: `next build` emits a static export consumed by
  // Electron via loadFile (copied into app resources by electron-builder).
  output: "export",
  images: { unoptimized: true },
  // reactCompiler intentionally off until the UI tree is audited for it.
};

export default nextConfig;
