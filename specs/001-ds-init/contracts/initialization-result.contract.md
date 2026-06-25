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

| status | `Issue.code` (si aplica) | exit code | Significado |
|---|---|---|---|
| `created` | — | 0 | Éxito: archivos creados. |
| `unchanged` | — | 2 | Sin cambios: estado previo `complete-valid` (idempotente / ya inicializado y válido). |
| `cancelled` | — | 1 | Cancelado por el usuario, sin escribir. |
| `conflict` | — | 4 | Conflicto de archivos o estado previo `partial`; nada escrito. |
| `failed` | `host` | 5 | Proyecto anfitrión inválido: falta `package.json` / raíz no resoluble. |
| `failed` | `validation` | 3 | Entrada/dominio/DTCG inválidos, incluido estado previo `complete-invalid`. |
| `failed` | `filesystem` | 6 | Error de E/S durante `stage`/`commit` (con rollback). |
| `failed` | `post-verify` | 7 | La validación posterior a `commit` falló (caso límite; dispara limpieza). |

> `failed` lleva `errors[]`; el primer `Issue.code` (`host` / `validation` / `filesystem` /
> `post-verify`) determina el exit code. Ver `exit-codes.md` (fuente normativa de los códigos).

### Mapeo estado previo → resultado (ver `data-model.md`)

| previousState | status | exit |
|---|---|---|
| `none` | `created` / `cancelled` / `conflict` | 0 / 1 / 4 |
| `complete-valid` | `unchanged` | 2 |
| `partial` | `conflict` | 4 |
| `complete-invalid` | `failed` (`validation`) | 3 |

## Garantías

- En `cancelled`, `conflict` y `failed` **no** quedan archivos parciales (atomicidad, US5/FR-022).
- `created.files` enumera exactamente lo escrito (FR-018) y se usa en el reporte final.
- El resultado no contiene texto de terminal ni colores: la presentación vive en el `Reporter`.
