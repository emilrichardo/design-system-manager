# Contract — InitializationResult (salida del caso de uso)

El caso de uso `initializeDesignSystem` devuelve un **resultado estructurado** independiente de la
representación visual. El CLI (y, en el futuro, Studio/MCP) lo mapea a su propia salida y, en el
caso del CLI, a un exit code (ver `exit-codes.md`).

## Tipo (TypeScript, conceptual)

```ts
type Issue = { code: string; message: string; path?: string };

type InitializationResult =
  | { status: "created";   files: string[] }              // rutas relativas creadas
  | { status: "unchanged"; reason: string }               // ya inicializado / nada que hacer
  | { status: "cancelled" }                               // el usuario canceló
  | { status: "conflict";  conflicts: string[] }          // rutas objetivo ocupadas
  | { status: "failed";    errors: Issue[] };             // host inválido, validación o FS
```

## Mapeo status → exit code (CLI)

| status | exit code | Significado |
|---|---|---|
| `created` | 0 | Éxito: archivos creados. |
| `unchanged` | 2 | Sin cambios (idempotente / ya inicializado). |
| `cancelled` | 1 | Cancelado por el usuario, sin escribir. |
| `conflict` | 4 | Conflicto de archivos; nada escrito. |
| `failed` (host inválido) | 5 | Falta `package.json` / raíz inválida. |
| `failed` (validación) | 3 | Entrada/dominio/DTCG inválidos. |
| `failed` (filesystem) | 6 | Error de E/S durante la escritura (con rollback). |

> Nota: `failed` lleva `errors[]` con un `code` que distingue host/validación/FS para que el CLI
> seleccione el exit code adecuado. Ver `exit-codes.md`.

## Garantías

- En `cancelled`, `conflict` y `failed` **no** quedan archivos parciales (atomicidad, US5/FR-022).
- `created.files` enumera exactamente lo escrito (FR-018) y se usa en el reporte final.
- El resultado no contiene texto de terminal ni colores: la presentación vive en el `Reporter`.
