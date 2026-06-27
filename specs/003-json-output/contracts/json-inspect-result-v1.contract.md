# Contract — JSON Inspect Result v1 (003)

Proyección pública de `InspectDesignSystemResult` (caso de uso headless `inspectDesignSystem`).
Reutiliza el resultado existente; **no** reanaliza, **no** aplica la cota textual de 200.
Ver [data-model.md](../data-model.md) §6.

## Forma de `result` (outcomes con result presente)

```ts
interface JsonInspectResultV1 {
  host: { root: string; designSystemPath: string | null } | null;
  structuralState: "not-initialized" | "partial" | "complete-invalid" | "complete-valid";
  identity: {
    name: JsonInspectedValueV1<string>; slug: JsonInspectedValueV1<string>;
    version: JsonInspectedValueV1<string>; description: JsonInspectedValueV1<string>;
  } | null;
  schemaVersions: {
    config: JsonInspectedValueV1<string>; manifest: JsonInspectedValueV1<string>;
    formatVersion: JsonInspectedValueV1<string>;
  } | null;
  files: {
    expected: string[];
    present: { relativePath: string; kind: string; sizeBytes: number | null; readable: boolean }[];
    missing: string[];
  };
  tokens: {
    total: number; groups: number; concreteValues: number; aliases: number;
    byType: Record<string, number>; maxDepth: number; aliasIssues: number;
    paths: JsonTokenNodeV1[]; // TODOS los nodos — sin cota 200
  } | null;
  validation: JsonValidationV1; // proyección de ValidationReport sin host
  limits: { reached: boolean; partial: boolean; hits: { limit: string; detail: string }[] };
}
```

`JsonInspectedValueV1`: ver [json-inspected-value-v1](json-inspected-value-v1.contract.md).
`JsonIssueV1`: ver [json-issue-v1](json-issue-v1.contract.md).

## Reglas

- **Sin cota de 200**: `tokens.paths.length === tokens.total` (FR-012/SC-004). La constante
  `MAX_INSPECT_TERMINAL_TOKEN_ROWS` **no** se importa en DTO/mapper/serializer.
- Identidad/schemaVersions: cada subcampo es un `InspectedValue` con `value` siempre presente
  (posible `null`) y `trust`. Si el modelo no trae `identity`/`tokens` → `null`.
- `not-found` → `result: null` (no se inventan identidad/paths/inspección; FR-013), `error` mapea
  `hostError` o `null`.

## Exit codes (ADR-0006)

`valid→0`, `complete-invalid→3`, `partial→4`, `not-found→5`, `read-error→6`.

## Ejemplo — `valid` (exit 0)

```json
{
  "formatVersion": "1.0.0",
  "command": "inspect",
  "outcome": "valid",
  "result": {
    "host": { "root": "/project", "designSystemPath": "/project/design-system" },
    "structuralState": "complete-valid",
    "identity": {
      "name": { "value": "Acme Design System", "trust": "valid" },
      "slug": { "value": "acme-design-system", "trust": "valid" },
      "version": { "value": "0.1.0", "trust": "valid" },
      "description": { "value": null, "trust": "unavailable" }
    },
    "schemaVersions": {
      "config": { "value": "0.1.0", "trust": "valid" },
      "manifest": { "value": "0.1.0", "trust": "valid" },
      "formatVersion": { "value": "2025.10", "trust": "valid" }
    },
    "files": {
      "expected": ["neuraz-ds.config.json", "design-system/design-system.json", "design-system/tokens/base.tokens.json"],
      "present": [
        { "relativePath": "neuraz-ds.config.json", "kind": "file", "sizeBytes": null, "readable": true },
        { "relativePath": "design-system/design-system.json", "kind": "file", "sizeBytes": null, "readable": true },
        { "relativePath": "design-system/tokens/base.tokens.json", "kind": "file", "sizeBytes": null, "readable": true }
      ],
      "missing": []
    },
    "tokens": {
      "total": 2, "groups": 2, "concreteValues": 1, "aliases": 1,
      "byType": { "color": 2 }, "maxDepth": 3, "aliasIssues": 0,
      "paths": [
        { "path": "color.base.blue-500", "declaredType": "color", "effectiveType": "color", "typeOrigin": "own", "typeSourcePath": null, "kind": "concrete", "aliasTarget": null, "aliasState": "n/a", "description": null, "depth": 3, "trust": "valid" },
        { "path": "color.brand.primary", "declaredType": null, "effectiveType": "color", "typeOrigin": "alias", "typeSourcePath": null, "kind": "alias", "aliasTarget": "color.base.blue-500", "aliasState": "valid", "description": null, "depth": 3, "trust": "valid" }
      ]
    },
    "validation": {
      "valid": true, "structuralState": "complete-valid",
      "checkedDocuments": ["neuraz-ds.config.json", "design-system/design-system.json", "design-system/tokens/base.tokens.json"],
      "uncheckedDocuments": [], "summary": { "errors": 0, "warnings": 0, "tokens": 2 },
      "errors": [], "warnings": [], "limits": { "reached": false, "partial": false, "hits": [] }
    },
    "limits": { "reached": false, "partial": false, "hits": [] }
  }
}
```

