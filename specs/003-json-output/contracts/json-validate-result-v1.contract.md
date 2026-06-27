# Contract — JSON Validate Result v1 (003)

Proyección pública de `ValidateDesignSystemResult` (caso de uso headless `validateDesignSystem`).
Reutiliza el resultado existente; **no** reanaliza. Ver [data-model.md](../data-model.md) §5.

## Forma de `result` (outcomes con result presente)

```ts
interface JsonValidateResultV1 {
  host: { root: string; designSystemPath: string | null } | null;
  structuralState: "not-initialized" | "partial" | "complete-invalid" | "complete-valid";
  valid: boolean;
  checkedDocuments: string[];
  uncheckedDocuments: string[];
  summary: { errors: number; warnings: number; tokens: number | null };
  errors: JsonIssueV1[];
  warnings: JsonIssueV1[];
  limits: { reached: boolean; partial: boolean; hits: { limit: string; detail: string }[] };
}
```

`JsonIssueV1`: ver [json-issue-v1](json-issue-v1.contract.md).

## Exit codes (sin cambios; ADR-0006)

`valid→0`, `complete-invalid→3`, `partial→4`, `not-found→5`, `read-error→6`. `--json` no altera el
código.

## Ejemplo — `valid` (exit 0)

```json
{
  "formatVersion": "1.0.0",
  "command": "validate",
  "outcome": "valid",
  "result": {
    "host": { "root": "/project", "designSystemPath": "/project/design-system" },
    "structuralState": "complete-valid",
    "valid": true,
    "checkedDocuments": ["neuraz-ds.config.json", "design-system/design-system.json", "design-system/tokens/base.tokens.json"],
    "uncheckedDocuments": [],
    "summary": { "errors": 0, "warnings": 0, "tokens": 2 },
    "errors": [],
    "warnings": [],
    "limits": { "reached": false, "partial": false, "hits": [] }
  }
}
```

## Ejemplo — `complete-invalid` (exit 3)

```json
{
  "formatVersion": "1.0.0",
  "command": "validate",
  "outcome": "complete-invalid",
  "result": {
    "host": { "root": "/project", "designSystemPath": "/project/design-system" },
    "structuralState": "complete-invalid",
    "valid": false,
    "checkedDocuments": ["neuraz-ds.config.json", "design-system/design-system.json", "design-system/tokens/base.tokens.json"],
    "uncheckedDocuments": [],
    "summary": { "errors": 1, "warnings": 0, "tokens": 1 },
    "errors": [
      { "severity": "error", "code": "dtcg-type-unrecognized", "message": "El tipo DTCG no es reconocido.", "document": "tokens", "path": "color.brand.primary" }
    ],
    "warnings": [],
    "limits": { "reached": false, "partial": false, "hits": [] }
  }
}
```

## Ejemplo — `not-found` (exit 5)

`result` es `null`; `error` mapea el `hostError` del resultado. **En v1 los casos de uso reutilizados
dejan `hostError` en `null`** (003 no los modifica), por lo que `error` es **`null`**. El campo queda
reservado para que un cambio futuro del caso de uso pueda exponer el motivo sin romper el formato.

```json
{
  "formatVersion": "1.0.0",
  "command": "validate",
  "outcome": "not-found",
  "result": null,
  "error": null
}
```

## Ejemplo — `read-error` (exit 6)

Conserva la información recuperable disponible antes del fallo (no se reduce a un string).

```json
{
  "formatVersion": "1.0.0",
  "command": "validate",
  "outcome": "read-error",
  "result": {
    "host": { "root": "/project", "designSystemPath": "/project/design-system" },
    "structuralState": "partial",
    "valid": false,
    "checkedDocuments": ["neuraz-ds.config.json", "design-system/design-system.json"],
    "uncheckedDocuments": ["design-system/tokens/base.tokens.json"],
    "summary": { "errors": 1, "warnings": 0, "tokens": null },
    "errors": [
      { "severity": "error", "code": "invalid-encoding", "message": "El documento no es UTF-8 válido.", "document": "tokens", "path": null }
    ],
    "warnings": [],
    "limits": { "reached": false, "partial": false, "hits": [] }
  }
}
```
