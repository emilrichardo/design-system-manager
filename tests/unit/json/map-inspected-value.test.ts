// T005 (003) — toJsonInspectedValue: value siempre presente (null si ausente), trust preservado.
import { describe, expect, it } from "vitest";
import { toJsonInspectedValue } from "../../../src/application/json/map-inspected-value.js";
import {
  recovered,
  untrusted,
  unavailable,
  valid,
} from "../../../src/domain/analysis/inspected-value.js";

describe("toJsonInspectedValue (T005)", () => {
  it("valid conserva valor y trust", () => {
    expect(toJsonInspectedValue(valid("Acme"))).toEqual({ value: "Acme", trust: "valid" });
  });

  it("recovered y untrusted conservan el valor recuperado", () => {
    expect(toJsonInspectedValue(recovered("0.1.0"))).toEqual({ value: "0.1.0", trust: "recovered" });
    expect(toJsonInspectedValue(untrusted("x"))).toEqual({ value: "x", trust: "untrusted" });
  });

  it("unavailable → value null sin inventar valor", () => {
    expect(toJsonInspectedValue(unavailable)).toEqual({ value: null, trust: "unavailable" });
  });

  it("undefined (campo ausente) → { value: null, trust: 'unavailable' }", () => {
    expect(toJsonInspectedValue(undefined)).toEqual({ value: null, trust: "unavailable" });
  });

  it("nunca emite value === undefined", () => {
    const out = toJsonInspectedValue(unavailable);
    expect("value" in out).toBe(true);
    expect(out.value).toBeNull();
  });

  it("no muta la entrada congelada y es determinista", () => {
    const input = Object.freeze(valid("Acme"));
    const a = toJsonInspectedValue(input);
    const b = toJsonInspectedValue(input);
    expect(a).toEqual(b);
    expect(input).toEqual({ value: "Acme", trust: "valid" });
  });
});
