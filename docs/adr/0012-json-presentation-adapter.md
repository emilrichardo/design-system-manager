# ADR 0012 — Adapter de presentación JSON (reporter JSON)

- **Estado**: Aceptado
- **Fecha**: 2026-06-27
- **Contexto**: Feature 003-json-output. Hay que emitir el envelope JSON sin duplicar análisis, sin
  ejecutar el reporter textual y garantizando **una sola escritura**. Los puertos de presentación
  existentes (`ValidationReporter` / `InspectionReporter`) reciben datos estructurados; sus
  implementaciones textuales **solo escriben en `completed(result)`** y `completed` recibe el
  resultado público completo. Constitución V, VI, XV.

## Decisión

**Opción A — Reporter JSON**. Se implementan `JsonValidationReporter` y `JsonInspectionReporter` que
satisfacen los puertos existentes, **ignoran los eventos intermedios** y, en `completed(result)`,
mapean el resultado público a su envelope DTO, lo serializan y lo escriben **una sola vez** en
`io.out`.

- **Selección de modo** (capa CLI): `--json` es una opción booleana **local** (`default false`) en
  `validate` e `inspect`; la acción lee `cmd.opts().json` y usa el reporter JSON o el textual. Se
  construye/ejecuta **exactamente un** adapter por invocación.
- **Cero cambios** en los casos de uso: ya invocan `completed(result)` con el resultado completo.
- **Mappers/DTO en aplicación** (puros, headless-reusables); **serializer** (`JSON.stringify(env,
  null, 2) + "\n"`) y **reporters JSON** en infraestructura/presentación; el serializer no muta.
- Salida humana (sin `--json`) **inalterada**.

## Consecuencias

- Simetría con el reporter textual: misma disciplina de única escritura y mismas pruebas de tipo
  *recording reporter*.
- El dominio/aplicación no conocen streams ni serialización a string.
- Una futura TUI/MCP puede reutilizar los mappers/DTO de aplicación sin la CLI.

## Alternativas rechazadas

- **Opción B — reporter mudo + serializar el retorno en el comando**: duplica el punto de escritura
  (comando + reporter) y obliga al comando a conocer la serialización.
- **Postprocesar la salida textual a JSON**: frágil y acoplado al formato humano.
- **Dos adapters activos**: riesgo de doble salida.

## Referencias

- [contracts/json-output-streams](../../specs/003-json-output/contracts/json-output-streams.contract.md),
  [research.md §2/§6](../../specs/003-json-output/research.md). Relacionado: ADR-0011, ADR-0013.
