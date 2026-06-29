# Tasks: 006-build-export

**Input**: `specs/006-build-export/spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`
**Scope**: Backlog técnico ejecutable para `build` (publica todos los formatos como un conjunto) y `export <format>` (solo stdout, sin escribir). Reúsa el motor `002`/`004`; no crea un segundo parser/alias-graph/type-engine/foundation-analyzer.
**Generated**: 2026-06-29
**Status**: Backlog; ninguna tarea completada. No implementa código aquí.

## Execution Rules

- Orden por checkpoint: A → B → C/D/E → F → G → H → I → J → K → L (ver grafo de dependencias).
- Cada checkpoint termina con un gate y un commit sugerido; no mezclar checkpoints salvo tareas `[P]`.
- Cada tarea de implementación o prueba apunta a un path concreto y a una sola responsabilidad comprobable.
- Reglas contractuales no negociables (spec D1–D16, research, data-model, ADR 0022–0025):
  - **No artefactos parciales**: si un renderer requerido falla, el build completo se bloquea (`wrote:false`, cero artifacts publicados); en `export`, el renderer solicitado falla con stdout vacío, stderr seguro y cero escrituras.
  - **`export` es siempre read-only**: nunca toca writer, build manifest, output inspector, staging, backup, rename ni filesystem.
  - **Comandos exactos**: `neuraz-ds build`, `neuraz-ds build --json`, `neuraz-ds export css|json|typescript`. Sin `--output/--input/--formats/--force/--dry-run/--cwd/--clean/--watch/--minify` y sin `export --json`.
  - Identificador de formato canónico: `typescript` (filename `tokens.ts`).
- No crear `specs/006-build-export/audit.md` hasta el cierre del checkpoint L (tarea T160).
- No modificar features cerradas `001`–`005` salvo las pruebas de regresión listadas en el checkpoint L.

## Checkpoint A — Modelos, source snapshot y resolved token view

**Objective**: Definir los modelos de dominio inmutables y la captura de entrada (una sola lectura semántica) que alimenta todo build/export sin duplicar el análisis `002`/`004`.
**Preconditions**: `plan.md` y `data-model.md` vigentes; features `001`–`005` cerradas.

### Tasks

- [X] T001 [US01] Crear `src/domain/build-export/build-format.ts` con `BuildFormat = "css" | "json" | "typescript"`, orden canónico `css, json, typescript` y el mapa formato→filename (`tokens.css`, `tokens.resolved.json`, `tokens.ts`).
- [X] T002 [US01] Crear `src/domain/build-export/artifact.ts` con `BuildArtifact` (format, relativePath, bytes, contentHash, byteLength, contentType) y `BuildArtifactMetadata` (sin bytes); readonly, copia defensiva de bytes, `relativePath` relativo sin separadores.
- [X] T003 [US07] Crear `src/domain/build-export/build-outcome.ts` con las uniones `BuildResult` (`built|unchanged|invalid-design-system|unsupported-value|conflict|not-found|read-error|write-error|verification-error`) y `ExportResult` (`exported|invalid-design-system|unsupported-value|not-found|read-error`), `BuildConflict` (code/path/format/severity/message/blocksWrite) y campos de recovery (`outputAvailable`, `backupRelativePath`, `recoveryRequired`); prohibir `partial`/`success`/`blocked` como outcomes públicos.
- [X] T004 [US17] Crear `src/domain/build-export/verification.ts` con `BuildVerification` (status `passed|failed|skipped`, checks en orden determinista) y `VerificationCheck` kinds `source|css|json|typescript|build-manifest|filesystem`.
- [X] T005 [US18] Crear `src/domain/build-export/index.ts` exportando solo tipos y funciones públicas del dominio build-export.
- [X] T006 [P] [US01] Crear `tests/domain/build-export/build-domain-models.test.ts`: orden de formatos, invariantes de artifact, uniones de outcome exactas (assert que `partial`/`success` NO existen), defaults de recovery.
- [X] T007 [US01] Crear `src/infrastructure/build-export/hash.ts` con SHA-256 hexadecimal en minúsculas sobre bytes exactos (source y artifact).
- [X] T008 [P] [US01] Crear `tests/infrastructure/build-export/hash.test.ts` con vectores deterministas y distinción texto/bytes.
- [X] T009 [US18] Crear `src/application/build-export/build-ports.ts` con los tipos internos `AnalyzedSourceSnapshot`, `ResolvedTokenView`, `ResolvedTokenRecord`, `TokenResolutionMap` y los puertos `SourceSnapshotReader`, `ArtifactRenderer`, `ArtifactSetWriter`, `BuildOutputInspector` (solo interfaces; sin Node, sin Commander).
- [X] T010 [US01] Crear `src/infrastructure/build-export/snapshot-reader.ts`: una lectura raw de bytes + una decodificación UTF-8 estricta + un `JSON.parse` + reúso de `createBoundAnalyze` (`src/cli/composition.ts`) y una proyección de foundations (`src/application/foundations/project-foundations.ts`); `sourceHash` desde los bytes iniciales; sin segundo parse/analyzer.
- [X] T011 [P] [US01] Crear `tests/integration/build-export/source-snapshot-reader.test.ts`: UTF-8 inválido → read-error, `sourceHash` estable byte-exacto, logical path lógico (sin ruta absoluta).
- [X] T012 [US18] Crear `tests/integration/build-export/one-pass-evidence.test.ts` con spies inyectados: por ejecución `initial semantic reads:1, UTF-8 decodes:1, JSON.parse:1, DTCG analyzer:1, alias graph builds:1, type resolution:1, foundation projections:1`; build permite `pre-publication raw byte reread:1` que no decodifica/parsea/analiza/proyecta; export `pre-publication rereads:0`; casos token normal, alias directo, alias chain, missing, cycle, alias-to-group; compatibilidad con `validate`/`inspect`; bytes históricos intactos.
- [X] T013 Gate A: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `git diff --check`.

**Regression**: T011/T012 prueban que el analizador existente no cambia su salida pública.
**Suggested commit**: `feat: add build-export source snapshot and domain models`
**Exclusions**: sin renderers, sin writer, sin CLI, sin manifest.
**First task next checkpoint**: T014.

## Checkpoint B — Proyección normalizada y orden canónico

**Objective**: Convertir el `ResolvedTokenView` en `NormalizedTokenSet` con orden canónico total y category/foundation calculados una sola vez (no por renderer).
**Preconditions**: Checkpoint A completo y gate A verde.

### Tasks

