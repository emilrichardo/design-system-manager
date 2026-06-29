# ADR 0023 — Deterministic build artifacts and manifests

- **Estado**: Aceptado
- **Fecha**: 2026-06-29
- **Contexto**: 006 debe generar artefactos byte-estables y un manifest que sirva como autoridad de
  ownership para builds posteriores.

## Decisión

1. Todos los artefactos son UTF-8 sin BOM, LF y newline final.
2. El orden canónico es: categorías foundation (`color`, `spacing`, `typography`, `radius`, `border`,
   `shadow`, `opacity`, `sizing`, `motion`), luego rutas parent-before-child; paths no foundation van
   después en comparación bytewise, sin `localeCompare` dependiente del entorno.
3. CSS usa `:root`, custom properties sin prefijo, y detección global de colisiones antes de serializar.
4. `ResolvedTokensV1`, `BuildManifestV1` y `BuildJsonEnvelopeV1` son contratos independientes con
   `formatVersion: "1.0.0"`.
5. Hashes: SHA-256 lowercase hexadecimal sobre bytes exactos. `sourceHash` usa bytes exactos de
   `base.tokens.json`; `contentHash` usa bytes exactos del artefacto. El manifest no se lista a sí
   mismo.
6. El manifest excluye timestamps, cwd, hostname, usuario, Node version, UUID y cualquier ruta absoluta.

## Consecuencias

- Builds idénticos producen bytes y hashes idénticos.
- El manifest puede distinguir archivos gestionados de desconocidos.
- El JSON público no se acopla a contratos cerrados de 003/004/005.

## Alternativas rechazadas

- Hashear objetos JS: depende de serialización implícita.
- Preservar orden del documento como único criterio: dos fuentes equivalentes pueden diferir.
- Incluir metadata de entorno: rompe reproducibilidad.
