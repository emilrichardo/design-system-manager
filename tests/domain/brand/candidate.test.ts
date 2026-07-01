// T005 (011) — CandidateV1: invariante de aprobacion explicita, sin productor real.
import { describe, expect, it } from "vitest";
import { isApprovedForPersistence, validateCandidateShape, type CandidateV1 } from "../../../src/domain/brand/candidate.js";

function makeCandidate(overrides: Partial<CandidateV1> = {}): CandidateV1 {
  return {
    id: "c1",
    targetLevel: "brand",
    proposedValue: { name: "Eurotech" },
    evidence: [],
    confidence: 0.7,
    issues: [],
    reviewState: "pending",
    ...overrides,
  };
}

describe("isApprovedForPersistence", () => {
  it("solo autoriza persistencia si reviewState=approved", () => {
    expect(isApprovedForPersistence(makeCandidate({ reviewState: "pending" }))).toBe(false);
    expect(isApprovedForPersistence(makeCandidate({ reviewState: "rejected" }))).toBe(false);
    expect(isApprovedForPersistence(makeCandidate({ reviewState: "approved" }))).toBe(true);
  });
});

describe("validateCandidateShape", () => {
  it("acepta un candidato bien formado", () => {
    expect(validateCandidateShape(makeCandidate())).toHaveLength(0);
  });
  it("rechaza id vacio", () => {
    const issues = validateCandidateShape(makeCandidate({ id: "" }));
    expect(issues.some((i) => i.code === "candidate-id-invalid")).toBe(true);
  });
  it("rechaza confidence fuera de [0,1]", () => {
    const issues = validateCandidateShape(makeCandidate({ confidence: 1.5 }));
    expect(issues.some((i) => i.code === "candidate-confidence-invalid")).toBe(true);
  });
  it("rechaza targetLevel desconocido", () => {
    const issues = validateCandidateShape({ ...makeCandidate(), targetLevel: "governance" as never });
    expect(issues.some((i) => i.code === "candidate-target-level-invalid")).toBe(true);
  });
});