- [X] T014 [US20] Crear `src/domain/build-export/normalized-token.ts` con `NormalizedBuildToken` (path, segments, category, foundationLevel, effectiveType, sourceValue, resolvedValue, aliasOf, aliasChain, description, trust, order, compatibility) y `NormalizedTokenSet` (source, tokens, byPath, warnings); readonly y congelado.
- [X] T015 [US20] Crear `src/domain/build-export/build-token-order.ts` con el comparador canónico único: orden de categoría foundation → path padres-antes-que-hijos → comparación bytewise por code point (sin `localeCompare`).
- [X] T016 [US06] Crear `src/application/build-export/create-build-projection.ts`: mapea `ResolvedTokenView` → `NormalizedTokenSet`, reutiliza UNA proyección de foundations para category/foundationLevel y el alias inmediato del grafo existente.
- [X] T017 [US07] Crear `src/application/build-export/compatibility.ts` para anotar `NormalizedBuildToken.compatibility` (representabilidad por formato) sin renderizar todavía.
- [X] T018 [US08] Añadir en `create-build-projection.ts` el rechazo de tokens con tipo no resoluble, alias inválido, alias-to-group, cycle o alias no confiable, y la exclusión de grupos (no se emiten como tokens).
- [X] T019 [US20] Garantizar en `normalized-token.ts`/`create-build-projection.ts` copias defensivas, valores JSON-safe y congelamiento de colecciones anidadas.
- [X] T020 [P] [US20] Crear `tests/domain/build-export/build-token-order.test.ts`: orden por categoría, padres antes que descendientes, code point, sin locale.
- [X] T021 [P] [US20] Crear `tests/application/build-export/create-build-projection.test.ts`: entrada inmutable, copias defensivas, distinto insertion order → misma proyección.
- [X] T022 [P] [US06] Crear `tests/integration/build-export/build-projection-aliases.test.ts`: alias válido (aliasOf inmediato), alias roto, cycle y alias-to-group reportados por el análisis (rechazados, no proyectados).
- [X] T023 [US18] Crear `tests/integration/build-export/projection-single-foundation.test.ts` con spy: `foundation projections:1`; category/foundationLevel no se recalculan por renderer.
- [X] T024 [US08] Crear `tests/fixtures/build-export/projection/source.tokens.json` (tokens color/dimension/number + un alias) y un test que confirme grupos excluidos y tokens inválidos rechazados.
- [X] T025 Gate B: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `git diff --check`.

**Regression**: T022 preserva los errores contractuales de alias de `002`.
**Suggested commit**: `feat: add normalized build projection and canonical order`
**Exclusions**: sin escritura de archivos ni manifest.
**First task next checkpoint**: T026 (C), en paralelo conceptual con T055 (D) y T062 (E).

## Checkpoint C — CSS naming, escaping y renderer

**Objective**: Renderizar CSS Custom Properties deterministas y exactas; cualquier token no representable bloquea el build completo (cero CSS).
**Preconditions**: Checkpoint B completo y gate B verde.

### Tasks

- [X] T026 [US11] Crear `src/domain/build-export/css-name.ts` con `tokenPathToCssCustomPropertyName(path)` = `"--"` + segments unidos por `-`; cada segmento valida `^[A-Za-z0-9_][A-Za-z0-9_-]*$`; case preservado; puntos solo como separadores; sin lowercasing, sin normalización Unicode, sin identifier escaping.
- [X] T027 [P] [US11] Crear `tests/domain/build-export/css-name.test.ts`: segmento vacío, Unicode, espacio, slash, backslash y caracteres fuera del subconjunto → `unsupported-value`/`css-name-invalid` (format `css`, tokenPath, wrote:false); case preservado; sin lowercase ni normalización.
- [X] T028 [US11] Crear en `src/domain/build-export/css-name.ts` el detector de colisiones (mapa global nombre→path antes de producir bytes): `foo.bar-baz` y `foo-bar.baz` colisionan en `--foo-bar-baz` → `unsupported-value`/`css-name-collision`, wrote:false.
- [X] T029 [P] [US11] Crear `tests/domain/build-export/css-name-collision.test.ts` con el caso `foo.bar-baz`/`foo-bar.baz` y verificación de que nunca se elige uno silenciosamente.
- [X] T030 [US20] Crear `src/infrastructure/build-export/css-string.ts` (escaping de valores string entre comillas dobles, separado de la validación de identifiers): backslash, comilla doble, LF, CR, form feed, NULL, controles C0, DEL; escapes hex con espacio terminador; UTF-8; independiente de locale.
- [X] T031 [P] [US20] Crear `tests/infrastructure/build-export/css-string.test.ts` con fixtures byte-exactos de `research.md` (comillas, salto de línea, NULL, tab) y controles C0/DEL.
- [X] T032 [US07] Crear en `src/infrastructure/build-export/css-renderer.ts` el serializer de `number` (SUPPORTED): decimal más corto estable, menos-cero a cero, sin locale, sin notación científica; rechazo defensivo de NaN/Infinity → `css-number-invalid`.
- [X] T033 [US07] Añadir en `src/infrastructure/build-export/css-renderer.ts` los serializers CONDITIONALLY_SUPPORTED: `color` (solo `hex`, alpha ausente o 1; `#rrggbb` minúscula), `dimension` (`px|rem|em|%`), `duration` (`ms|s`), `fontWeight` (entero 1..1000 o `normal|bold`), `fontFamily` (lista coma+espacio; keywords genéricos sin comillas), `cubicBezier` (`x1`/`x2` en 0..1), `string`.
- [X] T034 [US07] Añadir en `src/infrastructure/build-export/css-renderer.ts` el reconocimiento de tipos UNSUPPORTED_IN_CSS_V1 (`boolean`, `strokeStyle`, `border`, `transition`, `shadow`, `gradient`, `typography`) → `unsupported-value` con format `css`, tokenPath, type y stable code (`css-boolean-unsupported`, `css-type-unsupported`).
- [X] T035 [US05] Añadir en `src/infrastructure/build-export/css-renderer.ts` la emisión de aliases `var(--<immediate-target>)`: el target debe existir, ser token, tener CSS name válido, generar declaration, ser representable y compatible; si no → `unsupported-value`/`css-alias-target-unrenderable`; sin fallback silencioso al valor final.
- [X] T036 [US01] Completar `src/infrastructure/build-export/css-renderer.ts`: ensamblar bloque `:root`, declaraciones en orden canónico, newline final, UTF-8 sin BOM; all-or-nothing: si cualquier token es no soportado, retornar `unsupported-value` y cero bytes CSS.
- [X] T037 [P] [US07] Crear `tests/infrastructure/build-export/css-type-color.test.ts`: hex válido; alpha distinto de 1 / shape inválida → `css-color-unsupported-shape`.
- [X] T038 [P] [US07] Crear `tests/infrastructure/build-export/css-type-dimension.test.ts`: `16px`/`rem`/`em`/`%`; unidad inválida/whitespace/no-finito → `css-dimension-unsupported-shape`.
- [X] T039 [P] [US07] Crear `tests/infrastructure/build-export/css-type-number.test.ts`: `0.875`; menos-cero a cero; NaN/Infinity → `css-number-invalid`.
- [X] T040 [P] [US07] Crear `tests/infrastructure/build-export/css-type-string.test.ts`: string entrecomillado/escapado; gating de tipo → `css-string-unsupported-type`.
- [X] T041 [P] [US07] Crear `tests/infrastructure/build-export/css-type-boolean.test.ts`: cualquier boolean → `css-boolean-unsupported` (UNSUPPORTED).
- [X] T042 [P] [US07] Crear `tests/infrastructure/build-export/css-type-font-family.test.ts`: lista/keyword genérico sin comillas; shape inválida → `css-font-family-unsupported-shape`.
- [X] T043 [P] [US07] Crear `tests/infrastructure/build-export/css-type-font-weight.test.ts`: `700`/`normal`/`bold`; otro → `css-font-weight-unsupported-shape`.
- [X] T044 [P] [US07] Crear `tests/infrastructure/build-export/css-type-duration.test.ts`: `120ms`/`s`; unidad inválida → `css-duration-unsupported-shape`.
- [X] T045 [P] [US07] Crear `tests/infrastructure/build-export/css-type-cubic-bezier.test.ts`: `cubic-bezier(0.4, 0, 0.2, 1)`; `x` fuera de 0..1 → `css-cubic-bezier-unsupported-shape`.
- [X] T046 [P] [US07] Crear `tests/infrastructure/build-export/css-type-stroke-style.test.ts`: cualquier valor → `css-type-unsupported`.
- [X] T047 [P] [US07] Crear `tests/infrastructure/build-export/css-type-border.test.ts`: cualquier valor → `css-type-unsupported`.
- [X] T048 [P] [US07] Crear `tests/infrastructure/build-export/css-type-transition.test.ts`: cualquier valor → `css-type-unsupported`.
- [X] T049 [P] [US07] Crear `tests/infrastructure/build-export/css-type-shadow.test.ts`: cualquier valor → `css-type-unsupported`.
- [X] T050 [P] [US07] Crear `tests/infrastructure/build-export/css-type-gradient.test.ts`: cualquier valor → `css-type-unsupported`.
- [X] T051 [P] [US07] Crear `tests/infrastructure/build-export/css-type-typography.test.ts`: cualquier valor → `css-type-unsupported`.
- [X] T052 [US05] Crear `tests/integration/build-export/css-aliases.test.ts`: alias directo, cadena, missing, alias-to-group, cycle, target con nombre inválido, target no representable → `unsupported-value`; cero fallback silencioso.
- [X] T053 [US08] Crear `tests/integration/build-export/css-all-or-nothing.test.ts`: un token no soportado → renderer retorna `unsupported-value` y cero bytes CSS (sin CSS parcial).
- [X] T054 Gate C: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `git diff --check`.

