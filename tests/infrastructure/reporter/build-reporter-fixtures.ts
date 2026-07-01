// Fixtures de tests del Checkpoint H: builders de BuildResult/ExportResult y writers en buffer. No test.
import type { BuildArtifactMetadata } from "../../../src/domain/build-export/artifact.js";
import type { BuildOutcome } from "../../../src/domain/build-export/build-outcome.js";
import type { BuildResult } from "../../../src/domain/build-export/build-result.js";
import type { ExportResult } from "../../../src/domain/build-export/build-result.js";
import type { OutputWriter } from "../../../src/infrastructure/reporter/terminal-reporter.js";
import type { ExportOutput } from "../../../src/infrastructure/reporter/export-error-reporter.js";

export function hex(seed: number): string {
  return seed.toString(16).padStart(64, "0").slice(0, 64);
}

export const ARTIFACTS: readonly BuildArtifactMetadata[] = [
  { format: "css", relativePath: "tokens.css", contentType: "text/css; charset=utf-8", contentHash: hex(10), byteLength: 42 },
  { format: "json", relativePath: "tokens.resolved.json", contentType: "application/json; charset=utf-8", contentHash: hex(11), byteLength: 64 },
  { format: "typescript", relativePath: "tokens.ts", contentType: "text/typescript; charset=utf-8", contentHash: hex(12), byteLength: 80 },
];

const BASE: BuildResult = {
  outcome: "built",
  wrote: true,
  source: { logicalPath: "design-system/tokens/base.tokens.json", hash: hex(1) },
  outputDirectory: "design-system/build",
  outputAvailable: true,
  artifacts: ARTIFACTS,
  manifest: { relativePath: "manifest.json", contentHash: hex(2), byteLength: 200 },
  brandArtifact: { status: "absent", relativePath: null, contentHash: null, byteLength: null },
  verification: { status: "passed", checks: [], artifacts: [] },
  backupRelativePath: null,
  recoveryRequired: false,
  conflict: null,
  error: null,
};

/** BuildResult de ejemplo para cada outcome (campos coherentes con los invariantes del contrato). */
export function buildResult(outcome: BuildOutcome): BuildResult {
  switch (outcome) {
    case "built":
      return { ...BASE, outcome, wrote: true };
    case "unchanged":
      return { ...BASE, outcome, wrote: false };
    case "invalid-design-system":
      return { ...BASE, outcome, wrote: false, source: BASE.source, outputDirectory: null, outputAvailable: null, artifacts: [], manifest: null, verification: null, error: { code: "type-unresolved", message: "Tipo no resuelto en color.x.", path: "color.x", details: null } };
    case "unsupported-value":
      return { ...BASE, outcome, wrote: false, artifacts: [], manifest: null, verification: null, error: { code: "css-type-unsupported", message: "Tipo no soportado en CSS.", path: "fx.sh", details: { type: "shadow" } } };
    case "conflict":
      return { ...BASE, outcome, wrote: false, verification: null, conflict: { code: "required-path-owned-by-unknown", path: "tokens.css", format: "css", severity: "error", message: "Required path ocupado por contenido no administrado.", blocksWrite: true } };
    case "not-found":
      return { ...BASE, outcome, wrote: false, source: null, outputDirectory: null, outputAvailable: null, artifacts: [], manifest: null, verification: null, error: { code: "not-found", message: "Design System no inicializado.", path: null, details: null } };
    case "read-error":
      return { ...BASE, outcome, wrote: false, outputDirectory: null, outputAvailable: null, artifacts: [], manifest: null, verification: null, error: { code: "read-error", message: "UTF-8 inválido.", path: null, details: null } };
    case "write-error":
      return { ...BASE, outcome, wrote: false, outputAvailable: false, verification: null, backupRelativePath: ".neuraz-build-backup", recoveryRequired: true, error: { code: "write-failed", message: "Restore falló.", path: null, details: null } };
    case "verification-error":
      return { ...BASE, outcome, wrote: true, outputAvailable: true, verification: { status: "failed", checks: [{ kind: "json", status: "failed", code: "json-parse", message: "no parsea" }], artifacts: [] }, backupRelativePath: ".neuraz-build-backup", recoveryRequired: true, error: { code: "verify-failed", message: "Verificación posterior falló.", path: null, details: null } };
    default: {
      const _e: never = outcome;
      throw new Error(`outcome ${String(_e)}`);
    }
  }
}

export function exportSuccess(format: "css" | "json" | "typescript", bytes: Uint8Array): ExportResult {
  const filenames = { css: "tokens.css", json: "tokens.resolved.json", typescript: "tokens.ts" } as const;
  const types = { css: "text/css; charset=utf-8", json: "application/json; charset=utf-8", typescript: "text/typescript; charset=utf-8" } as const;
  return { outcome: "exported", format, logicalFilename: filenames[format], contentType: types[format], bytes, contentHash: hex(20), byteLength: bytes.length };
}

export function exportFailure(outcome: "invalid-design-system" | "unsupported-value" | "not-found" | "read-error"): ExportResult {
  return { outcome, format: "css", source: { logicalPath: "design-system/tokens/base.tokens.json", hash: hex(1) }, error: { code: outcome, message: "fallo seguro", path: null, details: null } };
}

export interface BufferIO extends OutputWriter {
  outText: string;
  errText: string;
}

export function bufferIO(): BufferIO {
  const io: BufferIO = {
    outText: "",
    errText: "",
    out(text: string): void {
      io.outText += text;
    },
    err(text: string): void {
      io.errText += text;
    },
  };
  return io;
}

export interface BufferExportOutput extends ExportOutput {
  artifact: Uint8Array | null;
  errText: string;
}

export function bufferExportOutput(): BufferExportOutput {
  const io: BufferExportOutput = {
    artifact: null,
    errText: "",
    writeArtifact(bytes: Uint8Array): void {
      io.artifact = bytes;
    },
    error(text: string): void {
      io.errText += text;
    },
  };
  return io;
}
