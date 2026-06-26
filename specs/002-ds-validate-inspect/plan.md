# Implementation Plan: Validación e inspección de un Design System existente (ds-validate-inspect)

**Branch**: `002-ds-validate-inspect` | **Date**: 2026-06-26 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-ds-validate-inspect/spec.md`

## Summary

Añadir dos comandos **de solo lectura** —`neuraz-ds validate` y `neuraz-ds inspect`— sobre un Design
System existente, **reutilizando** toda la infraestructura de `001` (resolución de raíz anfitriona,
path-guard, presencia, validadores zod/ajv, aliases/ciclos, `Issue`/`ValidationResult`, `Reporter`,
composición headless, CLI Commander). El núcleo es una **única tubería de análisis**
`analyzeExistingDesignSystem` (resolve → presencia → lectura segura con límites → parseo → validación
→ recorrido del árbol DTCG con índice → análisis estructurado) de la que se **derivan** dos vistas:
`ValidationReport` (orientada a validez) y `DesignSystemInspection` (descriptiva, con marcas de
confiabilidad). Ambos comandos son **observacionalmente puros** (no escriben, no crean temporales,
no siguen symlinks externos, no ejecutan contenido, sin red). No se implementa código en esta fase.

## Technical Context

**Language/Version**: TypeScript 5.x estricto, ESM (NodeNext), Node `>=22` (sin cambios respecto a 001).

**Primary Dependencies**: las ya presentes (zod, ajv, semver, commander); **sin dependencias nuevas**.
Clack no participa (ambos comandos son no interactivos).

**Storage**: solo lectura de archivos locales del DS dentro de la raíz anfitriona.

**Testing**: vitest — unit (dominio/recorrido), integración (FS real en temp dirs), CLI (runner +
proceso hijo), y **regresión completa de `001`**.

**Target Platform**: CLI multiplataforma; núcleo headless reutilizable por TUI/Studio/MCP futuros.

**Project Type**: CLI tool (single package, modular por capas).

**Performance Goals**: recorrido **lineal** O(nodos + aliases); una sola lectura/parseo/recorrido por
documento; índice `tokenPath → token` en una pasada para validar aliases sin recorridos cuadráticos.

**Constraints**: pureza observacional; límites internos de lectura/recorrido (ADR-0009); sin escritura;
sin `--json` (diferido pero habilitado por modelos estructurados).

**Scale/Scope**: dos comandos; un DS por proyecto; subconjunto DTCG 2025.10 reconocido (13 tipos),
con análisis profundo solo de `color` (lo que hoy soporta el núcleo).

## Constitution Check

*GATE: pasa antes de Phase 0 y se re-evalúa tras Phase 1.*

| # | Principio | Estado | Cómo lo cumple |
|---|---|---|---|
| I | Un DS por proyecto | PASS | opera sobre el único DS de la raíz resuelta |
| II | Archivos fuente de verdad | PASS | **solo lectura**; nunca una DB |
| III | DTCG canónico | PASS | valida contra DTCG 2025.10; no inventa formato |
| IV | Style Dictionary diferido | PASS (N/A) | no genera artefactos |
| V | Independencia de framework | PASS | núcleo sin framework; DTCG estándar |
| VI | Gestor ≠ DS | PASS | inspecciona/valida; no se mezcla con el DS |
| VII | Edición transparente | PASS (N/A) | no edita; expone el contenido real |
| VIII | Validación antes de generación | PASS | la feature **es** validación/inspección |
| IX | Contratos antes que implementación | PASS | esta fase define contratos/ADR |
| X | Accesibilidad estructural | PASS (N/A) | no crea componentes/UI |
| XI | Páginas como validación | PASS (N/A) | fuera de alcance |
| XII | Contenido opcional | PASS (N/A) | fuera de alcance |
| XIII | Local-first | PASS | offline; sin red ni cuenta |
| XIV | Seguridad | PASS | solo lectura, observacionalmente puro, path-guard, sin ejecutar contenido, límites |
| XV | Integraciones desacopladas | PASS | casos de uso headless; modelos consumibles por TUI/Studio/MCP |
| XVI | Incrementalidad | PASS | solo validate/inspect; sin escritura |
| XVII | Portabilidad / no lock-in | PASS | modelo de inspección no obligatorio; DS legible sin el gestor |

**Notas explícitas**: ambos comandos son **de solo lectura**; la futura **TUI es presentación
opcional** que consumirá los mismos modelos; **no hay lock-in** al modelo de inspección textual (es
una representación, no la fuente de verdad). **Gate: PASS** (pre-Phase 0 y post-Phase 1).

## Matriz de reutilización de `001` (reusar / extender / generalizar / crear)

| Capacidad (001) | Acción | Nota |
|---|---|---|
| `resolveHostRoot`, raíz Git, workspace más cercano | **Reusar sin cambios** | resolución idéntica |
| `path-guard` (assertWithinRoot, realpath, anti-escape) | **Reusar sin cambios** | seguridad de rutas |
| `inspect-presence` (presencia/tipos) | **Reusar sin cambios** | alimenta el estado estructural |
| `classify-state` (none/partial/complete-valid/invalid) | **Reusar** (lectura) | 002 reusa su criterio de estado; la validación detallada la produce la nueva tubería |
| `Issue`, `ValidationResult` | **Reusar** | + nuevos códigos estables (ADR-0008) |
| schema config / manifest + zod `documentValidators` | **Reusar sin cambios** | validación de config/manifiesto |
| reglas slug / SemVer / identidad | **Reusar sin cambios** | dominio |
| `dtcg-validator` (alias/refs/ciclos) | **Reusar utilidades** | comprobación de referencias/ciclos compartida |
| **schema DTCG estricto de `001`** (`dtcg.schema` solo `color`) | **NO cambiar** | sigue restringiendo lo que `init` **genera** |
| validación DTCG de **lectura** (todos los tipos reconocidos) | **Crear/Generalizar** | nuevo validador de lectura 002 (estructura genérica + tipos reconocidos), separado del schema de generación |
| `FileSystem` port (lstatKind/readFile/realpath) | **Extender mínimamente** | añadir `byteSize` (stat de tamaño previo a leer) — aditivo, 001 intacto |
| `Reporter` port | **Reusar el patrón** | nuevos reporters de presentación (validate/inspect) |
| CLI Commander / `runCli` / programa | **Extender** | registrar `validate` e `inspect`; sin tocar `init` |
| `exit-codes.ts` de `001` | **Generalizar** | tabla común; añadir mapeos validate/inspect **sin** cambiar los de init (ADR-0006) |
| Composición headless / adapters en memoria de tests | **Reusar/extender** | nuevas deps de validate/inspect |

> Garantía: **`init` no empieza a generar nuevos `$type`**; su schema de generación permanece
> `color`-only. La ampliación de tipos vive solo en el **validador de lectura** de 002 (regresión
> probada).

## Project Structure

### Documentation (this feature)

```text
specs/002-ds-validate-inspect/
├── plan.md            # este archivo
├── research.md        # DTCG 2025.10, límites, decisiones (Phase 0)
├── data-model.md      # entidades de análisis/inspección/validación (Phase 1)
├── quickstart.md      # guía de validación e2e (Phase 1)
├── contracts/         # contratos preliminares (Phase 1)
│   ├── analysis-pipeline.contract.md
│   ├── validation-report.contract.md
│   ├── design-system-inspection.contract.md
│   ├── exit-codes-common.contract.md
│   └── managed-document-reader.contract.md
└── checklists/requirements.md

