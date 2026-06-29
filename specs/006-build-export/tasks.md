# Tasks: 006-build-export

**Input**: `specs/006-build-export/spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`
**Scope**: Implementacion futura de build/export determinista para artefactos CSS, JSON resuelto y TypeScript.
**Generated**: 2026-06-29
**Status**: Backlog tecnico ejecutable; ninguna tarea esta completada.

## Execution Rules

- Ejecutar en orden por checkpoint: A -> B -> C/D/E -> F/G -> H -> I -> J -> K -> L.
- Mantener commits sugeridos como puntos de control; no mezclar checkpoints salvo para tareas marcadas `[P]`.
- Correr los gates indicados al final de cada checkpoint antes de avanzar.
- Cada tarea de implementacion o prueba apunta a un path concreto.
- No crear `specs/006-build-export/audit.md` hasta el cierre del checkpoint L.
- No modificar features cerradas 001-005 salvo pruebas de regresion explicitamente listadas aqui.

## Checkpoint A - Modelos, source snapshot y resolved token view

**Objective**: Definir el nucleo de dominio y la captura de entrada que alimenta todo build/export sin duplicar analisis existente.
**Preconditions**: `specs/006-build-export/plan.md` y `specs/006-build-export/data-model.md` estan vigentes; features 001-005 siguen cerradas.

### Tasks

- [ ] T001 Crear `src/domain/build-export/build-format.ts` con formatos canonicos `css`, `json`, `ts` y validaciones de lista ordenada.
- [ ] T002 Crear `src/domain/build-export/artifact.ts` con `ArtifactKind`, `ArtifactPath`, `ArtifactBytes`, `ArtifactHash` y metadatos deterministas.
- [ ] T003 Crear `src/domain/build-export/logical-path.ts` con normalizacion de logical paths, rechazo de traversal y preservacion de orden canonico.
- [ ] T004 Crear `src/domain/build-export/build-outcome.ts` con outcomes, conflict kinds, recovery statuses y exit categories.
- [ ] T005 Crear `src/domain/build-export/source-snapshot.ts` con `SourceSnapshot`, `SourceDocumentSnapshot`, hash de bytes y texto UTF-8 validado.
- [ ] T006 Crear `src/domain/build-export/resolved-token-view.ts` con `ResolvedTokenView`, alias path, valor resuelto, tipo DTCG y procedencia.
- [ ] T007 Crear `src/domain/build-export/verification.ts` con modelos de verificacion post-write, mismatch y ausencia de artefactos.
- [ ] T008 Crear `src/domain/build-export/index.ts` exportando solo tipos y funciones publicas del dominio build/export.
- [ ] T009 [P] Crear `tests/domain/build-export/build-domain-models.test.ts` para invariantes de formatos, paths, hashes y outcomes.
- [ ] T010 Extender `src/application/analysis-ports.ts` para exponer snapshots de bytes y texto sin romper contratos de analisis existentes.
- [ ] T011 Extender `src/infrastructure/analysis/managed-document-reader.ts` para devolver contenido, bytes y hash input cuando se solicite source snapshot.
- [ ] T012 [P] Crear `tests/integration/build-export/source-snapshot-reader.test.ts` con UTF-8 estricto, size bytes y hash estable.
- [ ] T013 Crear `src/infrastructure/build-export/hash.ts` con SHA-256 hexadecimal para bytes de entrada y artefactos generados.
- [ ] T014 [P] Crear `tests/infrastructure/build-export/hash.test.ts` con vectores deterministas y diferencia texto/bytes.
- [ ] T015 Crear `src/application/build-export/create-source-snapshot.ts` reutilizando lectura administrada y limites de `src/domain/traversal/limits.ts`.
- [ ] T016 Crear `src/application/build-export/create-resolved-token-view.ts` reutilizando resultados del analizador y resolucion de alias existente.
- [ ] T017 [P] Crear `tests/integration/build-export/resolved-token-view.test.ts` para alias chains, procedencia y ausencia de segundo grafo de aliases.
- [ ] T018 Ejecutar gate A desde `package.json`: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `git diff --check`.

**Regression**: T012 y T017 deben probar que el analizador existente no cambia su salida publica.
**Suggested commit**: `feat: add build export source snapshot models`
**First task next checkpoint**: T019
**Exclusions**: No renderers, no writer transaccional, no CLI.

## Checkpoint B - Proyeccion normalizada y orden canonico

**Objective**: Convertir `ResolvedTokenView` en una proyeccion estable por formato, con orden total y decisiones de soportado/no soportado.
**Preconditions**: Checkpoint A completo y gate A verde.

### Tasks

