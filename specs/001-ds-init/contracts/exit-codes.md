# Contract — Exit Codes (CLI `neuraz-ds init`)

Códigos de salida consistentes para integración en scripts/CI. `0` = éxito; cualquier valor `!= 0`
indica que no se completó la creación. Antes de la confirmación nunca se escribe nada.

| Código | Nombre | Cuándo |
|---|---|---|
| 0 | `OK` | Inicialización exitosa (`status: created`). |
| 1 | `CANCELLED` | El usuario canceló (prompt o confirmación); sin cambios. |
| 2 | `UNCHANGED` | Ya inicializado / nada pendiente (idempotente). |
| 3 | `INVALID_INPUT` | Entrada o dominio inválidos (nombre vacío, slug inválido, versión no SemVer). |
| 4 | `CONFLICT` | Conflicto de archivos (rutas objetivo ocupadas); nada escrito. |
| 5 | `INVALID_HOST` | Proyecto anfitrión inválido: falta `package.json` o raíz no resoluble. |
| 6 | `FS_ERROR` | Error de filesystem durante la escritura (con rollback; sin estado parcial). |
| 7 | `VALIDATION_FAILED` | Validación del estado resultante falló tras escribir (caso límite; dispara limpieza). |

## Reglas

- Códigos 1, 2, 3, 4, 5 garantizan **cero escrituras**.
- Código 6 garantiza **rollback** del staging (sin archivos parciales).
- Código 7 (validación posterior a `commit`) dispara limpieza de lo escrito.
- El CLI no debe usar `0` para ningún caso de error.
- La distinción `INVALID_HOST` (5) vs `INVALID_INPUT` (3) vs `VALIDATION_FAILED` (7) permite a CI
  diagnosticar la causa sin parsear texto.

## Relación con el estado previo (ver `data-model.md`)

| previousState | Código |
|---|---|
| `none` → creación exitosa | 0 |
| `none` → cancelado | 1 |
| `none` → conflicto de rutas | 4 |
| `complete-valid` | 2 (`UNCHANGED`) |
| `partial` | 4 (`CONFLICT`) |
| `complete-invalid` | 3 (`INVALID_INPUT`, categoría validación) |
