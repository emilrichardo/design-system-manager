# Feature Specification: Complete Design System Foundation, Branding and Presets

**Feature Branch**: `011-complete-design-system-foundation-branding-and-presets`

**Created**: 2026-07-01

**Status**: Draft

**Input**: Reconstruir y auditar la visión completa de Neuraz Design System Studio (el producto NUNCA
es solamente un token manager/editor/DTCG editor/preset manager), y sentar las bases documentales y
contractuales de un Design System completo: Brand System, Foundations, Tokens (primitive/brand/semantic/
component), Assets, Components, Patterns, Templates, Governance/Distribution, y la capa transversal de
Import/Inference/Agent Orchestration. Esta feature siembra el modelo y los contratos; no implementa
anatomía de componentes, patterns, templates, crawler de URL, analizador de imágenes, Figma, MCP ni
proveedores de IA.

---

## Standards & Authorities *(mandatory for 011)*

### Standards matrix

| Concern | Authority |
|---|---|
| Tokens y aliases | DTCG Format Module 2025.10 + DTCG Resolver Module 2025.10 |
| Especificación machine-readable de UI | UI Specification Schema Community Group |
| Anatomía, partes, estados y comportamiento | Open UI |
| Semántica e interacción accesible | WAI-ARIA APG |
| Accesibilidad general | WCAG |
| Validación de contratos | JSON Schema |

### Authority model

| Domain | Authority |
|---|---|
| DTCG | Autoridad normativa para tokens. |
| Neuraz Complete Design System Model | Autoridad interna para Brand, Components, Patterns, Templates, Content y Governance. |
| UI Specification Schema | Objetivo de interoperabilidad mediante adapters. |
| Open UI | Referencia de vocabulario y anatomía. |
| WAI-ARIA APG | Referencia de interacción accesible. |

### Anti-lock-in

`011` mantiene un modelo **standards-first** y **adapter-friendly**: DTCG gobierna tokens, las capas y
metadatas propias viven bajo `$extensions`, y cualquier interoperabilidad con UI Specification Schema,
Open UI u otras superficies externas ocurre mediante adapters explícitos, nunca reemplazando la fuente
canónica del Design System del usuario.

---

## Concepts & Definitions *(mandatory context)*

`011` no reemplaza ni reescribe `001`–`010`; los reutiliza como el Core de tokens/assets/viewer/editor ya
cerrado, y les da un lugar dentro de un modelo de producto más amplio.

| Concept | Defines | Owns | In scope here? |
|---|---|---|---|
| **001–008 Core** | Init, validate/inspect, JSON envelopes, foundations, presets, build/export, token mutations. | Documentos administrados, DTCG, transacciones, ownership. | Reutilizado sin reescritura; se **extiende** (tipos DTCG profundos, capa `brand`, preset `web-complete`, quality summary). |
| **009 Viewer** | Proyecciones de solo lectura sobre `002`/`004`/`005`/`006`/`007`. | Sesión de lectura, shell `node:http` + bundle estático. | Reutilizado; se **añaden** vistas (`brand`, `components`, `quality`) sin reescribir el shell. |
| **010 Editor** | Comando → plan → diff → aprobación → apply transaccional sobre `008`. | Formularios de edición, aprobación, recarga de sesión. | Reutilizado; se **añade** un caso de uso de escritura propio para narrativa de marca (nunca forzado a través de `008`). |
| **Complete Design System model** | Los cinco niveles + capa transversal (sección "Five Levels" abajo). | La taxonomía canónica del producto. | Sí — es el resultado documental central de `011`. |
| **Brand System** | Identidad, propósito, voice & tone, visual language, brand assets, brand evidence, brand tokens. | `design-system/brand/**` (contrato definido en `data-model.md`). | Sí — modelo inicial, headless, con documentación narrativa + metadata estructurada. |
| **Token layer** | `primitive`, `brand`, `semantic`, `component` — jerarquía obligatoria de referencia. | Metadata `$extensions["ar.neuraz.design-system"].layer` por token. | Sí — política y validación; no anatomía de componentes completa. |
| **Candidate** | Propuesta importada/inferida (evidence, confidence, provenance, review state). | Nunca escribe directo a la fuente. | Modelo de contratos únicamente; el pipeline de importación real es `014`+. |

