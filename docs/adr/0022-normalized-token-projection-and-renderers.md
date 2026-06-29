# ADR 0022 — Normalized token projection and renderers

- **Estado**: Aceptado
- **Fecha**: 2026-06-29
- **Contexto**: Feature 006-build-export debe producir CSS, JSON resuelto y TypeScript desde
  `design-system/tokens/base.tokens.json` sin crear un segundo parser, alias graph, resolved-type engine
  ni foundation analyzer.

## Decisión

1. `build` y `export` reutilizan una sola llamada semántica al `AnalyzeUseCase` enlazado de 002 y una
   sola proyección de metadata/foundations de 004 por operación.
2. La lectura inicial crea un `AnalyzedSourceSnapshot` interno con raw bytes, `sourceHash`, texto
   decodificado, documento parseado, `DesignSystemAnalysis`, `ResolvedTokenView` y proyección de
   foundations. Raw bytes/texto/documento parseado no cruzan puertos públicos.
   `build` puede hacer una segunda lectura solo de bytes antes de publicar para comparar SHA-256 contra
   `sourceHash`; esa lectura no decodifica, parsea, analiza, reconstruye aliases ni renderiza.
3. La aplicación crea un `ResolvedTokenView` readonly durante la misma ejecución del analizador. Cada
   registro incluye path, valor declarado, valor resuelto, alias inmediato, cadena de aliases, tipo
   efectivo, estado de alias y trust. Los renderers lo consumen sin reconstruir alias graph.
4. La aplicación crea un modelo readonly `NormalizedTokenSet` desde `DesignSystemAnalysis`, el documento
   de tokens parseado, `ResolvedTokenView` y `FoundationsInspection`.
5. Los renderers reciben solo `NormalizedTokenSet` y devuelven `BuildArtifact` o `unsupported-value`.
   Son puros: sin filesystem, cwd, reloj, random, procesos, streams ni Commander.
6. El registry v1 es explícito y cerrado: `css`, `json`, `typescript`. No hay plugins dinámicos ni
   imports controlados por usuario.
7. JSON y TypeScript usan records planos por token path. TypeScript exporta `tokens`, `tokenMetadata` y
   `TokenPath` sin imports runtime.

## Consecuencias

- La reutilización de 002/004 es testeable con spies de call-count.
- `sourceHash` queda atado a bytes iniciales, no a una serialización posterior.
- Los renderers quedan aislados y fáciles de verificar byte a byte.
- CSS puede preservar alias inmediato sin hacer una segunda resolución.
- Los formatos futuros requieren contrato/ADR en lugar de aparecer por plugin implícito.

## Alternativas rechazadas

- Renderers que leen el documento fuente directamente: duplican reglas de análisis.
- Renderers que reconstruyen el alias graph: duplican reglas de 002 y pueden divergir.
- Objeto TypeScript anidado: introduce colisiones estructurales y diverge del JSON resuelto.
- Plugins dinámicos: aumentan superficie de seguridad y packaging en v1.
