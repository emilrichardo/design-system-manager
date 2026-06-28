# ADR 0018 — Bundled preset catalog and preset envelope

- **Estado**: Aceptado
- **Fecha**: 2026-06-28
- **Contexto**: Feature 005-presets. La spec decidió presets inmutables incluidos en el paquete y
  formato envelope con metadata + bloque DTCG. Hay que elegir ubicación de assets, resolución en
  paquete instalado y contrato mínimo sin introducir presets locales ni rutas externas.

## Decisión

1. V1 usa un catálogo estático en `presets/` en la raíz del paquete:

   ```text
   presets/catalog.json
   presets/*.preset.json
   ```

2. La implementación deberá incluir `presets` en `package.json.files`, además de `dist`, y cubrir
   `npm pack --dry-run` más un smoke desde tarball instalado.
3. La resolución de assets se hace desde el módulo ESM compilado que implementa el catálogo
   (`dist/infrastructure/presets/bundled-preset-catalog.js`) con `new URL("../../../presets/catalog.json",
   import.meta.url)`. Nunca usa `process.cwd()`, red, variables de entorno ni rutas del preset.
4. Cada preset usa `PresetEnvelopeV1`: `id`, `name`, `description`, `version`,
   `includedCategories`, `tokens`. No hay campos desconocidos en v1.
5. El token block es DTCG y se valida en memoria con las funciones puras de `002`/`004`; no se
   materializa como proyecto host.

## Consecuencias

- Presets son reproducibles, offline y auditables en el tarball.
- Local/external presets quedan fuera de alcance.
- El plan de tareas deberá modificar packaging y tests, pero esta fase no crea presets reales.

## Alternativas rechazadas

- `src/presets/`: `tsc` no copia JSON; agrega riesgo de build-copy.
- `dist/presets/`: convierte assets fuente en artefactos derivados.
- Preset DTCG plano: no transporta metadata estable de catálogo.
- Manifest + DTCG separado: más archivos y más riesgo de desincronización.