- [ ] T019 Crear `src/domain/build-export/normalized-token.ts` con `NormalizedToken`, `NormalizedAlias`, `UnsupportedToken` y `TokenProjectionIssue`.
- [ ] T020 Crear `src/domain/build-export/build-token-order.ts` con comparador canonico por logical path, formato y tipo.
- [ ] T021 Crear `src/application/build-export/create-build-projection.ts` para mapear resolved tokens a tokens normalizados.
- [ ] T022 Crear `src/application/build-export/map-foundation-token.ts` para conservar decisiones de foundations ya implementadas en 004.
- [ ] T023 Crear `src/application/build-export/classify-build-support.ts` para separar soportado, partial y blocked por formato.
- [ ] T024 [P] Crear `tests/domain/build-export/build-token-order.test.ts` para orden lexicografico estable, profundidad y desempates.
- [ ] T025 [P] Crear `tests/application/build-export/create-build-projection.test.ts` para copias defensivas y entrada inmutable.
- [ ] T026 Crear `tests/integration/build-export/build-projection-aliases.test.ts` para aliases validos, aliases rotos y ciclos reportados por analisis.
- [ ] T027 Crear `tests/fixtures/build-export/projection/source.tokens.json` como fixture minimo de tokens color, dimension y number.
- [ ] T028 Crear `src/application/build-export/index.ts` exportando source snapshot, resolved view y proyeccion normalizada.
- [ ] T029 Crear `tests/integration/build-export/build-projection-determinism.test.ts` para misma entrada en distinto orden JSON y misma proyeccion.
- [ ] T030 Ejecutar gate B desde `package.json`: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `git diff --check`.

**Regression**: T026 debe preservar errores contractuales de alias existentes.
**Suggested commit**: `feat: add normalized build projection`
**First task next checkpoint**: T031, T053 o T064, segun paralelismo de renderers.
**Exclusions**: No escritura de archivos ni manifiestos.

## Checkpoint C - CSS naming, escaping y renderer

**Objective**: Renderizar CSS custom properties deterministas, seguras y parcialmente generables cuando existan tokens no soportados.
**Preconditions**: Checkpoint B completo y gate B verde.

### Tasks

- [ ] T031 Crear `src/domain/build-export/css/css-name.ts` con reglas de nombre canonico para custom properties desde logical paths.
- [ ] T032 Crear `src/domain/build-export/css/css-escape.ts` con escaping determinista para segmentos, caracteres especiales y prefijos numericos.
- [ ] T033 Crear `src/domain/build-export/css/css-render-model.ts` con `CssRenderableToken`, `CssDeclaration`, `CssRenderWarning` y `CssRenderError`.
- [ ] T034 Crear `src/domain/build-export/css/css-name-collision.ts` para detectar colisiones post-normalizacion y producir conflictos explicitos.
- [ ] T035 [P] Crear `tests/domain/build-export/css/css-name.test.ts` para kebab case, segmentos reservados, Unicode escapado y colisiones.
- [ ] T036 [P] Crear `tests/domain/build-export/css/css-escape.test.ts` para espacios, slashes, dots, numeros iniciales y caracteres no ASCII.
- [ ] T037 Crear `src/infrastructure/build-export/css/render-css-value.ts` para color, dimension, duration, number, font family, font weight y cubic bezier.
- [ ] T038 Crear `src/infrastructure/build-export/css/render-css-alias.ts` para alias como `var(--token-name)` con fallback bloqueado por defecto.
- [ ] T039 Crear `src/infrastructure/build-export/css/render-css-file.ts` con header minimo, `:root`, orden canonico y newline final.
- [ ] T040 Crear `src/infrastructure/build-export/css/css-renderer.ts` como renderer de formato `css` sobre `NormalizedTokenSet`.
- [ ] T041 Crear `src/application/build-export/classify-css-support.ts` para marcar shadow, gradient, typography, border y transition como no soportados en CSS si no hay mapeo seguro.
- [ ] T042 Crear `src/application/build-export/create-css-artifact.ts` para producir artefacto CSS partial cuando existan tokens no soportados no bloqueantes.
- [ ] T043 Crear `tests/infrastructure/build-export/css/render-css-value.test.ts` para tipos DTCG soportados y errores de valores invalidos.
- [ ] T044 Crear `tests/infrastructure/build-export/css/css-renderer.test.ts` para snapshot determinista de CSS con newline final.
- [ ] T045 Crear `tests/integration/build-export/css-alias-output.test.ts` para alias resueltos como `var()` y nombres estables.
- [ ] T046 Crear `tests/integration/build-export/css-unsupported-partial.test.ts` para salida parcial, warnings y exclusion de tipos no soportados.
- [ ] T047 Crear `tests/integration/build-export/css-name-collision.test.ts` para bloqueo explicito por colision de custom property.
- [ ] T048 Crear `tests/integration/build-export/css-invalid-alias-blocks.test.ts` para alias roto, alias circular y alias a tipo incompatible.
- [ ] T049 Crear `tests/fixtures/build-export/css/source.tokens.json` con fixture amplio de tokens CSS soportados y no soportados.
- [ ] T050 Crear `tests/integration/build-export/css-deterministic-output.test.ts` comparando hashes CSS de entradas reordenadas.
- [ ] T051 Actualizar `src/application/build-export/index.ts` para exportar `createCssArtifact` sin exponer infraestructura interna.
- [ ] T052 Ejecutar gate C desde `package.json`: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `git diff --check`.

