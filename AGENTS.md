<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan:
`specs/011-complete-design-system-foundation-branding-and-presets/plan.md` (feature
011-complete-design-system-foundation-branding-and-presets — modelo canónico completo del Design
System, Brand System inicial, capas de token, 13 tipos DTCG profundos, preset `web-complete` + packs,
extensiones de Viewer/Editor; solo spec/contratos, sin código productivo todavía).
Features 001-ds-init, 002-ds-validate-inspect, 003-json-output, 004-foundations, 005-presets,
006-build-export, 007-asset-manager, 008-token-mutations, 009-design-system-viewer y
010-visual-token-editor estan cerradas (completed) y se reutilizan, no se reimplementan.
Stack previsto: TypeScript estricto + ESM, Node >=22, commander, @clack/prompts, zod, ajv,
semver, vitest; UI local heredada de 009 con `node:http` y TypeScript/DOM vanilla, sin nueva dependencia
runtime prevista. Formato canonico de tokens: DTCG 2025.10.
ADRs en `docs/adr/` (001: 0001–0005; 002: 0006–0010; 003: 0011–0013; 004: 0014–0017; 005: 0018–0021; 006: 0022–0025; 009: 0026; 010: 0027; 011: 0028–0030).
<!-- SPECKIT END -->

## Visión de producto

**Neuraz Design System Studio nunca es solamente un token manager, token editor, editor DTCG ni preset
manager.** Es un gestor, generador, documentador y distribuidor de Design Systems completos. El Core
actual (`001`–`010`) es la base de un producto de cinco niveles (Brand System, Foundations and Tokens,
Component System, Patterns and Templates, Governance and Distribution) más una capa transversal de
Import/Inference/Agent Orchestration. Antes de proponer cualquier capacidad futura (UI, assets,
importadores, IA, MCP), lee [`docs/product/`](docs/product/README.md):
[modelo completo](docs/product/complete-design-system-model.md),
[modelo de Brand System](docs/product/brand-system-model.md),
[roadmap](docs/product/complete-design-system-roadmap.md), [visión](docs/product/vision.md),
[guardrails arquitectónicos](docs/product/architecture-guardrails.md) y
[mapa de capacidades](docs/product/capability-map.md). `001`–`010` están `implemented` y `completed`;
`011` define spec/plan/contratos (sin código productivo); `012`–`021` son roadmap, no especificadas.

## Protocolo de intake de marca y assets (obligatorio para agentes)

Cuando el agente recibe una URL, imagen, captura, `theme.json`, CSS o descripción del usuario como
evidencia de un Design System existente, DEBE, en este orden:

1. Analizar la evidencia disponible.
2. Separar hechos observados de inferencias (nunca presentar una inferencia como hecho confirmado).
3. Detectar branding (identidad, paleta, tipografía, personalidad).
4. Detectar foundations (colores, spacing, tipografía, radius, shadow, etc.).
5. Detectar componentes (header, navegación, hero, cards, footer, etc.).
6. Detectar patterns (composiciones reutilizables).
7. Buscar assets ya existentes en el proyecto y en el inventario del Asset Manager
   (`neuraz-ds asset list`) antes de asumir que falta algo.
8. Solicitar al usuario los logos, fuentes y manuales de marca faltantes — **nunca inventarlos, nunca
   descargarlos/redistribuirlos silenciosamente sin confirmación explícita de licencia** (ver
   [brand-system-model.md § Asset intake protocol](docs/product/brand-system-model.md#asset-intake-protocol-branding-incompleto)).
9. Registrar provenance y confidence de cada dato de marca/token detectado.
10. Generar candidatos (`CandidateV1`) — nunca aplicar directamente a la fuente.
11. Esperar revisión y aprobación humana explícita antes de cualquier escritura.

**Ejemplo de salida esperada** ante evidencia de un sitio real:

```text
Detecté:

- Marca principal: Eurotech
- Paleta institucional observada: rojo, negro y neutros
- Tipografía observada: Space Grotesk e Inter
- Personalidad inferida: técnica, profesional y directa
- Componentes detectados: header, mega-menu, search, hero, product-card, category-card, footer
- Assets encontrados: 2 SVG y 3 fuentes
- Assets faltantes: logo principal registrado como logo, variantes monocromáticas y manual de marca

Necesito que proporciones los archivos faltantes o confirmes que continúe con placeholders claramente
marcados.
```