## Ejemplo — `partial` (exit 4, recuperable)

```json
{
  "formatVersion": "1.0.0",
  "command": "inspect",
  "outcome": "partial",
  "result": {
    "host": { "root": "/project", "designSystemPath": "/project/design-system" },
    "structuralState": "partial",
    "identity": {
      "name": { "value": "Acme Design System", "trust": "recovered" },
      "slug": { "value": "acme-design-system", "trust": "recovered" },
      "version": { "value": null, "trust": "unavailable" },
      "description": { "value": null, "trust": "unavailable" }
    },
    "schemaVersions": null,
    "files": {
      "expected": ["neuraz-ds.config.json", "design-system/design-system.json", "design-system/tokens/base.tokens.json"],
      "present": [
        { "relativePath": "neuraz-ds.config.json", "kind": "file", "sizeBytes": null, "readable": true },
        { "relativePath": "design-system/design-system.json", "kind": "file", "sizeBytes": null, "readable": true }
      ],
      "missing": ["design-system/tokens/base.tokens.json"]
    },
    "tokens": null,
    "validation": {
      "valid": false, "structuralState": "partial",
      "checkedDocuments": ["neuraz-ds.config.json", "design-system/design-system.json"],
      "uncheckedDocuments": ["design-system/tokens/base.tokens.json"],
      "summary": { "errors": 1, "warnings": 0, "tokens": null },
      "errors": [ { "severity": "error", "code": "managed-file-missing", "message": "Falta un documento administrado.", "document": "tokens", "path": null } ],
      "warnings": [], "limits": { "reached": false, "partial": false, "hits": [] }
    },
    "limits": { "reached": false, "partial": false, "hits": [] }
  }
}
```

## Ejemplo — `inspect` con >200 tokens (exit 0)

`tokens.paths` contiene **todos** los nodos (p. ej. 250); `tokens.total === paths.length`. **No**
aparece ningún mensaje de truncado.

```json
{
  "formatVersion": "1.0.0",
  "command": "inspect",
  "outcome": "valid",
  "result": {
    "host": { "root": "/project", "designSystemPath": "/project/design-system" },
    "structuralState": "complete-valid",
    "identity": { "name": { "value": "Acme Design System", "trust": "valid" }, "slug": { "value": "acme-design-system", "trust": "valid" }, "version": { "value": "0.1.0", "trust": "valid" }, "description": { "value": null, "trust": "unavailable" } },
    "schemaVersions": { "config": { "value": "0.1.0", "trust": "valid" }, "manifest": { "value": "0.1.0", "trust": "valid" }, "formatVersion": { "value": "2025.10", "trust": "valid" } },
    "files": { "expected": ["neuraz-ds.config.json", "design-system/design-system.json", "design-system/tokens/base.tokens.json"], "present": [], "missing": [] },
    "tokens": {
      "total": 250, "groups": 1, "concreteValues": 250, "aliases": 0,
      "byType": { "color": 250 }, "maxDepth": 2, "aliasIssues": 0,
      "paths": ["…250 entradas JsonTokenNodeV1, sin omisión…"]
    },
    "validation": { "valid": true, "structuralState": "complete-valid", "checkedDocuments": [], "uncheckedDocuments": [], "summary": { "errors": 0, "warnings": 0, "tokens": 250 }, "errors": [], "warnings": [], "limits": { "reached": false, "partial": false, "hits": [] } },
    "limits": { "reached": false, "partial": false, "hits": [] }
  }
}
```

> El array `paths` arriba se abrevia textualmente solo en este documento; la salida real contiene las
> 250 entradas completas.
