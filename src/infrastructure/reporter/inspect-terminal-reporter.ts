// T036 — Adapter de presentación del puerto InspectionReporter para terminal. Traduce el modelo de
// inspección a texto. La cota de presentación MAX_INSPECT_TERMINAL_TOKEN_ROWS = 200 vive AQUÍ (capa de
// presentación), NO en dominio/aplicación: limita solo cuántas filas de tokens se imprimen, sin
// alterar el modelo, las estadísticas, los issues, la validez ni el exit code. No accede al filesystem.
import type { InspectionReporter, InspectDesignSystemResult } from "../../application/analysis-ports.js";
import type { AnalysisHost } from "../../domain/analysis/design-system-analysis.js";
import type {
  DesignSystemInspection,
  TokensInspection,
} from "../../domain/analysis/design-system-inspection.js";
import type { InspectedValue } from "../../domain/analysis/inspected-value.js";
import type { TokenNodeSummary } from "../../domain/analysis/token-node-summary.js";
import type { AnalysisIssue } from "../../domain/analysis/analysis-issue.js";
import type { StructuralState } from "../../domain/analysis/structural-state.js";
import type { OutputWriter } from "./terminal-reporter.js";

/** Máximo de filas de tokens que el reporter textual imprime. Cota de PRESENTACIÓN (no de análisis). */
export const MAX_INSPECT_TERMINAL_TOKEN_ROWS = 200;

function iv(value: InspectedValue<string> | undefined): string {
  if (value === undefined || value.value === undefined) return "(no disponible)";
  return value.trust === "valid" ? value.value : `${value.value} [${value.trust}]`;
}

function formatNode(node: TokenNodeSummary): string {
  const type = node.effectiveType ?? "(untyped)";
  const origin = node.typeOrigin !== "own" ? ` <${node.typeOrigin}>` : "";
  const alias = node.kind === "alias" ? ` → ${node.aliasTarget ?? "?"} [${node.aliasState}]` : "";
  const trust = node.trust !== "valid" ? ` (${node.trust})` : "";
  return `  ${node.path}: ${type}${origin}${alias}${trust}`;
}

function tokenLines(tokens: TokensInspection): string[] {
  const lines: string[] = [];
  lines.push("Tokens:");
  lines.push(`  Total: ${tokens.total} · Grupos: ${tokens.groups} · Concretos: ${tokens.concreteValues} · Aliases: ${tokens.aliases} · Profundidad máx.: ${tokens.maxDepth}`);
  const byType = Object.entries(tokens.byType).map(([t, n]) => `${t}=${n}`).join(", ");
  lines.push(`  Por tipo: ${byType || "ninguno"}`);

  const paths = tokens.paths;
  const shown = paths.slice(0, MAX_INSPECT_TERMINAL_TOKEN_ROWS);
  lines.push("Rutas de tokens:");
  for (const node of shown) lines.push(formatNode(node));
  if (paths.length > MAX_INSPECT_TERMINAL_TOKEN_ROWS) {
    const omitted = paths.length - MAX_INSPECT_TERMINAL_TOKEN_ROWS;
    lines.push(`Mostrando ${MAX_INSPECT_TERMINAL_TOKEN_ROWS} de ${paths.length} tokens.`);
    lines.push(`${omitted} tokens no se muestran en la salida textual.`);
  }
  return lines;
}

function issueLine(issue: AnalysisIssue): string {
  const where = [issue.document, issue.path].filter((v) => v !== undefined).join(":");
  const suffix = where.length > 0 ? ` (${where})` : "";
  return `  [${issue.severity}] ${issue.code}${suffix} — ${issue.message}`;
}

function render(inspection: DesignSystemInspection): string[] {
  const lines: string[] = [];
  lines.push("Design System");

  // Identidad.
  if (inspection.identity !== undefined) {
    lines.push("Identidad:");
    lines.push(`  Nombre: ${iv(inspection.identity.name)}`);
    lines.push(`  Slug: ${iv(inspection.identity.slug)}`);
    lines.push(`  Versión: ${iv(inspection.identity.version)}`);
    if (inspection.identity.description !== undefined) lines.push(`  Descripción: ${iv(inspection.identity.description)}`);
  }

  // Archivos.
  lines.push("Archivos:");
  lines.push(`  Esperados: ${inspection.files.expected.join(", ")}`);
  lines.push(`  Presentes: ${inspection.files.present.map((f) => f.relativePath).join(", ") || "ninguno"}`);
  lines.push(`  Ausentes: ${inspection.files.missing.join(", ") || "ninguno"}`);

  // Tokens.
  if (inspection.tokens !== undefined) lines.push(...tokenLines(inspection.tokens));

  // Validación.
  const v = inspection.validation;
  lines.push("Validación:");
  lines.push(`  Estado: ${v.structuralState} · Válido: ${v.valid ? "sí" : "no"}`);
  lines.push(`  Errores: ${v.summary.errors} · Advertencias: ${v.summary.warnings}`);
  if (v.limits.partial) lines.push(`  Análisis parcial (límites alcanzados: ${v.limits.hits.map((h) => h.limit).join(", ")})`);
  for (const e of v.errors) lines.push(issueLine(e));
  for (const w of v.warnings) lines.push(issueLine(w));
  return lines;
}

export class InspectTerminalReporter implements InspectionReporter {
  private host: AnalysisHost | undefined;
  private state: StructuralState | undefined;
  private inspection: DesignSystemInspection | undefined;

  constructor(private readonly io: OutputWriter) {}

  hostResolved(host: AnalysisHost): void {
    this.host = host;
  }

  structuralStateDetected(state: StructuralState): void {
    this.state = state;
  }

  inspected(inspection: DesignSystemInspection): void {
    this.inspection = inspection;
  }

  completed(result: InspectDesignSystemResult): void {
    if (result.outcome === "not-found" || this.inspection === undefined) {
      const root = this.host?.root;
      const where = root !== undefined ? ` en ${root}` : "";
      this.io.err(`No se localizó un Design System administrado${where}.\n`);
      return;
    }
    const lines = render(this.inspection);
    const text = `${lines.join("\n")}\n`;
    if (result.outcome === "valid") this.io.out(text);
    else this.io.err(text);
  }
}
