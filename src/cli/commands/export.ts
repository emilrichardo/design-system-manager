// T141 (006) — Acción `neuraz-ds export css|json|typescript` (adapter delgado). Delega en el caso de uso
// headless READ-ONLY `exportDesignSystemArtifact`; selecciona un único renderer por el formato. Sin
// `--json` ni otros flags; sin escritura. El formato ya viene validado por Commander (choices).
import type { BuildFormat } from "../../domain/build-export/build-format.js";
import type { ExportResult } from "../../domain/build-export/build-result.js";
import type { ExportDesignSystemArtifactDependencies } from "../../application/build-export/export-design-system-artifact.js";
import { exportDesignSystemArtifact } from "../../application/build-export/export-design-system-artifact.js";

export function runExport(format: BuildFormat, executionDir: string, deps: ExportDesignSystemArtifactDependencies): Promise<ExportResult> {
  return exportDesignSystemArtifact({ executionDir, format }, deps);
}