**Regression**: ninguna; CSS es nuevo.
**Suggested commit**: `feat: add deterministic css renderer with full type matrix`
**Exclusions**: sin writer, sin manifest, sin JSON/TS renderers aquí.
**First task next checkpoint**: T055 (D).

## Checkpoint D — JSON resuelto

**Objective**: Producir `tokens.resolved.json` (`ResolvedTokensV1`) determinista, con valores resueltos y metadata mínima, sin exponer datos internos.
**Preconditions**: Checkpoint B completo y gate B verde (independiente de C).

### Tasks

- [X] T055 [US06] Crear `src/application/build-export/resolved-tokens-mapper.ts` con los DTO `ResolvedTokensV1` (`formatVersion`, `source {path,hash}`, `tokens`) y `ResolvedTokenV1` (`value`, `aliasOf`, `type`, `category`, `foundationLevel`, `description`); flat record por token path; `aliasOf` inmediato; null policy por campo.
- [X] T056 [US06] Crear `src/infrastructure/build-export/json-renderer.ts` con `serializeResolvedTokensV1`: `JSON.stringify(envelope, null, 2)` + LF final, UTF-8 sin BOM, `formatVersion` primera clave, claves de token en orden canónico, campos en orden de contrato.
- [X] T057 [P] [US06] Crear `tests/application/build-export/resolved-tokens-mapper.test.ts`: flat record, valor resuelto, alias inmediato, null policy de `aliasOf`/`category`/`description`, orden de campos.
- [X] T058 [P] [US20] Crear `tests/infrastructure/build-export/json-renderer.test.ts`: parseable, dos espacios, newline final único, sin BOM, orden de tokens canónico, `formatVersion` 1.0.0, arrays/objetos/strings JSON-safe.
- [X] T059 [US06] Crear `tests/integration/build-export/resolved-tokens-no-leak.test.ts`: NO expone raw bytes, decoded/parsed source, trust interno, alias chain interna, `$extensions` desconocidas, rutas absolutas, errores crudos ni stack.
- [X] T060 Gate D: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `git diff --check`.

**Regression**: ninguna; contrato JSON nuevo e independiente de `003`/`004`/`005`.
**Suggested commit**: `feat: add resolved tokens json renderer`
**Exclusions**: sin writer, sin manifest.
**First task next checkpoint**: T061 (E).

## Checkpoint E — TypeScript renderer

**Objective**: Producir `tokens.ts` válido, autocontenido, determinista y verificable sin ejecución.
**Preconditions**: Checkpoint B completo y gate B verde (independiente de C/D).

### Tasks

- [X] T061 [US06] Crear `src/infrastructure/build-export/ts-renderer.ts`: emitir `export const tokens = { ... } as const;`, `export const tokenMetadata = { ... } as const;`, `export type TokenPath = keyof typeof tokens;`; flat record; claves siempre entrecomilladas; valores resueltos; metadata (`aliasOf` inmediato, `type`, `category`, `foundationLevel`, `description`); orden canónico; newline final; cero imports y cero dependencia runtime del manager.
- [X] T062 [US20] Crear `src/infrastructure/build-export/ts-literal.ts` (serializer de literales TS-safe basado en `JSON.stringify`): escapar comillas, backslash, Unicode, U+2028, U+2029 y `</script>`; arrays/objetos; números finitos; rechazar `NaN`/Infinity.
- [X] T063 [P] [US20] Crear `tests/infrastructure/build-export/ts-literal.test.ts`: U+2028/U+2029, `</script>`, controles, comillas/backslash; rechazo de `NaN`/Infinity.
- [X] T064 [P] [US06] Crear `tests/infrastructure/build-export/ts-renderer-shape.test.ts`: exports `tokens`/`tokenMetadata`/`TokenPath`, contrato exacto de metadata, ausencia de imports, null policy.
- [X] T065 [US06] Crear `tests/integration/build-export/ts-validation-no-exec.test.ts`: validar sintaxis con la dependencia `typescript` (`transpileModule`/`tsc --noEmit`); sin `eval`, sin import dinámico, sin ejecutar el artifact; comprobar exports esperados y ausencia de imports.
- [X] T066 [P] [US20] Crear `tests/infrastructure/build-export/ts-determinism.test.ts`: bytes deterministas; identificador de formato normalizado `typescript`; filename `tokens.ts`.
- [X] T067 Gate E: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `git diff --check`.

