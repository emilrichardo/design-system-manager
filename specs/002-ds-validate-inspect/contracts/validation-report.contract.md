# Contract — ValidationReport (002)

Vista de validez derivada del análisis común. Reutiliza `Issue`/`ValidationResult` de `001`.

Usa el tipo canónico **`AnalysisIssue`** (C4) definido en [data-model.md](../data-model.md): tipo
aditivo que **extiende** `Issue` de `001` (no lo muta), con `severity`/`document?`/`context?`.

```ts
type Severity = "error" | "warning";
type ManagedDocument = "config" | "manifest" | "tokens" | "host" | "structure";

interface AnalysisIssue extends Issue {  // Issue de 001 = { code, message, path? } — sin cambios
  readonly severity: Severity;           // error invalida; warning no
  readonly document?: ManagedDocument;   // documento afectado cuando se conoce
  readonly context?: Record<string, unknown>; // contexto seguro opcional, sin secretos
}                                        // `code` estable; NUNCA texto de AJV/Zod

interface ValidationReport {
  readonly valid: boolean;        // false si hay ≥1 error o análisis incompleto por límite
  readonly structuralState: "not-initialized" | "partial" | "complete-invalid" | "complete-valid";
  readonly checkedDocuments: readonly string[];
  readonly uncheckedDocuments: readonly string[];
  readonly errors: readonly AnalysisIssue[];
  readonly warnings: readonly AnalysisIssue[];
  readonly limits: AnalysisLimitsResult;
  readonly summary: { readonly errors: number; readonly warnings: number; readonly tokens?: number };
}
```

## Reglas
- **error** impide `valid: true`; **warning** no invalida.
- Acumula **todos** los errores recuperables (no se detiene en el primero cuando es seguro continuar).
- Categorías por `Issue`: host / structure / read / validation / limit.
- Un límite duro alcanzado ⇒ `valid: false` + `limits.partial: true` + documentos en
  `uncheckedDocuments` cuando corresponda.
- Códigos estables: `dtcg-type-unrecognized` (error), `dtcg-type-undeterminable` (error),
  `dtcg-type-not-deeply-inspected` (warning), `dtcg-empty-group` (warning),
  `dtcg-description-missing` (warning), `alias-missing`/`alias-to-group`/`alias-cyclic`/`alias-malformed`
  (error), `config-path-escape` (error), `coherence-*` (error), `limit-*-exceeded` (error),
  `read-failed` (error).
