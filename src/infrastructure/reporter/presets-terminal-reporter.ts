import type {
  PresetApplicationPlanResult,
  PresetInspectionResult,
  PresetListResult,
} from "../../application/presets/preset-ports.js";
import type { ApplicationConflict } from "../../domain/changes/application-conflict.js";
import type { ApplicationSummary } from "../../domain/changes/application-summary.js";
import type { TokenChange } from "../../domain/changes/token-change.js";
import type { PresetApplyResult, PresetCatalogEntry, PresetInspection } from "../../domain/presets/index.js";
import type { PresetValidationIssue } from "../../domain/presets/preset-validation.js";
import type { OutputWriter } from "./terminal-reporter.js";

export class PresetsTerminalReporter {
  constructor(private readonly io: OutputWriter) {}

  listCompleted(result: PresetListResult): void {
    const lines = [
      `Presets list: ${result.outcome}`,
      `Total: ${result.presets.length}`,
      ...result.presets.map((preset) => `  - ${formatPreset(preset)}`),
      ...renderValidation(result.validation),
    ];
    this.io.out(`${lines.join("\n")}\n`);
  }

  inspectCompleted(result: PresetInspectionResult): void {
    const lines =
      result.inspection === null
        ? [`Preset inspect: ${result.outcome}`, "Preset: not found"]
        : [`Preset inspect: ${result.outcome}`, ...renderInspection(result.inspection)];
    this.io.out(`${lines.join("\n")}\n`);
  }

  planCompleted(result: PresetApplicationPlanResult): void {
    const lines = [`Preset plan: ${result.outcome}`];
    if ("notFoundResource" in result) lines.push(`Not found: ${result.notFoundResource}`);
    if (result.plan === null) {
      lines.push("Plan: unavailable");
    } else {
      lines.push(...renderPlan(result.plan.preset, result.plan.targetFile, result.plan.plan.summary, result.plan.plan.writable));
      lines.push(...renderChanges(result.plan.plan.changeSet.changes));
      lines.push(...renderConflicts(result.plan.plan.conflicts));
    }
    this.io.out(`${lines.join("\n")}\n`);
  }

  applyCompleted(result: PresetApplyResult): void {
    const lines = [
      `Preset apply: ${result.outcome}`,
      `Wrote: ${result.wrote ? "yes" : "no"}`,
      `Target: ${result.targetFile ?? "(none)"}`,
      `Preset: ${result.preset === null ? "(none)" : formatPreset(result.preset)}`,
      ...renderSummary(result.summary),
      ...renderVerification(result.verification),
      ...(result.backup === null ? [] : [`Backup: ${result.backup.relativePath}`]),
      ...(result.notFoundResource === null ? [] : [`Not found: ${result.notFoundResource}`]),
      ...(result.error === null ? [] : [`Error: ${result.error.code} - ${result.error.message}`]),
    ];
    this.io.out(`${lines.join("\n")}\n`);
  }
}

function renderInspection(inspection: PresetInspection): readonly string[] {
  return [
    `Preset: ${formatPreset(inspection.metadata)}`,
    `Description: ${inspection.metadata.description}`,
    `Categories: ${inspection.metadata.includedCategories.join(", ")}`,
    `Tokens: ${inspection.tokens.length}`,
    ...inspection.tokens.map(
      (token) =>
        `  - ${token.path}: ${token.category} ${token.level} ${token.type ?? "(type unknown)"} alias=${token.aliasTarget ?? "(none)"} description=${token.hasDescription ? "yes" : "no"}`,
    ),
    ...renderValidation(inspection.validation),
  ];
}

function renderPlan(
  preset: PresetCatalogEntry,
  targetFile: string,
  summary: ApplicationSummary,
  writable: boolean,
): readonly string[] {
  return [
    `Preset: ${formatPreset(preset)}`,
    `Target: ${targetFile}`,
    `Would write: ${summary.wouldWrite ? "yes" : "no"}`,
    `Writable: ${writable ? "yes" : "no"}`,
    ...renderSummary(summary),
  ];
}

function renderSummary(summary: ApplicationSummary): readonly string[] {
  return [
    "Summary:",
    `  create=${summary.create} update=${summary.update} unchanged=${summary.unchanged} conflict=${summary.conflict} skip=${summary.skip} total=${summary.total} blockingConflicts=${summary.blockingConflicts}`,
  ];
}

function renderChanges(changes: readonly TokenChange[]): readonly string[] {
  if (changes.length === 0) return ["Changes: none"];
  return [
    "Changes:",
    ...changes.map(
      (change) =>
        `  - ${change.operation} ${change.nodeKind} ${change.path} (${change.category}/${change.level}) blocks=${change.blocksWrite ? "yes" : "no"} reason=${change.reason}`,
    ),
  ];
}

function renderConflicts(conflicts: readonly ApplicationConflict[]): readonly string[] {
  if (conflicts.length === 0) return ["Conflicts: none"];
  return [
    "Conflicts:",
    ...conflicts.map(
      (conflict) =>
        `  - [${conflict.severity}] ${conflict.code} ${conflict.path ?? "(global)"} blocks=${conflict.blocksWrite ? "yes" : "no"} action=${conflict.proposedAction}`,
    ),
  ];
}

function renderValidation(validation: {
  readonly valid: boolean;
  readonly errors: readonly PresetValidationIssue[];
  readonly warnings: readonly PresetValidationIssue[];
} | null): readonly string[] {
  if (validation === null) return [];
  return [
    `Validation: ${validation.valid ? "valid" : "invalid"}`,
    `Errors: ${validation.errors.length}`,
    ...validation.errors.map((issue) => `  - [error] ${issue.code} ${issue.path ?? "(global)"}: ${issue.message}`),
    `Warnings: ${validation.warnings.length}`,
    ...validation.warnings.map((issue) => `  - [warning] ${issue.code} ${issue.path ?? "(global)"}: ${issue.message}`),
  ];
}

function renderVerification(verification: PresetApplyResult["verification"]): readonly string[] {
  if (verification === null) return ["Verification: not run"];
  return [
    `Verification: checked=${verification.checked ? "yes" : "no"} valid=${verification.valid ? "yes" : "no"} contributedTokensPresent=${verification.contributedTokensPresent ? "yes" : "no"}`,
    ...renderConflicts(verification.newStructuralErrors),
  ];
}

function formatPreset(preset: PresetCatalogEntry): string {
  return `${preset.id} (${preset.name}) v${preset.version} [${preset.includedCategories.join(", ")}]`;
}
