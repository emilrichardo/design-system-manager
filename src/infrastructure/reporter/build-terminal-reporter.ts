// T101 (006) — Reporter humano de build. Texto conciso y determinista; paths lógicos relativos; sin
// ANSI/spinners, sin `Error`/stack, sin bytes de artifact, sin rutas absolutas. Routing: `built`/
// `unchanged` → stdout; outcomes de error esperados e `internal-error` → stderr. Conflicts en el orden
// ya establecido por ownership. Recovery/backup visibles cuando aplica.
import type { BuildResult } from "../../domain/build-export/build-result.js";
import type { OutputWriter } from "./terminal-reporter.js";

const STDOUT_OUTCOMES = new Set(["built", "unchanged"]);

function shortHash(hash: string): string {
  return hash.length > 12 ? `${hash.slice(0, 12)}…` : hash;
}

function lines(result: BuildResult): string[] {
  const out: string[] = [`Build: ${result.outcome}`];
  if (result.source !== null) out.push(`Source: ${result.source.logicalPath} (${shortHash(result.source.hash)})`);
  if (result.outputDirectory !== null) out.push(`Output: ${result.outputDirectory}`);
  if (result.artifacts.length > 0) {
    out.push(`Formats: ${result.artifacts.map((a) => a.format).join(", ")}`);
    for (const a of result.artifacts) out.push(`  - ${a.relativePath} (${shortHash(a.contentHash)}, ${a.byteLength} bytes)`);
  }
  if (result.manifest !== null) out.push(`Manifest: ${result.manifest.relativePath} (${shortHash(result.manifest.contentHash)})`);
  out.push(`Wrote: ${result.wrote}`);
  if (result.verification !== null) out.push(`Verification: ${result.verification.status}`);
  for (const c of result.conflict ? [result.conflict] : []) {
    out.push(`Conflict: ${c.code}${c.path !== null ? ` @ ${c.path}` : ""} — ${c.message}`);
  }
  if (result.outcome === "verification-error" && result.wrote) {
    out.push("Note: artifacts were published but post-verification failed; recovery is required.");
  }
  if (result.backupRelativePath !== null) out.push(`Backup retained: ${result.backupRelativePath}`);
  if (result.recoveryRequired) out.push("Recovery required.");
  if (result.error !== null) out.push(`Error: ${result.error.code} — ${result.error.message}`);
  return out;
}

export class BuildTerminalReporter {
  constructor(private readonly io: OutputWriter) {}

  completed(result: BuildResult): void {
    const text = `${lines(result).join("\n")}\n`;
    if (STDOUT_OUTCOMES.has(result.outcome)) this.io.out(text);
    else this.io.err(text);
  }

  /** Excepción inesperada (adapter) → mensaje genérico seguro en stderr. */
  internalError(): void {
    this.io.err("Build: internal-error — An unexpected internal error occurred.\n");
  }
}
