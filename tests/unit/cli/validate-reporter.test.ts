// T035 — Reporter textual de validate (sobre IO falso capturable).
import { describe, expect, it } from "vitest";
import { ValidateTerminalReporter } from "../../../src/infrastructure/reporter/validate-terminal-reporter.js";
import { createValidationReport } from "../../../src/application/create-validation-report.js";
import {
  analysisCompleteInvalid,
  analysisHostFailure,
  analysisPartial,
  analysisValid,
  analysisHost,
} from "../../helpers/analysis-fixtures.js";
import type { DesignSystemAnalysis } from "../../../src/domain/analysis/design-system-analysis.js";
import type { ValidateDesignSystemResult } from "../../../src/application/analysis-ports.js";

function capture() {
  const out: string[] = [];
  const err: string[] = [];
  return { io: { out: (t: string) => out.push(t), err: (t: string) => err.push(t) }, out, err };
}

// Reproduce la secuencia de eventos que el caso de uso emitiría para un análisis dado.
function drive(analysis: DesignSystemAnalysis, outcome: ValidateDesignSystemResult["outcome"]) {
  const c = capture();
  const reporter = new ValidateTerminalReporter(c.io);
  const report = createValidationReport(analysis);
  const hostResolved = !analysis.errors.some((e) => e.document === "host");
  if (hostResolved) reporter.hostResolved(analysis.host);
  reporter.structuralStateDetected(analysis.structuralState);
  reporter.validated(report);
  const result: ValidateDesignSystemResult =
    outcome === "not-found"
      ? { outcome, host: hostResolved ? analysis.host : null, report, hostError: null }
      : { outcome, host: analysis.host, report };
  reporter.completed(result);
  return { ...c, text: c.out.join("") + c.err.join("") };
}

describe("ValidateTerminalReporter (T035)", () => {
  it("válido → stdout con host, estado, tokens y confirmación", () => {
    const a = analysisValid();
    const { out, err, text } = drive(a, "valid");
    expect(err).toEqual([]);
    expect(out.join("")).toContain("Host: /repo");
    expect(text).toContain("Estado: complete-valid");
    expect(text).toContain("Tokens: 2");
    expect(text).toContain("Design System válido.");
  });

  it("válido con warnings → sigue válido, lista advertencias", () => {
    const a = analysisValid();
    const withWarn = { ...a, warnings: [{ code: "dtcg-description-missing", message: "falta", severity: "warning" as const, document: "tokens" as const, path: "g.t" }] };
    const { text } = drive(withWarn, "valid");
    expect(text).toContain("Advertencias: 1");
    expect(text).toContain("[warning] dtcg-description-missing");
  });

  it("complete-invalid → stderr con issues (code, documento, path, mensaje)", () => {
    const { out, err } = drive(analysisCompleteInvalid(), "complete-invalid");
    expect(out).toEqual([]);
    const e = err.join("");
    expect(e).toContain("[error] dtcg-type-unrecognized");
    expect(e).toContain("tokens:g.t");
    expect(e).toContain("Design System no válido (complete-invalid).");
  });

  it("partial → documentos no comprobados listados", () => {
    const { text } = drive(analysisPartial(), "partial");
    expect(text).toContain("Documentos no comprobados:");
    expect(text).toContain("base.tokens.json");
  });

  it("not-found (host failure) → no muestra 'Host:' inventado", () => {
    const { text } = drive(analysisHostFailure(), "not-found");
    expect(text).not.toContain("Host: ");
    expect(text).toContain("no válido (not-found)");
  });

  it("orden determinista: misma entrada ⇒ misma salida; no muta el report", () => {
    const a = analysisCompleteInvalid();
    const t1 = drive(a, "complete-invalid").text;
    const t2 = drive(a, "complete-invalid").text;
    expect(t1).toBe(t2);
    expect(a.errors).toHaveLength(1);
  });

  it("ignora el helper analysisHost (smoke)", () => {
    expect(analysisHost().root).toBe("/repo");
  });
});
