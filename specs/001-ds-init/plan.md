# Implementation Plan: Inicialización de un Design System local (ds-init)

**Branch**: `001-ds-init` | **Date**: 2026-06-25 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-ds-init/spec.md`

## Summary

Diseñar la arquitectura mínima para un comando `init` (experiencia futura `npx neuraz-ds init`)
que resuelve la raíz anfitriona autorizada, exige `package.json`, detecta inicializaciones
previas, solicita y valida los datos mínimos (nombre, slug, versión SemVer), muestra un plan,
pide confirmación, escribe de forma transaccional los archivos iniciales del Design System
(manifiesto + configuración del gestor + un documento DTCG mínimo válido), valida el resultado e
informa. Enfoque técnico: **un único paquete npm internamente modular**, **TypeScript estricto +
ESM**, dirigido a **Node LTS (>=22)**, con arquitectura por capas (Domain / Application /
Infrastructure / CLI) que mantiene el dominio agnóstico del CLI y del filesystem para que CLI,
Studio y MCP futuros llamen al mismo caso de uso. No se implementa código en esta fase.

## Technical Context

**Language/Version**: TypeScript 5.x (estricto), salida ESM. Runtime objetivo Node.js `>=22`
(Active LTS 24 / Maintenance LTS 22 vigentes en 2026-06).

**Primary Dependencies** (propuestas; decididas en ADR-005, justificadas en
[research.md](research.md)):
- CLI/comandos: **commander** (maduro, 0 deps, tipado, subcomandos para `validate`/`inspect`
  futuros). Alternativa evaluada: `cac`.
- Prompts interactivos: **@clack/prompts** (cancelación nativa, accesible).
- Validación de entrada/dominio: **zod**.
- Validación DTCG (JSON Schema 2020-12): **ajv**.
- SemVer: **semver**.
- Resolución de raíz/symlinks: **APIs nativas de Node** (`node:fs`, `node:path`) — sin dependencia.

**Storage**: Archivos locales versionables en la raíz anfitriona (fuente de verdad). Sin base de
datos (Constitución II/XIII).

**Testing**: **vitest** (v4). Unitarias + integración en directorios temporales aislados
(`fs.mkdtemp`) + pruebas de CLI por subproceso. Sin depender solo de snapshots de texto.

**Target Platform**: CLI multiplataforma (macOS, Linux, Windows) ejecutable vía binario declarado
en `package.json` (`bin`).

**Project Type**: CLI tool (single npm package, internamente modular).

**Performance Goals**: No crítico; `init` debe completarse en < 2 s en un proyecto típico
(excluyendo el tiempo de respuesta del usuario en prompts). Sin metas de throughput.

**Constraints**: Local-first, offline, sin servicios cloud ni permisos de administrador
(Constitución XIII/XIV). Escritura atómica/transaccional; nunca estado parcial. Nunca escribir
fuera de la raíz anfitriona resuelta.

**Scale/Scope**: Un (1) Design System por proyecto; un workspace por ejecución. Alcance acotado a
`init` (ver Out of Scope en la spec).

## Constitution Check

*GATE: Debe pasar antes de Phase 0 y re-evaluarse tras Phase 1.*

Evaluación contra los 17 principios de [constitution.md](../../.specify/memory/constitution.md):

| # | Principio | Estado | Cómo lo cumple el plan |
|---|---|---|---|
| I | Un DS por proyecto | PASS | `init` administra un único DS; un workspace por ejecución (FR-002, FR-001g). |
| II | Archivos como fuente de verdad | PASS | Solo escribe archivos versionables; sin DB (Storage). |
| III | DTCG canónico | PASS | Tokens en DTCG **2025.10**; extensiones futuras vía `$extensions` (research). |
| IV | Style Dictionary pipeline | PASS (prep) | No se genera nada; estructura separa fuente de futuros artefactos. SD no se instala. |
| V | Independencia de framework | PASS | Núcleo sin React/Astro/WP/etc.; agnóstico del proyecto anfitrión. |
| VI | Gestor ≠ Design System | PASS | El paquete es la herramienta; los archivos creados pertenecen al repo anfitrión. |
| VII | Edición sin ocultar fuente | PASS | `init` produce archivos legibles; muestra plan/ubicación antes de escribir. |
| VIII | Validación antes de generación | PASS | 3 capas; entrada y plan validados antes de escribir; validación posterior. |
| IX | Contratos antes que implementaciones | PASS | Esta fase define contratos/schemas; sin código ejecutable en datos. |
| X | Accesibilidad estructural | PASS (N/A activo) | `init` no crea componentes; prompts accesibles (@clack). |
| XI | Páginas como validación | PASS (N/A) | Fuera de alcance; no se crean páginas. |
| XII | Contenido como contexto opcional | PASS (N/A) | Fuera de alcance. |
| XIII | Local-first | PASS | Offline, sin cuenta cloud ni admin. |
| XIV | Seguridad en modificaciones | PASS | No ejecuta código de datos; no toca `package.json`/deps; no publica/commitea; escritura confirmada y reversible; rechazo de escapes/symlinks. |
| XV | Agentes controlados | PASS (prep) | Caso de uso `initializeDesignSystem` reutilizable por CLI/Studio/MCP; una sola fuente de verdad. |
| XVI | Cambios incrementales | PASS | Alcance mínimo, verificable, con criterios de aceptación y pruebas. |
| XVII | Portabilidad / sin lock-in | PASS | Archivos comprensibles sin el gestor; desinstalar no los destruye. |

**Prioridad de conflictos**: no se detectan conflictos entre principios. La escritura segura
prioriza integridad de archivos (1) y seguridad/reversibilidad (3) por encima de la experiencia de
edición (6), lo que es coherente con la jerarquía constitucional.

**Resultado del gate (pre-Phase 0): PASS.** Sin violaciones; _Complexity Tracking_ vacía.
**Re-evaluación post-Phase 1: PASS** (los contratos y el data-model no introdujeron desviaciones).

## Project Structure

### Documentation (this feature)

```text
specs/001-ds-init/
├── plan.md              # Este archivo
├── research.md          # Phase 0 — decisiones técnicas verificadas
├── data-model.md        # Phase 1 — entidades y reglas
├── quickstart.md        # Phase 1 — guía de validación end-to-end
├── contracts/           # Phase 1 — schemas y contratos preliminares
│   ├── neuraz-ds.config.schema.md
│   ├── design-system.manifest.schema.md
│   ├── dtcg-tokens.contract.md
│   ├── initialization-result.contract.md
│   └── exit-codes.md
└── checklists/
    └── requirements.md  # de /speckit-specify

