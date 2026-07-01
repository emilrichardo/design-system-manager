---
description: "Task list for 011-complete-design-system-foundation-branding-and-presets"
---

# Tasks: Complete Design System Foundation, Branding and Presets

**Input**: `spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Cada checkpoint incluye tests (unit + integración + CLI, mismo patrón `vitest` que
`001`–`010`); no son opcionales aquí porque el propio brief exige "consistencia" y "0 warnings genéricos"
verificables.

**Organization**: 6 checkpoints amplios (A–F, mandato explícito del brief §24), agrupados en 3 lotes.
Ninguna tarea implementa código en esta ejecución de `011` — este documento es el plan de ejecución para
la implementación que sigue.

## Lote 1: Checkpoints A–B

---

### Checkpoint A — Modelo completo, branding, capas y contratos (fundacional, bloqueante)

**Goal**: Existen en código los tipos/contratos de `data-model.md` y `contracts/` — sin UI, sin CLI
nuevo todavía. Todo lo demás depende de esto.

- [ ] T001 Crear `src/domain/brand/` con `BrandProfileV1`, `BrandAudienceV1`, `BrandPersonalityV1`,
  `BrandPrincipleV1`, `BrandVoiceV1`, `BrandToneDimensionV1`, `BrandVisualLanguageV1`,
  `BrandAssetReferenceV1`, `BrandUsageRuleV1`, `BrandEvidenceV1` — dominio puro, sin `node:fs`, según
  `data-model.md`.
- [ ] T002 [P] Crear `src/domain/token-mutations/token-layer.ts` con `TokenLayerV1`/`TokenProvenanceV1` y
  las reglas R1–R5 de `contracts/token-layer-policy.md` como funciones puras de validación.
- [ ] T003 [P] Extender `src/domain/dtcg/recognized-types.ts` y crear `src/domain/dtcg/types/` con un
  módulo por tipo (parser/validación/normalización) para los 12 tipos que faltan según
  `contracts/dtcg-type-support.md`, reutilizando (no reimplementando) la forma ya escrita en
  `css-renderer.ts`.
- [ ] T004 [P] Crear `src/domain/brand/candidate.ts` con `CandidateV1` (contrato puro, sin productor) y
  su invariante de aprobación explícita.
- [ ] T005 Tests unitarios de dominio para T001–T004 (`tests/domain/brand/**`,
  `tests/domain/token-mutations/token-layer.test.ts`, `tests/domain/dtcg/types/**`) — cubrir cada regla
  R1–R5 y cada tipo de `dtcg-type-support.md` con casos válidos e inválidos.

**Checkpoint**: Tipos y reglas de dominio compilan, están cubiertos por tests, y no dependen de
filesystem/CLI. Nada de esto es visible aún para un usuario.

---

### Checkpoint B — `web-complete`, branding base y packs

**Goal**: El preset `web-complete` y el pack `commerce` existen en el catálogo empaquetado y son
aplicables vía el motor de `005-presets` sin modificarlo.

- [ ] T006 Crear el catálogo empaquetado `presets/web-complete/` (mismo formato que `presets/neutral-base/`
  de `005`) con foundations completas + roles semánticos + catálogo mínimo de component tokens, según
  `contracts/preset-web-complete.md`.
- [ ] T007 [P] Crear `design-system/brand/` placeholders dentro del preset `web-complete` (brand.json,
  voice-and-tone.json, visual-language.json, usage-guidelines.json vacíos válidos, `status:
  "placeholder"`).
- [ ] T008 [P] Crear el pack `presets/packs/commerce/` con los component tokens de comercio listados en
  `contracts/preset-web-complete.md`, con `basePresetId: "web-complete"`.
- [ ] T009 Extender `src/infrastructure/presets/preset-token-analyzer.ts` y el comando `presets` para
  reconocer `packs apply/plan <id>` reutilizando el mismo merge add-only/atómico de `005` (sin
  reescribir el writer transaccional).
- [ ] T010 Tests de integración: aplicar `web-complete` sobre un Design System vacío y verificar `SC-001`
  (`0 unclassified/unresolved-alias/broken-alias/unknown-type/dtcg-type-not-deeply-inspected`); aplicar
  `commerce` sobre `web-complete` y verificar add-only + idempotencia (`tests/integration/presets/
  web-complete.test.ts`, `tests/integration/presets/packs-commerce.test.ts`).
- [ ] T011 Test de regresión: `neutral-base` sigue aplicando exactamente igual que antes de `011`
  (`tests/integration/presets/neutral-base-regression.test.ts`).

**Checkpoint**: `npx neuraz-ds presets apply web-complete` y `npx neuraz-ds packs apply commerce`
funcionan de punta a punta sobre un Design System real, con los quality gates de `SC-001` verificados.

---

## Lote 2: Checkpoints C–D

---

### Checkpoint C — Validación profunda, aliases y composición de presets

**Goal**: `validate`/`inspect`/`foundations` usan los parsers de T003 para los 13 tipos, aplican la
política de capas de T002, y detectan issues de referencia entre brand y assets.

- [ ] T012 Conectar `src/infrastructure/analysis/dtcg-read-validator.ts` (`traverseDtcgTree`) a los
  parsers de T003 — eliminar `dtcg-type-not-deeply-inspected` para los 13 tipos y emitir los códigos de
  error específicos de `contracts/dtcg-type-support.md`.
- [ ] T013 [P] Aplicar la política de capas (T002) dentro de `foundations` (`004`) — nuevo warning
  `token-layer-unclassified`, `component-token-bypasses-semantic`, `brand-token-bypasses-semantic`, sin
  romper la clasificación `primitive/semantic` existente.
- [ ] T014 [P] Crear `src/application/brand/validate-brand.ts`: valida referencias
  `BrandAssetReferenceV1.logicalPath` contra `assets.json` real de `007` (código
  `brand-asset-reference-missing` cuando no existe), sin leer/escribir tokens ni assets.
- [ ] T015 Tests de regresión de compatibilidad: un Design System `001`–`010` sin `brand/` y sin metadata
  de capa sigue reportando exactamente los mismos issues que antes de `011`
  (`tests/integration/compat/legacy-token-only.test.ts`, cubre `FR-017`/`SC-003`).
- [ ] T016 Tests de los nuevos códigos de issue (T012–T014) con casos válidos/inválidos por tipo y por
  regla de capa (`tests/application/brand/validate-brand.test.ts`,
  `tests/infrastructure/analysis/dtcg-deep-types.test.ts`).

**Checkpoint**: `neuraz-ds validate --json` sobre un Design System con los 13 tipos y metadata de capa
completa devuelve `0` warnings genéricos y los issues específicos correctos; un Design System legado
(`001`–`010`) no cambia su resultado.

---

### Checkpoint D — Build, export, brand storage y font matching

**Goal**: El writer transaccional de `brand/**` existe; `build`/`export` incluyen la proyección segura
de brand documentation; el matching de fuentes (contracts/typography-projection.md) está corregido.

- [ ] T017 Crear `src/infrastructure/brand/brand-writer.ts` — mismo patrón transaccional (staging,
  verificación, backup, recovery) que `src/infrastructure/token-mutations/token-source-writer.ts`, pero
  para los 4 archivos de `design-system/brand/**` (JSON + Markdown narrativo donde corresponda).
- [ ] T018 [P] Crear `src/application/brand/plan-brand-mutation.ts` y `apply-brand-mutation.ts` — caso de
  uso propio de plan/diff/apply para narrativa de marca (nunca reutiliza
  `TokenMutationCommandV1`/`applyTokenMutation` de `008` para contenido no-token, per `FR-015`).
- [ ] T019 [P] Extender `src/infrastructure/build-export/` para publicar `brand.json` (proyección segura,
  no toda la narrativa a CSS) como artefacto adicional del build, sin cambiar el contrato de
  `tokens.css`/`tokens.resolved.json`/`tokens.ts`/`manifest.json` (`FR-018`).
- [ ] T020 Corregir `src/application/viewer/typography.ts` y `renderTypography` (`main.ts`) según
  `contracts/typography-projection.md`: discriminar por `kind`, calcular `FontAssetMatchV1` solo para
  `font-family`/`typography-composite`, eliminar `family=(none)`/`license=no-matching-asset` en
  `dimension`.
- [ ] T021 Tests de integración: plan/apply/idempotencia/recovery del writer de brand
  (`tests/integration/brand/brand-writer.test.ts`, espejo de
  `tests/integration/token-mutations/*-idempotency.test.ts`); build incluye `brand.json` cuando
  `brand/` existe y lo omite (sin error) cuando `brand: absent` (`tests/integration/build-export/
  brand-artifact.test.ts`); proyección de tipografía corregida
  (`tests/application/viewer/typography-projection.test.ts`).

**Checkpoint**: Editar brand narrativo vía el caso de uso headless escribe transaccionalmente; `build`
incluye brand cuando existe; la vista de tipografía del Viewer ya no muestra campos engañosos en tokens
`dimension`.

---

## Lote 3: Checkpoints E–F

---

### Checkpoint E — Viewer, Editor y quality summary

**Goal**: Las 3 vistas nuevas (`brand`, `components`, `quality`) y la edición de brand/component tokens
funcionan de punta a punta sobre el shell existente de `009`/`010`, sin reescritura.

- [ ] T022 Añadir proyección `brand` al Viewer (`src/application/viewer/brand.ts` +
  `src/infrastructure/viewer/ui/`): identidad, purpose, values, personality, voice, tone, visual
  language, logos, fonts, colores de marca, imagery guidance, missing assets, provenance, confidence,
  completion status — todo derivado de `BrandProfileV1`/`BrandVisualLanguageV1`/`BrandQualitySummaryV1`
  ya calculados, sin lógica nueva en la capa HTTP/UI.
- [ ] T023 [P] Añadir proyección `components` al Viewer: agrupación por
  component/part/variant/state/size con matrices `variant × state`, `size × variant`, `part ×
  property` cuando aplique (`ComponentTokenGroupV1` de `data-model.md`).
- [ ] T024 [P] Añadir proyección `quality` al Viewer: brand completeness, asset completeness, cobertura
  primitive/semantic/component, tokens sin clasificar, aliases rotos, referencias directas a primitive
  (bypass de semantic), cobertura de validación de tipos, font matching, licencias faltantes,
  completitud de provenance.
- [ ] T025 Extender el Editor (`010`) con formularios de brand profile/principios/voice-and-tone/
  visual-language (usa T018, plan→diff→aprobación→apply propio) y de component tokens (usa `008`
  existente sin cambios, solo nuevos campos de metadata de capa en el formulario).
- [ ] T026 Tests de accesibilidad y de contrato de las 3 vistas + Editor extendido
  (`tests/infrastructure/viewer/brand-view.test.ts`,
  `tests/infrastructure/viewer/components-view.test.ts`,
  `tests/infrastructure/viewer/quality-view.test.ts`, `tests/application/editor/brand-editing.test.ts`)
  — mismo nivel de exigencia de accesibilidad que `009`/`010` (teclado completo, foco visible, landmarks,
  nunca solo color).

**Checkpoint**: `neuraz-ds view` muestra `brand`/`components`/`quality` con datos reales; el modo editor
permite completar brand y editar component tokens con el mismo boundary de aprobación que `010`.

---

### Checkpoint F — Migración, empaquetado, regresión y cierre

**Goal**: Compatibilidad hacia atrás verificada exhaustivamente, `AGENTS.md`/docs actualizados,
`agent:status`/`agent:verify`/`agent:finalize` en verde.

- [ ] T027 Ejecutar y corregir hasta verde: `npm run typecheck`, `npm run lint` (arch-guard), `npm test`,
  `npm run build` sobre todo lo añadido en A–E.
- [ ] T028 [P] Test de migración explícito: tomar los fixtures reales de `001`–`010` (o snapshots
  equivalentes) sin `brand/` y sin metadata de capa, correr toda la suite de `011` encima, y verificar
  `0` diferencias de comportamiento observable (`tests/integration/compat/full-migration.test.ts`).
- [ ] T029 [P] Actualizar `AGENTS.md` con el protocolo de intake de marca (FR-020) y el estado real de
  `011` (reemplaza cualquier referencia obsoleta a `010` como no-implementada).
- [ ] T030 Ejecutar `npm run agent:verify -- --feature 011-complete-design-system-foundation-branding-and-presets`
  y `npm run agent:finalize -- --feature 011-complete-design-system-foundation-branding-and-presets`;
  corregir cualquier hallazgo Critical/High/Medium antes de cerrar.

**Checkpoint**: Feature `011` cerrada — `agent:status` reporta `completed`, working tree limpio, sin
regresión sobre `001`–`010`.

---

## Dependencies & Execution Order

- **Lote 1 (A→B)**: A es estrictamente bloqueante de B (B usa los tipos de dominio de A). Dentro de A,
  T001–T004 son paralelos entre sí; T005 depende de todos.
- **Lote 2 (C→D)**: depende de Lote 1 completo (C usa el catálogo `web-complete` de B para sus tests de
  integración; D usa T001 de A para el writer de brand). C y D pueden avanzar en paralelo entre sí una
  vez cerrado Lote 1, pero ambos requieren A+B.
- **Lote 3 (E→F)**: E depende de C+D (las vistas proyectan datos que C/D ya calculan/persisten). F
  depende de A–E completos (es el cierre).

## Notes

- Ningún checkpoint introduce una segunda implementación de lógica ya cerrada en `001`–`010` — todas las
  tareas son "extender" o "conectar", nunca "reemplazar" (guardrail 3).
- No se generan microtareas por archivo: cada tarea agrupa un módulo/capa coherente, siguiendo el
  mandato explícito del brief ("Evita microtareas").
