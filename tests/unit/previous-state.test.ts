import { describe, expect, it } from "vitest";
import {
  completeValidState,
  createCompleteInvalidState,
  createPartialState,
  expectedOutcome,
  noneState,
} from "../../src/domain/state/previous-state.js";

describe("previous states (T013)", () => {
  it("none → permite continuar, outcome created", () => {
    expect(noneState.kind).toBe("none");
    expect(expectedOutcome(noneState)).toBe("created");
  });

  it("complete-valid → outcome unchanged, conserva la ubicación", () => {
    const s = completeValidState("design-system");
    expect(s.designSystemDir).toBe("design-system");
    expect(expectedOutcome(s)).toBe("unchanged");
  });

  it("partial → enumera presentes y ausentes, outcome conflict", () => {
    const r = createPartialState(["neuraz-ds.config.json"], ["design-system/design-system.json"]);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.present).toEqual(["neuraz-ds.config.json"]);
      expect(r.value.missing).toEqual(["design-system/design-system.json"]);
      expect(expectedOutcome(r.value)).toBe("conflict");
    }
  });

  it("partial vacío (sin presentes ni ausentes) es incoherente", () => {
    const r = createPartialState([], []);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("incoherent-state");
  });

  it("complete-invalid → requiere errores, outcome failed-validation", () => {
    const r = createCompleteInvalidState([{ code: "dtcg-invalid", message: "tokens inválidos" }]);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.errors).toHaveLength(1);
      expect(expectedOutcome(r.value)).toBe("failed-validation");
    }
  });

  it("complete-invalid sin errores es incoherente", () => {
    const r = createCompleteInvalidState([]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("incoherent-state");
  });
});
