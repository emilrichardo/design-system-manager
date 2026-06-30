// T023 (007) — Reporter humano de assets. Texto conciso y determinista; paths lógicos relativos; sin
// ANSI/spinners, sin `Error`/stack, sin rutas absolutas. `listed`/`inspected` → stdout; errores → stderr.
import type { AssetInspectResult, AssetListResult } from "../../application/assets/asset-ports.js";
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

  internalError(): void {
    this.io.err("Asset: internal-error — An unexpected internal error occurred.\n");
  }
}
