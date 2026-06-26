# Contract — DesignSystemInspection (002, ADR-0007)

Vista descriptiva del análisis común, con **confiabilidad por sección/valor**. Incluye la validación.

```ts
type Trust = "valid" | "recovered" | "untrusted" | "unavailable";
interface InspectedValue<T> { readonly value?: T; readonly trust: Trust; }
interface FileInspection { readonly relativePath: string; readonly kind: ManagedFileKind;
  readonly sizeBytes?: number; readonly readable: boolean; }

interface TokenNodeSummary {
  readonly path: string;                 // ruta canónica (orden inserción JSON)
  readonly declaredType: string | null;
  readonly effectiveType: string | null; // precedencia C1: declarado → alias → grupo; null si indeterminable
  readonly typeOrigin: "own" | "alias" | "group" | "none";
  readonly typeSourcePath: string | null; // ruta del grupo fuente si typeOrigin === "group"; si no, null
  readonly kind: "concrete" | "alias";
  readonly aliasTarget: string | null;
  readonly aliasState: "valid" | "missing" | "to-group" | "cyclic" | "malformed" | "n/a";
  readonly description: string | null;
  readonly depth: number;
  readonly trust: "valid" | "recovered" | "untrusted";
}

interface DesignSystemInspection {
  readonly host: { readonly root: string; readonly designSystemPath: string | null };
  readonly structuralState: "not-initialized" | "partial" | "complete-invalid" | "complete-valid";
  readonly identity?: {
    readonly name?: InspectedValue<string>; readonly slug?: InspectedValue<string>;
    readonly version?: InspectedValue<string>; readonly description?: InspectedValue<string>;
  };
  readonly schemaVersions?: {
    readonly config?: InspectedValue<string>; readonly manifest?: InspectedValue<string>;
    readonly formatVersion?: InspectedValue<string>;
  };
  readonly files: { readonly expected: readonly string[];
    readonly present: readonly FileInspection[]; readonly missing: readonly string[] };
  readonly tokens?: {
    readonly total: number; readonly groups: number; readonly concreteValues: number;
    readonly aliases: number; readonly byType: Readonly<Record<string, number>>;
    readonly paths: readonly TokenNodeSummary[]; readonly maxDepth: number;
  };
  readonly validation: ValidationReport;     // inspect INCLUYE la validación, no la sustituye
  readonly limits: AnalysisLimitsResult;
}
```

## Reglas
- Distingue **presente / válido / recuperado / no confiable / no disponible** (vía `trust`).
- En `complete-invalid`/`partial`, los datos recuperados se entregan marcados; nunca un dato
  parcialmente incorrecto se presenta como confiable.
- `byType` usa el **tipo efectivo**; tipos no reconocidos cuentan bajo su literal con `trust:untrusted`;
  tokens sin tipo determinable bajo la categoría explícita `"(untyped)"`.
- `inspect` **no** infiere componentes/patrones/páginas/estilos; **no** resuelve colores a CSS; **no**
  genera artefactos; **no** modifica archivos.
- Mínimo necesario: la confiabilidad se marca por sección/valor, sin envolver cada primitivo si una
  marca por sección basta.

## Límite de análisis vs límite de presentación (C2)
- El **modelo** (`DesignSystemInspection.tokens.paths`) conserva **todos** los nodos admitidos por los
  límites de análisis (ADR-0009). El modelo headless **no** se ve afectado por ninguna cota de salida.
- La constante **`MAX_INSPECT_TERMINAL_TOKEN_ROWS = 200`** pertenece **únicamente** al reporter textual
  de CLI: limita cuántas filas de tokens/rutas se imprimen. NO altera estadísticas, `valid`,
  errors/warnings, exit codes, ni marca la inspección como parcial.
- Con > 200 tokens, el reporter imprime las **primeras 200** en el orden determinista de ADR-0010 y un
  aviso explícito de cuántas se muestran y cuántas se omiten (no truncado silencioso).