### Five Levels + cross-cutting layer (canonical taxonomy)

```text
1. Brand System
2. Foundations and Tokens
3. Component System
4. Patterns and Templates
5. Governance and Distribution

Cross-cutting: Import, Inference and Agent Orchestration
```

Cada nivel tiene una autoridad explícita y una relación de dependencia hacia abajo (un nivel superior
puede referenciar el inferior; nunca al revés):

```text
Brand System (identidad, principios, voice & tone, visual language)
      │  (brand primitive / brand token)
      ▼
Foundations and Tokens (primitive → semantic → component)
      │  (component tokens, contratos)
      ▼
Component System (anatomy, parts, variants, states — 012+)
      │  (composición)
      ▼
Patterns and Templates (013+)
      │  (todo lo anterior, versionado)
      ▼
Governance and Distribution (ownership, status, release, CI/CD)
```

La capa transversal (**Import, Inference and Agent Orchestration**, `014`–`020`) puede leer evidencia de
cualquier fuente externa y **proponer** candidatos para cualquiera de los cinco niveles, pero **nunca**
escribe directo a las fuentes finales (guardrail 7–8, ya vigente).

### Alcance explícito de `011` dentro del modelo completo

| Nivel/capa | Qué entrega `011` | Qué NO entrega `011` |
|---|---|---|
| Brand System | Modelo de datos, storage headless, Viewer/Editor iniciales, placeholders del preset | Import automático de manuales de marca, IA |
| Foundations and Tokens | Capas `primitive/brand/semantic/component`, 13 tipos DTCG profundos, preset `web-complete` + packs | — (nivel completo en esta feature) |
| Component System | Vocabulario de `component tokens` (no anatomía completa) | Definición de anatomy/parts/slots/variantes como entidad propia (`012`) |
| Patterns and Templates | Nada implementado; solo referenciado en el modelo y el roadmap | Todo (`013`) |
| Governance and Distribution | Quality summary extendido, compatibilidad hacia atrás documentada | Versionado formal de releases, changelog, CI/CD (`021`) |
| Import/Inference/Agents | Contratos de `candidate`/`evidence`/`provenance` (solo modelo) | Cualquier importador real (`014`–`020`) |

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Crear un Design System completo con `web-complete` (Priority: P1)

Un usuario nuevo instala el paquete en un proyecto anfitrión y quiere un Design System de partida que no
sea solo dos tokens de ejemplo: quiere foundations completas, una capa de marca editable (aunque vacía) y
una base de component tokens reconocida.

**Why this priority**: Es el punto de entrada de todo lo demás; sin un preset completo y sin capa de
marca, ninguna otra historia tiene datos sobre los que operar.

**Independent Test**: Ejecutar `neuraz-ds presets apply web-complete` sobre un Design System recién
inicializado y verificar que `validate`/`inspect`/`foundations` reportan `0 unclassified`, `0
unresolved/broken aliases`, `0 unknown types`, y que `design-system/brand/` existe con estado
`needs-user-input`.

**Acceptance Scenarios**:

1. **Given** un Design System inicializado y vacío (solo el seed de `init`), **When** el usuario ejecuta
   `presets plan web-complete`, **Then** el plan muestra `create` para todas las categorías foundation,
   el layer de cada token candidato, y un bloque de `brand` marcado `placeholder`, sin escribir nada.
2. **Given** el mismo Design System, **When** el usuario ejecuta `presets apply web-complete`, **Then** se
   escribe de forma atómica (todo o nada) y una segunda ejecución idéntica resuelve `unchanged`.
3. **Given** un Design System que ya tiene tokens propios en conflicto de valor con `web-complete`,
   **When** el usuario aplica el preset, **Then** el plan se bloquea sin escribir (mismo comportamiento
   add-only que `neutral-base`).

---

### User Story 2 - Registrar identidad y propósito de marca (Priority: P1)

Un usuario documenta el perfil de marca (nombre, propósito, misión, visión, valores, posicionamiento,
audiencias) sin que eso se convierta en tokens.

**Why this priority**: Sin brand profile no hay ancla para tono, visual language ni brand tokens; es el
primer objeto que un usuario real completa tras aplicar el preset.

