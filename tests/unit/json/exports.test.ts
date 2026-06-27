// T003 (003) — La API pública headless expone versión + DTO (type-only) + mappers comunes.
import { describe, expect, it } from "vitest";
import { JSON_FORMAT_VERSION, toJsonIssue, toJsonValidation } from "../../../src/application/index.js";
import type { JsonEnvelopeV1, JsonIssueV1 } from "../../../src/application/index.js";
import { analysisError } from "../../../src/domain/analysis/analysis-issue.js";

describe("exports JSON v1 (T003)", () => {
  it("re-exporta JSON_FORMAT_VERSION desde la API de aplicación", () => {
    expect(JSON_FORMAT_VERSION).toBe("1.0.0");
  });

  it("re-exporta los mappers comunes", () => {
    expect(typeof toJsonIssue).toBe("function");
    expect(typeof toJsonValidation).toBe("function");
  });

  it("los tipos DTO están disponibles (uso type-only)", () => {
    const issue: JsonIssueV1 = toJsonIssue(analysisError("c", "m"));
    expect(issue.code).toBe("c");
    // JsonEnvelopeV1 es usable como anotación de tipo.
    const sample: JsonEnvelopeV1 = {
      formatVersion: "1.0.0",
      command: "validate",
      outcome: "not-found",
      result: null,
      error: null,
    };
    expect(sample.outcome).toBe("not-found");
  });
});
