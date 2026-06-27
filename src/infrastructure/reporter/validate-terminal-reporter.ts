// T035 — Adapter de presentación del puerto ValidationReporter para terminal. Traduce eventos
// semánticos a texto legible (sin ANSI obligatorio). No ejecuta lógica de negocio, no accede al
// filesystem, no recalcula `valid`. Usa un OutputWriter inyectado (compatible con CliIO).
import type { ValidationReporter, ValidateDesignSystemResult } from "../../application/analysis-ports.js";
import type { AnalysisHost } from "../../domain/analysis/design-system-analysis.js";
import type { AnalysisIssue } from "../../domain/analysis/analysis-issue.js";
import type { ValidationReport } from "../../domain/analysis/validation-report.js";
import type { StructuralState } from "../../domain/analysis/structural-state.js";
import type { OutputWriter } from "./terminal-reporter.js";

function formatIssue(issue: AnalysisIssue): string {
  const where = [issue.document, issue.path].filter((v) => v !== undefined).join(":");
  const suffix = where.length > 0 ? ` (${where})` : "";
  return `  [${issue.severity}] ${issue.code}${suffix} — ${issue.message}`;
}

export class ValidateTerminalReporter implements ValidationReporter {
  private host: AnalysisHost | undefined;
  private state: StructuralState | undefined;
  private report: ValidationReport | undefined;

  constructor(private readonly io: OutputWriter) {}

  hostResolved(host: AnalysisHost): void {
    this.host = host;
  }

  structuralStateDetected(state: StructuralState): void {
    this.state = state;
  }

  validated(report: ValidationReport): void {
    this.report = report;
  }

  completed(result: ValidateDesignSystemResult): void {
    const report = this.report;
    const lines: string[] = [];
    lines.push(`Validación del Design System: ${result.outcome}`);
    if (this.host !== undefined) lines.push(`Host: ${this.host.root}`);
    if (this.state !== undefined) lines.push(`Estado: ${this.state}`);

    if (report !== undefined) {
      lines.push(`Documentos comprobados: ${report.checkedDocuments.join(", ") || "ninguno"}`);
      if (report.uncheckedDocuments.length > 0) {
        lines.push(`Documentos no comprobados: ${report.uncheckedDocuments.join(", ")}`);
      }
      if (report.summary.tokens !== undefined) lines.push(`Tokens: ${report.summary.tokens}`);
      lines.push(`Errores: ${report.summary.errors}`);
      lines.push(`Advertencias: ${report.summary.warnings}`);
      for (const e of report.errors) lines.push(formatIssue(e));
      for (const w of report.warnings) lines.push(formatIssue(w));
    }
    lines.push(result.outcome === "valid" ? "Design System válido." : `Design System no válido (${result.outcome}).`);

    const text = `${lines.join("\n")}\n`;
    if (result.outcome === "valid") this.io.out(text);
    else this.io.err(text);
  }
}
