// T005 (011) — Vocabulario unico de provenance/confidence.
import { describe, expect, it } from "vitest";
import { PROVENANCE_STATUSES, isCoherentProvenance, isProvenanceStatus, isValidConfidence } from "../../src/domain/provenance.js";

describe("ProvenanceStatus", () => {
  it("tiene exactamente 6 estados", () => {
    expect(PROVENANCE_STATUSES).toHaveLength(6);
  });
  it("rechaza un status no reconocido", () => {
    expect(isProvenanceStatus("confirmed")).toBe(false);
    expect(isProvenanceStatus("official")).toBe(true);
  });
});

describe("confidence", () => {
  it("acepta null y numeros en [0,1]", () => {
    expect(isValidConfidence(null)).toBe(true);
    expect(isValidConfidence(0)).toBe(true);
    expect(isValidConfidence(1)).toBe(true);
    expect(isValidConfidence(0.5)).toBe(true);
  });
  it("rechaza fuera de rango o no numerico", () => {
    expect(isValidConfidence(1.1)).toBe(false);
    expect(isValidConfidence(-0.1)).toBe(false);
    expect(isValidConfidence("high")).toBe(false);
  });
});

describe("isCoherentProvenance", () => {
  it("acepta status+confidence validos", () => {
    expect(isCoherentProvenance({ status: "observed", confidence: 0.8 })).toBe(true);
  });
  it("rechaza confidence fuera de rango aunque status sea valido", () => {
    expect(isCoherentProvenance({ status: "observed", confidence: 3 })).toBe(false);
  });
});
