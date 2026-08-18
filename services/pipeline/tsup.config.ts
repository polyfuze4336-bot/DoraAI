import { defineConfig } from "tsup";

export default defineConfig({
  clean: true,
  entry: ["src/index.ts"],
  format: ["cjs"],
  noExternal: [/.*/],
  outExtension: () => ({ js: ".cjs" }),
  platform: "node",
  sourcemap: true,
  target: "node22",
});