**Regression**: ninguna; TS es nuevo.
**Suggested commit**: `feat: add typescript renderer`
**Exclusions**: sin writer, sin manifest.
**First task next checkpoint**: T068 (F).

## Checkpoint F — Manifest, hashes y ownership

**Objective**: Construir el build manifest determinista y clasificar ownership del directorio de salida vía el manifest anterior (única autoridad).
**Preconditions**: Checkpoints C, D y E completos y gates verdes.

### Tasks

- [X] T068 [US10] Crear `src/domain/build-export/build-manifest.ts` con `BuildManifestV1` (`formatVersion` primera clave, `source` lógico, `sourceHash`, `artifacts`) y `BuildManifestArtifactV1` (`format`, `relativePath`, `contentHash`, `byteLength`); orden css/json/typescript; sin self-entry; sin timestamp/env/cwd/host.
- [X] T069 [US01] Crear `src/application/build-export/manifest-builder.ts`: ensamblar `BuildManifestV1` desde artifacts + `sourceHash`; SHA-256 minúscula; `byteLength` exacto; paths relativos.
- [X] T070 [US01] Añadir en `src/infrastructure/build-export/json-renderer.ts` `serializeBuildManifestV1`: dos espacios + LF final, UTF-8 sin BOM.
- [X] T071 [P] [US10] Crear `tests/application/build-export/build-manifest.test.ts`: `formatVersion` 1.0.0; `source` lógico (token source, no host manifest); sin self-entry; orden de artifacts; `byteLength`; sin timestamps/cwd/hostname/rutas absolutas.
- [X] T072 [US10] Crear `src/domain/build-export/build-plan.ts` con `BuildPlan` (`outputRoot`, `sourceHash`, `artifacts`, `manifest`, `previousBuildManifest`, `requiredPaths`, `unknownPolicy`); invariante: sin conjunto candidato parcial.
- [X] T073 [US10] Añadir en `src/domain/build-export/build-outcome.ts` el modelo `BuildOwnership` (`empty|trusted|untrusted-build-manifest|required-path-owned-by-unknown|managed-artifact-modified|managed-artifact-missing|unsupported-unknown-node`) y los códigos estables de `BuildConflict`.
- [X] T074 [US10] Crear `src/application/build-export/ownership.ts`: clasificar el build manifest previo (parseable/corrupto/no soportado/ausente) y los artifacts declarados; la autoridad de ownership es únicamente el build manifest (`design-system/build/manifest.json`), nunca el Design System host manifest (`design-system/design-system.json`).
- [X] T075 [P] [US19] Crear `tests/domain/build-export/manifest-terminology.test.ts` que documente y verifique la distinción host manifest vs build manifest (paths y propósito).
- [X] T076 [P] [US10] Crear `tests/application/build-export/ownership-empty.test.ts`: primer build sin build manifest ni required paths → `empty` (permitido).
- [X] T077 [P] [US10] Crear `tests/application/build-export/ownership-trusted.test.ts`: build manifest soportado con hashes coincidentes → `trusted`.
- [X] T078 [P] [US10] Crear `tests/application/build-export/ownership-manifest-absent-required-present.test.ts`: build manifest ausente con required paths presentes → `required-path-owned-by-unknown`.
- [X] T079 [P] [US10] Crear `tests/application/build-export/ownership-manifest-corrupt.test.ts`: build manifest corrupto → `untrusted-build-manifest`.
- [X] T080 [P] [US10] Crear `tests/application/build-export/ownership-manifest-unknown-version.test.ts`: versión desconocida → `untrusted-build-manifest`.
- [X] T081 [P] [US10] Crear `tests/application/build-export/ownership-artifact-modified.test.ts`: managed artifact modificado → `managed-artifact-modified`.
- [X] T082 [P] [US10] Crear `tests/application/build-export/ownership-artifact-missing.test.ts`: managed artifact faltante → `managed-artifact-missing`.
- [X] T083 [P] [US10] Crear `tests/application/build-export/ownership-unknown-file-required-path.test.ts`: archivo regular desconocido en required path → `required-path-owned-by-unknown`.
- [X] T084 [P] [US10] Crear `tests/application/build-export/ownership-unknown-dir-required-path.test.ts`: directorio desconocido en required path → `required-path-owned-by-unknown`.
- [X] T085 [P] [US10] Crear `tests/application/build-export/ownership-artifact-bad-hash.test.ts`: artifact declarado con hash inválido → `untrusted-build-manifest`.
- [X] T086 [P] [US10] Crear `tests/application/build-export/ownership-artifact-outside-root.test.ts`: artifact declarado fuera del output root → `untrusted-build-manifest`/unsafe.
- [X] T087 [P] [US10] Crear `tests/application/build-export/ownership-manifest-duplicate-path.test.ts`: build manifest con path duplicado → `untrusted-build-manifest`.
- [X] T088 [P] [US10] Crear `tests/application/build-export/ownership-manifest-unknown-artifact.test.ts`: build manifest con artifact desconocido → `untrusted-build-manifest`.
- [X] T089 Gate F: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `git diff --check`.

**Regression**: ninguna; manifest y ownership son nuevos.
**Suggested commit**: `feat: add build manifest and ownership classification`
**Exclusions**: sin writer transaccional ni publicación todavía.
**First task next checkpoint**: T090 (G).

## Checkpoint G — Casos de uso build/export

**Objective**: Orquestar build (render de todos los formatos en memoria → manifest → writer) y export (un renderer → bytes), ambos headless; export es estrictamente read-only.
**Preconditions**: Checkpoints C/D/E completos (renderers) y F completo (manifest/ownership).

### Tasks

