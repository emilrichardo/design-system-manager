# Roadmap del Design System completo — Neuraz Design System Studio

> Features futuras necesarias para completar el [modelo de 5 niveles + capa transversal](complete-design-system-model.md).
> Ninguna de `012`–`021` está especificada en detalle todavía (solo `011` lo está, como fundación). Este
> documento fija **nombre, nivel del modelo y propósito** de cada una, para que no se creen dos features
> con el mismo número ni se pierda de vista a qué nivel pertenece cada pieza.

| Feature | Nivel del modelo | Propósito |
|---|---|---|
| `011-complete-design-system-foundation-branding-and-presets` | Transversal (fundación) | Modelo canónico completo, Brand System inicial, capas de token, 13 tipos DTCG profundos, `web-complete` + packs, Viewer/Editor iniciales de marca y component tokens. **Estado**: spec/plan/contratos definidos, sin código productivo (esta feature). |
| `012-component-catalog` | 3 — Component System | Anatomy, parts, slots, propiedades, variantes, tamaños, estados, comportamiento responsive/interacción, requisitos de accesibilidad y contenido por componente, completos (más allá del vocabulario mínimo de `011`). |
| `013-patterns-templates-and-content-guidelines` | 4 — Patterns and Templates | Patrones de navegación/formularios/búsqueda/comercio/datos/feedback/layout; plantillas de página y responsive; composición de contenido; guías de contenido que consumen `voice-and-tone` de `011`. |
| `014-candidate-import-pipeline` | Transversal | Implementación real del contrato `CandidateV1` (`011`): pipeline genérico de evidencia → candidato → revisión, sin productor concreto todavía (los productores son `015`–`017`, `020`). |
| `015-candidate-review-and-asset-intake` | Transversal + Governance | UI/CLI de revisión y aprobación de candidatos; implementación operativa del protocolo de asset intake (`brand-system-model.md`) para logos/fuentes/iconos faltantes. |
| `016-website-design-system-importer` | Transversal | Extracción de evidencia desde una URL (CSS, `theme.json`, HTML) hacia candidatos de brand/foundations/tokens — el caso de uso ya ejercitado manualmente en la aceptación de Eurotech, formalizado como productor real de `CandidateV1`. |
| `017-image-and-brand-reference-analyzer` | Transversal | Análisis de imágenes/capturas/manuales de marca en PDF/imagen hacia candidatos de brand (paleta, tipografía observada, personalidad inferida). |
| `018-agent-orchestration-skill` | Transversal + Governance | Skill(s) para agentes que documenten y ejecuten el protocolo de intake de marca/assets/tokens de `AGENTS.md` de forma consistente entre sesiones. |
| `019-mcp-server` | Interfaces (todas las capas) | Servidor MCP que expone los mismos casos de uso headless de `001`–`018` a agentes externos, sin una segunda fuente de verdad (Principio XV de la constitución). |
| `020-figma-importer` | Transversal | Productor de `CandidateV1` desde Figma (tokens, componentes, estilos) — mismo boundary de candidato/revisión que `016`/`017`. |
| `021-governance-versioning-and-release` | 5 — Governance and Distribution | Status/madurez/versionado/deprecación/migración de los propios tokens/componentes/patterns del Design System del usuario (no de este paquete); changelog; métricas de adopción futuras. |

## Reglas de numeración

- Los números son **estables y no se reutilizan**: si una feature documental se detecta ya creada con
  otro nombre bajo el mismo número, se audita y se corrige/renombra — nunca se crea una feature paralela
  con el mismo número (mandato de `011` §9, extendido a todo el roadmap).
- Ninguna feature de `012`–`021` se especifica (`spec.md`) antes de que la anterior en su misma cadena de
  dependencia esté cerrada, salvo que el usuario lo solicite explícitamente (Principio XVI: incrementalidad).

## Dependencias entre features futuras

```text
011 (fundación) ──> 012 (component catalog) ──> 013 (patterns/templates)
011 ──> 014 (candidate pipeline) ──> 015 (review + asset intake)
014 ──> 016 (URL importer)
014 ──> 017 (image/brand analyzer)
014 ──> 020 (Figma importer)
011, 012, 014 ──> 018 (agent orchestration skill)
001–018 ──> 019 (MCP server, expone todo lo anterior sin reescribirlo)
011, 012, 013 ──> 021 (governance/versioning/release)
```
