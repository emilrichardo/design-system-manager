// Abstracción de salida de la CLI, inyectable y capturable en pruebas.
// out(): stdout (ayuda, plan, éxito, unchanged, cancelación). err(): stderr (conflictos, fallos).
import type { ExportOutput } from "../infrastructure/reporter/export-error-reporter.js";

export interface CliIO {
  out(text: string): void;
  err(text: string): void;
}

export const processIO: CliIO = {
  out: (text) => {
    process.stdout.write(text);
  },
  err: (text) => {
    process.stderr.write(text);
  },
};

// T141/T146 (006) — Salida byte-exacta para `export`: stdout recibe los bytes del artifact sin
// reinterpretarlos como texto; stderr recibe mensajes seguros. Único punto que escribe bytes crudos.
export const processExportOutput: ExportOutput = {
  writeArtifact: (bytes) => {
    process.stdout.write(bytes);
  },
  error: (text) => {
    process.stderr.write(text);
  },
};
