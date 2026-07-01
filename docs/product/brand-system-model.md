# Modelo de Brand System — Neuraz Design System Studio

> Nivel 1 del [modelo completo](complete-design-system-model.md). Define qué es el Brand System, cómo se
> almacena, cómo se relaciona con tokens/componentes/patterns, y el protocolo de intake de assets
> faltantes. Contratos de datos completos (campos, tipos) en
> `specs/011-complete-design-system-foundation-branding-and-presets/data-model.md`.

## Qué es

El Brand System es la documentación **headless** de la identidad de marca de un proyecto: quién es la
marca, cómo habla, cómo se ve, y qué assets reales la representan. No es una nota decorativa ni un
sinónimo de "colores y logo": es un dominio propio con su propio storage, su propia validación y su
propio ciclo de revisión — al mismo nivel que tokens o assets, nunca subordinado a ellos.

## Dónde vive

```text
design-system/
└── brand/
    ├── brand.json                # BrandProfileV1 — identidad, propósito, valores, principios
    ├── voice-and-tone.json       # BrandVoiceV1 — principios de voz, dimensiones de tono, terminología
    ├── visual-language.json      # BrandVisualLanguageV1 — logo variants, paleta, roles tipográficos, estilo
    └── usage-guidelines.json     # BrandUsageRuleV1[] — reglas do/don't
```

Separado de `tokens/` (DTCG puro) y de `assets/` (`007`, binarios/SVG con su propio manifest) —
extensión directa del guardrail 6 ("Assets separados de los tokens DTCG") al contenido narrativo de
marca: **la narrativa de marca tampoco contamina el documento DTCG**.

## Brand profile

Representa: `name`, `shortName`, `description`, `purpose`, `mission`, `vision`, `values`, `positioning`,
`audiences`, `personality`, `attributes`, `principles`, `promise`, `differentiators`. Campos narrativos
largos (`positioning`, `mission`) admiten Markdown; campos de lista (`values`, `differentiators`) son
arrays de string. Nunca se infiere un valor no provisto: un campo vacío es `null`/`[]`, nunca una
invención plausible.

## Voice and tone

Representa: principios de voz, dimensiones de tono (formal/informal, técnico/simple, serio/divertido,
directo/editorial) con ejemplos `do`/`don't` obligatorios por dimensión declarada, terminología
preferida/prohibida, guía de microcopy, guía de mensajes de error, guía de CTA.

## Visual identity (visual language)

Representa: variantes de logo (primary/monochrome/horizontal/vertical/dark-background), clear space,
tamaño mínimo, compatibilidad de fondo, uso incorrecto, colores de marca y de soporte (por **referencia a
tokens reales**, nunca hex embebido), roles tipográficos, estilo de icono/ilustración/fotografía,
tratamiento de imagen, composición, lenguaje de forma/borde/sombra/motion.

## Brand provenance — nunca se asume una regla oficial

Cada decisión importante de marca registra: `source`, `evidence`, `confidence`, `author`, `license`,
`origin`, `date`, `status`, `reviewState`. El vocabulario de `status` es único en todo el producto
(se reutiliza también para tokens y para candidatos futuros):

```text
official | observed | inferred | generated | placeholder | user-confirmed
```

**Regla dura**: un valor observado en un sitio web, una captura o un documento externo es `observed` o
`inferred` hasta que el usuario lo confirme explícitamente (`user-confirmed`). Nunca se presenta como
`official` sin esa confirmación.

## Relación entre branding y tokens

No todo el Brand System se convierte en tokens. La frontera:

```text
Brand strategy               → documentación estructurada (brand/**)
Visual brand decisions       → tokens (brandRole:"brand") y assets (007)
Component behavior           → component definitions (012+)
Composition                  → patterns y templates (013+)
```

Ver la tabla de ejemplos completa en
[complete-design-system-model.md](complete-design-system-model.md#relación-entre-branding-y-tokens-frontera-no-ambigüedad).

## Brand tokens — política

Los brand tokens son **primitivos** con el rol adicional `brandRole: "brand"` (ver
`contracts/token-layer-policy.md` de `011`) — no un cuarto documento DTCG separado, no un cuarto tipo de
capa estructural. Ejemplos: `color.brand.primary`, `color.brand.secondary`, `typography.brand.heading`,
`shape.brand.radius`, `motion.brand.duration`, `opacity.brand.overlay`.

**Flujo obligatorio**:

```text
brand primitive (color.brand.primary)
   → semantic role (color.semantic.action.primary)
      → component token (component.button.primary.background.default)
```

Los component tokens **nunca** deben referenciar un brand primitive directo — ver regla R2 de
`contracts/token-layer-policy.md` (warning `brand-token-bypasses-semantic`). Esto evita que todos los
componentes queden acoplados directamente a decisiones de marca, preservando la capa `semantic` como
punto único de cambio.

## Asset intake protocol (branding incompleto)

Cuando falta un logo, isotipo, variante monocromática, variante para fondo oscuro, fuente, icono,
fotografía, ilustración o manual de marca, el agente/CLI DEBE:

1. Buscar en el proyecto actual.
2. Buscar en el inventario del Asset Manager (`neuraz-ds asset list`, `007`).
3. Identificar qué falta específicamente.
4. Explicar por qué se necesita.
5. Solicitar archivo, ruta (absoluta o relativa) o URL de descarga directa.
6. Solicitar licencia y procedencia.
7. Generar un `asset import plan` (nunca escribir directo).
8. Presentar conflictos, duplicados, resultado de sanitización, licencia faltante y problemas de
   procedencia.
9. Aplicar (`asset import apply`) **solo** con aprobación explícita del usuario.
10. Registrar el vínculo con el Brand System (`BrandAssetReferenceV1`, validado contra el inventario
    real — nunca copiado).

**Nunca**: inventar un recurso oficial, asumir una licencia, descargar/redistribuir fuentes comerciales
sin autorización explícita. Los placeholders solo se usan con aprobación del usuario, marcados
explícitamente como temporales, y nunca se presentan como asset oficial de marca. (Este protocolo ya
está vigente como regla de sesión — ver memoria de feedback del proyecto — y se formaliza aquí como parte
del modelo de producto.)

## Estados de completitud

`BrandQualitySummaryV1.overallStatus`: `complete | partial | absent | placeholder | needs-user-input`.

- `absent`: no existe `design-system/brand/` (comportamiento de un proyecto `001`–`010` sin marca —
  nunca `invalid`).
- `placeholder`: existe la estructura (p. ej. desde `web-complete`) pero sin contenido real del usuario.
- `partial`/`complete`: derivado de cobertura de campos + assets requeridos resueltos (ver
  `data-model.md` de `011`).
- `needs-user-input`: hay campos que **requieren** una decisión humana antes de avanzar (p. ej. una
  variante de logo declarada `required: true` sin resolver).

## Compatibilidad

Un Design System `001`–`010` sin `design-system/brand/` sigue siendo válido; `brand` se reporta como
`absent` en Viewer/quality, nunca como error. Ver `FR-017`/`SC-003` de
`specs/011-complete-design-system-foundation-branding-and-presets/spec.md`.
