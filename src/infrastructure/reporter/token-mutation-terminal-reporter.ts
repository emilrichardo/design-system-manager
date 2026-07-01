// T036 (008) — Reporter humano de mutaciones de tokens. Outcomes de éxito (`planned`/`applied`/
// `unchanged`) → stdout; outcomes esperados de error (`invalid-command`/`invalid-design-system`/
// `conflict`/`not-found`/`read-error`/`write-error`/`verification-error`) → stderr (mismo patrón que
// `validate`/`build`/`asset`). Determinista: sin color obligatorio, sin TTY, sin bytes crudos ni paths
// absolutos. `internalError()` es la única fuente de `internal-error` (frontera adapter).
import type { TokenMutationDiffEntry } from "../../domain/token-mutations/diff.js";
import type { MutationIssue } from "../../domain/token-mutations/outcome.js";
import type { TokenMutationResultV1 } from "../../domain/token-mutations/result.js";
import type { OutputWriter } from "./terminal-reporter.js";

const SUCCESS_OUTCOMES = new Set(["planned", "applied", "unchanged"]);

function renderEntry(e: TokenMutationDiffEntry): string {
  const from = e.previousPath === null ? "" : ` (desde ${e.previousPath})`;
  const refs = e.references.length === 0 ? "" : ` refs=[${e.references.join(", ")}]`;
  return `  - ${e.kind} ${e.path}${from}${refs}`;
}

function renderConflict(c: MutationIssue): string {
  const deps = c.dependents.length === 0 ? "" : ` dependents=[${c.dependents.join(", ")}]`;
  return `  [${c.severity}] ${c.code}${c.path === null ? "" : ` (${c.path})`} — ${c.message}${deps}`;
}

function renderLines(label: string, result: TokenMutationResultV1): string {
  const lines: string[] = [`${label}: ${result.outcome}`, `Wrote: ${result.wrote ? "yes" : "no"}`];
  if (result.source !== null) lines.push(`Source: ${result.source.logicalPath} (${result.source.contentHash.slice(0, 12)}…)`);
  if (result.plan !== null) lines.push(`Writable: ${result.plan.writable ? "yes" : "no"}`, `Candidate hash: ${result.plan.candidateHash.slice(0, 12)}…`);
  if (result.diff !== null) {
    const s = result.diff.summary;
    lines.push(
      `Diff: added=${s.added} updated=${s.updated} renamed=${s.renamed} moved=${s.moved} removed=${s.removed} aliasChanged=${s.aliasChanged} metadataChanged=${s.metadataChanged} groupChanged=${s.groupChanged}`,
    );
    if (result.diff.entries.length === 0) lines.push("Entries: none");
    else lines.push("Entries:", ...result.diff.entries.map(renderEntry));
  }
  if (result.conflicts.length > 0) lines.push("Conflicts:", ...result.conflicts.map(renderConflict));
  if (result.recovery !== null) {
    lines.push(
      `Recovery: sourceAvailable=${result.recovery.sourceAvailable ? "yes" : "no"} recoveryRequired=${result.recovery.recoveryRequired ? "yes" : "no"}`,
    );
    if (result.recovery.backupRelativePath !== null) lines.push(`Backup: ${result.recovery.backupRelativePath}`);
  }
  if (result.error !== null) lines.push(`Error: ${result.error.code} — ${result.error.message}`);
  return `${lines.join("\n")}\n`;
}

export class TokenMutationTerminalReporter {
  constructor(private readonly io: OutputWriter) {}

  planCompleted(result: TokenMutationResultV1): void {
    this.write("Token plan", result);
  }

  applyCompleted(result: TokenMutationResultV1): void {
    this.write("Token apply", result);
  }

  private write(label: string, result: TokenMutationResultV1): void {
    const text = renderLines(label, result);
    if (SUCCESS_OUTCOMES.has(result.outcome)) this.io.out(text);
    else this.io.err(text);
  }

  internalError(): void {
    this.io.err("token: internal-error — Ocurrió un error interno.\n");
  }
}