docs/adr/                # ADR del proyecto (Constitución: registro obligatorio)
├── 0001-npm-project-requirement.md
├── 0002-host-root-resolution.md
├── 0003-design-system-identity.md
├── 0004-minimal-file-structure.md
└── 0005-cli-initial-stack.md
```

### Source Code (repository root — propuesto para implementación futura, NO creado aún)

```text
package.json             # name @neuraz/design-system-manager, type: module, bin: neuraz-ds
tsconfig.json            # strict, ESM (NodeNext)
src/
├── domain/              # Reglas puras; sin CLI ni filesystem
│   ├── identity/        # nombre, slug (regex + derivación), versión (SemVer)
│   ├── tokens/          # modelo del documento DTCG mínimo (sin I/O)
│   ├── plan/            # InitializationPlan (archivos a crear, conflictos)
│   └── validation/      # ValidationResult, reglas de dominio
├── application/         # Casos de uso + PUERTOS (interfaces)
│   ├── initialize-design-system.ts   # orquesta el flujo; depende de puertos
│   └── ports.ts                      # HostRootResolver, FileSystem, Prompter, Reporter
├── infrastructure/      # Adaptadores que implementan los puertos
│   ├── host-root/       # resolución de raíz anfitriona (Node fs/path), realpath, anti-escape
│   ├── fs/              # escritura transaccional (staging temp → commit atómico)
│   ├── prompts/         # adaptador @clack/prompts
│   ├── serialization/   # lectura/escritura JSON determinista
│   └── reporter/        # salida de terminal (info/warn/conflict/error/success)
├── schemas/             # zod (entrada/dominio) + JSON Schema (config/manifest/DTCG) para ajv
└── cli/                 # wiring commander; mapea resultado → exit code; sin reglas de negocio

tests/
├── unit/                # dominio + adaptadores aislados
├── integration/         # directorios temporales (13 escenarios de la spec)
└── cli/                 # ejecución del binario por subproceso
```

**Structure Decision**: **Un único paquete npm internamente modular** (no monorepo). Razón: esta
funcionalidad no requiere múltiples paquetes publicables; un monorepo añadiría complejidad
prematura (Constitución XVI). La separación por capas con **puertos en `application/`** permite
extraer en el futuro `@neuraz/ds-core` (domain+application) como paquete independiente sin
reescritura: bastaría mover `domain/` + `application/` y publicar, dejando `cli/`,
`infrastructure/` y futuros `studio/`/`mcp/` como consumidores. Ver ADR-004 y ADR-005.

## Flujo del comando `init` (10 pasos)

```text
1. Resolver raíz anfitriona (infra: host-root)         → falla → exit 5 (host inválido)
2. Verificar package.json en el límite                 → ausente → exit 5
3. Detectar inicialización previa (config/manifiesto)  → completa → status "unchanged" (exit 2)
4. Solicitar datos mínimos (prompts) [interactivo]     → cancelar → status "cancelled" (exit 1)
5. Validar nombre/slug/versión (domain + zod)          → inválido → exit 3
6. Construir InitializationPlan + detectar conflictos  → conflicto → status "conflict" (exit 4)
7. Mostrar plan + ubicación; pedir confirmación        → no → status "cancelled" (exit 1)
8. Escritura transaccional (staging temp → commit)     → fallo → rollback → exit 6/7
9. Validación posterior (relee y valida DTCG/manifest/config)
10. Reporte final (archivos creados, fuente canónica, siguiente paso) → exit 0
```

La escritura segura se detalla en [research.md](research.md) (§ Escritura segura) y el modelo de
resultado en [contracts/initialization-result.contract.md](contracts/initialization-result.contract.md).

## Complexity Tracking

> Sin violaciones de la constitución. Tabla vacía intencionalmente.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