**Regression**: T046 y T048 cubren salida parcial segura y bloqueo por defectos contractuales.
**Suggested commit**: `feat: render deterministic css artifacts`
**First task next checkpoint**: T053 o T064 si aun no se ejecutaron en paralelo.
**Exclusions**: No TypeScript renderer, no JSON renderer, no writer.

## Checkpoint D - JSON resuelto

**Objective**: Renderizar JSON resuelto estable, sin filtrar metadata interna y preservando formato DTCG util para consumidores.
**Preconditions**: Checkpoint B completo y gate B verde.

### Tasks

- [ ] T053 Crear `src/domain/build-export/json/json-render-model.ts` con `ResolvedJsonDocument`, `ResolvedJsonToken` y errores de serializacion.
- [ ] T054 Crear `src/infrastructure/build-export/json/create-resolved-json-document.ts` para convertir proyeccion normalizada a documento JSON publico.
- [ ] T055 Crear `src/infrastructure/build-export/json/render-json-file.ts` con orden canonico, indentacion estable de dos espacios y newline final.
- [ ] T056 Crear `src/infrastructure/build-export/json/json-renderer.ts` como renderer de formato `json` con aliases resueltos y procedencia omitida.
- [ ] T057 Crear `src/application/build-export/create-json-artifact.ts` para producir artefacto JSON resuelto y warnings no bloqueantes.
- [ ] T058 [P] Crear `tests/infrastructure/build-export/json/render-json-file.test.ts` para orden, indentacion y newline final.
- [ ] T059 Crear `tests/integration/build-export/json-resolved-output.test.ts` para valores resueltos, alias chains y ausencia de `$extensions` internas.
- [ ] T060 Crear `tests/integration/build-export/json-deterministic-output.test.ts` comparando hash de entradas reordenadas.
- [ ] T061 Crear `tests/fixtures/build-export/json/source.tokens.json` con fixture de aliases, tipos soportados y metadata publica.
- [ ] T062 Actualizar `src/application/build-export/index.ts` para exportar `createJsonArtifact`.
- [ ] T063 Ejecutar gate D desde `package.json`: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `git diff --check`.

**Regression**: T059 debe confirmar que no se exponen detalles internos del analizador.
**Suggested commit**: `feat: render resolved json artifacts`
**First task next checkpoint**: T064 o T075, segun avance paralelo.
**Exclusions**: No CSS renderer adicional, no TypeScript renderer, no writer.

## Checkpoint E - TypeScript renderer

**Objective**: Renderizar modulo TypeScript determinista con tipos utiles, valores resueltos y export estable.
**Preconditions**: Checkpoint B completo y gate B verde.

### Tasks

- [ ] T064 Crear `src/domain/build-export/typescript/typescript-render-model.ts` con `TypescriptModule`, `TypescriptExport`, `TypescriptRenderError`.
- [ ] T065 Crear `src/infrastructure/build-export/typescript/sanitize-typescript-identifier.ts` para nombres exportables y deteccion de colisiones.
- [ ] T066 Crear `src/infrastructure/build-export/typescript/render-typescript-value.ts` para literales `as const` seguros.
- [ ] T067 Crear `src/infrastructure/build-export/typescript/render-typescript-file.ts` con header minimo, exports canonicos, newline final y sin imports runtime.
- [ ] T068 Crear `src/infrastructure/build-export/typescript/typescript-renderer.ts` como renderer de formato `ts`.
- [ ] T069 Crear `src/application/build-export/create-typescript-artifact.ts` para producir artefacto TypeScript y diagnosticos de identifiers.
- [ ] T070 [P] Crear `tests/infrastructure/build-export/typescript/sanitize-typescript-identifier.test.ts` para palabras reservadas, numeros y colisiones.
- [ ] T071 Crear `tests/infrastructure/build-export/typescript/typescript-renderer.test.ts` para snapshot estable y literales `as const`.
- [ ] T072 Crear `tests/integration/build-export/typescript-output.test.ts` para aliases resueltos, tipos DTCG y compilabilidad con `tsc`.
- [ ] T073 Actualizar `src/application/build-export/index.ts` para exportar `createTypescriptArtifact`.
- [ ] T074 Ejecutar gate E desde `package.json`: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `git diff --check`.

