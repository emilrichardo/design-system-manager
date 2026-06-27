// T009/T010 (003) — toJsonValidateEnvelope: los cinco outcomes, not-found contractual, pureza.
import { describe, expect, it } from "vitest";
import { toJsonValidateEnvelope } from "../../../src/application/json/map-validate.js";
import type { ValidateDesignSystemResult } from "../../../src/application/analysis-ports.js";
import { validationReport } from "../../../src/domain/analysis/validation-report.js";
import { analysisError, analysisWarning } from "../../../src/domain/analysis/analysis-issue.js";
import { analysisLimitsResult, noLimitsReached } from "../../../src/domain/traversal/limits.js";
import { analysisHost } from "../../helpers/analysis-fixtures.js";
import { deepFreeze, undefinedPaths } from "./json-test-utils.js";

function report(over: Partial<Parameters<typeof validationReport>[0]> = {}) {
  return validationReport({
    structuralState: "complete-valid",
    checkedDocuments: ["neuraz-ds.config.json"],
    uncheckedDocuments: [],
    errors: [],
    warnings: [],
    limits: noLimitsReached,
    tokens: 2,
    ...over,
  });
}

describe("toJsonValidateEnvelope — outcomes con result (T009)", () => {
  it("valid: envelope completo, sin campo error", () => {
    const r: ValidateDesignSystemResult = { outcome: "valid", host: analysisHost(), report: report() };
    const env = toJsonValidateEnvelope(r);
    expect(env.formatVersion).toBe("1.0.0");
    expect(env.command).toBe("validate");
    expect(env.outcome).toBe("valid");
    expect("error" in env).toBe(false);
    expect(env.outcome === "not-found" ? null : env.result).toEqual({
      host: { root: "/repo", designSystemPath: "/repo/design-system" },
      structuralState: "complete-valid",
      valid: true,
      checkedDocuments: ["neuraz-ds.config.json"],
      uncheckedDocuments: [],
      summary: { errors: 0, warnings: 0, tokens: 2 },
      errors: [],
      warnings: [],
      limits: { reached: false, partial: false, hits: [] },
    });
  });

  it("orden canónico de claves del envelope", () => {
    const r: ValidateDesignSystemResult = { outcome: "valid", host: analysisHost(), report: report() };
    expect(Object.keys(toJsonValidateEnvelope(r))).toEqual([
      "formatVersion",
      "command",
      "outcome",
      "result",
    ]);
  });

  it("valid con warnings: no invalida; warning mapeado", () => {
    const rep = report({
      warnings: [analysisWarning("dtcg-type-not-deeply-inspected", "no profundo", { document: "tokens" })],
    });
    const r: ValidateDesignSystemResult = { outcome: "valid", host: analysisHost(), report: rep };
    const env = toJsonValidateEnvelope(r);
    if (env.outcome !== "not-found") {
      expect(env.result.valid).toBe(true);
      expect(env.result.warnings).toHaveLength(1);
    }
  });

  it("complete-invalid: conserva host, errores, checked y límites", () => {
    const rep = report({
      structuralState: "complete-invalid",
      errors: [analysisError("dtcg-type-unrecognized", "tipo", { document: "tokens", path: "a.b" })],
    });
    const r: ValidateDesignSystemResult = { outcome: "complete-invalid", host: analysisHost(), report: rep };
    const env = toJsonValidateEnvelope(r);
    expect(env.outcome).toBe("complete-invalid");
    if (env.outcome !== "not-found") {
      expect(env.result.valid).toBe(false);
      expect(env.result.errors[0]).toEqual({
        severity: "error",
        code: "dtcg-type-unrecognized",
        message: "tipo",
        document: "tokens",
        path: "a.b",
      });
      expect("context" in (env.result.errors[0] as object)).toBe(false);
    }
  });

  it("partial: límite duro reflejado", () => {
    const rep = report({
      structuralState: "partial",
      checkedDocuments: [],
      uncheckedDocuments: ["design-system/tokens/base.tokens.json"],
      limits: analysisLimitsResult([{ limit: "nodes", detail: ">100000" }]),
    });
    const r: ValidateDesignSystemResult = { outcome: "partial", host: analysisHost(), report: rep };
    const env = toJsonValidateEnvelope(r);
    if (env.outcome !== "not-found") {
      expect(env.result.limits.partial).toBe(true);
      expect(env.result.uncheckedDocuments).toEqual(["design-system/tokens/base.tokens.json"]);
    }
  });

  it("read-error: conserva el informe recuperable", () => {
    const rep = report({
      structuralState: "partial",
      errors: [analysisError("read-failed", "EACCES", { document: "tokens" })],
    });
    const r: ValidateDesignSystemResult = { outcome: "read-error", host: analysisHost(), report: rep };
    const env = toJsonValidateEnvelope(r);
    expect(env.outcome).toBe("read-error");
    if (env.outcome !== "not-found") expect(env.result.errors[0]?.code).toBe("read-failed");
  });
});

describe("toJsonValidateEnvelope — not-found (T009)", () => {
  it("con host resuelto: result null, error null", () => {
    const r: ValidateDesignSystemResult = {
      outcome: "not-found",
      host: analysisHost(),
      report: report({ structuralState: "not-initialized" }),
      hostError: null,
    };
    const env = toJsonValidateEnvelope(r);
    expect(env).toEqual({
      formatVersion: "1.0.0",
      command: "validate",
      outcome: "not-found",
      result: null,
      error: null,
    });
  });

  it("sin host: result null, error null (no inventa ruta)", () => {
    const r: ValidateDesignSystemResult = {
      outcome: "not-found",
      host: null,
      report: null,
      hostError: { code: "package-json-missing", message: "sin package.json" },
    };
    const env = toJsonValidateEnvelope(r);
    expect(env.result).toBeNull();
    if (env.outcome === "not-found") expect(env.error).toBeNull();
  });
});

describe("toJsonValidateEnvelope — pureza y JSON-safe (T009)", () => {
  const r: ValidateDesignSystemResult = {
    outcome: "complete-invalid",
    host: analysisHost(),
    report: report({ structuralState: "complete-invalid", errors: [analysisError("e", "m")] }),
  };

  it("no expone campos de inspect (identity/files/tokens)", () => {
    const env = toJsonValidateEnvelope(r);
    if (env.outcome !== "not-found") {
      for (const k of ["identity", "schemaVersions", "files", "tokens"]) {
        expect(k in env.result).toBe(false);
      }
    }
  });

  it("no muta el input congelado y es determinista", () => {
    deepFreeze(r);
    expect(toJsonValidateEnvelope(r)).toEqual(toJsonValidateEnvelope(r));
  });

  it("no contiene undefined en ningún nivel", () => {
    expect(undefinedPaths(toJsonValidateEnvelope(r))).toEqual([]);
  });
});
