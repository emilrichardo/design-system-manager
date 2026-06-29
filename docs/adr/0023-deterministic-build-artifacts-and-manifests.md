# ADR 0023 — Deterministic build artifacts and manifests

- **Estado**: Aceptado
- **Fecha**: 2026-06-29
- **Contexto**: 006 debe generar artefactos byte-estables y un build manifest que sirva como autoridad
  de ownership para builds posteriores, sin confundirlo con el Design System host manifest.

## Decisión

1. Todos los artefactos son UTF-8 sin BOM, LF y newline final.
2. El orden canónico es: categorías foundation (`color`, `spacing`, `typography`, `radius`, `border`,
   `shadow`, `opacity`, `sizing`, `motion`), luego rutas parent-before-child; paths no foundation van
   después en comparación bytewise, sin `localeCompare` dependiente del entorno.
3. CSS usa `:root`, custom properties sin prefijo, y detección global de colisiones antes de
   serializar. El nombre exacto es `"--" + segments.join("-")`; cada segmento debe cumplir
   `^[A-Za-z0-9_][A-Za-z0-9_-]*$`; no hay lowercasing, Unicode normalization ni identifier escaping en
   v1.
4. La matriz CSS v1 clasifica cada tipo como `SUPPORTED`, `CONDITIONALLY_SUPPORTED` o
   `UNSUPPORTED_IN_CSS_V1`. Composites (`strokeStyle`, `border`, `transition`, `shadow`, `gradient`,
   `typography`) y `boolean` son unsupported. `color` solo emite hex lowercase cuando el shape srgb
   tiene `hex` y alpha ausente/1; otros shapes válidos para el analizador son unsupported en CSS v1.
5. CSS aliases emiten `var(--immediate-target)` si todo el chain tiene variables válidas; no hay
   fallback silencioso al valor final.
6. `ResolvedTokensV1`, `BuildManifestV1` y `BuildJsonEnvelopeV1` son contratos independientes con
   `formatVersion: "1.0.0"`.
7. Hashes: SHA-256 lowercase hexadecimal sobre bytes exactos. `sourceHash` usa los bytes exactos
   iniciales de `base.tokens.json`; `contentHash` usa bytes exactos del artefacto. El build manifest no
   se lista a sí mismo.
8. El build manifest (`design-system/build/manifest.json`) excluye timestamps, cwd, hostname, usuario,
   Node version, UUID y cualquier ruta absoluta. El Design System host manifest es
   `design-system/design-system.json` y no prueba ownership de artefactos generados.

## Consecuencias

- Builds idénticos producen bytes y hashes idénticos.
- El build manifest puede distinguir archivos gestionados de desconocidos.
- El JSON público no se acopla a contratos cerrados de 003/004/005.

## Alternativas rechazadas

- Hashear objetos JS: depende de serialización implícita.
- Preservar orden del documento como único criterio: dos fuentes equivalentes pueden diferir.
- Incluir metadata de entorno: rompe reproducibilidad.
- Escapar identifiers CSS en v1: produciría nombres públicos sorprendentes y reglas de colisión más
  difíciles de auditar.
