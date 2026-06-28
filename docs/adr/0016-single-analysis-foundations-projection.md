# ADR 0016 — Single-analysis foundations projection

- **Estado**: Aceptado
- **Fecha**: 2026-06-28
- **Contexto**: Feature 004-foundations debe producir su vista sin un segundo análisis. Verificado en
  código: `analyzeExistingDesignSystem` ya retiene `documents[<tokens>].parsed` (el JSON parseado
  completo, con `$extensions`) y `nodes: TokenNodeSummary[]` (alias/tipo/trust por path). Constitución
  II, V, VIII, XVI.

## Decisión

**Opción C — proyección pura tras el análisis único.** La feature añade una capa de aplicación que
deriva foundations a partir de:
- `analysis.nodes` (join por `path`: `effectiveType`, `kind`, `aliasTarget`, `aliasState`, `trust`);
- `analysis.documents[<tokens>].parsed` (pasada superficial de metadata para leer `$extensions` y
  resolver herencia de nivel).

NO se crea un segundo reader, ni un segundo `JSON.parse`, ni un segundo recorrido DTCG, ni se
re-resuelven aliases/tipos/estadísticas. La extracción de `$extensions` es metadata, no análisis DTCG.

- Caso de uso headless único (lectura): recibe `executionDir`, reutiliza `createBoundAnalyze()` /
  `analyzeExistingDesignSystem`, devuelve `FoundationsResult` estructurado; sin fs/Commander/ANSI/exit
  codes/JSON en dominio o aplicación.
- Si el documento de tokens no se parseó (ausente/read-error/json-parse) → categorías `absent`/
  limitadas y se reutiliza el outcome del análisis; sin crash.

## Consecuencias

- Sin tocar 002 (ni modelos públicos ni `traverse-dtcg-tree`): cero riesgo de regresión en 002.
- Una lectura, un parseo, un recorrido; cero escrituras (solo lectura).
- Reutiliza alias/tipo/trust ya calculados → listo para 005/006 sin re-análisis.

## Alternativas rechazadas

- **A (enriquecer cada `TokenNodeSummary`)**: ensancha el modelo público de 002 e impacta sus tests.
- **B (acumulador en el traversal)**: modifica infra de 002 y añade complejidad al recorrido.
- **D (segundo parseo/traversal)**: viola el invariante de análisis único.

## Referencias

[analyze-existing-design-system.ts](../../src/application/analyze-existing-design-system.ts) (línea
~191, `parsed` retenido), [research §1/§2](../../specs/004-foundations/research.md),
[data-model.md](../../specs/004-foundations/data-model.md). Relacionado: ADR-0014/0015/0017.
