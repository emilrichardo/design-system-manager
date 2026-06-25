import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Cobertura se habilitará en fases posteriores (Fase 8/9). Bootstrap solo ejecuta tests.
  },
});
