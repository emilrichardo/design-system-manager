// T030 — Orquestador de validación previa (3 capas: entrada → dominio → documentos a escribir).
// Pertenece a aplicación: depende SOLO de dominio y de puertos (DocumentValidators inyectado),
// nunca de infraestructura concreta. No escribe, no confirma, no traduce a exit codes.
import type { Issue } from "../domain/issue.js";
import type { ValidationResult } from "../domain/validation/validation-result.js";
import { validationResult } from "../domain/validation/validation-result.js";
import type { InitializationPlan } from "../domain/plan/initialization-plan.js";
import { EXPECTED_FILES } from "../domain/plan/managed-files.js";
import type { DocumentValidators } from "./ports.js";

/** Documentos construidos en memoria que el plan pretende escribir. */
export interface PlannedDocuments {
  readonly config: unknown;
  readonly manifest: unknown;
  readonly tokens: unknown;
}

/**
 * Valida un plan y sus documentos antes de cualquier escritura. Acumula todos los errores.
 * Un resultado con errores debe impedir que el plan sea ejecutable en fases posteriores.
 */
export function validatePlan(
  plan: InitializationPlan,
  documents: PlannedDocuments,
  validators: DocumentValidators,
): ValidationResult {
  const errors: Issue[] = [];
  const warnings: Issue[] = [];

  // Estructura del plan: rutas exactas de ADR-0004, sin duplicados.
  const matchesExpected =
    plan.filesToCreate.length === EXPECTED_FILES.length &&
    EXPECTED_FILES.every((f, i) => plan.filesToCreate[i] === f);
  if (!matchesExpected) {
    errors.push({
      code: "plan-files-mismatch",
      message: "Los archivos del plan no coinciden con la estructura aprobada (ADR-0004).",
    });
  }
  if (new Set(plan.filesToCreate).size !== plan.filesToCreate.length) {
    errors.push({ code: "plan-duplicate-files", message: "El plan contiene rutas duplicadas." });
  }

  // Contenido presente para cada documento.
  if (documents.config === undefined) errors.push({ code: "plan-missing-config", message: "Falta el contenido de la configuración." });
  if (documents.manifest === undefined) errors.push({ code: "plan-missing-manifest", message: "Falta el contenido del manifiesto." });
  if (documents.tokens === undefined) errors.push({ code: "plan-missing-tokens", message: "Falta el contenido de los tokens." });

  // Conflictos incompatibles con ejecución.
  if (plan.conflicts.length > 0) {
    for (const c of plan.conflicts) {
      errors.push({ code: "plan-conflict", message: `Conflicto de archivo: ${c}`, path: c });
    }
  }

  // Validación de cada documento mediante el puerto inyectado.
  errors.push(...validators.validateConfig(documents.config));
  errors.push(...validators.validateManifest(documents.manifest));
  errors.push(...validators.validateDtcg(documents.tokens));

  return validationResult(errors, warnings);
}
