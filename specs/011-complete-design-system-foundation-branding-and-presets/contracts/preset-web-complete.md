# Contract: `web-complete` Preset and Packs

**Feature**: `011` | Extends: `005-presets` (catálogo empaquetado, merge add-only, atómico — motor sin
cambios).

## Identity

| Field | Value |
|---|---|
| `id` | `web-complete` |
| `version` | `1.0.0` |
| `categories` | `color, spacing, sizing, radius, border, shadow, typography, motion, opacity, z-index, breakpoints, layout, focus` (foundations) + component tokens del catálogo mínimo (ver abajo) + placeholders de brand |
| `basePresetId` | ninguno (es un preset base, igual que `neutral-base`) |

`neutral-base` (`1.0.0`) se conserva sin cambios de contrato — sigue siendo el preset mínimo y
compatible; `web-complete` no lo reemplaza ni lo deprecia.

## Contents

### Foundations (primitive + semantic)

Cobertura completa de las 9 categorías foundation ya reconocidas por `004`
(`color, spacing, typography, radius, border, shadow, opacity, sizing, motion`) más las extensiones
mencionadas en el brief (`z-index, breakpoints, layout, focus`) modeladas como grupos `sizing`/`number`
dentro del mismo documento de tokens (no se crea una décima categoría foundation en `011`; se documenta
como extensión de `sizing`/`motion` existentes, evitando ambigüedad de alcance en `004`).

### Semantic roles (mínimo)

```text
canvas, background, surface, raised, overlay, inverse,
text, icon, border, action, link, focus, selection, disabled, status
```

Cada rol semántico alias-referencia un primitivo (`layer: "semantic"`).

### Component tokens (catálogo mínimo — solo combinaciones relevantes, nunca cartesiano completo)

```text
button, link, input, textarea, select, checkbox, radio, switch, form-field,
card, badge, chip, alert, toast, dialog, drawer, tooltip, popover,
tabs, accordion, table, pagination, breadcrumb, avatar,
header, navigation, menu, dropdown, mega-menu, search,
skeleton, spinner, progress
```

Cada componente declara únicamente las combinaciones `part × variant × state × size` que tiene sentido
que tenga (p. ej. `spinner` no tiene `variant`; `button` no tiene `part` más allá de `container/label/
icon`). El catálogo exacto de combinaciones por componente se fija en la implementación (fuera de
`011`), no en este contrato — este contrato fija la **política** (R1 abajo), no la enumeración final.

### Brand placeholders (nunca una marca inventada)

`web-complete` incluye `design-system/brand/**` con:

- `brand.json`: todos los campos de `BrandProfileV1` en `null`/`[]`, `status: "placeholder"`.
- `voice-and-tone.json`, `visual-language.json`, `usage-guidelines.json`: estructura vacía válida.
- `BrandQualitySummaryV1.overallStatus` resultante: `"placeholder"` (nunca `"complete"` ni `"absent"` —
  el archivo existe pero está deliberadamente vacío, a la espera del usuario).

## Packs

| Pack | `basePresetId` | Adds |
|---|---|---|
| `commerce` | `web-complete` | `product-card, product-image, product-title, price, previous-price, discount-badge, stock-status, quantity-selector, cart-item, category-card, promotional-banner, product-gallery, filter-control, sort-control, purchase-action` |
| `dashboard` | `web-complete` | Reservado — catálogo a definir en `012`/implementación; **no** se enumera aquí para no fijar un contrato sin evidencia (evita `[NEEDS CLARIFICATION]` fingiendo certeza). |
| `institutional` | `web-complete` | Reservado — idem `dashboard`. |

## Rules

1. **R1 — No combinatoria cartesiana inútil.** Un pack/preset nunca genera automáticamente el producto
   cartesiano de variantes×estados×tamaños; cada combinación debe estar declarada explícitamente en el
   catálogo empaquetado.
2. **R2 — Packs son add-only sobre `web-complete`**, nunca sobre `neutral-base` ni un Design System
   arbitrario sin `web-complete` ya aplicado (evita estados intermedios ambiguos).
3. **R3 — Idempotencia y atomicidad** — idéntico comportamiento a `005-presets` (aplicar dos veces =
   `unchanged`; conflicto bloqueante nunca escribe parcialmente).
4. **R4 — Quality gate**: aplicar `web-complete` sobre un Design System vacío DEBE producir `0`
   `unclassified/unresolved-alias/broken-alias/unknown-type/dtcg-type-not-deeply-inspected` (`SC-001` de
   `spec.md`). El brand `placeholder` cuenta como estado explícito válido, no como issue.

## Out of scope

- Enumeración final de combinaciones por componente (implementación).
- Contenido real de `dashboard`/`institutional` (implementación futura, ver roadmap `012`+).
