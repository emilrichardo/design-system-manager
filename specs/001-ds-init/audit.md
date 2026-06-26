# Auditoría de cierre — 001-ds-init

Fecha: 2026-06-26 · Feature: Inicialización de un Design System local (`init`).
Resultado: **APROBADA**. typecheck OK · arch-guard OK · 270+ tests verdes · build OK.

## 1. Auditoría arquitectónica (capas)

Verificada por `scripts/arch-guard.mjs` (`npm run lint`) y `tests/unit/architecture-guard.test.ts`.

| Regla | Estado |
|---|---|
| `domain` sin Node / fs / path | ✅ |
| `domain` sin Zod / AJV | ✅ (solo `semver`, permitido por ADR-0005) |
| `domain` sin Commander / Clack / console / process.exit | ✅ |
| `application` sin Commander / Clack | ✅ |
| `application` sin infraestructura concreta (usa puertos) | ✅ |
| `application` sin `node:fs` / `node:path` / console / process.exit | ✅ |
| `infrastructure` sin Commander (solo CLI) y sin process.exit | ✅ |
| Commander únicamente en `src/cli/` | ✅ |
| Clack únicamente en el adapter autorizado `src/infrastructure/prompts/clack-prompter.ts` | ✅ |
| Exit codes únicamente en `src/cli/exit-codes.ts` | ✅ |
| `process.exitCode` solo en el entrypoint `src/cli/index.ts` | ✅ |
| Sin código TUI / web / MCP | ✅ |

## 2. Constitution Check (17 principios)

| # | Principio | Estado | Evidencia |
|---|---|---|---|
| I | Un DS por proyecto | ✅ | FR-002; un workspace por ejecución; tests monorepo |
| II | Archivos como fuente de verdad | ✅ | solo escribe archivos; sin DB |
| III | DTCG canónico | ✅ | DTCG 2025.10; color objeto sRGB; alias; sin formato propietario |
| IV | Style Dictionary diferido y compatible | ✅ | no instalado; fuente separada de artefactos |
| V | Independencia de framework | ✅ | núcleo sin framework; arch-guard |
| VI | Gestor ≠ Design System | ✅ | el paquete es herramienta; archivos en el anfitrión |
| VII | Edición transparente a la fuente | ✅ | plan/raíz mostrados; archivos JSON legibles |
| VIII | Validación antes de generación/escritura | ✅ | validate-plan + staged + post-verify |
| IX | Contratos antes que implementación | ✅ | contracts/ + schemas |
| X | Accesibilidad estructural | ✅ (N/A activo) | init no crea componentes |
| XI | Páginas como validación futura | ✅ (N/A) | fuera de alcance |
| XII | Contenido opcional | ✅ (N/A) | fuera de alcance |
| XIII | Local-first | ✅ | offline; sin cuenta cloud; sin red |
| XIV | Modificaciones seguras | ✅ | transaccional + rollback; no toca package.json; no publish/commit; anti-escape |
| XV | Integración de agentes controlada | ✅ (prep) | núcleo headless reutilizable; tests T066 |
| XVI | Incrementalidad | ✅ | solo `init`; entregado por fases verificables |
| XVII | Portabilidad / no lock-in | ✅ | archivos válidos sin el gestor; test portability |

**Nota TUI futura:** la arquitectura headless (puertos `Prompter`/`Reporter`, resultado
estructurado, sin exit codes en aplicación) **habilita** añadir más adelante una TUI / viewer /
Studio / MCP sin reescribir dominio/aplicación. No se implementa en esta versión.

## 3. Matriz final de trazabilidad (US → FR → SC → tareas → pruebas)

| Historia | FR | SC | Tareas | Pruebas representativas |
|---|---|---|---|---|
| **US1** Inicializar | FR-001/001a–g, 003, 006–018, 033–035 | SC-001,002,007 | T008–T018, T022–T030, T031–T046 | happy-root, state-none, exit-matrix, packaging-npx |
| **US2** No sobrescribir | FR-005,010,011,026 | SC-004 | T014,T019,T032,T030b,T038,T053–T055 | state-partial, detect-conflicts, external-symlink, transaction-failures |
| **US3** Idempotencia | FR-004,020,021 | — | T013,T021,T030b,T038,T039,T052,T059 | state-complete-valid, second-run, idempotent-second-run |
| **US4** Portabilidad | FR-023,024 | SC-005 | T035,T040,T060 | portability |
| **US5** Atomicidad | FR-008,017,022 | SC-006 | T014,T030,T033,T034,T045,T056,T058 | transactional-writer, verify-persisted, transaction-failures, no-write-permission |

**Cobertura:** 5/5 historias · 44/44 FR · 7/7 SC · 67/67 tareas (T001–T066 + T030b).
Códigos de salida 0–7: todos probados (`tests/cli/exit-matrix.test.ts` + integración).
Estados previos (none/complete-valid/partial/complete-invalid): todos probados.
Seguridad de rutas, escritura transaccional, CLI, empaquetado y headless: probados.

## 4. Desviaciones documentadas

- **T055 (escape/symlink)**: el resultado seguro real es `conflict` (4) si una ruta administrada es
  un symlink, o `failed/filesystem` (6) si `design-system` es un symlink externo — nunca se sigue
  el enlace ni se modifica el destino externo. `exit 5` (`host`) corresponde al resolver (sin
  `package.json`). `TransactionResult` no expresa la categoría "host".
- **Error interno de frontera CLI** → código no contractual **70** (documentado en exit-codes.ts).
- **JSON Schemas** como objetos TS (no `.json`) y **serialización** en infraestructura: build
  autosuficiente sin copia de assets.

## 5. Deuda técnica

- `init` interactivo requiere TTY; no hay modo no interactivo (fuera de alcance). Una invocación
  con stdin cerrado/no-TTY produce el código 13 de Node (top-level await pendiente), no contractual.
- Pruebas de symlink/permisos se omiten por capacidad del entorno (Windows/root) con `skipIf`.