**Regression**: T072 debe probar que el artefacto generado no depende de paths internos del paquete.
**Suggested commit**: `feat: render typescript token artifacts`
**First task next checkpoint**: T075
**Exclusions**: No manifest ni escritura atomica.

## Checkpoint F - Manifest, hashes y ownership

**Objective**: Definir manifest versionado, hashing de artefactos, ownership de salidas y deteccion de conflictos antes de escribir.
**Preconditions**: Checkpoints C, D y E completos o stubs equivalentes con gates verdes.

### Tasks

- [ ] T075 Crear `src/domain/build-export/manifest.ts` con `BuildManifestV1`, version, source hash, artifact entries y timestamp determinista opcional.
- [ ] T076 Crear `src/domain/build-export/ownership.ts` con ownership states `owned`, `foreign`, `missing`, `modified`, `unknown`.
- [ ] T077 Crear `src/domain/build-export/artifact-set.ts` con conjunto de artefactos, paths relativos y hashes esperados.
- [ ] T078 Crear `src/application/build-export/create-build-manifest.ts` para manifest desde source snapshot, projection y artifact set.
- [ ] T079 Crear `src/application/build-export/parse-existing-manifest.ts` para leer manifest previo y validar schema/version.
- [ ] T080 Crear `src/application/build-export/detect-output-ownership.ts` para comparar manifest previo, archivos actuales y artefactos esperados.
- [ ] T081 Crear `src/infrastructure/build-export/manifest/manifest-renderer.ts` para serializacion JSON estable del manifest.
- [ ] T082 [P] Crear `tests/domain/build-export/manifest.test.ts` para version, hashes, paths relativos y schema de entradas.
- [ ] T083 Crear `tests/application/build-export/create-build-manifest.test.ts` para manifest determinista y source hash correcto.
- [ ] T084 Crear `tests/application/build-export/detect-output-ownership.test.ts` para owned, foreign, modified, missing y unknown.
- [ ] T085 Crear `tests/integration/build-export/manifest-roundtrip.test.ts` para parse/render estable de `build.manifest.json`.
- [ ] T086 Crear `tests/fixtures/build-export/manifest/build.manifest.json` con fixture versionado valido.
- [ ] T087 Crear `tests/integration/build-export/manifest-idempotency.test.ts` para manifest igual cuando entrada y opciones no cambian.
- [ ] T088 Ejecutar gate F desde `package.json`: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `git diff --check`.

**Regression**: T084 debe impedir sobrescritura de archivos no pertenecientes al sistema.
**Suggested commit**: `feat: add build export manifest ownership`
**First task next checkpoint**: T089
**Exclusions**: No writer transaccional aun.

## Checkpoint G - Casos de uso build/export

**Objective**: Orquestar build y export headless sobre renderers, manifest y resultados sin acoplarse a CLI.
**Preconditions**: Checkpoints C, D, E y F completos; gates verdes.

### Tasks

- [ ] T089 Crear `src/application/build-export/build-artifacts-use-case.ts` para pipeline source snapshot -> projection -> renderers -> manifest.
- [ ] T090 Crear `src/application/build-export/export-artifacts-use-case.ts` para construir artifact set y delegar escritura a un puerto aun no implementado.
- [ ] T091 Crear `src/application/build-export/build-export-ports.ts` con puertos de filesystem snapshot, writer, clock, reporter y process IO.
- [ ] T092 Crear `src/application/build-export/select-build-formats.ts` para defaults y validacion de combinaciones `css`, `json`, `ts`.
- [ ] T093 Crear `src/application/build-export/evaluate-build-result.ts` para outcome success, partial, blocked y verification-error.
- [ ] T094 Crear `src/application/build-export/build-options.ts` con opciones de input, output dir, dry run, force, format y cwd.
- [ ] T095 Crear `src/application/build-export/build-export-errors.ts` con errores tipados y mapeo a categorias publicas.
- [ ] T096 Crear `tests/application/build-export/build-artifacts-use-case.test.ts` para pipeline exitoso de tres formatos y manifest.
- [ ] T097 Crear `tests/application/build-export/build-artifacts-partial.test.ts` para CSS parcial con JSON/TS exitosos.
- [ ] T098 Crear `tests/application/build-export/build-artifacts-blocked.test.ts` para bloqueo por alias contractual, colision y entrada invalida.
- [ ] T099 Crear `tests/application/build-export/export-artifacts-use-case.test.ts` con writer fake y no escritura directa desde aplicacion.
- [ ] T100 Crear `tests/integration/build-export/headless-use-cases.test.ts` para ejecucion sin CLI ni prompts.
- [ ] T101 Ejecutar gate G desde `package.json`: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `git diff --check`.

