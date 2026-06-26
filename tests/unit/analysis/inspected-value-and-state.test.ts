// T004 — InspectedValue / Trust (C3). T005 — StructuralState desde PreviousState.
import { describe, expect, it } from "vitest";
import {
  recovered,
  unavailable,
  untrusted,
  valid,
} from "../../../src/domain/analysis/inspected-value.js";
import {
  structuralStateFromPrevious,
  type StructuralState,
} from "../../../src/domain/analysis/structural-state.js";
import type { PreviousStateKind } from "../../../src/domain/state/previous-state.js";

describe("InspectedValue / Trust (C3)", () => {
  it("distingue los cuatro niveles canónicos", () => {
    expect(valid("Acme")).toEqual({ value: "Acme", trust: "valid" });
    expect(recovered("acme")).toEqual({ value: "acme", trust: "recovered" });
    expect(untrusted("weird")).toEqual({ value: "weird", trust: "untrusted" });
    expect(unavailable).toEqual({ trust: "unavailable" });
  });

  it("unavailable no expone value", () => {
    expect("value" in unavailable).toBe(false);
  });
});

describe("structuralStateFromPrevious (T005)", () => {
  const cases: ReadonlyArray<[PreviousStateKind, StructuralState]> = [
    ["none", "not-initialized"],
    ["partial", "partial"],
    ["complete-invalid", "complete-invalid"],
    ["complete-valid", "complete-valid"],
  ];
  it.each(cases)("mapea %s → %s", (prev, expected) => {
    expect(structuralStateFromPrevious(prev)).toBe(expected);
  });
});
