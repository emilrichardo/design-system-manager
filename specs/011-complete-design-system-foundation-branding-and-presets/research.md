# Research: Complete Design System Foundation, Branding and Presets

**Feature**: `011-complete-design-system-foundation-branding-and-presets` | **Date**: 2026-07-01

## Audit of the historical vision (mandatory, Section 2 of the brief)

Fuentes revisadas directamente: `README.md`, `AGENTS.md`, `docs/product/**`, `docs/adr/**` (0001–0027),
`specs/001-010/**` (vía `npm run agent:status` por feature), `.specify/memory/constitution.md`,
`package.json`, árbol de `src/**`.

### 1. ¿La visión original habla de un Design System completo?

**Sí, a nivel constitucional.** `.specify/memory/constitution.md` (v1.0.0, ratificada 2026-06-25) ya
define principios sobre componentes con contratos (Principio IX: "Componentes y patrones DEBEN
definirse primero mediante contratos... propiedades, slots, variantes, estados, tokens consumidos,
reglas de accesibilidad"), páginas/secciones de validación (Principio XI) y contenido como contexto
opcional (Principio XII). La constitución **nunca** redujo el producto a tokens.

### 2. ¿Qué dominios completos ya están documentados?

- Core de tokens (init/validate/inspect/foundations/presets/build-export/token-mutations): completo y
  cerrado (`001`–`008`).
- Viewer y Editor de tokens: completos (`009`, `010`).
- Asset Manager (fonts/logos/svg/icons/images, separado de tokens): completo (`007`).

### 3. ¿Qué dominios existen solo parcialmente?

- **Foundations**: el concepto (`004`) clasifica `primitive/semantic` pero solo para tokens ya
  existentes; no hay noción de capa `component` ni `brand` en el modelo de datos actual.
- **Presets**: motor completo y seguro (`005`), pero solo un preset (`neutral-base`, 2 categorías).
- **Documentación de producto** (`docs/product/`): `vision.md` ya anticipa Studio, importadores,
  inferencia y candidatos — pero enumera capacidades sin la taxonomía explícita de 5 niveles que pide
  este brief, y no menciona "Brand System" como concepto propio en ningún documento existente.

### 4. ¿Qué dominios fueron omitidos?

- **Brand System** como entidad de primera clase (identidad, voice & tone, visual language, brand
  tokens, brand evidence) — no existe ninguna mención en `docs/product/**` ni en `specs/001-010/**`.
- **Component System** (anatomy, parts, slots, variantes, estados) más allá del principio constitucional
  IX — nunca se instanció en ninguna spec cerrada.
- **Patterns and Templates** — no mencionado fuera de la constitución (Principio XI, de forma indirecta).
- **Governance and Distribution** como dominio propio (versionado de releases, changelog, adopción) —
  existe gobernanza de la *constitución* (enmiendas, ADR) pero no del *Design System del usuario* (status,
  madurez, deprecación de sus propios tokens/componentes).

### 5. ¿Qué decisiones actuales son válidas pero demasiado token-centric?

- `capability-map.md` organiza todo bajo "Core / Studio (UI) / Assets / Importadores e inferencia" — un
  framing correcto para `001`–`010` pero que no deja lugar explícito para Brand/Component/Patterns como
  filas propias. Se corrige en esta feature (ver "Documentos corregidos" abajo), sin borrar las filas
  existentes.
- `AGENTS.md` describe el stack y las features cerradas correctamente pero quedó **desactualizado**: dice
  que `010` "aún no implementa código productivo" cuando `010` está `completed` (49/49, ver
  `npm run agent:status`). Es deriva de mantenimiento, no de visión, pero se corrige igual.

### 6. ¿Qué documentación contradice la visión completa?

**Hallazgo concreto — Style Dictionary**: la constitución (Principio IV) declara Style Dictionary como
"la herramienta principal prevista" para el pipeline `Tokens DTCG → Validación → Resolución → Style
Dictionary → Salidas". La implementación real de `006-build-export` (ADR-0022 a ADR-0025) construyó un
pipeline propio, determinista, sin dependencia de Style Dictionary (`package.json` no la incluye). Esto
es una **contradicción documentada sin ADR que la reconcilie**.

**Resuelto**: el usuario autorizó explícitamente la enmienda constitucional. El Principio IV fue
redefinido (constitución `2.0.0`, enmienda `MAJOR`, ratificada 2026-07-01) de "Style Dictionary como
pipeline de generación" a "Build y export deterministas, reproducibles y extensibles mediante
adapters": conserva los objetivos originales (cumplimiento de estándares, determinismo, salida
multi-formato, separación fuente/artefacto, reproducibilidad, interoperabilidad) y retira la
obligación tecnológica concreta. Style Dictionary queda como adapter/integración opcional, nunca
autoridad del Core. Ver ADR-0028 (actualizado) y el commit `docs: align build principle with
implemented pipeline`.

### 7. ¿Qué capacidades actuales deben conservarse como subsistemas?

Todas las de `001`–`010` sin excepción: init, validate/inspect, JSON envelopes, foundations
(clasificación), presets (motor add-only), build/export (tokens.css/json/ts + manifest), token mutations
(plan/diff/apply transaccional), asset manager, viewer, editor. `011` los **extiende**, nunca los
reemplaza (ver tabla de "Reutilizado vs añadido" en `spec.md`).

### 8. ¿Qué features futuras son necesarias para completar el producto?

Ver `docs/product/complete-design-system-roadmap.md` (`012`–`021`), creado por esta feature.

### 9. ¿Qué elementos pertenecen a tokens y cuáles necesitan contratos propios?

- **Pertenece a tokens**: cualquier valor visual reutilizable y resoluble (color, dimension, fontFamily,
  shadow, etc.), incluida la capa `brand` como rol de metadata sobre primitivos.
- **Necesita contrato propio** (no es un token): brand profile, voice & tone, visual language narrativo,
  usage rules, brand evidence, component anatomy/parts/slots, patterns, templates, content guidelines,
  governance (status/versionado/deprecación). Cada uno de estos vive en su propio documento/entidad,
  nunca forzado dentro de `base.tokens.json`.

### 10. ¿Cómo debe integrarse branding en todo el sistema?

Como el **nivel 1** del modelo de 5 niveles: fuente de principios que informan (no reemplazan) tokens
semánticos, que a su vez informan component tokens. Ver sección "Boundary" en `spec.md` §Requirements y
la política de capas abajo.

## Decisión: capa de token `brand`

**Pregunta**: ¿`brand` debe ser una capa de documento propia (como `primitive`/`semantic`) o un **rol**
dentro de `primitive`?

**Decisión**: **rol dentro de `primitive`**, expresado vía metadata
(`$extensions["ar.neuraz.design-system"].layer = "brand"`), no como un cuarto árbol de documento DTCG
separado.

**Alternativas consideradas**:

1. Documento DTCG separado `design-system/tokens/brand.tokens.json` — rechazado: `002`-`008` asumen **un**
   único archivo de tokens (`006-build-export`, `008-token-mutations`); introducir un segundo archivo
   rompe la garantía de "una sola lectura/análisis semántico por ejecución" (guardrail 1/vision.md §3) y
   duplicaría el motor de resolución de aliases para poco beneficio.
2. `brand` como cuarto nivel de la jerarquía (`primitive → brand → semantic → component`) — rechazado
   como *documento* separado pero **aceptado como concepto de jerarquía de referencia**: un brand token
   (p. ej. `color.brand.primary`) es estructuralmente un primitivo (valor concreto, sin depender de otro
   token) que además porta el rol semántico "es una decisión de marca". La jerarquía de **referencia**
   preferida queda:

```text
primitive/brand → semantic → component
```

**Justificación**: mantiene compatibilidad total con `001`–`010` (un solo archivo, un solo análisis), no
introduce un nuevo motor de resolución, y resuelve la ambigüedad pedida por el brief ("La jerarquía
preferida debe quedar explícita") sin ambigüedad: `brand` es un rol, no un tipo de documento.

## Decisión: `dtcg-type-not-deeply-inspected` para los 13 tipos

**Problema real observado** (sesión de aceptación previa sobre Eurotech): tokens `dimension`,
`fontFamily`, `shadow`, `number` importados correctamente generan warnings genéricos
`dtcg-type-not-deeply-inspected` porque `DEEPLY_SUPPORTED_DTCG_TYPES` (`src/domain/dtcg/recognized-types.ts`)
solo incluye `color`. El motor de build/export (`css-renderer.ts`) **ya** tiene parsers estrictos por tipo
(`serializeDimension`, `serializeShadow`, `serializeFontFamily`, etc.) — la profundidad ya existe en la
capa de export, pero no está conectada a la capa de *validación/inspección*.

**Decisión**: `012+` (implementación futura, fuera de `011`) debe promover cada tipo con parser de
export ya existente a `DEEPLY_SUPPORTED_DTCG_TYPES`, reutilizando la misma lógica de parseo/validación en
`validate`/`inspect` que ya usa `build`/`export` — nunca una segunda implementación de parsing por tipo.
`011` deja el contrato (`contracts/dtcg-type-support.md`) que fija, tipo por tipo, qué error específico
debe emitirse en vez del warning genérico.

## Decisión: matching de fuentes (`family=(none)`, `license=no-matching-asset`)

**Problema real observado**: la vista `typography` del Viewer (`renderTypography` en
`src/infrastructure/viewer/ui/main.ts`) atribuye `family`/`weight`/`style`/`licenseState` a **cualquier**
entrada de tipografía, incluidos tokens `dimension` (font-size) que no tienen `fontFamily`. Esto produce
`family=(none)` y `license=no-matching-asset` en tokens donde ese campo no aplica.

**Decisión**: la proyección de tipografía debe distinguir entre entradas con `fontFamily`/`typography`
real (a las que sí aplica family/weight/style/licenseState) y entradas de dimensión pura (font-size,
line-height, letter-spacing), que se proyectan sin esos campos. Contrato en
`contracts/typography-projection.md`.

## Decisión: storage de Brand System

**Alternativas**:

1. Dentro de `design-system/tokens/base.tokens.json` vía `$extensions` — rechazado: mezclaría narrativa
   larga (Markdown) con el documento DTCG estrictamente tipado, violando el guardrail de "Assets
   separados de los tokens DTCG" por extensión de principio (marca narrativa ≠ token DTCG).
2. Base de datos interna — rechazado explícitamente por la constitución (Principio II).
3. **Archivos JSON + Markdown narrativo bajo `design-system/brand/`** — elegido. Mismo patrón
   transaccional (writer atómico, backup, verificación posterior) que `tokens/` y `assets/`. Permite
   campos estructurados (JSON) y campos narrativos largos (Markdown) sin forzar todo a un esquema rígido
   (pedido explícito del brief §13).

## Alternativas descartadas (resumen)

| Alternativa | Por qué se descartó |
|---|---|
| Un segundo motor de resolución de aliases para `brand/` | Duplicaría lógica ya cerrada en `008`; brand es narrativo, no un grafo de aliases. |
| Forzar brand a través de `TokenMutationCommandV1` (`008`) | `008` está tipado para tokens DTCG; forzar narrativa markdown ahí viola el contrato existente (brief §18: "no fuerces branding no-token a través de 008"). |
| Migrar `build/export` a Style Dictionary ahora | Fuera de alcance de `011` (no implementa código productivo); además requeriría una enmienda constitucional explícita, no unilateral. |
| Combinatoria cartesiana completa de variant×state×size por componente | Rechazada explícitamente por el brief (§15): solo combinaciones relevantes declaradas. |
