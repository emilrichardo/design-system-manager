# Contract — Tubería de análisis y casos de uso (002)

Núcleo headless: una sola tubería produce `DesignSystemAnalysis`; validate/inspect lo proyectan.
Sin Commander/Clack/TTY/consola/proceso hijo. Solo lectura. Tipos conceptuales (TS):

```ts
interface AnalyzeInput { readonly executionDir: string; }

interface AnalyzeDependencies {
  readonly resolver: HostRootResolver;          // 001, reusado
  readonly reader: ManagedDocumentReader;        // 002, lectura segura con límites
  readonly documentValidators: DocumentValidators; // 001, config/manifest (zod)
  readonly dtcgReadValidator: DtcgReadValidator;  // 002, tipos reconocidos + estructura genérica
  readonly limits: AnalysisLimits;                // 002, constantes (ADR-0009)
}

// Servicio interno compartido — una sola lectura/parseo/recorrido.
function analyzeExistingDesignSystem(
  input: AnalyzeInput, deps: AnalyzeDependencies,
): Promise<DesignSystemAnalysis>;

// Proyecciones (puras) sobre el análisis:
function toValidationReport(a: DesignSystemAnalysis): ValidationReport;
function toInspection(a: DesignSystemAnalysis): DesignSystemInspection;

// Casos de uso públicos:
function validateDesignSystem(input, deps): Promise<ValidationReport>;
function inspectDesignSystem(input, deps): Promise<DesignSystemInspection>;
```

## Garantías
- **Una sola pasada**: sin doble lectura/parseo/recorrido; validate e inspect comparten el mismo
  `DesignSystemAnalysis` ⇒ resultado semántico idéntico (SC-008).
- **Observacionalmente puro**: no escribe, no crea temporales en la raíz, no sigue symlinks externos,
  no ejecuta/evalúa contenido, sin red (FR-002/003/004).
- **Determinista**: mismas entradas → mismo análisis (orden de recorrido = inserción JSON).
- `validateDesignSystem`/`inspectDesignSystem` **no** conocen exit codes (los traduce la CLI).
