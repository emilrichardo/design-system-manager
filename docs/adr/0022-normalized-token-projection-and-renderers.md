# ADR 0022 — Normalized token projection and renderers

- **Estado**: Aceptado
- **Fecha**: 2026-06-29
- **Contexto**: Feature 006-build-export debe producir CSS, JSON resuelto y TypeScript desde
  `design-system/tokens/base.tokens.json` sin crear un segundo parser, alias graph, resolved-type engine
  ni foundation analyzer.

## Decisión

1. `build` y `export` reutilizan una sola llamada al `AnalyzeUseCase` enlazado de 002 y una sola
   proyección de metadata/foundations de 004 por operación.
2. La aplicación crea un modelo readonly `NormalizedTokenSet` desde `DesignSystemAnalysis`, el documento
   de tokens parseado y `FoundationsInspection`.
3. Los renderers reciben solo `NormalizedTokenSet` y devuelven `BuildArtifact` o `unsupported-value`.
   Son puros: sin filesystem, cwd, reloj, random, procesos, streams ni Commander.
4. El registry v1 es explícito y cerrado: `css`, `json`, `typescript`. No hay plugins dinámicos ni
   imports controlados por usuario.
5. JSON y TypeScript usan records planos por token path. TypeScript exporta `tokens`, `tokenMetadata` y
   `TokenPath` sin imports runtime.

## Consecuencias

- La reutilización de 002/004 es testeable con spies de call-count.
- Los renderers quedan aislados y fáciles de verificar byte a byte.
- Los formatos futuros requieren contrato/ADR en lugar de aparecer por plugin implícito.

## Alternativas rechazadas

- Renderers que leen el documento fuente directamente: duplican reglas de análisis.
- Objeto TypeScript anidado: introduce colisiones estructurales y diverge del JSON resuelto.
- Plugins dinámicos: aumentan superficie de seguridad y packaging en v1.