**Independent Test**: Editar `design-system/brand/brand.json` a través del Editor (o del caso de uso
headless equivalente) y verificar con `neuraz-ds view --json` que la sección `brand` refleja los campos
y el estado de completitud (`complete`/`partial`/`placeholder`).

**Acceptance Scenarios**:

1. **Given** el brand profile en estado `placeholder`, **When** el usuario completa `name`, `purpose`,
   `mission`, `values`, **Then** el estado de completitud avanza a `partial` o `complete` según
   `data-model.md`, sin inventar campos no provistos.
2. **Given** un campo narrativo largo (p. ej. `positioning`), **When** se guarda, **Then** se preserva
   como Markdown/texto narrativo, no se fragmenta en tokens.

---

### User Story 3 - Documentar valores y personalidad (Priority: P2)

**Why this priority**: La personalidad de marca informa voice & tone y las guías de imagen, pero no
bloquea el uso de foundations/tokens (P1 ya cubierto).

**Independent Test**: Añadir 3 `BrandPrincipleV1` y una `BrandPersonalityV1` vía plan/apply del caso de
uso de brand, y verificar que aparecen en la vista `brand` del Viewer con su `provenance`.

**Acceptance Scenarios**:

1. **Given** un brand profile sin principios, **When** el usuario añade principios con `source:
   user-confirmed`, **Then** el Viewer los lista con ese estado de provenance explícito.

---

### User Story 4 - Documentar voice and tone (Priority: P2)

**Why this priority**: Voice & tone es consumido por content guidelines futuras (`013`) pero es útil de
forma independiente para copy/microcopy hoy.

**Independent Test**: Registrar `voice principles`, dimensiones de tono (formal/informal,
técnico/simple), ejemplos `do`/`don't` y terminología preferida/prohibida; verificar que el Viewer los
proyecta agrupados.

**Acceptance Scenarios**:

1. **Given** voice-and-tone vacío, **When** se registran dimensiones de tono con al menos un ejemplo
   `do` y uno `don't` cada una, **Then** `neuraz-ds validate` no reporta error (es narrativo, no DTCG) y
   el Viewer los muestra.

---

### User Story 5 - Vincular logos y fuentes al Brand System (Priority: P1)

**Why this priority**: Sin vínculo explícito entre `007-asset-manager` y el Brand System, cada asset
importado queda huérfano de contexto de marca (qué logo es "el principal", qué fuente es "heading").

**Independent Test**: Importar un SVG y un WOFF2 con `007` (asset import plan/apply, ya cerrado), y luego
vincularlos desde `design-system/brand/visual-language.json` como `logo primary` y `typography heading
family`; verificar que el Viewer de marca resuelve el asset referenciado (hash, licencia, dimensiones)
sin duplicar el modelo de `007`.

**Acceptance Scenarios**:

1. **Given** un asset ya importado (`logicalPath` existente en `assets.json`), **When** se referencia
   desde `visual-language.json`, **Then** la referencia se valida contra el inventario real de `007`
   (nunca se copia el asset ni se reimplementa su metadata).
2. **Given** una referencia a un asset que no existe en el inventario, **When** se valida, **Then** se
   reporta como issue de coherencia (`brand-asset-reference-missing`), nunca se autogenera el asset.

---

### User Story 6 - Marcar assets faltantes (Priority: P1)

**Why this priority**: Es la garantía anti-invención: el sistema debe poder decir explícitamente "falta
el logo monocromo" en vez de inventarlo o dejarlo ambiguo.

**Independent Test**: Con un brand profile que declara variantes de logo requeridas
(`primary/monochrome/horizontal/vertical/dark-background`) y solo el `primary` importado, verificar que
`quality` reporta las variantes faltantes con su razón, sin generar ningún archivo.

**Acceptance Scenarios**:

1. **Given** 1 de 5 variantes de logo registradas, **When** se consulta `quality`, **Then** se listan
   las 4 faltantes con severidad `warning` y mensaje explícito, nunca error bloqueante.

---

### User Story 7 - Usar brand tokens (Priority: P1)

**Why this priority**: Es el puente contractual entre marca y foundations; sin política de brand tokens,
la capa `brand` es ambigua respecto de `primitive`/`semantic`.

