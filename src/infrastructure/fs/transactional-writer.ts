// T033 — Escritura transaccional. Alcance REAL de atomicidad (no es una única operación atómica
// sobre tres rutas): staging completo y validado + rename por unidad (atómico donde el FS lo
// permite) + rollback compensatorio ante promoción parcial. Sin DB, locks ni journaling externo.
//
// Flujo: guard rutas → detectar conflictos → crear staging dentro de la raíz → escribir+releer+
// validar staged → promover (rename, creando solo los dirs necesarios, registrando lo creado) →
// limpiar staging → verificar persistido → en cualquier fallo: rollback de lo creado + limpieza.
import { join } from "node:path";
import type { FileSystem, PreparedFile, TransactionResult } from "../../application/ports.js";
import type { Issue } from "../../domain/issue.js";
import { EXPECTED_FILES, MANAGED_FILES } from "../../domain/plan/managed-files.js";
import { assertWithinRoot } from "../host-root/path-guard.js";
import { documentValidators } from "../validation/schema-validators.js";
import { detectConflicts } from "./detect-conflicts.js";
import { verifyPersisted } from "./verify-persisted.js";

const STAGING_PREFIX = ".neuraz-ds-staging-";

class TaggedError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

function issue(code: string, message: string, path?: string): Issue {
  return path === undefined ? { code, message } : { code, message, path };
}

function toIssue(e: unknown, fallbackCode: string): Issue {
  if (e instanceof TaggedError) return issue(e.code, e.message);
  const message = e instanceof Error ? e.message : String(e);
  return issue(fallbackCode, message);
}

function parentDirSegments(relPath: string): string[] {
  const parts = relPath.split("/");
  return parts.slice(0, -1);
}

function validateStaged(prepared: readonly PreparedFile[]): Issue[] {
  const issues: Issue[] = [];
  const byRel = new Map(prepared.map((p) => [p.relativePath, p.content]));
  const parse = (rel: string): unknown => {
    try {
      return JSON.parse(byRel.get(rel) ?? "");
    } catch {
      issues.push(issue("staged-parse", `JSON staged inválido: ${rel}`, rel));
      return undefined;
    }
  };
  issues.push(...documentValidators.validateConfig(parse(MANAGED_FILES.config)));
  issues.push(...documentValidators.validateManifest(parse(MANAGED_FILES.manifest)));
  issues.push(...documentValidators.validateDtcg(parse(MANAGED_FILES.tokens)));
  return issues;
}

async function ensureFinalDirs(
  fs: FileSystem,
  rootDir: string,
  relPath: string,
  created: string[],
): Promise<void> {
  let cur = rootDir;
  for (const seg of parentDirSegments(relPath)) {
    cur = join(cur, seg);
    const kind = await fs.lstatKind(cur);
    if (kind === "absent") {
      await fs.mkdir(cur, false);
      created.push(cur);
    } else if (kind !== "directory") {
      throw new TaggedError("dir-occupied", `Ruta ocupada por un tipo incompatible: ${cur}`);
    }
  }
}

/** Rollback compensatorio idempotente: elimina solo lo creado por esta transacción. */
async function rollback(fs: FileSystem, files: string[], dirs: string[]): Promise<Issue[]> {
  const errors: Issue[] = [];
  for (const f of [...files].reverse()) {
    try {
      await fs.removeFile(f);
    } catch (e) {
      errors.push(toIssue(e, "rollback-file"));
    }
  }
  for (const d of [...dirs].reverse()) {
    try {
      await fs.removeDir(d); // tolera no-vacío/ausente en el adapter
    } catch (e) {
      errors.push(toIssue(e, "rollback-dir"));
    }
  }
  return errors;
}

/** Limpia el staging de forma segura (solo si tiene el prefijo y está dentro de la raíz). */
async function cleanupStaging(fs: FileSystem, rootDir: string, stagingDir: string): Promise<void> {
  const base = stagingDir.split(/[/\\]/).pop() ?? "";
  if (!base.startsWith(STAGING_PREFIX)) return;
  if (!assertWithinRoot(rootDir, stagingDir).ok) return;
  try {
    await fs.removeTree(stagingDir);
  } catch {
    /* limpieza best-effort */
  }
}

