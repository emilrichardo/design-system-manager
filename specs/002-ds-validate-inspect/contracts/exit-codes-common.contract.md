# Contract — Códigos de salida comunes del binario (002, ADR-0006)

Tabla **única** para todos los comandos del binario `neuraz-ds`. Generaliza la de `001` **sin**
cambiar los códigos de `init`.

| Código | Significado común |
|---:|---|
| 0 | Operación exitosa y resultado válido |
| 1 | Cancelación interactiva (solo comandos interactivos, p. ej. `init`) |
| 2 | Operación exitosa sin cambios (`unchanged`; usada por `init`) |
| 3 | Entrada o Design System inválido |
| 4 | Estructura parcial o conflicto |
| 5 | Proyecto anfitrión o Design System administrado no localizable |
| 6 | Error de lectura/filesystem |
| 7 | Error de verificación posterior (reservado para operaciones que **escriben**) |
| 70 | Error interno inesperado de frontera CLI (no contractual) |

## Mapeo por comando

```ts
// init (001) — SIN CAMBIOS: created→0, cancelled→1, unchanged→2, failed/validation→3,
//              conflict→4, failed/host→5, failed/filesystem→6, failed/post-verify→7.

function exitCodeForValidation(r: ValidationReport): number; // validate
//   valid (complete-valid) → 0
//   complete-invalid       → 3
//   partial                → 4
//   not-initialized / host → 5
//   read/filesystem        → 6

function exitCodeForInspection(i: DesignSystemInspection): number; // inspect
//   complete-valid    → 0
//   complete-invalid  → 3   (entrega igualmente el informe)
//   partial           → 4   (entrega present/missing/recuperables)
//   not-initialized   → 5
//   read/filesystem   → 6
```

## Reglas
- `validate`/`inspect` **no** reasignan `2` (sigue siendo `unchanged` de `init`); no usan normalmente
  `1`/`2`/`7` (reservados por el contrato común).
- Ayuda y versión → `0`; error de uso del parser → `3`; error interno de frontera → `70`.
- La función común de exit codes MUST evolucionar **sin romper** `init` (regresión probada).
- Ningún código tiene dos significados incompatibles dentro del binario.
