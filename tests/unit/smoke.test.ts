import { describe, expect, it } from "vitest";
import { PACKAGE_NAME } from "../../src/index.js";

// T003: prueba trivial que confirma que Vitest ejecuta y que el módulo ESM carga.
describe("bootstrap smoke", () => {
  it("carga el módulo de entrada ESM", () => {
    expect(PACKAGE_NAME).toBe("@neuraz/design-system-manager");
  });
});