docs/adr/
├── 0006-common-exit-codes.md
├── 0007-inspection-model.md
├── 0008-error-warning-and-type-policy.md
├── 0009-safe-read-and-traversal-limits.md
└── 0010-dtcg-traversal-strategy.md
```

### Source Code (extensión propuesta — NO creada aún)

```text
src/
├── domain/
│   ├── analysis/
│   │   ├── design-system-analysis.ts   # modelo interno común (puro)
│   │   ├── validation-report.ts        # vista de validez
│   │   ├── design-system-inspection.ts # vista descriptiva + InspectedValue/confiabilidad
│   │   ├── token-node-summary.ts       # resumen por token
│   │   └── inspection-statistics.ts    # conteos (grupos/tokens/aliases/byType/maxDepth)
│   ├── traversal/
│   │   ├── token-path.ts               # ruta canónica
│   │   ├── effective-type.ts           # herencia de $type (own → ref → grupo → error)
│   │   └── limits.ts                    # límites conceptuales + LimitsResult
│   └── dtcg/recognized-types.ts        # conjunto reconocido DTCG 2025.10 + cuáles son "profundos"
├── application/
│   ├── ports.ts                        # + ManagedDocumentReader, validadores de lectura, reporters
│   ├── analyze-design-system.ts        # tubería común (orquesta puertos)
│   ├── validate-design-system.ts       # deriva ValidationReport
│   └── inspect-design-system.ts        # deriva DesignSystemInspection
├── infrastructure/
│   ├── analysis/
│   │   ├── managed-document-reader.ts  # lectura segura con límites (node:fs)
│   │   ├── dtcg-read-validator.ts      # validación de lectura (tipos reconocidos, genérico)
│   │   └── traverse-dtcg-tree.ts       # recorrido iterativo + índice
│   └── reporter/
│       ├── validate-terminal-reporter.ts
│       └── inspect-terminal-reporter.ts
└── cli/
    ├── exit-codes.ts                   # generalizado a tabla común (validate/inspect)
    └── commands/{validate,inspect}.ts
