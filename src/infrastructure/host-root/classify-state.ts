// T030b — Clasificación final del estado previo combinando presencia + validadores.
// Diferencia estructura (incompleta → partial) de contenido (completo inválido → complete-invalid).
// Lectura segura: valida cada ruta con el path-guard, limita a archivos administrados, usa
// JSON.parse (nunca evalúa código), y NO escribe nada.
import { readFileSync } from "node:fs";
import type { Issue } from "../../domain/issue.js";
import type { PreviousState } from "../../domain/state/previous-state.js";
import {
  completeValidState,
  createCompleteInvalidState,
  createPartialState,
  noneState,
} from "../../domain/state/previous-state.js";
import { DESIGN_SYSTEM_DIR, MANAGED_FILES } from "../../domain/plan/managed-files.js";
import { inspectPresence } from "./inspect-presence.js";
import { assertWithinRoot } from "./path-guard.js";
import { documentValidators } from "../validation/schema-validators.js";

export function classifyState(rootDir: string): PreviousState {
  const presence = inspectPresence(rootDir);

  // none: ningún archivo administrado presente.
  if (presence.nonePresent) return noneState;

  // partial: estructura incompleta o tipos incompatibles (directorio/symlink/otro en una ruta).
  const allRegularFiles = presence.details.every((d) => !d.present || d.kind === "file");
  if (!presence.allPresent || !allRegularFiles) {
    const r = createPartialState(presence.present, presence.missing);
    return r.ok ? r.value : noneState; // present no vacío garantizado aquí
  }

  // potentially-complete + todos archivos regulares → leer y validar contenido.
  const errors: Issue[] = [];
  const byRel: Record<string, unknown> = {};

  for (const rel of [MANAGED_FILES.config, MANAGED_FILES.manifest, MANAGED_FILES.tokens]) {
    const guard = assertWithinRoot(rootDir, rel);
    if (!guard.ok) {
      errors.push({ code: `unsafe-path-${guard.reason}`, message: guard.message, path: rel });
      continue;
    }
    try {
      byRel[rel] = JSON.parse(readFileSync(guard.realPath, "utf8"));
    } catch {
      errors.push({ code: "read-or-parse", message: `No se pudo leer o parsear ${rel}.`, path: rel });
    }
  }

  if (errors.length === 0) {
    errors.push(...documentValidators.validateConfig(byRel[MANAGED_FILES.config]));
    errors.push(...documentValidators.validateManifest(byRel[MANAGED_FILES.manifest]));
    errors.push(...documentValidators.validateDtcg(byRel[MANAGED_FILES.tokens]));

    // Coherencia mínima entre documentos: la config debe apuntar al directorio del manifiesto.
    const cfg = byRel[MANAGED_FILES.config];
    if (cfg !== null && typeof cfg === "object" && (cfg as { designSystemDir?: unknown }).designSystemDir !== DESIGN_SYSTEM_DIR) {
      errors.push({
        code: "coherence-design-system-dir",
        message: "config.designSystemDir no coincide con la ubicación del manifiesto.",
        path: MANAGED_FILES.config,
      });
    }
  }

  if (errors.length > 0) {
    const r = createCompleteInvalidState(errors);
    return r.ok ? r.value : noneState;
  }

  return completeValidState(DESIGN_SYSTEM_DIR);
}
