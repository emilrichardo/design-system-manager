import { describe, expect, it } from "vitest";
import { validatePlan } from "../../src/application/validate-plan.js";
import { documentValidators } from "../../src/infrastructure/validation/schema-validators.js";
import { createInitializationPlan } from "../../src/domain/plan/initialization-plan.js";
import { EXPECTED_FILES } from "../../src/domain/plan/managed-files.js";
import { createPartialState, noneState } from "../../src/domain/state/previous-state.js";
import { validConfig, validIdentity, validManifest, validTokens } from "../fixtures/documents.js";

function plan(files = [...EXPECTED_FILES], conflicts: string[] = [], state = noneState) {
  const r = createInitializationPlan({
    identity: validIdentity,
    hostRootId: "host-1",
    filesToCreate: files,
    conflicts,
    previousState: state,
  });
  if (!r.ok) throw new Error("plan fixture inválido");
  return r.value;
}

const docs = { config: validConfig, manifest: validManifest, tokens: validTokens };

describe("validatePlan (T030)", () => {
  it("plan válido con documentos válidos → ok", () => {
    const r = validatePlan(plan(), docs, documentValidators);
    expect(r.ok).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it("documento DTCG inválido → no ok", () => {
    const r = validatePlan(plan(), { ...docs, tokens: { x: { $value: "{a.b}" } } }, documentValidators);
    expect(r.ok).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it("archivos del plan que no coinciden con ADR-0004 → mismatch", () => {
    const r = validatePlan(plan(["solo-uno.json"]), docs, documentValidators);
    expect(r.ok).toBe(false);
    expect(r.errors.map((i) => i.code)).toContain("plan-files-mismatch");
  });

  it("conflictos → no ejecutable (errores)", () => {
    const partial = createPartialState([EXPECTED_FILES[0]!], [EXPECTED_FILES[1]!]);
    if (!partial.ok) throw new Error("estado fixture inválido");
    const r = validatePlan(plan([...EXPECTED_FILES], [EXPECTED_FILES[0]!], partial.value), docs, documentValidators);
    expect(r.ok).toBe(false);
    expect(r.errors.map((i) => i.code)).toContain("plan-conflict");
  });

  it("acumula múltiples errores (config y tokens)", () => {
    const r = validatePlan(
      plan(),
      { config: { configSchemaVersion: "0.1.0", designSystemDir: "../x" }, manifest: validManifest, tokens: { a: { $value: "{z.z}" } } },
      documentValidators,
    );
    expect(r.ok).toBe(false);
    expect(r.errors.length).toBeGreaterThanOrEqual(2);
  });
});
