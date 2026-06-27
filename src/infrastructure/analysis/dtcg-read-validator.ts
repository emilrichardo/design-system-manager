// T026 — Validador DTCG amplio de lectura (puerto DtcgReadValidator de Fase 3). Reconoce los 13
// tipos DTCG 2025.10 (solo `color` profundo) sin transformar `$value`. SEPARADO del schema estricto
// de generación de `001` (dtcg.schema.ts, color-only), que NO se modifica. Delega el análisis real al
// recorrido (traverseDtcgTree) y proyecta sus issues; el resultado rico (nodos/estadísticas/límites)
// se obtiene de `traverseDtcgTree` directamente (lo usará la tubería T029).
import type { AnalysisIssue } from "../../domain/analysis/analysis-issue.js";
import type { DtcgAnalyzer, DtcgReadValidator } from "../../application/analysis-ports.js";
import { traverseDtcgTree } from "./traverse-dtcg-tree.js";

/**
 * Crea el analizador DTCG de lectura (puerto `DtcgAnalyzer`): una sola pasada de `traverseDtcgTree`
 * por documento. Es lo que usa la tubería compartida (T029) para no duplicar el recorrido.
 */
export function createDtcgAnalyzer(): DtcgAnalyzer {
  return {
    analyze: (document: unknown) => traverseDtcgTree(document),
  };
}

/**
 * Crea el validador de lectura. `validate(document)` devuelve los issues (errores seguidos de
 * advertencias) producidos por el recorrido. Documento válido ⇒ sin errores.
 */
export function createDtcgReadValidator(): DtcgReadValidator {
  return {
    validate(document: unknown): readonly AnalysisIssue[] {
      const result = traverseDtcgTree(document);
      return [...result.errors, ...result.warnings];
    },
  };
}
