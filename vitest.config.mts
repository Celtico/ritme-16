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
    // Els tests que generen centenars de cançons per estil triguen uns 3 s en un portàtil i
    // passen dels 5 s per defecte en un runner de CI, que és més lent.
    testTimeout: 30_000,
  },
});
