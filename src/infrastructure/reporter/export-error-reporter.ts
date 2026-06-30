// T102 (006) — Presentación de `export`. Éxito → SOLO los bytes exactos del artifact a stdout (sin
// header/envelope/mensaje/newline extra). Error esperado → mensaje humano seguro a stderr, stdout
// vacío. Nunca mezcla artifact y reporte. Usa un puerto byte-capable inyectado (no toca `process`).
import type { ExportResult } from "../../domain/build-export/build-result.js";

/** Puerto de salida de export: stdout en bytes exactos, stderr en texto seguro. */
export interface ExportOutput {
  /** Escribe los bytes exactos del artifact en stdout. */
  writeArtifact(bytes: Uint8Array): void;
  /** Escribe un mensaje seguro en stderr. */
  error(text: string): void;
}

function safeMessage(result: Exclude<ExportResult, { outcome: "exported" }>): string {
  const code = result.error?.code ?? result.outcome;
  const detail = result.error?.message ?? result.outcome;
  return `export ${result.format ?? ""}: ${result.outcome} (${code}) — ${detail}\n`;
}

export class ExportReporter {
  constructor(private readonly io: ExportOutput) {}

  /** Enruta el resultado de export: éxito a stdout (bytes), error esperado a stderr. */
  completed(result: ExportResult): void {
    if (result.outcome === "exported") {
      this.io.writeArtifact(result.bytes);
      return;
    }
    this.io.error(safeMessage(result));
  }

  /** Excepción inesperada (adapter) → mensaje genérico y seguro en stderr; stdout intacto. */
  internalError(): void {
    this.io.error("export: internal-error — An unexpected internal error occurred.\n");
  }
}
