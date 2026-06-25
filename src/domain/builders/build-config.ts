// T025 — Builder determinista de la configuración del gestor (neuraz-ds.config.json).
// Puro: sin entorno, sin fecha/hora, sin aleatoriedad, sin I/O. Mismo input → mismo output.
import { DESIGN_SYSTEM_DIR, FORMAT_VERSION } from "../plan/managed-files.js";

export const CONFIG_SCHEMA_VERSION = "0.1.0";

export interface ManagerConfig {
  readonly configSchemaVersion: string;
  readonly designSystemDir: string;
  readonly formatVersion: string;
}

export function buildConfig(): ManagerConfig {
  return {
    configSchemaVersion: CONFIG_SCHEMA_VERSION,
    designSystemDir: DESIGN_SYSTEM_DIR,
    formatVersion: FORMAT_VERSION,
  };
}