**Regression**: T099 preserva frontera aplicacion/infraestructura y evita side effects prematuros.
**Suggested commit**: `feat: orchestrate build export use cases`
**First task next checkpoint**: T102
**Exclusions**: No reporters CLI finales ni writer real.

## Checkpoint H - Reporters, JSON publico, outcomes y streams

**Objective**: Publicar resultados humanos y JSON estable con streams, codigos de salida y diagnosticos consumibles.
**Preconditions**: Checkpoint G completo y gate G verde.

### Tasks

- [ ] T102 Crear `src/application/build-export/public-build-result.ts` con DTO publico para `--json`, warnings, conflicts, artifacts y manifest.
- [ ] T103 Crear `src/application/build-export/map-build-result-to-public-json.ts` para convertir resultados internos a contrato JSON publico.
- [ ] T104 Crear `src/infrastructure/build-export/reporters/json-build-reporter.ts` para emitir JSON estable por stdout.
- [ ] T105 Crear `src/infrastructure/build-export/reporters/human-build-reporter.ts` para resumen humano, tabla de artefactos y diagnosticos.
- [ ] T106 Crear `src/infrastructure/build-export/reporters/build-stream-policy.ts` para stdout/stderr, silent mode y errores no JSON.
- [ ] T107 Crear `src/application/build-export/map-build-outcome-to-exit-code.ts` para exit codes success, partial, blocked, validation y unexpected.
- [ ] T108 Crear `tests/application/build-export/map-build-result-to-public-json.test.ts` para contrato JSON sin campos internos.
- [ ] T109 Crear `tests/infrastructure/build-export/reporters/json-build-reporter.test.ts` para stdout JSON parseable y stderr vacio.
- [ ] T110 Crear `tests/infrastructure/build-export/reporters/human-build-reporter.test.ts` para resumen legible de success, partial y blocked.
- [ ] T111 Crear `tests/application/build-export/map-build-outcome-to-exit-code.test.ts` para tabla completa de outcomes y exit codes.
- [ ] T112 Ejecutar gate H desde `package.json`: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `git diff --check`.

**Regression**: T108 y T109 deben mantener compatibilidad con contratos JSON publicos de 003.
**Suggested commit**: `feat: report build export outcomes`
**First task next checkpoint**: T113
**Exclusions**: No CLI final, no writer transaccional.

## Checkpoint I - Snapshot filesystem, unknown nodes y concurrencia

**Objective**: Observar directorios de salida de forma segura antes de escribir, preservando archivos desconocidos y detectando carreras.
**Preconditions**: Checkpoints F y G completos; gate H puede avanzar en paralelo si no toca writer.

### Tasks

- [ ] T113 Crear `src/domain/build-export/filesystem-snapshot.ts` con nodos archivo/directorio/symlink, mtime, size y hash opcional.
- [ ] T114 Crear `src/domain/build-export/concurrency-check.ts` con preconditions de escritura, tokens de snapshot y diferencias detectadas.
- [ ] T115 Crear `src/infrastructure/build-export/filesystem/read-output-snapshot.ts` para caminar output dir con limites de profundidad y bytes.
- [ ] T116 Crear `src/infrastructure/build-export/filesystem/classify-output-node.ts` para owned, unknown, symlink, unsupported y ignored.
- [ ] T117 Crear `src/infrastructure/build-export/filesystem/detect-output-concurrency.ts` para comparar snapshot previo y estado actual antes de publish.
- [ ] T118 Crear `src/application/build-export/evaluate-output-snapshot.ts` para transformar snapshot en ownership y conflictos publicos.
- [ ] T119 [P] Crear `tests/domain/build-export/concurrency-check.test.ts` para cambios de mtime, size, hash y nodo eliminado.
- [ ] T120 Crear `tests/infrastructure/build-export/filesystem/read-output-snapshot.test.ts` para directorio inexistente, vacio, symlink y limites.
- [ ] T121 Crear `tests/infrastructure/build-export/filesystem/detect-output-concurrency.test.ts` para carreras antes de publish y despues de staging.
- [ ] T122 Crear `tests/application/build-export/evaluate-output-snapshot.test.ts` para unknown files preservados y conflicts reportados.
- [ ] T123 Crear `tests/integration/build-export/unknown-output-nodes.test.ts` para no borrar archivos manuales del directorio.
- [ ] T124 Crear `tests/integration/build-export/concurrent-output-change.test.ts` para fallo controlado si cambia un archivo entre snapshot y publish.
- [ ] T125 Ejecutar gate I desde `package.json`: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `git diff --check`.

