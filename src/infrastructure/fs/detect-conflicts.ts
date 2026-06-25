// T032 — Detección de conflictos en las rutas finales (TOCTOU). No escribe, no sobrescribe.
// Cualquier entrada existente (archivo/dir/symlink/otro) en una ruta administrada es conflicto.
import { join } from "node:path";
import type { FileSystem } from "../../application/ports.js";
import { EXPECTED_FILES } from "../../domain/plan/managed-files.js";

/** Devuelve las rutas administradas ya ocupadas, en orden determinista (= EXPECTED_FILES). */
export async function detectConflicts(fs: FileSystem, rootDir: string): Promise<string[]> {
  const conflicts: string[] = [];
  for (const rel of EXPECTED_FILES) {
    if ((await fs.lstatKind(join(rootDir, rel))) !== "absent") conflicts.push(rel);
  }
  return conflicts;
}
