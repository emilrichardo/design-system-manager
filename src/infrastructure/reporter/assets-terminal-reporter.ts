// T023 (007) — Reporter humano de assets. Texto conciso y determinista; paths lógicos relativos; sin
// ANSI/spinners, sin `Error`/stack, sin rutas absolutas. `listed`/`inspected` → stdout; errores → stderr.
import type { AssetInspectResult, AssetListResult, AssetPlanResult, AssetWriteOperationResult } from "../../application/assets/asset-ports.js";
import type { OutputWriter } from "./terminal-reporter.js";

function shortHash(hash: string): string {
  return hash.length > 12 ? `${hash.slice(0, 12)}…` : hash;
}

export class AssetsTerminalReporter {
  constructor(private readonly io: OutputWriter) {}

  listCompleted(result: AssetListResult): void {
    if (result.outcome !== "listed") {
      this.io.err(`Assets: ${result.outcome}${result.error ? ` — ${result.error.message}` : ""}\n`);
      return;
    }
    const lines = [`Assets: listed (${result.summary.totalAssets})`];
    for (const a of result.assets) {
      const dim = a.dimensions && a.dimensions.width !== null ? ` ${a.dimensions.width}×${a.dimensions.height}` : "";
      lines.push(`  - [${a.kind}] ${a.logicalPath} (${a.mimeType}, ${a.byteLength} bytes, ${shortHash(a.contentHash)})${dim}`);
    }
    for (const c of result.conflicts) lines.push(`  ! ${c.code}${c.path !== null ? ` @ ${c.path}` : ""} — ${c.message}`);
    this.io.out(`${lines.join("\n")}\n`);
  }

  inspectCompleted(result: AssetInspectResult): void {
    if (result.outcome !== "inspected" || result.inspection === null) {
      this.io.err(`Asset: ${result.outcome}${result.error ? ` — ${result.error.message}` : ""}\n`);
      return;
    }
    const r = result.inspection.record;
    const lines = [
      `Asset: inspected`,
      `Path: ${r.logicalPath}`,
      `Kind: ${r.kind}  MIME: ${r.mimeType}  Size: ${r.byteLength} bytes`,
      `Hash: ${shortHash(r.contentHash)}`,
      `Dimensions: ${r.dimensions && r.dimensions.width !== null ? `${r.dimensions.width}×${r.dimensions.height} ${r.dimensions.unit}` : "n/a"}`,
      `Provenance: ${r.provenance.kind} (${r.provenance.sourceRef})`,
      `License: ${r.license.status}${r.license.identifier ? ` (${r.license.identifier})` : ""}`,
      `Path state: ${result.inspection.pathState}`,
    ];
    this.io.out(`${lines.join("\n")}\n`);
  }

  planCompleted(result: AssetPlanResult): void {
    if (result.outcome !== "planned" || result.plan === null) {
      this.io.err(`Asset plan: ${result.outcome}${result.error ? ` — ${result.error.message}` : ""}\n`);
      return;
    }
    const lines = [`Asset plan: ${result.plan.summary.add} add, ${result.plan.summary.duplicate} duplicate, ${result.plan.summary.blocked} blocked`];
    for (const c of result.plan.candidates) {
      const dest = c.destinationPath ?? "(n/a)";
      lines.push(`  - [${c.verdict}] ${c.sourceRef} → ${dest}${c.duplicateOf ? ` (= ${c.duplicateOf})` : ""}`);
      for (const i of c.issues) lines.push(`      ${i.severity}: ${i.code}${i.message ? ` — ${i.message}` : ""}`);
    }
    this.io.out(`${lines.join("\n")}\n`);
  }

  writeCompleted(result: AssetWriteOperationResult): void {
    const stdoutOutcomes = new Set(["applied", "removed", "unchanged"]);
    const lines = [`Asset: ${result.outcome}`, `Wrote: ${result.wrote}`];
    if (result.manifestSummary !== null) lines.push(`Manifest: ${result.manifestSummary.relativePath}`);
    for (const c of result.conflicts) lines.push(`Conflict: ${c.code}${c.path !== null ? ` @ ${c.path}` : ""} — ${c.message}`);
    if (result.recovery && result.recovery.recoveryRequired) {
      lines.push("Recovery required.");
      if (result.recovery.backupRelativePath) lines.push(`Backup retained: ${result.recovery.backupRelativePath}`);
    }
    if (result.error !== null) lines.push(`Error: ${result.error.code} — ${result.error.message}`);
    const text = `${lines.join("\n")}\n`;
    if (stdoutOutcomes.has(result.outcome)) this.io.out(text);
    else this.io.err(text);
  }

  internalError(): void {
    this.io.err("Asset: internal-error — An unexpected internal error occurred.\n");
  }
}
