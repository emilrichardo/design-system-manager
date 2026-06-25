import { describe, expect, it } from "vitest";
import { createIdentity } from "../../src/domain/identity/design-system-identity.js";
import {
  createInitializationPlan,
  ensureExecutable,
} from "../../src/domain/plan/initialization-plan.js";
import { EXPECTED_FILES } from "../../src/domain/plan/managed-files.js";
import { createPartialState, noneState } from "../../src/domain/state/previous-state.js";

function identity() {
  const r = createIdentity({ name: "Acme" });
  if (!r.ok) throw new Error("identidad inválida en fixture");
  return r.value;
}

describe("createInitializationPlan (T014)", () => {
  it("plan ejecutable: estado none, sin conflictos, archivos esperados exactos", () => {
    const r = createInitializationPlan({
      identity: identity(),
      hostRootId: "host-1",
      filesToCreate: [...EXPECTED_FILES],
      previousState: noneState,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.canProceed).toBe(true);
      expect(r.value.filesToCreate).toEqual(EXPECTED_FILES);
      expect(ensureExecutable(r.value).ok).toBe(true);
    }
  });

  it("plan no ejecutable: con conflictos canProceed=false y ensureExecutable falla", () => {
    const partial = createPartialState([EXPECTED_FILES[0]!], [EXPECTED_FILES[1]!]);
    expect(partial.ok).toBe(true);
    if (!partial.ok) return;
    const r = createInitializationPlan({
      identity: identity(),
      hostRootId: "host-1",
      filesToCreate: [...EXPECTED_FILES],
      conflicts: [EXPECTED_FILES[0]!],
      previousState: partial.value,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.canProceed).toBe(false);
      const exec = ensureExecutable(r.value);
      expect(exec.ok).toBe(false);
      if (!exec.ok) expect(exec.error.code).toBe("plan-not-executable");
    }
  });

  it("rechaza rutas duplicadas", () => {
    const dup = [EXPECTED_FILES[0]!, EXPECTED_FILES[0]!];
    const r = createInitializationPlan({
      identity: identity(),
      hostRootId: "host-1",
      filesToCreate: dup,
      previousState: noneState,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("plan-duplicate-files");
  });

  it("el plan es inmutable (filesToCreate congelado)", () => {
    const r = createInitializationPlan({
      identity: identity(),
      hostRootId: "host-1",
      filesToCreate: [...EXPECTED_FILES],
      previousState: noneState,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(Object.isFrozen(r.value)).toBe(true);
      expect(Object.isFrozen(r.value.filesToCreate)).toBe(true);
      expect(() => {
        (r.value.filesToCreate as string[]).push("x");
      }).toThrow();
    }
  });
});