**Independent Test**: Crear `color.brand.primary` (capa `brand`), aliasarlo desde
`color.semantic.action.primary` (capa `semantic`), y verificar que `neuraz-ds foundations` y la vista
`components` (más adelante) solo permiten llegar a un component token **a través** de un semantic token,
nunca directo desde `brand`.

**Acceptance Scenarios**:

1. **Given** `color.brand.primary`, **When** se intenta crear un component token que lo referencia
   directamente (sin pasar por `semantic`), **Then** `validate`/`foundations` emite un warning de
   política (`brand-token-bypasses-semantic`), no un error duro (para no romper `001`–`010`), documentado
   como regla objetivo para `012`.

---

### User Story 8 - Navegar de component a semantic y primitive (Priority: P2)

**Why this priority**: La trazabilidad de capas es lo que hace útil el modelo de 4 capas; sin navegación
visible, es solo metadata muerta.

**Independent Test**: Desde la vista `components` del Viewer, seguir la cadena de alias de un component
token hasta su primitive, y verificar que cada salto muestra su `layer` declarada.

**Acceptance Scenarios**:

1. **Given** `component.button.primary.background.default` → `color.semantic.action.primary` →
   `color.brand.primary` → `color.base.gray-10`, **When** se inspecciona en el Viewer, **Then** se listan
   las 4 capas en orden con su `layer` metadata, sin inferir capas por el path.

---

### User Story 9 - Aplicar el commerce pack (Priority: P2)

**Why this priority**: Valida que la arquitectura de packs es real y extensible (no solo `web-complete`
monolítico) usando un caso concreto (Eurotech-like) mencionado explícitamente en el brief.

**Independent Test**: Aplicar `web-complete` y luego el pack `commerce`; verificar que solo añade los
component tokens de comercio (`product-card`, `price`, etc.) sin duplicar ni chocar con lo ya aplicado.

**Acceptance Scenarios**:

1. **Given** `web-complete` ya aplicado, **When** se aplica el pack `commerce`, **Then** el plan es
   `add-only` sobre los nuevos component tokens de comercio; aplicar dos veces resuelve `unchanged`.

---

### User Story 10 - Visualizar component tokens (Priority: P2)

**Independent Test**: Abrir la vista `components` del Viewer y verificar agrupación por
`component/part/variant/state/size` con al menos una matriz `variant × state` renderizada para un
componente con >1 variante y >1 estado.

**Acceptance Scenarios**:

1. **Given** `button` con variantes `primary/secondary` y estados `default/hover/disabled`, **When** se
   abre la vista `components`, **Then** se muestra una matriz 2×3 legible sin generar combinaciones no
   declaradas.

---

### User Story 11 - Editar component tokens (Priority: P2)

**Independent Test**: Desde el Editor, cambiar el valor de
`component.button.primary.background.hover` vía plan → diff → aprobación → apply, reutilizando `008`.

**Acceptance Scenarios**:

1. **Given** un component token existente, **When** se edita su valor y su `layer`/metadata vía el
   Editor, **Then** el flujo es idéntico al de `010` (nunca un segundo writer).

---

### User Story 12 - Validar tipos DTCG profundamente (Priority: P1)

**Why this priority**: Es la base técnica de todo lo demás (tipografía, shadow, motion) y corrige una
deriva real detectada en la auditoría (ver `research.md`).

**Independent Test**: Crear un token de cada uno de los 13 tipos reconocidos y verificar que
`validate`/`inspect` ya no emiten `dtcg-type-not-deeply-inspected` para ninguno, y que cada tipo tiene
comportamiento definido de parser/validación/normalización/resolución/CSS/JSON/TypeScript.

**Acceptance Scenarios**:

1. **Given** un token `shadow` multi-capa mal formado (offset sin unidad), **When** se valida, **Then**
   se reporta un error específico del tipo (`shadow-offset-missing-unit` o equivalente), no un warning
   genérico de "no inspeccionado profundamente".

---

### User Story 13 - Relacionar fonts y font assets (Priority: P2)

**Why this priority**: Corrige el defecto observado en el Viewer real (`family=(none)`,
`license=no-matching-asset` en tokens que no deberían tener familia) documentado en la auditoría previa
de la sesión.

**Independent Test**: Con un token `typography.font-family.heading` y un asset de fuente importado con
family/weight/style coincidentes, verificar que el Viewer resuelve el matching y no muestra
`license=no-matching-asset` para tokens sin `fontFamily` real.