function failed(
  category: "filesystem" | "post-verify",
  errors: readonly Issue[],
  rollbackErrors?: readonly Issue[],
): TransactionResult {
  return rollbackErrors !== undefined && rollbackErrors.length > 0
    ? { status: "failed", category, errors, rollbackErrors }
    : { status: "failed", category, errors };
}

export async function commitTransaction(
  fs: FileSystem,
  rootDir: string,
  prepared: readonly PreparedFile[],
): Promise<TransactionResult> {
  // 0. Seguridad de rutas finales.
  for (const p of prepared) {
    const g = assertWithinRoot(rootDir, p.relativePath);
    if (!g.ok) return failed("filesystem", [issue(`unsafe-path-${g.reason}`, g.message, p.relativePath)]);
  }

  // 1. Conflictos iniciales: nada de staging si hay destinos ocupados.
  const initialConflicts = await detectConflicts(fs, rootDir);
  if (initialConflicts.length > 0) return { status: "conflict", conflicts: initialConflicts };

  // 2. Staging dentro de la raíz anfitriona (mismo filesystem que los destinos).
  let stagingDir: string;
  try {
    stagingDir = await fs.mkdtemp(join(rootDir, STAGING_PREFIX));
  } catch (e) {
    return failed("filesystem", [toIssue(e, "stage-create")]);
  }
  if (!assertWithinRoot(rootDir, stagingDir).ok) {
    await cleanupStaging(fs, rootDir, stagingDir);
    return failed("filesystem", [issue("staging-escape", "El staging quedó fuera de la raíz anfitriona.")]);
  }

  // 3. Escribir en staging (exclusivo), releer, comparar y validar staged.
  try {
    for (const p of prepared) {
      const stagedPath = join(stagingDir, p.relativePath);
      await ensureFinalDirs(fs, stagingDir, p.relativePath, []); // dirs del staging (no se trackean)
      await fs.writeFileExclusive(stagedPath, p.content);
      const back = await fs.readFile(stagedPath);
      if (back !== p.content) throw new TaggedError("staged-mismatch", `Contenido staged difiere: ${p.relativePath}`);
    }
    const stagedIssues = validateStaged(prepared);
    if (stagedIssues.length > 0) {
      await cleanupStaging(fs, rootDir, stagingDir);
      return failed("filesystem", stagedIssues);
    }
  } catch (e) {
    await cleanupStaging(fs, rootDir, stagingDir);
    return failed("filesystem", [toIssue(e, "stage-write")]);
  }

  // 4. Promoción: rename por unidad, creando solo los dirs necesarios y registrando lo creado.
  const createdFiles: string[] = [];
  const createdDirs: string[] = [];
  try {
    for (const p of prepared) {
      await ensureFinalDirs(fs, rootDir, p.relativePath, createdDirs);
      const finalPath = join(rootDir, p.relativePath);
      if ((await fs.lstatKind(finalPath)) !== "absent") {
        // Conflicto tardío (TOCTOU): preservar lo aparecido, revertir lo nuestro.
        await rollback(fs, createdFiles, createdDirs);
        await cleanupStaging(fs, rootDir, stagingDir);
        return { status: "conflict", conflicts: [p.relativePath] };
      }
      await fs.rename(join(stagingDir, p.relativePath), finalPath);
      createdFiles.push(finalPath);
    }
  } catch (e) {
    const rollbackErrors = await rollback(fs, createdFiles, createdDirs);
    await cleanupStaging(fs, rootDir, stagingDir);
    return failed("filesystem", [toIssue(e, "promote")], rollbackErrors);
  }

  // 5. Limpieza del staging tras éxito de la promoción.
  await cleanupStaging(fs, rootDir, stagingDir);

  // 6. Verificación posterior.
  const verifyIssues = await verifyPersisted(fs, rootDir, prepared);
  if (verifyIssues.length > 0) {
    const rollbackErrors = await rollback(fs, createdFiles, createdDirs);
    return failed("post-verify", verifyIssues, rollbackErrors);
  }

  return { status: "committed", files: EXPECTED_FILES };
}