**Regression**: T123 protege archivos desconocidos y T124 evita corrupcion por concurrencia.
**Suggested commit**: `feat: inspect build export output filesystem`
**First task next checkpoint**: T126
**Exclusions**: No publish atomico aun.

## Checkpoint J - Writer transaccional por directorio

**Objective**: Escribir artifact sets por directorio con staging, publish atomico, rollback y preservacion de nodos ajenos.
**Preconditions**: Checkpoints F, G e I completos; gates verdes.

### Tasks

- [ ] T126 Crear `src/domain/build-export/write-plan.ts` con operaciones stage, publish, preserve, remove-owned y rollback.
- [ ] T127 Crear `src/infrastructure/build-export/filesystem/create-write-plan.ts` para calcular operaciones desde artifact set y ownership.
- [ ] T128 Crear `src/infrastructure/build-export/filesystem/stage-artifact-set.ts` para escribir todos los artefactos en directorio temporal.
- [ ] T129 Crear `src/infrastructure/build-export/filesystem/publish-artifact-set.ts` para reemplazo atomico por directorio en el mismo filesystem.
- [ ] T130 Crear `src/infrastructure/build-export/filesystem/rollback-artifact-set.ts` para restaurar estado anterior ante fallo de publish.
- [ ] T131 Crear `src/infrastructure/build-export/filesystem/preserve-unknown-nodes.ts` para copiar o mantener nodos desconocidos segun ownership.
- [ ] T132 Crear `src/infrastructure/build-export/filesystem/remove-owned-artifacts.ts` para eliminar artefactos previos solo si manifest los reconoce.
- [ ] T133 Crear `src/infrastructure/build-export/filesystem/directory-artifact-writer.ts` implementando el puerto de writer transaccional.
- [ ] T134 Crear `src/infrastructure/build-export/filesystem/platform-write-retry.ts` para retries acotados en errores transitorios de filesystem.
- [ ] T135 Crear `tests/infrastructure/build-export/filesystem/create-write-plan.test.ts` para preserve, remove-owned, stage y rollback planificados.
- [ ] T136 Crear `tests/infrastructure/build-export/filesystem/directory-artifact-writer.test.ts` para success, fallo en stage, fallo en publish y rollback.
- [ ] T137 Crear `tests/integration/build-export/atomic-directory-write.test.ts` para no dejar directorios temporales visibles tras exito.
- [ ] T138 Crear `tests/integration/build-export/rollback-on-write-failure.test.ts` para restaurar salida previa y manifest previo.
- [ ] T139 Ejecutar gate J desde `package.json`: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `git diff --check`.

**Regression**: T136 y T138 son obligatorias antes de conectar CLI a escritura real.
**Suggested commit**: `feat: write build export artifacts transactionally`
**First task next checkpoint**: T140
**Exclusions**: No CLI publica final todavia.

## Checkpoint K - Verificacion, recuperacion e idempotencia

**Objective**: Verificar artefactos publicados, recuperar fallos controlados y garantizar idempotencia observable.
**Preconditions**: Checkpoint J completo y gate J verde.

### Tasks

- [ ] T140 Crear `src/application/build-export/verify-artifact-set.ts` para comparar hashes esperados contra archivos publicados.
- [ ] T141 Crear `src/application/build-export/verify-build-manifest.ts` para validar manifest escrito contra artifact set y source snapshot.
- [ ] T142 Crear `src/application/build-export/recover-build-export.ts` para clasificar recovery completed, rolled-back, manual-required.
- [ ] T143 Crear `src/application/build-export/complete-export-transaction.ts` integrando writer, verificacion y recovery.
- [ ] T144 Crear `tests/application/build-export/verify-artifact-set.test.ts` para missing, hash mismatch y contenido correcto.
- [ ] T145 Crear `tests/application/build-export/verify-build-manifest.test.ts` para manifest corrupto, version incompatible y hash incorrecto.
- [ ] T146 Crear `tests/application/build-export/complete-export-transaction.test.ts` para success, verification-error y rollback visible.
- [ ] T147 Crear `tests/integration/build-export/export-idempotency.test.ts` para dos ejecuciones iguales sin cambios de hashes ni manifest.
- [ ] T148 Crear `tests/integration/build-export/export-recovery.test.ts` para fallo simulado y reporte de recovery.
- [ ] T149 Crear `tests/integration/build-export/rebuild-after-manual-change.test.ts` para detectar modified owned artifact antes de overwrite.
- [ ] T150 Ejecutar gate K desde `package.json`: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `git diff --check`.

