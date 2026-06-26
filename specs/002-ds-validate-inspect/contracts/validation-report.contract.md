# Contract — ValidationReport (002)

Vista de validez derivada del análisis común. Reutiliza `Issue`/`ValidationResult` de `001`.

```ts
type Severity = "error" | "warning";
type IssueDocument = "config" | "manifest" | "tokens" | "host" | "structure";

interface ReportedIssue { // Issue de 001 + severidad/documento
  readonly code: string;          // estable; NUNCA texto de AJV/Zod
  readonly severity: Severity;
  readonly document?: IssueDocument;
  readonly path?: string;         // ruta dentro del documento
  readonly message: string;
  readonly context?: string;      // contexto seguro, sin secretos
}

interface ValidationReport {
  readonly valid: boolean;        // false si hay ≥1 error o análisis incompleto por límite
  readonly structuralState: "not-initialized" | "partial" | "complete-invalid" | "complete-valid";
  readonly checkedDocuments: readonly string[];
  readonly uncheckedDocuments: readonly string[];
  readonly errors: readonly ReportedIssue[];
  readonly warnings: readonly ReportedIssue[];
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
