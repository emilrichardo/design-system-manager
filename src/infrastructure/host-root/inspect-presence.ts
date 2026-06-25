// T021 — Inspección de PRESENCIA de los archivos administrados (sin validar contenido).
// Solo lee tipos de entrada del filesystem; no crea, no modifica, no elimina, no valida DTCG.
// La clasificación final complete-valid/complete-invalid es responsabilidad de T030b (Fase 4).
import { lstatSync } from "node:fs";
import { join } from "node:path";
import { EXPECTED_FILES } from "../../domain/plan/managed-files.js";
import type {
  ManagedFileKind,
  ManagedFilePresence,
  ManagedFilesPresence,
  PreliminaryState,
} from "../../application/ports.js";

function kindOf(fullPath: string): ManagedFileKind {
  try {
    const st = lstatSync(fullPath);
    if (st.isSymbolicLink()) return "symlink";
    if (st.isDirectory()) return "directory";
    if (st.isFile()) return "file";
    return "other";
  } catch {
    return "absent";
  }
}

/** Inspecciona la presencia de los archivos administrados en `rootDir`, en orden determinista. */
export function inspectPresence(rootDir: string): ManagedFilesPresence {
  const details: ManagedFilePresence[] = [];
  const present: string[] = [];
  const missing: string[] = [];

  for (const rel of EXPECTED_FILES) {
    const kind = kindOf(join(rootDir, rel));
    const isPresent = kind !== "absent";
    (isPresent ? present : missing).push(rel);
    details.push({ path: rel, present: isPresent, kind });
  }

  const allPresent = missing.length === 0;
  const nonePresent = present.length === 0;
  const preliminary: PreliminaryState = nonePresent
    ? "none"
    : allPresent
      ? "potentially-complete"
      : "potentially-partial";

  return { present, missing, allPresent, nonePresent, preliminary, details };
}
