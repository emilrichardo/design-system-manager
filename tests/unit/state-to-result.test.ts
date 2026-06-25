import { describe, expect, it } from "vitest";
import { initializeDesignSystem } from "../../src/application/initialize-design-system.js";
import { completeValidState, createCompleteInvalidState, createPartialState } from "../../src/domain/state/previous-state.js";
import { MANAGED_FILES } from "../../src/domain/plan/managed-files.js";
import { buildDeps } from "../helpers/in-memory-adapters.js";

const input = { executionDir: "/host" };

describe("mapeo estado previo → resultado (T038)", () => {
  it("complete-valid → unchanged, sin identidad/confirmación/transacción", async () => {
    const built = buildDeps({ state: completeValidState("design-system") });
    const result = await initializeDesignSystem(input, built.deps);
    expect(result.status).toBe("unchanged");
    if (result.status === "unchanged") expect(result.reason).toBe("design-system");
    expect(built.prompter.requestIdentityCalls).toBe(0);
    expect(built.prompter.confirmCalls).toBe(0);
    expect(built.writer.commitCalls).toBe(0);
  });

  it("partial → conflict con presentes, sin identidad/confirmación/transacción", async () => {
    const partial = createPartialState([MANAGED_FILES.config], [MANAGED_FILES.manifest, MANAGED_FILES.tokens]);
    if (!partial.ok) throw new Error("fixture inválido");
    const built = buildDeps({ state: partial.value });
    const result = await initializeDesignSystem(input, built.deps);
    expect(result.status).toBe("conflict");
    if (result.status === "conflict") expect(result.conflicts).toContain(MANAGED_FILES.config);
    expect(built.prompter.requestIdentityCalls).toBe(0);
    expect(built.writer.commitCalls).toBe(0);
  });

  it("complete-invalid → failed/validation con errores, sin identidad/transacción", async () => {
    const invalid = createCompleteInvalidState([{ code: "dtcg-invalid", message: "tokens inválidos" }]);
    if (!invalid.ok) throw new Error("fixture inválido");
    const built = buildDeps({ state: invalid.value });
    const result = await initializeDesignSystem(input, built.deps);
    expect(result.status).toBe("failed");
    if (result.status === "failed") {
      expect(result.category).toBe("validation");
      expect(result.errors.length).toBe(1);
    }
    expect(built.prompter.requestIdentityCalls).toBe(0);
    expect(built.writer.commitCalls).toBe(0);
  });
});
