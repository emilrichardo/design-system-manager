# Neuraz Design System Studio — documentación de producto

**Neuraz Design System Studio nunca es solamente un token manager, token editor, editor DTCG ni preset
manager.** Es un gestor, generador, documentador y distribuidor de Design Systems completos:
local-first, Git-first, headless-first y agent-friendly, organizado en cinco niveles (Brand System,
Foundations and Tokens, Component System, Patterns and Templates, Governance and Distribution) más una
capa transversal de Import/Inference/Agent Orchestration. El Core de tokens (`001`–`010`, cerradas) es
su cimiento técnico, manteniendo el repositorio anfitrión como única fuente de verdad.

Esta carpeta documenta **la visión, el modelo y las reglas**, no implementaciones. Ninguna capacidad
futura aquí descrita está implementada salvo lo que el [mapa de capacidades](capability-map.md) marca
como `implemented`.

## Documentos

- [complete-design-system-model.md](complete-design-system-model.md) — la taxonomía canónica de los
  cinco niveles + capa transversal; léelo primero.
- [brand-system-model.md](brand-system-model.md) — el modelo de Brand System (Nivel 1): identidad,
  voice & tone, visual language, brand tokens, provenance, protocolo de intake de assets.
- [complete-design-system-roadmap.md](complete-design-system-roadmap.md) — features futuras (`012`–`021`)
  con su nivel del modelo y sus dependencias.
- [vision.md](vision.md) — qué es el Studio, a quién sirve y cómo evoluciona desde el Core headless.
- [architecture-guardrails.md](architecture-guardrails.md) — las 15 reglas arquitectónicas obligatorias
  que cualquier capacidad futura debe respetar.
- [capability-map.md](capability-map.md) — capacidades del producto con su estado real
  (`implemented` / `planned` / `exploratory` / `out-of-scope`), módulo y feature actual/futura,
  organizadas tanto por subsistema técnico como por nivel del modelo completo.

## Estado del Core (base del Studio)

- `001`–`010` **completadas**: init, validate/inspect, salida JSON, foundations, presets, build/export,
  mutaciones de tokens, Viewer y Editor visual de tokens.
- `011-complete-design-system-foundation-branding-and-presets`: spec/plan/contratos definidos (modelo
  completo, Brand System inicial, capas de token, 13 tipos DTCG, `web-complete`+packs); sin código
  productivo todavía.
- El Core es **local-first, Git-first y headless-first**, sin React, navegador, Figma, scraping ni
  proveedores de IA.

## Cómo leer esta documentación

1. Empieza por [complete-design-system-model.md](complete-design-system-model.md) para la taxonomía
   completa, y [vision.md](vision.md) para el porqué.
2. Consulta [architecture-guardrails.md](architecture-guardrails.md) antes de proponer cualquier feature.
3. Usa [capability-map.md](capability-map.md) para ubicar una capacidad y su madurez antes de planificar.
4. Si la propuesta toca marca/identidad, lee [brand-system-model.md](brand-system-model.md) primero.