**Regression**: T147 y T149 cubren idempotencia y proteccion ante cambios manuales.
**Suggested commit**: `feat: verify and recover build export writes`
**First task next checkpoint**: T151
**Exclusions**: No documentar cierre hasta CLI y packaging.

## Checkpoint L - CLI, procesos hijos, packaging, regresion, documentacion y auditoria

**Objective**: Exponer comandos finales, validar procesos reales, empaquetado, regresiones 001-005 y cierre documental.
**Preconditions**: Checkpoints A-K completos; todos los gates previos verdes.

### Tasks

- [ ] T151 Crear `src/cli/commands/build.ts` con comando `build`, opciones de input/output/formats/json/dry-run/force/cwd y reporter humano.
- [ ] T152 Crear `src/cli/commands/export.ts` con comando `export`, salida JSON opcional, exit codes publicos y writer transaccional real.
- [ ] T153 Actualizar `src/cli/index.ts` para registrar `build` y `export` sin alterar comandos existentes.
- [ ] T154 Crear `tests/cli/build-export.cli.test.ts` para success, partial, blocked, `--json`, `--dry-run`, `--cwd` y exit codes.
- [ ] T155 Crear `tests/integration/build-export/child-process-build-export.test.ts` para ejecutar binario empaquetado desde un fixture externo.
- [ ] T156 Crear `tests/integration/build-export/package-consumption.test.ts` para `npm pack`, instalacion temporal y uso de `build`/`export`.
- [ ] T157 Actualizar `package.json` solo si falta registrar archivos CLI o exports requeridos por `build`/`export`.
- [ ] T158 Crear `tests/regression/build-export/closed-features-001-005.test.ts` para confirmar que init, validate/inspect, json-output, foundations y presets no cambian sus contratos.
- [ ] T159 Actualizar `specs/006-build-export/quickstart.md` solo si la implementacion final demuestra una discrepancia operacional menor.
- [ ] T160 Crear `specs/006-build-export/audit.md` al cierre con evidencia de gates, cobertura de US/FR/SC/Constitution y decision final de readiness.
- [ ] T161 Ejecutar gate L desde `package.json`: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `git diff --check`.

**Regression**: T154, T155, T156 y T158 son obligatorias para cerrar la feature.
**Suggested commit**: `feat: expose build export cli`
**First task next checkpoint**: Ninguna; cerrar con `specs/006-build-export/audit.md`.
**Exclusions**: No nuevas dependencias salvo defecto contractual demostrado y documentado.

## Dependencies

- A (`T001-T018`) -> B (`T019-T030`)
- B (`T019-T030`) -> C (`T031-T052`), D (`T053-T063`), E (`T064-T074`)
- C + D + E -> F (`T075-T088`) y G (`T089-T101`)
- F -> G cuando el manifest real sea necesario para artifact sets
- G -> H (`T102-T112`)
- F + G -> I (`T113-T125`)
- I -> J (`T126-T139`)
- J -> K (`T140-T150`)
- H + K -> L (`T151-T161`)

## Parallel Opportunities

- T009, T012, T014 y T017 pueden ejecutarse en paralelo tras los modelos A correspondientes.
- T024 y T025 pueden ejecutarse en paralelo con T026 una vez creada la proyeccion B.
- Checkpoints C, D y E pueden avanzar en paralelo despues de B, siempre que cada renderer mantenga sus paths aislados.
- T035 y T036 son paralelas dentro del renderer CSS.
- T058 puede avanzar en paralelo con T059-T061 si el contrato JSON ya esta acordado.
- T070 puede avanzar en paralelo con T071-T072 si el sanitizador TS esta definido.
- T082 puede avanzar en paralelo con T083-T085 tras el modelo de manifest.
- T119 puede avanzar en paralelo con T120-T124 tras los modelos de snapshot/concurrency.
- T154, T155, T156 y T158 pueden ejecutarse en paralelo tras registrar CLI y empaquetado.

## User Story Traceability - 20/20

