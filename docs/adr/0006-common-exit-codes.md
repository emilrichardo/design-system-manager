# ADR 0006 — Semántica común de códigos de salida entre comandos

- **Estado**: Aceptado
- **Fecha**: 2026-06-26
- **Contexto**: Feature 002-ds-validate-inspect. Constitución V, XIV, XVI. El binario `neuraz-ds`
  pasa de un único comando (`init`) a varios (`init`, `validate`, `inspect`). Se necesita una tabla
  **única** de códigos de salida, sin significados incompatibles para un mismo código, y **sin romper**
  los códigos ya contractuales de `init` (ADR/feature 001). Decisión de producto ya aprobada en
  `/speckit-clarify` de 002.

## Decisión

Tabla común para todo el binario:

| Código | Significado común |
|---:|---|
| 0 | Operación exitosa y resultado válido |
| 1 | Cancelación interactiva (solo comandos interactivos, p. ej. `init`) |
| 2 | Operación exitosa sin cambios (`unchanged`; usada por `init`) |
| 3 | Entrada o Design System inválido |
| 4 | Estructura parcial o conflicto |
| 5 | Proyecto anfitrión o Design System administrado no localizable |
| 6 | Error de lectura/filesystem |
| 7 | Verificación posterior fallida (solo operaciones que escriben) |
| 70 | Error interno inesperado de frontera CLI (no contractual) |

- `init` (001) **no cambia**: `created→0`, `cancelled→1`, `unchanged→2`, `failed/validation→3`,
  `conflict→4`, `failed/host→5`, `failed/filesystem→6`, `failed/post-verify→7`.
- `validate`/`inspect`: `válido→0`, `completo-inválido→3`, `parcial→4`, `no-localizable→5`,
  `lectura/fs→6`. No reasignan `2` (sigue siendo `unchanged`); no usan normalmente `1`/`2`/`7`.
- La función común de exit codes (generalización de la de 001) MUST evolucionar con **regresión
  probada** de `init`.

## Consecuencias

- Un solo lugar mapea resultado→código; coherencia entre comandos y scripts/CI.
- `2` NO significa "inspección inválida": evita ambigüedad pedida por la spec.
- Detalle contractual en [contracts/exit-codes-common.contract.md](../../specs/002-ds-validate-inspect/contracts/exit-codes-common.contract.md).

## Alternativas rechazadas

- Tabla independiente por comando: produce colisiones semánticas dentro del mismo binario.
- Reusar `2` para "inválido completado": rompe la semántica `unchanged` de `init`.