- [ ] T090 [US18] Finalizar `src/application/build-export/build-ports.ts`: interfaces `ArtifactRenderer`, `ArtifactSetWriter` (`ArtifactSetWriteRequest`/`ArtifactSetWriteResult`), `BuildOutputInspector`, `SourceSnapshotReader`; dominio/aplicación sin filesystem/Commander/stdout/npm.
- [ ] T091 [US01] Crear `src/application/build-export/build-design-system.ts`: una snapshot → proyección → render de los 3 formatos en memoria → manifest → writer; all-or-nothing: si cualquier renderer da `unsupported-value`, retornar ese outcome con `wrote:false` sin invocar writer ni crear staging; produce `BuildResult`.
- [ ] T092 [US02] Crear `src/application/build-export/export-design-system-artifact.ts`: resolve host → lectura semántica → validación → normalización → seleccionar UN renderer → devolver `bytes`/`contentType`/`logicalFilename`; nunca writer/manifest/output-inspector/staging/backup/reread/mtime; produce `ExportResult`.
- [ ] T093 [P] [US01] Crear `tests/application/build-export/build-use-case.test.ts`: `built` renderiza los 3 y luego escribe; fallo de renderer bloquea antes de cualquier escritura (spy `writer calls:0`, sin staging); prior output intacto.
- [ ] T094 [P] [US18] Crear `tests/application/build-export/export-read-only.test.ts` con spies/fakes: `writer calls:0`, `output inspector calls:0`, `manifest builder calls:0`, `concurrency rereads:0`, `filesystem writes:0`.
- [ ] T095 [P] [US02] Crear `tests/application/build-export/export-outcomes.test.ts`: `exported`, `invalid-design-system`, `unsupported-value`, `not-found`, `read-error`.
- [ ] T096 [US08] Crear `tests/integration/build-export/build-blocks-partial.test.ts`: CSS no soportado → `unsupported-value`; JSON/TS no publicados; sin manifest; prior output intacto.
- [ ] T097 Gate G: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `git diff --check`.

**Regression**: ninguna directa; usa el motor reutilizado de A/B.
**Suggested commit**: `feat: add build and export use cases`
**Exclusions**: sin reporters/JSON público; sin writer real (puerto fake en G).
**First task next checkpoint**: T098 (H).

## Checkpoint H — Reporters, JSON público, outcomes y streams

**Objective**: Presentación humana y JSON de build, mapeo exacto de outcomes a exit codes y disciplina de streams; export sin JSON envelope.
**Preconditions**: Checkpoint G completo y gate G verde.

### Tasks

- [ ] T098 [US17] Crear `src/application/build-export/build-json/map-build.ts` con `BuildJsonEnvelopeV1` desde `BuildResult` (campos del contrato `build-json-v1.contract.md`); null policy; orden de propiedades; sin bytes/rutas absolutas/`Error`/stack/env.
- [ ] T099 [US17] Crear `src/infrastructure/reporter/build-json-serializer.ts` (`serializeBuildJsonV1` independiente; dos espacios + LF), sin cast desde `JsonEnvelopeV1`/`FoundationsJsonEnvelopeV1`/`PresetsJsonEnvelopeV1`.
- [ ] T100 [US17] Crear `src/infrastructure/reporter/build-json-reporter.ts`: un único envelope a stdout para outcomes esperados; stderr vacío.
- [ ] T101 [US16] Crear `src/infrastructure/reporter/build-terminal-reporter.ts` (humano): outcome, source lógico, output directory lógico, formatos, archivos, hashes resumidos, `wrote`, verification.
- [ ] T102 [US02] Crear `src/infrastructure/reporter/export-error-reporter.ts`: éxito → solo bytes del artifact a stdout; error → stderr seguro; nunca mezcla reporte y artifact.
- [ ] T103 [US19] Extender `src/cli/exit-codes.ts` con el mapeo build/export: `built`/`exported`→0, `unchanged`→2, `invalid-design-system`→3, `unsupported-value`/`conflict`→4, `not-found`→5, `read-error`/`write-error`→6, `verification-error`→7, `internal-error`→70 (solo capa CLI/adapter).
- [ ] T104 [P] [US07] Crear `tests/cli/build-export-outcomes.test.ts`: uniones exactas (build 9, export 5, `internal-error` adapter-only); ausencia pública de `success`/`partial`/`blocked`/`validation`/`unexpected`.
- [ ] T105 [P] [US19] Crear `tests/cli/build-export-exit-codes.test.ts` tabla-a-tabla del mapeo de exit codes.
- [ ] T106 [P] [US17] Crear `tests/infrastructure/reporter/build-json.test.ts`: contrato + bytes (sin rutas absolutas, `Error`, stack, env, ni bytes completos de artifact).
- [ ] T107 [US13] Crear `tests/cli/build-export-streams.test.ts`: build humano (stdout reporte/stderr vacío); build --json (un envelope/stderr vacío); export success (artifact exacto/stderr vacío); export error (stdout vacío/stderr seguro); internal (stdout vacío/stderr seguro/exit 70); sin envelope JSON para export.
- [ ] T108 Gate H: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `git diff --check`.

**Regression**: T105/T107 confirman que los exit codes históricos no cambian.
**Suggested commit**: `feat: add build reporters, json envelope and exit mapping`
**Exclusions**: sin writer real ni filesystem snapshot todavía.
**First task next checkpoint**: T109 (I).

## Checkpoint I — Snapshot filesystem, unknown nodes y concurrencia

**Objective**: Capturar el estado de `design-system/build/` con seguridad de nodos y revalidar concurrencia por bytes/hashes antes del commit point.
**Preconditions**: Checkpoint F (ownership) y G (use cases) completos.

### Tasks

- [ ] T109 [US10] Crear `src/domain/build-export/build-snapshot.ts` con `BuildSnapshot`, `UnknownOutputNode` (`kind` `regular-file|regular-directory|unsupported`, `depth`, `byteLength`, `copyAction`) y `requiredPathStates` (`file|dir|symlink|absent|other`).
- [ ] T110 [US10] Crear `src/infrastructure/build-export/snapshot-reader.ts` (extensión del lector de output dir): estados de required paths, parents, defensa de symlink/containment; sin seguir symlinks.
- [ ] T111 [US10] Crear `src/application/build-export/classify-unknown-nodes.ts`: permitir solo archivos/directorios regulares; rechazar symlink/socket/FIFO/block/char/special/path-escape → `conflict`/`unsupported-unknown-node`.
- [ ] T112 [US10] Añadir límites reusando `src/domain/traversal/limits.ts` (`ANALYSIS_LIMITS`): cantidad de unknown nodes ≤ `maxNodes` (100000), profundidad ≤ `maxDepth` (32), bytes totales ≤ `maxTotalBytes` (16 MiB), por-archivo ≤ ese presupuesto; longitud de path reusando los límites de path existentes.
- [ ] T113 [P] [US10] Crear `tests/integration/build-export/unknown-nodes-kinds.test.ts`: archivo/dir regular permitidos; symlink, FIFO, socket, device (vía seam/fake), special y path traversal rechazados; cambio de node kind concurrente.
- [ ] T114 [P] [US10] Crear `tests/integration/build-export/unknown-nodes-limits.test.ts`: límite exacto, límite+1, directorios anidados, directorio vacío.
- [ ] T115 [US12] Crear `src/application/build-export/concurrency.ts`: reread byte-only del source → SHA-256 vs `sourceHash`; rechequear build manifest bytes/hash, managed artifacts, required path node kinds, symlink state, output root y parent; sin decode/parse/analyze; mismatch → `conflict`/`source-modified`, `wrote:false`.
- [ ] T116 [P] [US12] Crear `tests/integration/build-export/concurrency.test.ts`: una prueba por modificación concurrente (source bytes, build manifest, managed artifacts, required paths, unknown nodes, output root, parent, node kinds, symlinks, ownership) → `conflict`/`wrote:false`.
- [ ] T117 [P] [US12] Crear `tests/integration/build-export/concurrency-not-mtime.test.ts`: la detección usa bytes/hash, no mtime/size.
- [ ] T118 Gate I: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `git diff --check`.