| User story | Primary tasks |
| --- | --- |
| US1 build completo | T089-T101, T140-T150, T151-T154 |
| US2 export CSS | T031-T052, T089-T101, T151-T154 |
| US3 export JSON resuelto | T053-T063, T089-T101, T151-T154 |
| US4 export TypeScript | T064-T074, T089-T101, T151-T154 |
| US5 aliases CSS | T038, T045, T048, T050 |
| US6 aliases JSON/TS | T016, T056, T067, T059, T072 |
| US7 CSS parcial | T041-T046, T093, T097 |
| US8 build parcial multisalida | T092-T098, T102-T112 |
| US9 idempotencia | T087, T147, T149 |
| US10 archivos desconocidos | T076, T080, T113-T124, T131 |
| US11 colisiones CSS | T034, T047 |
| US12 concurrencia | T114, T117, T119, T121, T124 |
| US13 verificacion y recuperacion | T140-T148 |
| US14 paquete instalado | T155-T157 |
| US15 cwd/directorios | T094, T151-T156 |
| US16 reporte humano | T105, T106, T151 |
| US17 reporte JSON | T102-T104, T108-T109, T152 |
| US18 headless | T089-T101, T155 |
| US19 compatibilidad 001-005 | T017, T026, T108, T158 |
| US20 determinismo | T020, T024, T029, T050, T060, T071, T083, T147 |

## Functional Requirement Traceability - 68/68

| Requirements | Primary tasks |
| --- | --- |
| FR-001-FR-004 source snapshot y entrada | T005, T010-T017 |
| FR-005-FR-008 resolved view y proyeccion | T006, T016, T019-T029 |
| FR-009-FR-012 orden canonico | T020, T024, T029, T050, T060, T071 |
| FR-013-FR-018 CSS naming y valores | T031-T040, T043-T045 |
| FR-019-FR-022 CSS parcial y colisiones | T034, T041-T048 |
| FR-023-FR-027 JSON resuelto | T053-T063 |
| FR-028-FR-032 TypeScript output | T064-T074 |
| FR-033-FR-038 manifest y hashes | T075-T087 |
| FR-039-FR-043 ownership y desconocidos | T076, T080, T113-T124, T131-T132 |
| FR-044-FR-049 writer transaccional | T126-T139 |
| FR-050-FR-053 verificacion y recovery | T140-T148 |
| FR-054-FR-058 use cases headless | T089-T101 |
| FR-059-FR-062 reporters y streams | T102-T112 |
| FR-063-FR-066 CLI y procesos | T151-T156 |
| FR-067-FR-068 packaging y documentacion final | T157-T161 |

## Success Criteria Traceability - 14/14

| Success criteria | Evidence tasks |
| --- | --- |
| SC-001 build exitoso genera artefactos esperados | T096, T154 |
| SC-002 CSS determinista | T044, T050 |
| SC-003 JSON resuelto determinista | T058-T060 |
| SC-004 TypeScript usable | T071-T072, T156 |
| SC-005 manifest versionado | T083, T085 |
| SC-006 idempotencia | T087, T147 |
| SC-007 no sobrescribe desconocidos | T084, T123 |
| SC-008 detecta concurrencia | T121, T124 |
| SC-009 rollback/recovery | T136, T138, T146, T148 |
| SC-010 salida parcial segura | T046, T097 |
| SC-011 JSON publico estable | T108-T109, T154 |
| SC-012 CLI instalada funciona | T155-T156 |
| SC-013 regresion 001-005 verde | T158 |
| SC-014 auditoria de cierre completa | T160-T161 |

## Constitution Traceability - 17/17

| Principle | Coverage |
| --- | --- |
| I Library-first CLI | T089-T101, T151-T153 |
| II Deterministic outputs | T020, T024, T029, T050, T060, T071, T083, T147 |
| III DTCG canonical format | T019-T023, T037, T054, T066 |
| IV TypeScript strict ESM | T064-T074, T155-T157, all gates |
| V Contract-first public JSON | T102-T109, T154 |
| VI Atomic writes | T126-T139 |
| VII No silent data loss | T076, T080, T123, T149 |
| VIII Explicit errors | T004, T093, T095, T107, T140-T148 |
| IX Regression protection | T017, T026, T108, T158 |
| X Testable headless flows | T089-T101, T155 |
| XI Minimal dependencies | T157 and all gates |
| XII Security and path safety | T003, T031-T036, T113-T124, T151-T156 |
| XIII Streaming discipline | T104-T106, T109-T110 |
| XIV Documentation accuracy | T159-T160 |
| XV Backward compatibility | T017, T026, T108, T158 |
| XVI Packaging readiness | T155-T157 |
| XVII Formal closure evidence | T160-T161 |

## Quality Checklist

- Task IDs are continuous from T001 to T161.
- No task is marked complete.
- `[P]` appears only where dependencies allow real parallel execution.
- Every productive or test task names an exact path.
- Each checkpoint includes objective, preconditions, tasks, regression, gates, suggested commit, next task and exclusions.
- Dependencies and parallel opportunities are explicit.
- Traceability covers 20/20 user stories, 68/68 functional requirements, 14/14 success criteria and 17/17 constitution principles.
- No open clarification markers remain.
- `specs/006-build-export/audit.md` is intentionally scheduled for T160 and must not exist before implementation closure.
