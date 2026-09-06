import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// src/lib és codi pur: ni React ni Tone ni DOM. Amb l'entorn de node n'hi ha prou.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
