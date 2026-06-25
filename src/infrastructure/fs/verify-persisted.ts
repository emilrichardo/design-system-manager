// T034 — Verificación posterior a la promoción: existen los 3 archivos regulares, se releen,
// se parsean, validan (config/manifest/DTCG + coherencia) y se compara el contenido persistido
// con el preparado. Devuelve Issues con código `post-verify-*` (vacío = ok). No escribe.
import { join } from "node:path";
import type { FileSystem, PreparedFile } from "../../application/ports.js";
import type { Issue } from "../../domain/issue.js";
import { DESIGN_SYSTEM_DIR, EXPECTED_FILES, MANAGED_FILES } from "../../domain/plan/managed-files.js";
import { documentValidators } from "../validation/schema-validators.js";

export async function verifyPersisted(
  fs: FileSystem,
  rootDir: string,
  prepared: readonly PreparedFile[],
): Promise<Issue[]> {
  const issues: Issue[] = [];
  const expectedContent = new Map(prepared.map((p) => [p.relativePath, p.content]));
  const parsed: Record<string, unknown> = {};

  for (const rel of EXPECTED_FILES) {
    const full = join(rootDir, rel);
    if ((await fs.lstatKind(full)) !== "file") {
      issues.push({ code: "post-verify-missing", message: `Archivo ausente o de tipo inesperado tras escribir: ${rel}`, path: rel });
      continue;
    }
    let text: string;
    try {
      text = await fs.readFile(full);
    } catch {
      issues.push({ code: "post-verify-unreadable", message: `No se pudo releer ${rel}`, path: rel });
      continue;
    }
    if (expectedContent.get(rel) !== text) {
      issues.push({ code: "post-verify-content-mismatch", message: `El contenido persistido difiere del preparado: ${rel}`, path: rel });
    }
    try {
      parsed[rel] = JSON.parse(text);
    } catch {
      issues.push({ code: "post-verify-parse", message: `JSON inválido tras escribir: ${rel}`, path: rel });
    }
  }

  if (issues.length === 0) {
    issues.push(...documentValidators.validateConfig(parsed[MANAGED_FILES.config]));
    issues.push(...documentValidators.validateManifest(parsed[MANAGED_FILES.manifest]));
    issues.push(...documentValidators.validateDtcg(parsed[MANAGED_FILES.tokens]));
    const cfg = parsed[MANAGED_FILES.config];
    if (cfg !== null && typeof cfg === "object" && (cfg as { designSystemDir?: unknown }).designSystemDir !== DESIGN_SYSTEM_DIR) {
      issues.push({ code: "post-verify-coherence", message: "config.designSystemDir no coincide tras escribir.", path: MANAGED_FILES.config });
    }
  }

  return issues;
}
