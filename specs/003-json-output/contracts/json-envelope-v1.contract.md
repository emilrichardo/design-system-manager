# Contract — JSON Envelope v1 (003)

Envelope público y versionado para `validate --json` e `inspect --json`. **No** serializa objetos de
dominio: se construye desde los resultados públicos vía mappers puros (ver
[data-model.md](../data-model.md)).

## Forma

```ts
const JSON_FORMAT_VERSION = "1.0.0";

// Outcomes de dominio con result presente
type ExpectedEnvelope<C, R> =
  | { formatVersion: "1.0.0"; command: C; outcome: "valid" | "complete-invalid" | "partial" | "read-error"; result: R }
  | { formatVersion: "1.0.0"; command: C; outcome: "not-found"; result: null; error: { code: string; message: string } | null };

// Error interno (solo capa CLI; NO es outcome de dominio)
type InternalErrorEnvelope =
  { formatVersion: "1.0.0"; command: "validate" | "inspect"; outcome: "internal-error"; result: null; error: { code: string; message: string } };
```

## Reglas

- **Cuatro campos base siempre presentes**: `formatVersion`, `command`, `outcome`, `result`
  (FR-004/FR-006). En `not-found` e `internal-error`, `result === null`.
- Campo `error` **solo** en `not-found` (mapea `hostError`, puede ser `null`) e `internal-error`
  (FR-009, US8). En los demás outcomes no aparece.
- Orden canónico de claves: `formatVersion`, `command`, `outcome`, `result`, `error`.
- `formatVersion` es independiente de `package.version` (FR-005).
- Serialización: `JSON.stringify(envelope, null, 2) + "\n"` (2 espacios + newline; FR-022).
- Determinista: misma entrada → bytes idénticos; sin timestamps/UUID/duración/entorno (FR-023/FR-024).
- Sin `undefined` en ningún nivel (FR-018).

## Ejemplo (envelope mínimo, `result` abreviado)

```json
{
  "formatVersion": "1.0.0",
  "command": "validate",
  "outcome": "valid",
  "result": {}
}
```

Ejemplos completos por outcome: ver
[json-validate-result-v1](json-validate-result-v1.contract.md),
[json-inspect-result-v1](json-inspect-result-v1.contract.md) y
[json-internal-error-v1](json-internal-error-v1.contract.md).