**Regression**: ninguna; snapshot/concurrencia son nuevos.
**Suggested commit**: `feat: add output snapshot, unknown-node safety and concurrency checks`
**Exclusions**: sin publicación todavía (solo lectura/clasificación).
**First task next checkpoint**: T119 (J).

## Checkpoint J — Writer transaccional por directorio

**Objective**: Publicar el conjunto completo de artifacts vía directorio candidato (staging → build) con estados de recuperación explícitos y sin rollback automático tras el commit point.
**Preconditions**: Checkpoint I completo y gate I verde.

### Tasks

- [ ] T119 [US13] Crear en `src/domain/build-export/build-outcome.ts`/`build-plan.ts` los modelos `ArtifactSetWriteRequest` (`strategy: "candidate-directory-set-v1"`, `expectedHashes`), `ArtifactSetWriteResult` (`published|unchanged|conflict|unsafe-target|write-error|verification-error`), `PublicationState` y `BuildRecoveryState`.
- [ ] T120 [US01] Crear `src/infrastructure/build-export/artifact-set-writer.ts`: staging sibling en el mismo parent; copiar byte-a-byte los unknown regular files/dirs permitidos; escribir artifacts nuevos + build manifest nuevo; verificar el candidato antes de publicar; publicar como conjunto (rename prior `build/`→backup, staging→`build/`). Sin publicación live artifact-by-artifact.
- [ ] T121 [US13] Modelar el commit point: transición a `candidate-published` solo cuando `staging → build` tiene éxito; desde ahí `wrote:true`.
- [ ] T122 [US13] Estado: fallo antes de mover build → `wrote:false`, `outputAvailable:true`, `backupRelativePath:null`, `recoveryRequired:false`.
- [ ] T123 [US13] Estado: primer rename (`build → backup`) falla → `wrote:false`, `outputAvailable:true`.
- [ ] T124 [US13] Estado: segundo rename (`staging → build`) falla y restore (`backup → build`) funciona → `wrote:false`, `outputAvailable:true`, `backupRelativePath:null`, `recoveryRequired:false`.
- [ ] T125 [US13] Estado: segundo rename falla y restore falla → `write-error`, `wrote:false`, `outputAvailable:false`, backup retenido, `recoveryRequired:true`.
- [ ] T126 [US13] Estado: verification-error posterior al commit point → `verification-error`, `wrote:true`, `outputAvailable:true`, backup retenido, `recoveryRequired:true`; sin rollback automático.
- [ ] T127 [P] [US13] Crear `tests/integration/build-export/writer-posix.test.ts`: renames sibling, ventana de dos renames en directorio no vacío, cleanup de staging.
- [ ] T128 [P] [US13] Crear `tests/integration/build-export/writer-windows-sim.test.ts` (seams): open handle/antivirus rename failure simulado, permisos, retry acotado.
- [ ] T129 [P] [US13] Crear `tests/integration/build-export/writer-recovery.test.ts`: primer rename, segundo rename, restore exitoso, restore fallido, cleanup, staging residual, backup residual, rutas públicas relativas.
- [ ] T130 [US13] Crear `tests/integration/build-export/writer-no-rollback.test.ts`: tras el commit point no hay rollback destructivo automático.
- [ ] T131 Gate J: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `git diff --check`.

**Regression**: ninguna; reúsa conceptos del writer `005` sin acoplar su interfaz de archivo único.
**Suggested commit**: `feat: add transactional artifact-set writer with recovery states`
**Exclusions**: sin verificación de tres niveles ni idempotencia completa (van en K).
**First task next checkpoint**: T132 (K).

## Checkpoint K — Verificación, recuperación e idempotencia

**Objective**: Separar las tres verificaciones (input, candidate, post-publication) y decidir `unchanged` antes de cualquier staging.
**Preconditions**: Checkpoints H y J completos.

### Tasks

- [ ] T132 [US08] Crear `src/application/build-export/verification.ts` con la verificación de input: Design System válido, aliases válidos, tipos válidos, foundations válidas, límites; bloquea el render si falla.
- [ ] T133 [US17] Añadir la verificación de candidate (antes de publicar): CSS, JSON, TypeScript, build manifest, hashes, byte lengths, presencia y paths de artifacts, selector, declarations, aliases CSS, exports TS y ausencia de runtime imports.
- [ ] T134 [US13] Añadir la verificación post-publication: releer artifacts, recalcular hashes, comprobar tamaños, parsear JSON, validar TypeScript sin ejecución, validar CSS estructuralmente, releer build manifest y comprobar el conjunto completo (sin archivos faltantes).
- [ ] T135 [US13] Confirmar la semántica de `verification-error`: posterior al commit point, `wrote:true`, backup retenido, sin rollback automático.
- [ ] T136 [US09] Crear `src/application/build-export/idempotency.ts`: decidir `unchanged` ANTES de crear staging, comparando build manifest, artifact hashes, artifact bytes, byte lengths, paths, ownership y presence (no solo el hash del manifest).
- [ ] T137 [P] [US09] Crear `tests/integration/build-export/idempotency.test.ts`: segunda ejecución sin cambios → `unchanged`/`wrote:false`; `staging creations:0`, `backup creations:0`, `rename calls:0`, `write calls:0`, `temporary files:0`, `bytes changed:0`, `mtime changed:0`.
- [ ] T138 [P] [US17] Crear `tests/integration/build-export/verification-levels.test.ts`: input vs candidate vs post-publication por separado; `verification-error` con backup retenido.
- [ ] T139 Gate K: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `git diff --check`.

**Regression**: ninguna; verificación/idempotencia son nuevas.
**Suggested commit**: `feat: add three-level verification and idempotency`
**Exclusions**: sin CLI ni packaging todavía.
**First task next checkpoint**: T140 (L).

## Checkpoint L — CLI, procesos hijos, packaging, regresión, documentación y auditoría

