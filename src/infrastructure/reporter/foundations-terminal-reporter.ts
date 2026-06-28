// T030 (004) - Adapter textual del puerto FoundationsReporter para terminal. Presenta la
// inspeccion foundation ya calculada; no analiza, no accede a filesystem y no muta el modelo.
import type {
  FoundationCategoryInspection,
  FoundationTokenInspection,
  FoundationsReporter,
  FoundationsResult,
} from "../../application/foundations/foundations-ports.js";
import type { FoundationIssue } from "../../domain/foundations/foundation-issue.js";
import type { AnalysisLimitsResult } from "../../domain/traversal/limits.js";
import type { OutputWriter } from "./terminal-reporter.js";

function issueLine(issue: FoundationIssue): string {
  const where = [issue.document, issue.path].filter((value) => value !== undefined).join(":");
  const suffix = where.length > 0 ? ` (${where})` : "";
  return `  [${issue.severity}] ${issue.code}${suffix} - ${issue.message}`;
}

function tokenLine(token: FoundationTokenInspection): string {
  const type = token.effectiveType ?? "(untyped)";
  const alias = token.kind === "alias" ? ` -> ${token.aliasTarget ?? "?"} [${token.aliasState}]` : "";
  return `  ${token.path}: ${token.category} ${token.level} (${token.levelSource}) ${type}${alias}`;
}

function categoryLine(category: FoundationCategoryInspection): string {
  const counts = category.counts;
  return [
    `  ${category.id}: ${category.state}`,
    `depth=${category.validationDepth}`,
    `total=${counts.total}`,
    `primitive=${counts.primitive}`,
    `semantic=${counts.semantic}`,
    `unclassified=${counts.unclassified}`,
    `issues=${category.issues.length}`,
  ].join(" · ");
}

function limitLines(limits: AnalysisLimitsResult): string[] {
  const lines = ["Límites:"];
  lines.push(`  Alcanzados: ${limits.reached ? "sí" : "no"} · Parcial: ${limits.partial ? "sí" : "no"}`);
  if (limits.hits.length === 0) {
    lines.push("  Hits: ninguno");
    return lines;
  }
  for (const hit of limits.hits) lines.push(`  - ${hit.limit}: ${hit.detail}`);
  return lines;
}

function renderInspection(result: Exclude<FoundationsResult, { outcome: "not-found" }>): string[] {
  const { inspection } = result;
  const summary = inspection.summary;
  const categories = [...inspection.categories].sort(
    (a, b) => a.definition.displayOrder - b.definition.displayOrder,
  );
  const lines: string[] = [
    `Foundations: ${result.outcome}`,
    `Host: ${result.host.root}`,
    `Design System: ${result.host.designSystemPath ?? "(no disponible)"}`,
    `Estado estructural: ${inspection.structuralState}`,
    "Resumen:",
    `  Categorías: absent=${summary.categories.absent}, partial=${summary.categories.partial}, complete=${summary.categories.complete}, invalid=${summary.categories.invalid}`,
    `  Tokens: total=${summary.tokens.total}, primitive=${summary.tokens.primitive}, semantic=${summary.tokens.semantic}, unclassified=${summary.tokens.unclassified}, unresolved=${summary.tokens.unresolved}`,
    `  Issues: errors=${summary.errors}, warnings=${summary.warnings}`,
    "Categorías:",
  ];

  for (const category of categories) lines.push(categoryLine(category));

  lines.push("Unresolved:");
  lines.push(`  Total: ${inspection.unresolved.length}`);
  for (const token of inspection.unresolved) lines.push(tokenLine(token));

  lines.push("Issues:");
  lines.push(`  Errores: ${inspection.validation.errors.length} · Advertencias: ${inspection.validation.warnings.length}`);
  if (inspection.validation.errors.length === 0 && inspection.validation.warnings.length === 0) {
    lines.push("  Ninguno");
  } else {
    for (const issue of inspection.validation.errors) lines.push(issueLine(issue));
    for (const issue of inspection.validation.warnings) lines.push(issueLine(issue));
  }

  lines.push(...limitLines(inspection.validation.limits));
  return lines;
}

function renderNotFound(result: Extract<FoundationsResult, { outcome: "not-found" }>): string[] {
  const lines = [
    "Foundations: not-found",
    `Host: ${result.host?.root ?? "(no resuelto)"}`,
    `Design System: ${result.host?.designSystemPath ?? "(no disponible)"}`,
    "Inspección: no disponible",
  ];
  if (result.hostError !== null) {
    lines.push(`Error: ${result.hostError.code} - ${result.hostError.message}`);
  }
  return lines;
}

export class FoundationsTerminalReporter implements FoundationsReporter {
  constructor(private readonly io: OutputWriter) {}

  completed(result: FoundationsResult): void {
    const lines = result.outcome === "not-found" ? renderNotFound(result) : renderInspection(result);
    const text = `${lines.join("\n")}\n`;
    if (result.outcome === "valid") this.io.out(text);
    else this.io.err(text);
  }
}
