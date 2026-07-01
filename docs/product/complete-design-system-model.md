# Modelo completo del Design System — Neuraz Design System Studio

> Documento canónico. Reemplaza cualquier lectura que presente el producto como "un gestor de tokens".
> Neuraz Design System Studio es un **gestor, generador, documentador y distribuidor de Design Systems
> completos** — local-first, Git-first, headless-first y agent-friendly. Los tokens son una capa
> central, no el producto entero. Visión de alto nivel en [vision.md](vision.md); estado real por
> capacidad en [capability-map.md](capability-map.md); reglas obligatorias en
> [architecture-guardrails.md](architecture-guardrails.md); el modelo de marca en detalle, en
> [brand-system-model.md](brand-system-model.md); el roadmap de features futuras, en
> [complete-design-system-roadmap.md](complete-design-system-roadmap.md).

## Los cinco niveles + la capa transversal

```text
1. Brand System
2. Foundations and Tokens
3. Component System
4. Patterns and Templates
5. Governance and Distribution

Cross-cutting: Import, Inference and Agent Orchestration
```

Cada nivel tiene **autoridad propia** y una dirección de dependencia hacia abajo: un nivel superior puede
referenciar/informar al inferior; el inferior nunca depende del superior para ser válido por sí mismo.

```text
Brand System
   │ (brand primitive / brand token → informa, no reemplaza)
   ▼
Foundations and Tokens   (primitive → semantic → component)
   │ (component tokens, contratos)
   ▼
Component System         (anatomy, parts, slots, variants, states)
   │ (composición)
   ▼
Patterns and Templates
   │ (todo lo anterior, versionado)
   ▼
Governance and Distribution
```

La **capa transversal** (Import, Inference and Agent Orchestration) puede leer evidencia de cualquier
fuente externa y **proponer candidatos** para cualquiera de los cinco niveles, pero nunca escribe directo
a las fuentes finales (guardrails 7–9).

## Nivel 1 — Brand System

Identidad, propósito, misión, visión, valores, posicionamiento, audiencias, personalidad, principios,
voice & tone, visual language (logo system, estrategia de color/tipografía, iconografía, imagen,
ilustración, fotografía, motion personality), compromisos de accesibilidad, reglas de uso de marca,
ejemplos correcto/incorrecto, procedencia y licencias de assets. Modelo completo en
[brand-system-model.md](brand-system-model.md). Storage: `design-system/brand/**`, separado de tokens y
assets (extensión del guardrail 6).

**Estado**: modelo inicial definido en `011-complete-design-system-foundation-branding-and-presets`
(`planned` hasta que se implemente código; ver `capability-map.md`).

## Nivel 2 — Foundations and Tokens

Tokens primitive, semantic, component; aliases; los 13 tipos DTCG reconocidos con soporte profundo;
foundations (clasificación primitive/semantic por categoría); themes/modes futuros; presets (`neutral-
base`, `web-complete`, packs); artefactos de build; validación; resolución de referencias.

**Estado**: `implemented` para el Core de tokens (`001`–`008`), foundations (`004`), presets
(`005`), build/export (`006`), mutaciones (`008`). La capa `component` de tokens y el preset
`web-complete` se modelan en `011`; su implementación de código es trabajo posterior a `011` (ver
`tasks.md` de `011`).

## Nivel 3 — Component System

Definiciones de componentes, anatomía, parts, slots, propiedades, variantes, tamaños, estados,
comportamiento responsive, comportamiento de interacción, requisitos de accesibilidad, requisitos de
contenido, component tokens, ejemplos, reglas de uso, anti-patrones.

**Estado**: `exploratory`. `011` define el **vocabulario** de component tokens (catálogo mínimo,
política de capas) pero no la anatomía completa por componente — eso es `012-component-catalog`.

## Nivel 4 — Patterns and Templates

Patrones de navegación, formularios, búsqueda, comercio, presentación de datos, feedback, layout;
plantillas de página; plantillas responsive; composición de contenido.

**Estado**: `exploratory`. Ningún artefacto implementado; referenciado en el roadmap como
`013-patterns-templates-and-content-guidelines`.

## Nivel 5 — Governance and Distribution

Ownership, status, madurez, versionado, deprecación, migración, revisión, aprobación, release,
documentación, distribución del paquete, CLI, MCP, skills, CI/CD, Git, changelog, métricas de adopción
futuras.

**Estado**: parcialmente `implemented` (gobernanza de la constitución/ADR ya existe; CLI implementada) y
parcialmente `planned` (gobernanza del Design System *del usuario* — status/versionado/deprecación de sus
propios tokens/componentes — es `021-governance-versioning-and-release`).

## Capa transversal — Import, Inference and Agent Orchestration

Puede recibir: URL, capturas, imágenes, CSS, `theme.json`, DTCG, Figma, logos, fuentes, iconos,
documentos de marca, manuales de identidad, descripciones del usuario.

Debe producir: evidence, observations, brand candidates, token candidates, asset candidates, component
candidates, pattern candidates, issues, confidence, provenance, planes de revisión.

**Nunca** escribe directamente en las fuentes finales (guardrails 7–8). El contrato `CandidateV1` (ver
`data-model.md` de `011`) es el punto de entrada único para cualquier productor futuro (`014`–`020`).

**Estado**: `exploratory`. Solo el contrato de tipos (`CandidateV1`) existe tras `011`; ningún productor
real (crawler, analizador de imágenes, Figma, IA) está implementado.

## Relación entre branding y tokens (frontera, no ambigüedad)

```text
Brand strategy               → documentación estructurada y narrativa (brand/**)
Visual brand decisions       → tokens (brandRole:"brand") y assets (007)
Component behavior           → component definitions (012+)
Composition                  → patterns y templates (013+)
```

Ejemplos concretos (del brief, conservados literalmente porque fijan la frontera sin ambigüedad):

| Decisión | Dónde vive |
|---|---|
| "Confiable, técnica y directa" | `BrandPersonalityV1.narrative` — brand, no token |
| Rojo institucional principal | `color.brand.primary` — primitive token, `brandRole: "brand"` |
| Color de acción primaria | `color.semantic.action.primary` — semantic token, alias del brand |
| Fondo del botón primario | `component.button.primary.background.default` — component token |
| "Usar fotografías de talleres reales" | `BrandVisualLanguageV1.photographyStyle` — imagery guideline |
| Logo horizontal blanco | asset (`007`) + `BrandUsageRuleV1` — asset + brand usage rule |

## Reconciliación de deriva de alcance (auditoría de `011`)

- La constitución (`.specify/memory/constitution.md`, v1.0.0) **ya** anticipaba componentes con
  contratos (Principio IX), páginas de validación (Principio XI) y contenido como contexto (Principio
  XII) — el producto **nunca** fue diseñado como solo-tokens a nivel constitucional.
- La deriva ocurrió en la **documentación de producto** (`docs/product/`) y en las specs cerradas
  (`001`–`010`), que cubrieron exclusivamente Core/Viewer/Editor/Assets de tokens — correctamente
  acotado para su momento (Principio XVI: incrementalidad), pero sin dejar explícito dónde encajaría
  Brand/Component/Patterns. Este documento y `capability-map.md` corrigen esa ausencia.
- **Hallazgo sin resolver, documentado, no ambiguo**: la constitución (Principio IV) declara Style
  Dictionary como pipeline previsto; la implementación real (`006-build-export`) usa un pipeline propio
  determinista sin esa dependencia. `011` no amend la constitución unilateralmente — queda registrado
  aquí y en `research.md` de `011` como pendiente de una enmienda explícita futura.
