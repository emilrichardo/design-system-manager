# Contract — JSON Issue v1 (003)

Proyección pública estable de `AnalysisIssue` (dominio). Mapeo puro; no expone interno.
Ver [data-model.md](../data-model.md) §3.

## Forma

```ts
interface JsonIssueV1 {
  severity: "error" | "warning"; // SIEMPRE
  code: string;                  // SIEMPRE — identificador estable (jamás texto AJV/Zod)
  message: string;               // SIEMPRE — humano
  document: string | null;       // ManagedDocument ("config"|"manifest"|"tokens"|"host"|"structure") o null
  path: string | null;           // ruta lógica del token cuando aplica, o null
}
```

## Reglas

- `document`/`path`: `null` cuando el modelo no los aporta (FR-014). Nunca se omiten.
- **Prohibido** en v1: `context`, stack traces, objetos `Error`, errores crudos AJV/Zod, contenido de
  archivos, rutas externas sensibles (FR-015/FR-016/FR-032).
- Mapeo desde `AnalysisIssue { code, message, path?, severity, document?, context? }`:
  `{ severity, code, message, document: document ?? null, path: path ?? null }` — `context` se descarta.
- Orden de los arrays `errors`/`warnings`: el del modelo (no se reordena por mensaje; FR-024).

## Ejemplos

```json
{ "severity": "error", "code": "dtcg-type-unrecognized", "message": "El tipo DTCG no es reconocido.", "document": "tokens", "path": "color.brand.primary" }
```

```json
{ "severity": "warning", "code": "dtcg-type-not-deeply-inspected", "message": "Tipo DTCG reconocido pero no inspeccionado en profundidad.", "document": "tokens", "path": "space.md" }
```

```json
{ "severity": "error", "code": "managed-file-missing", "message": "Falta un documento administrado.", "document": "tokens", "path": null }
```