**Objective**: Registrar los comandos exactos, probar el binario real, el packaging instalado y la regresión granular `001`–`005`, actualizar documentación y cerrar con la auditoría.
**Preconditions**: Checkpoints A–K completos y gates verdes.

### Tasks

- [ ] T140 [US01] Crear `src/cli/commands/build.ts`: registrar `neuraz-ds build` con `--json` local; sin otros flags; un solo caso de uso por invocación.
- [ ] T141 [US02] Crear `src/cli/commands/export.ts`: registrar `neuraz-ds export css|json|typescript`; sin `--json` ni otros flags; selección de un renderer.
- [ ] T142 [US19] Conectar en `src/cli/program.ts` y `src/cli/composition.ts` los comandos build/export, reporter humano vs JSON y el `internal-error`→70 en el adapter.
- [ ] T143 [P] [US19] Crear `tests/cli/build-export-help.test.ts`: `neuraz-ds --help`, `build --help`, `export --help` muestran los comandos válidos y NO `--output/--input/--formats/--force/--dry-run/--cwd/--clean/--watch/--minify` ni `export --json`.
- [ ] T144 [P] [US18] Crear `tests/cli/build-export-commands.test.ts`: un caso de uso por invocación, selección correcta de reporter, sin escritura en export.
- [ ] T145 [US14] Crear `tests/cli/build-binary.test.ts` (procesos hijos `dist/cli/index.js`): cwd diferente, path con espacios, path Unicode, stdin cerrado, sin TTY; primera build `built`/0, segunda build `unchanged`/2; streams y exit codes.
- [ ] T146 [P] [US02] Crear `tests/cli/export-binary.test.ts`: `export css|json|typescript` emiten bytes exactos a stdout, stderr vacío, cero escrituras.
- [ ] T147 [P] [US13] Crear `tests/cli/build-error-matrix.test.ts`: invalid DS/3, unsupported CSS/4, conflict/4, read-error/6, write-error/6, verification-error/7 y estado de recovery en JSON.
- [ ] T148 [US14] Crear `tests/integration/build-export/npm-pack.test.ts`: `npm pack --dry-run --json` incluye `dist/`, bin, `presets/`, recursos runtime; excluye `src/`, `tests/`, `specs/`, `.agents/`.
- [ ] T149 [US14] Crear `tests/integration/build-export/tarball-smoke.test.ts`: `npm pack` real + `npm install <tarball>` real (sin npm link, sin symlink al repo); ejecutar el binario instalado desde otro cwd: `build`, `build --json`, `export` de los 3 formatos, idempotencia; cleanup de tarballs/proyectos; sin residuos.
- [ ] T150 [P] [US19] Crear `tests/integration/build-export/regression-001-init.test.ts`: init, config, Design System host manifest, bytes iniciales de tokens, idempotencia, segunda ejecución `unchanged`/2, ningún preset automático, ningún build automático.
- [ ] T151 [P] [US19] Crear `tests/integration/build-export/regression-002-validate-inspect.test.ts`: validate, inspect, traversal, aliases, types, trust, limits, outcomes, streams, exits y compatibilidad de la extensión aditiva del analyzer.
- [ ] T152 [P] [US19] Crear `tests/integration/build-export/regression-003-json.test.ts`: `JsonEnvelopeV1`, formatVersion, DTO, mapper, serializer, property order, dos espacios, newline, bytes, streams, exits.
- [ ] T153 [P] [US19] Crear `tests/integration/build-export/regression-004-foundations.test.ts`: foundations, categorías, levels, namespace, inheritance, aliases, issues, JSON, formatVersion, bytes, exits.
- [ ] T154 [P] [US19] Crear `tests/integration/build-export/regression-005-presets.test.ts`: presets list/inspect/plan/apply, safe merge, conflicts, writer, concurrency, verification, JSON, streams, exits, idempotencia, packaging.
- [ ] T155 [US16] Actualizar `README.md` con `build`/`export`: comandos exactos, formatos, output dir fijo, fuente vs derivados, determinismo, idempotencia, ausencia de flags fuera de alcance.
- [ ] T156 [US19] Actualizar `specs/006-build-export/quickstart.md` con el flujo reproducible build/export y los outcomes/exits.
- [ ] T157 Gate L (suite completa): `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm pack --dry-run --json`, `git diff --check`.
- [ ] T158 [US19] Crear `specs/006-build-export/audit.md` con trazabilidad (20/20 US, 68/68 FR, 14/14 SC, 17/17 Constitution), hallazgos (0 CRITICAL/HIGH/MEDIUM) y gates finales registrados; cerrar la feature.

**Regression**: T150–T154 prueban que `001`–`005` no cambian comportamiento, bytes, JSON ni exits.
**Suggested commit**: `feat: add build and export cli with packaging and regression`
**Exclusions**: no iniciar `007`; no publicar en npm.
**First task next checkpoint**: ninguno; L cierra `006`.

## Dependencies

```text
A → B
B → C, D, E
C + D + E → F
F → G
G → H
F + G → I
I → J
J → K
H + K → L
```

Reglas duras (no violar):

- `export` (T092) NO depende del writer (J) ni del manifest builder; es read-only.
- La CLI (L) no precede a los casos de uso (G).
- El writer (J) no precede al snapshot/ownership (F/I).
- El modelo de `verification-error` (J/K) no precede al commit-point (J).
- Los reporters (H) no preceden a los outcomes (G/H base en T003).
- El manifest (F) no precede a los modelos de artifact (A).

## Parallel Opportunities

- Tras B, los renderers son ramas paralelas: **C** (CSS, T026–T054), **D** (JSON, T055–T060) y **E**
  (TypeScript, T061–T067) editan archivos distintos y no comparten modelos centrales mutables.
- Dentro de C, las 15 pruebas de tipo (T037–T051) son `[P]`: archivos de test separados, sin editar el
  renderer compartido.
- En F, las 13 pruebas de ownership (T076–T088) son `[P]`: fixtures/tests independientes.
- Las regresiones `001`–`005` (T150–T154) son `[P]`: archivos de test separados.
- `[P]` se aplica solo cuando las dependencias del checkpoint están completas, no se edita el mismo
  archivo y no se comparte un modelo central inestable.
- Ruta crítica: A → B → (C ∪ D ∪ E) → F → G → H → I → J → K → L.

## Traceability — User Stories → Tasks (20/20)