**Acceptance Scenarios**:

1. **Given** un token `dimension` de `font-size` (sin `fontFamily`), **When** se ve en el Viewer,
   **Then** no se le atribuye `family=(none)` ni estado de licencia — ese campo solo aplica a tokens
   `fontFamily`/`typography`.

---

### User Story 14 - Consultar calidad general (Priority: P1)

**Independent Test**: `neuraz-ds foundations --json` (o el comando de quality ampliado) reporta
`brand completeness`, `asset completeness`, cobertura por capa, aliases rotos, referencias directas a
primitive, cobertura de validación de tipos, font matching y licencias faltantes en un único resumen.

**Acceptance Scenarios**:

1. **Given** un Design System con `web-complete` recién aplicado, **When** se consulta quality, **Then**
   el resumen es explícito (`complete/partial/absent/placeholder/needs-user-input`), nunca ambiguo.

---

### User Story 15 - Conservar proyectos token-only antiguos (Priority: P1)

**Why this priority**: Es la garantía de compatibilidad hacia atrás explícita del brief; sin esto, `011`
rompe `001`–`010`.

**Independent Test**: Tomar un Design System de `001`–`010` sin `brand/` ni component tokens y correr
`validate`/`inspect`/`foundations`/`build`/`view` de `011`; deben comportarse exactamente igual, y
`brand` debe reportar `absent` (nunca `invalid`).

**Acceptance Scenarios**:

1. **Given** un Design System sin `design-system/brand/`, **When** se abre el Viewer, **Then** la vista
   `brand` muestra `absent` con mensaje explícito, no un error ni una pantalla vacía sin explicación.

---

### User Story 16 - Preparar el sistema para import de URL e imagen (Priority: P3)

**Independent Test**: Verificar (solo a nivel de contrato, sin implementación) que existe un tipo
`CandidateV1` con `evidence`, `confidence`, `provenance`, `reviewState` capaz de representar una
propuesta para cualquiera de los 5 niveles, y que ningún caso de uso de `011` lo escribe directo a la
fuente.

**Acceptance Scenarios**:

1. **Given** el contrato `CandidateV1` documentado, **When** se revisa contra los guardrails 7–9,
   **Then** no existe ningún método que persista un candidato sin paso de aprobación explícito.

---

### User Story 17 - Funcionar localmente y offline (Priority: P1)

**Independent Test**: Repetir toda la validación de `011` sin red (assets ya importados localmente,
sin llamadas a servicios externos); debe comportarse igual.

**Acceptance Scenarios**:

1. **Given** sin conectividad, **When** se ejecuta cualquier comando de `011`, **Then** no hay
   degradación ni error de red — el diseño es local-first como en `001`–`010`.

---

### User Story 18 - Documentar provenance y confidence (Priority: P2)

**Independent Test**: Cada campo de brand con fuente no oficial (`observed`/`inferred`) debe exponer su
`provenance` en el Viewer; ningún valor observado en una web externa se presenta como regla oficial de
marca sin `status: user-confirmed`.

**Acceptance Scenarios**:

1. **Given** un `BrandEvidenceV1` con `status: observed`, **When** se muestra en el Viewer, **Then** se
   distingue visualmente/textualmente de un valor `official`.

---

### Edge Cases

- ¿Qué pasa si `web-complete` se aplica sobre un Design System que ya tiene `design-system/brand/` con
  datos reales? → add-only: nunca sobrescribe brand ya declarado; solo rellena lo ausente.
- ¿Qué pasa si un component token referencia un semantic token que no existe? → error de referencia
  (mismo comportamiento que `008` ya garantiza para aliases).
- ¿Qué pasa si dos packs declaran el mismo component token con valores distintos? → conflicto bloqueante,
  igual que el merge seguro de `005-presets`; nunca "el último gana" silenciosamente.
- ¿Qué pasa si el usuario borra manualmente `design-system/brand/brand.json` pero deja el resto? →
  `structuralState: partial`, igual que hoy con los documentos administrados de `001`.