```

**Structure Decision**: extensión **mínima** del paquete único existente, conservando
`domain → application → infrastructure → cli`. La tubería común evita doble lectura/parseo/recorrido
y garantiza que validate e inspect **no diverjan**.

## Tubería común de análisis

```text
analyzeExistingDesignSystem(input, deps) → DesignSystemAnalysis
  resolve (host)            → si falla: host → exit 5
  inspect presence          → estado estructural preliminar (reusa 001)
  read authorized docs      → ManagedDocumentReader con límites (stat size → read UTF-8); rechaza symlink externo
  parse (JSON.parse seguro) → por documento; marca confiabilidad
  validate                  → config/manifest (zod 001) + DTCG read-validator (tipos reconocidos)
  analyze token tree        → traverse-dtcg-tree: índice tokenPath→token, stats, aliases/ciclos, effective-type
  coherence                 → designSystemDir ↔ manifiesto/tokensDir
  → DesignSystemAnalysis (host, presence, structuralState, parsedDocs+trust, errors, warnings,
                          nodes, statistics, limitsResult, valid)
validateDesignSystem  → proyecta a ValidationReport
inspectDesignSystem   → proyecta a DesignSystemInspection (incluye validation)
```

Una sola pasada de lectura/parseo/recorrido; `validate` e `inspect` comparten el mismo
`DesignSystemAnalysis` → **mismo resultado semántico** (SC-008).

## Decisiones (registradas como ADR)

- **ADR-0006 Exit codes comunes**: tabla única 0–7 + 70; `2` sigue siendo `unchanged` (init).
  validate/inspect: 0/3/4/5/6 (inspect entrega informe en 3/4). No reasigna `2`.
- **ADR-0007 Modelo de inspección**: `DesignSystemInspection` con confiabilidad por sección
  (`InspectedValue<T>` / `FileInspection` / `untrusted`); estados presente/válido/recuperado/no
  confiable/no disponible. Mínimo necesario.
- **ADR-0008 Política error/warning + `$type`**: tipo reconocido-no-profundo → warning
  (`dtcg-type-not-deeply-inspected`, válido); tipo no reconocido → error; sin tipo propio ni heredado
  → error; `$description` ausente → warning; grupo vacío → warning; `$extensions` no valida tipos.
- **ADR-0009 Límites seguros**: tamaño/archivo 5 MiB, total 16 MiB, profundidad 32, nodos 100 000,
  ruta 512, alias 256, issues 1 000 (justificados en research). Límite duro → error + análisis parcial
  marcado + DS no validado completamente (inválido); inspect entrega lo recuperado.
- **ADR-0010 Recorrido DTCG**: iterativo con stack explícito; orden = inserción JSON (determinista);
  índice `tokenPath→token` en una pasada; detección grupo/token/alias; herencia de `$type`; O(n).

## Estrategia de pruebas (resumen)

- **Unit**: effective-type (herencia/origen), token-path, profundidad, detección grupo/token/alias,
  conteos/byType (incl. categoría `(untyped)`/no reconocido), warnings, no-confiables, límites,
  determinismo, proyección a ValidationReport/Inspection, mapeo de exit codes.
- **Integración (FS real)**: DS válido de `init`; no-inicializado; parcial; completo-inválido; JSON
  roto; config/manifest/DTCG inválidos; alias roto/a-grupo/ciclos; tipo reconocido-no-profundo; tipo
  desconocido; tipo heredado; archivo grande; árbol profundo; límite de nodos; archivo eliminado
  durante lectura; symlink externo; permisos; subcarpeta; monorepo; sin Git; **pureza observacional**
  (snapshot antes/después: bytes/mtime/permisos/listado); validate→inspect sin cambios; inspect→validate
  mismo resultado semántico.
- **CLI**: ayuda; comandos registrados; sin prompts; stdout/stderr; exit codes; proceso hijo; CI sin
  TTY; CLI ≡ núcleo.
- **Regresión 001**: suite completa de `init` verde; el documento de `init` valida e inspecciona OK;
  los exit codes de `init` no cambian; ampliar el DTCG read-validator **no** altera la salida de `init`.

## Complexity Tracking

> Sin violaciones de la constitución. Tabla vacía.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