| US | Tasks |
|---|---|
| US1 build all artifacts | T091, T145 |
| US2 export CSS to stdout | T092, T146 |
| US3 export JSON to stdout | T092, T146 |
| US4 export TypeScript to stdout | T092, T146 |
| US5 CSS preserves aliases | T035, T052 |
| US6 JSON/TS resolve aliases + metadata | T055, T061 |
| US7 detect CSS-unsupported type | T034, T096 |
| US8 block partial builds | T053, T091, T096 |
| US9 idempotent build | T136, T137 |
| US10 protect unknown files | T083, T084, T120 |
| US11 detect CSS name collisions | T028, T029 |
| US12 detect concurrency | T115, T116 |
| US13 recover on verification-error | T126, T129, T135 |
| US14 run from installed package | T145, T149 |
| US15 run independent of cwd | T145, T149 |
| US16 human-readable report | T101, T155 |
| US17 machine-readable build output | T098, T106 |
| US18 headless consumption | T090, T091, T092 |
| US19 preserve compatibility 001–005 | T150, T151, T152, T153, T154 |
| US20 deterministic outputs | T036, T058, T066, T137 |

## Traceability — Functional Requirements → Tasks (68/68)

| FR | Tasks | FR | Tasks |
|---|---|---|---|
| FR-001 | T010, T092 | FR-035 | T069, T007 |
| FR-002 | T002, T091 | FR-036 | T091, T120, T140 |
| FR-003 | T010, T012, T016 | FR-037 | T120, T150 |
| FR-004 | T010, T012, T016, T023 | FR-038 | T074, T120 |
| FR-005 | T091, T092, T132 | FR-039 | T078, T083, T084 |
| FR-006 | T018, T132 | FR-040 | T111, T120 |
| FR-007 | T036, T053, T091, T096 | FR-041 | T101 |
| FR-008 | T003, T034, T096 | FR-042 | T098, T099, T106 |
| FR-009 | T035, T052 | FR-043 | T092, T146 |
| FR-010 | T055, T061 | FR-044 | T092, T094 |
| FR-011 | T016, T035, T012 | FR-045 | T141, T102, T146 |
| FR-012 | T036 | FR-046 | T141, T143 |
| FR-013 | T026 | FR-047 | T036, T058, T066, T137 |
| FR-014 | T028, T029 | FR-048 | T015, T066, T137 |
| FR-015 | T032, T033, T034, T037–T051 | FR-049 | T136, T137 |
| FR-016 | T031, T036 | FR-050 | T136, T137 |
| FR-017 | T030, T031 | FR-051 | T091, T133 |
| FR-018 | T015, T036 | FR-052 | T120 |
| FR-019 | T055, T056 | FR-053 | T115, T116 |
| FR-020 | T055, T057 | FR-054 | T134 |
| FR-021 | T059 | FR-055 | T126, T135 |
| FR-022 | T055, T058 | FR-056 | T125, T129 |
| FR-023 | T056, T058 | FR-057 | T107 |
| FR-024 | T061, T064 | FR-058 | T103, T107 |
| FR-025 | T061, T064 | FR-059 | T003, T104 |
| FR-026 | T062, T063 | FR-060 | T103, T105 |
| FR-027 | T066 | FR-061 | T026, T110, T111 |
| FR-028 | T065 | FR-062 | T110, T111, T113 |
| FR-029 | T068 | FR-063 | T065, T120 |
| FR-030 | T068, T069 | FR-064 | T030, T059, T063, T106 |
| FR-031 | T068, T071 | FR-065 | T145, T149 |
| FR-032 | T074 | FR-066 | T090, T091, T092 |
| FR-033 | T007, T069 | FR-067 | T150–T154 |
| FR-034 | T007, T010 | FR-068 | T090, T091, T092 |

## Traceability — Success Criteria → Tasks (14/14)

| SC | Tasks |
|---|---|
| SC-001 same bytes twice | T137 |
| SC-002 second run unchanged, 0 writes | T137 |
| SC-003 export 0 filesystem writes | T094, T146 |
| SC-004 required-target failure → 0 partial | T053, T096 |
| SC-005 JSON parseable | T058, T134 |
| SC-006 TS syntactically valid | T065 |
| SC-007 CSS deterministic | T036, T066 |
| SC-008 aliases correct (var / resolved+aliasOf) | T052, T055, T061 |
| SC-009 installed package works from other cwd | T149 |
| SC-010 regression 001–005 green | T150, T151, T152, T153, T154 |
| SC-011 0 absolute paths / 0 stacks | T059, T106, T143 |
| SC-012 audit 0 findings ≥ MEDIUM | T158 |
| SC-013 CSS collision blocks | T028, T029 |
| SC-014 concurrency blocks (wrote:false) | T116, T117 |

## Traceability — Constitution → Tasks/Gates (17/17)

| Principle | Coverage |
|---|---|
| I One Design System per project | T010 (single source), T091 |
| II Local files are source of truth | T091 (no source mutation), T150 |
| III DTCG canonical tokens | T010, T016 (reuse analysis; no second parser) |
| IV Style Dictionary pipeline | PASS (N/A): 006 no altera el pipeline; renderers puros |
| V Framework independence | T061 (no runtime/manager import) |
| VI Manager is tool, not DS | T091 (artifacts downstream, never source) |
| VII Visual editing transparency | T101, T106 (logical paths + hashes, no absolute) |
| VIII Validate before generation | T132, T091 (input verification gate antes de render/write) |
| IX Contracts before implementation | tareas ancladas a `contracts/` + gates por checkpoint |
| X Accessibility structural | PASS (N/A): sin UI |
| XI Pages as validation | PASS (N/A): sin pages/viewer |
| XII Content optional context | PASS (N/A): sin content |
| XIII Local-first | T120 (sin red), T065 (sin ejecución) |
| XIV Safe modifications | T111, T120, T125, T126 (preservar unknown, set atómico, recovery, sin rollback destructivo) |
| XV Controlled agent integration | T090, T098 (headless + JSON estable) |
| XVI Incremental/verifiable | gates A–L: T013, T025, T054, T060, T067, T089, T097, T108, T118, T131, T139, T157 |
| XVII Portability / no lock-in | T055, T061 (CSS/JSON/TS estándar, sin runtime del manager) |

## Validation Summary

- Total tasks: 158 (T001–T158), continuos, únicos, 0 completados.
- Checkpoints: 12 (A–L), cada uno con objetivo, precondiciones, tareas, regresión, gate y commit sugerido.
- Gates: 12/12. Commits sugeridos: 12/12.
- CSS types cubiertos: 15/15 (T037–T051). Ownership scenarios: 13 (T076–T088). Recovery states: T122–T126.
- Outcomes/exits: T003/T104/T105/T103. Regresión 001–005 granular: T150–T154.
- Trazabilidad: US 20/20, FR 68/68, SC 14/14, Constitution 17/17.
- `partial`/`success` públicos: 0. `export` conectado a writer: 0. Flags fuera de alcance: 0.
- NEEDS CLARIFICATION: 0. Contradicciones: 0.