- ¿Qué pasa si un asset referenciado por brand se elimina vía `asset remove`? → la referencia queda rota
  y se reporta (`brand-asset-reference-missing`); `asset remove` no necesita conocer brand (separación de
  superficies, guardrail 6).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE documentar y sostener el modelo canónico de cinco niveles + capa
  transversal (Brand System, Foundations and Tokens, Component System, Patterns and Templates,
  Governance and Distribution, Import/Inference/Agents) como taxonomía única del producto.
- **FR-002**: El sistema DEBE definir una jerarquía obligatoria de capas de token: `primitive` (incluye
  el rol `brand` como metadata, ver `research.md` §Decisión de capas) → `semantic` → `component`, y
  registrar la capa de cada token vía `$extensions["ar.neuraz.design-system"].layer`.
- **FR-003**: El sistema DEBE proveer un modelo de Brand System headless (`BrandProfileV1` y entidades
  relacionadas) almacenado en archivos versionables separados de los tokens DTCG (guardrail 6).
- **FR-004**: El sistema DEBE distinguir explícitamente el estado de cada dato de marca:
  `official | observed | inferred | generated | placeholder | user-confirmed`.
- **FR-005**: El sistema NUNCA DEBE asumir que un valor observado en una fuente externa es una regla
  oficial de marca sin confirmación explícita del usuario.
- **FR-006**: El sistema DEBE soportar validación profunda (parser, normalización, resolución, error
  específico) para los 13 tipos DTCG reconocidos (`color, dimension, fontFamily, fontWeight, duration,
  cubicBezier, number, strokeStyle, border, transition, shadow, gradient, typography`), eliminando el
  warning genérico `dtcg-type-not-deeply-inspected` para esos tipos.
- **FR-007**: El sistema DEBE conservar compatibilidad con `string` y `boolean` como tipos adicionales
  no-DTCG-estrictos ya usados por metadata de mutaciones (`008`).
- **FR-008**: El sistema DEBE ofrecer un preset `web-complete` que produzca `0 unclassified tokens`,
  `0 unresolved/broken aliases`, `0 unknown types`, `0 dtcg-type-not-deeply-inspected`, con brand en
  estado explícito (nunca ambiguo) y requisitos de assets explícitos.
- **FR-009**: El sistema DEBE conservar `neutral-base` sin cambios de contrato como preset mínimo.
- **FR-010**: El sistema DEBE soportar `packs` (unidades opcionales aplicables sobre `web-complete`,
  ej. `commerce`, `dashboard`, `institutional`) con el mismo motor add-only/atómico de `005-presets`.
- **FR-011**: El sistema DEBE definir component tokens para el catálogo mínimo listado en el brief
  (botones, formularios, feedback, navegación, datos) sin generar combinaciones cartesianas de
  variantes/estados/tamaños que el componente no soporte.
- **FR-012**: El pack `commerce` DEBE añadir component tokens de comercio
  (`product-card`, `price`, `discount-badge`, etc.) como capa opcional sobre `web-complete`.
- **FR-013**: El sistema DEBE vincular tokens de tipografía con assets de fuente reales del Asset Manager
  (`007`) por family/weight/style/format, y DEBE dejar de atribuir `family`/`license` a tokens que no son
  `fontFamily`/`typography`.
- **FR-014**: El Viewer (`009`) DEBE extenderse con vistas `brand`, `components` y `quality` que
  proyecten exclusivamente datos ya producidos por casos de uso headless (sin lógica nueva en la UI).
- **FR-015**: El Editor (`010`) DEBE extenderse para editar brand profile/voice-tone/visual-language y
  component tokens, reutilizando `008-token-mutations` para tokens y un caso de uso de escritura propio
  (transaccional, con plan/diff/aprobación) para narrativa de marca — nunca forzando contenido no-token a
  través del comando de mutación de tokens.
- **FR-016**: El sistema DEBE definir un contrato `CandidateV1` (evidence, confidence, provenance,
  reviewState) capaz de representar propuestas para cualquiera de los 5 niveles, sin implementar ningún
  productor real de candidatos en esta feature.
- **FR-017**: El sistema DEBE mantener compatibilidad total con Design Systems `001`–`010` sin `brand/`
  ni component tokens: deben seguir siendo válidos, con `brand: absent` explícito.
- **FR-018**: El sistema DEBE actualizar `build`/`export` para incluir artefactos de brand documentación
  (proyección segura, no todo el branding transformado a CSS) sin romper los formatos ya contractuales
  (`tokens.css`, `tokens.resolved.json`, `tokens.ts`, `manifest.json`).
