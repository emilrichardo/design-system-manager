// T036 — Reporter textual de inspect + cota de 200 filas (sobre IO falso).
import { describe, expect, it } from "vitest";
import {
  InspectTerminalReporter,
  MAX_INSPECT_TERMINAL_TOKEN_ROWS,
} from "../../../src/infrastructure/reporter/inspect-terminal-reporter.js";
import { createDesignSystemInspection } from "../../../src/application/create-design-system-inspection.js";
import {
  analysisCompleteInvalid,
  analysisHostFailure,
  analysisPartial,
  analysisValid,
  designSystemAnalysis,
} from "../../helpers/analysis-fixtures.js";
import type { DesignSystemAnalysis } from "../../../src/domain/analysis/design-system-analysis.js";
import type { InspectDesignSystemResult } from "../../../src/application/analysis-ports.js";
import type { TokenNodeSummary } from "../../../src/domain/analysis/token-node-summary.js";

function capture() {
  const out: string[] = [];
  const err: string[] = [];
  return { io: { out: (t: string) => out.push(t), err: (t: string) => err.push(t) }, out, err };
}

function drive(analysis: DesignSystemAnalysis, outcome: InspectDesignSystemResult["outcome"]) {
  const c = capture();
  const reporter = new InspectTerminalReporter(c.io);
  const hostResolved = !analysis.errors.some((e) => e.document === "host");
  const inspection = outcome === "not-found" ? null : createDesignSystemInspection(analysis);
  if (hostResolved) reporter.hostResolved(analysis.host);
  reporter.structuralStateDetected(analysis.structuralState);
  if (inspection !== null) reporter.inspected(inspection);
  const result: InspectDesignSystemResult =
    outcome === "not-found"
      ? { outcome, host: hostResolved ? analysis.host : null, inspection: null, hostError: null }
      : { outcome, host: analysis.host, inspection: inspection as never };
  reporter.completed(result);
  return { ...c, text: c.out.join("") + c.err.join("") };
}

function nodes(n: number): TokenNodeSummary[] {
  return Array.from({ length: n }, (_, i) => ({
    path: `g.t${i}`, declaredType: "color", effectiveType: "color", typeOrigin: "own" as const,
    typeSourcePath: null, kind: "concrete" as const, aliasTarget: null, aliasState: "n/a" as const,
    description: null, depth: 2, trust: "valid" as const,
  }));
}

function analysisWithNodes(n: number): DesignSystemAnalysis {
  const base = analysisValid();
  return designSystemAnalysis({ ...base, nodes: nodes(n), statistics: { ...base.statistics, total: n, byType: { color: n } } });
}

describe("InspectTerminalReporter (T036)", () => {
  it("válido → identidad, archivos, tokens, validación en stdout", () => {
    const { out, err } = drive(analysisValid(), "valid");
    expect(err).toEqual([]);
    const t = out.join("");
    expect(t).toContain("Identidad:");
    expect(t).toContain("Nombre: Acme");
    expect(t).toContain("Archivos:");
    expect(t).toContain("Tokens:");
    expect(t).toContain("Validación:");
  });

  it("complete-invalid recuperable en stderr, con byType y errores", () => {
    const { err } = drive(analysisCompleteInvalid(), "complete-invalid");
    const t = err.join("");
    expect(t).toContain("weird=1");
    expect(t).toContain("[error] dtcg-type-unrecognized");
  });

  it("partial → presentes/ausentes", () => {
    const { text } = drive(analysisPartial(), "partial");
    expect(text).toContain("Ausentes:");
    expect(text).toContain("base.tokens.json");
  });

  it("not-found → mensaje claro, sin inspección", () => {
    const { err, text } = drive(analysisHostFailure(), "not-found");
    expect(err.join("")).toContain("No se localizó un Design System administrado");
    expect(text).not.toContain("Identidad:");
  });

  const cap = MAX_INSPECT_TERMINAL_TOKEN_ROWS;
  it.each([0, 1, 199, 200])("≤200 (%d) → muestra todos, sin mensaje de omisión", (n) => {
    const { text } = drive(analysisWithNodes(n), "valid");
    const shown = (text.match(/^ {2}g\.t\d+:/gm) ?? []).length;
    expect(shown).toBe(n);
    expect(text).not.toContain("no se muestran en la salida textual");
  });

  it.each([201, 250])(">200 (%d) → muestra 200 y mensaje exacto de omisión", (n) => {
    const { text } = drive(analysisWithNodes(n), "valid");
    const shown = (text.match(/^ {2}g\.t\d+:/gm) ?? []).length;
    expect(shown).toBe(cap);
    expect(text).toContain(`Mostrando ${cap} de ${n} tokens.`);
    expect(text).toContain(`${n - cap} tokens no se muestran en la salida textual.`);
    // primera y última fila mostradas
    expect(text).toContain("  g.t0:");
    expect(text).toContain(`  g.t${cap - 1}:`);
    expect(text).not.toContain(`  g.t${cap}:`);
  });

  it("estadísticas completas aunque solo se muestren 200 filas", () => {
    const { text } = drive(analysisWithNodes(250), "valid");
    expect(text).toContain("Total: 250");
    expect(text).toContain("color=250");
  });

  it("no muta la inspección de entrada (análisis congelado)", () => {
    const a = Object.freeze(analysisWithNodes(5));
    drive(a, "valid");
    expect(a.nodes).toHaveLength(5);
  });
});
