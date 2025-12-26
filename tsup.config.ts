import { defineConfig } from "tsup";

export default defineConfig([
  // ✅ ESM: no bundle, preserves "use client"
  {
    entry: ["src/index.ts"],
    format: ["esm"],
    dts: true,
    splitting: false,
    clean: true,
    treeshake: true,
    external: ["react", "react-dom", "matter-js"],
    bundle: false
  },

  // Optional: CJS build (React apps that want require)
  {
    entry: ["src/index.ts"],
    format: ["cjs"],
    dts: false,
    splitting: false,
    clean: false,
    treeshake: true,
    external: ["react", "react-dom", "matter-js"],
    bundle: true
  }
]);