- **FR-019**: El sistema NUNCA DEBE escribir un asset ni asumir su licencia; toda referencia de marca a un
  asset DEBE validarse contra el inventario real de `007-asset-manager`.
- **FR-020**: El sistema DEBE documentar en `AGENTS.md` el protocolo de intake de marca (evidencia →
  separar hechos de inferencias → detectar branding/foundations/componentes/patterns → buscar en el
  proyecto y en el Asset Manager → solicitar lo faltante → registrar provenance/confidence → generar
  candidatos → nunca aplicar sin revisión).

### Key Entities *(include if feature involves data)*

Ver `data-model.md` para los contratos completos con campos y relaciones. Resumen:

- **BrandProfileV1**: identidad y propósito de marca (name, purpose, mission, vision, values,
  positioning, audiences, personality, principles, promise, differentiators).
- **BrandVoiceV1 / BrandToneDimensionV1**: principios de voz y dimensiones de tono con ejemplos do/don't.
- **BrandVisualLanguageV1**: logo variants, paleta de marca, roles tipográficos, estilo de icono/
  ilustración/fotografía, lenguaje de forma/borde/sombra/motion.
- **BrandAssetReferenceV1**: vínculo validado hacia un asset real de `007` (nunca copia su metadata).
- **BrandUsageRuleV1**: reglas de uso correcto/incorrecto (do/don't) de assets de marca.
- **BrandEvidenceV1**: fuente, evidencia, confianza, autor, licencia, origen, fecha, estado, review state.
- **BrandQualitySummaryV1**: completitud de marca y de assets requeridos.
- **TokenLayer**: `primitive | brand | semantic | component` — metadata obligatoria por token.
- **ComponentTokenGroupV1**: agrupación de component tokens por componente/part/variant/state/size.
- **PresetPackV1**: unidad opcional de tokens aplicable sobre un preset base (add-only).
- **CandidateV1**: propuesta con evidence/confidence/provenance/reviewState (solo contrato).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Aplicar `web-complete` sobre un Design System vacío produce `0` issues de
  `unclassified/unresolved-alias/broken-alias/unknown-type/dtcg-type-not-deeply-inspected`.
- **SC-002**: El 100% de los 13 tipos DTCG reconocidos tiene comportamiento de error específico
  documentado (no warning genérico) en `contracts/dtcg-type-support.md`.
- **SC-003**: Un Design System `001`–`010` sin `brand/` sigue validando `complete-valid` (o el estado que
  ya tuviera) sin ningún cambio de comportamiento observable.
- **SC-004**: El Viewer expone `brand`, `components` y `quality` con datos reales de un `web-complete`
  aplicado, sin ningún placeholder de UI vacío no explicado.
- **SC-005**: Ningún dato de marca con `status` distinto de `official`/`user-confirmed` se presenta sin
  su badge/etiqueta de provenance visible en el Viewer.
- **SC-006**: El pack `commerce` aplicado sobre `web-complete` no introduce ningún conflicto ni
  duplicado; una segunda aplicación resuelve `unchanged`.

## Assumptions

- El almacenamiento de Brand System vive bajo `design-system/brand/` como archivos JSON + Markdown
  narrativo, siguiendo el mismo patrón transaccional que `tokens/` y `assets/` (decisión formalizada en
  `data-model.md` y `plan.md`; sujeta a ADR).
- La capa `brand` de tokens se modela como **rol de metadata sobre `primitive`** (no como cuarto tipo de
  documento DTCG separado) — ver `research.md` para la justificación completa; queda documentada como
  decisión explícita, no ambigua.
- Los packs (`commerce`, `dashboard`, `institutional`) se versionan igual que los presets (`005`):
  empaquetados con el gestor, inmutables por versión, nunca descargados de un marketplace externo
  (guardrail: fuera de alcance según `capability-map.md`).
- Ningún importador real (URL, imagen, Figma) se implementa en `011`; el contrato `CandidateV1` es
  puramente documental/de tipos para que `014`+ no tenga que rediseñar la frontera.
- El catálogo de component tokens del brief es el punto de partida, no exhaustivo; `012` definirá
  anatomy/parts/slots completos por componente.
