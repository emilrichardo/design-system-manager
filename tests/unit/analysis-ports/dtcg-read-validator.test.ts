// T017 — DtcgReadValidator: puerto separado del de generación de 001; devuelve AnalysisIssue[].
import { describe, expect, it } from "vitest";
import type { DtcgReadValidator } from "../../../src/application/analysis-ports.js";
import { analysisError, analysisWarning } from "../../../src/domain/analysis/analysis-issue.js";

// Fake mínimo: reconoce tipos sin transformar $value.
const fakeReadValidator: DtcgReadValidator = {
  validate(document: unknown) {
    if (typeof document !== "object" || document === null) {
      return [analysisError("dtcg-document-invalid", "documento no es objeto", { document: "tokens" })];
    }
    return [analysisWarning("dtcg-type-not-deeply-inspected", "tipo reconocido no profundo", {
      document: "tokens",
    })];
  },
};

describe("DtcgReadValidator (T017)", () => {
  it("devuelve AnalysisIssue[] (severidad/documento), no texto crudo", () => {
    const issues = fakeReadValidator.validate({ color: { $type: "dimension", $value: "1px" } });
    expect(issues).toHaveLength(1);
    expect(issues[0]?.severity).toBe("warning");
    expect(issues[0]?.code).toBe("dtcg-type-not-deeply-inspected");
    expect(issues[0]?.document).toBe("tokens");
  });

  it("documento inválido ⇒ error estructurado", () => {
    const issues = fakeReadValidator.validate(null);
    expect(issues[0]?.severity).toBe("error");
    expect(issues[0]?.code).toBe("dtcg-document-invalid");
  });
});
