# Quickstart: Complete Design System Foundation, Branding and Presets

**Feature**: `011` | Válido **una vez implementados** los checkpoints A–F (`011` en sí misma no
implementa código; esta guía documenta el flujo objetivo para validar la implementación futura).

## 1. Aplicar el preset completo

```bash
npx neuraz-ds presets plan web-complete    # preview: 0 escrituras
npx neuraz-ds presets apply web-complete   # atómico, add-only
npx neuraz-ds presets apply web-complete   # segunda vez -> unchanged (exit 2)
```

## 2. Verificar calidad general

```bash
npx neuraz-ds validate --json      # 0 errors; 0 dtcg-type-not-deeply-inspected
npx neuraz-ds foundations --json   # cobertura primitive/semantic/component por categoría
npx neuraz-ds quality --json       # (nuevo) brand completeness, asset completeness, provenance
```

Resultado esperado tras `web-complete`: `brand.overallStatus = "placeholder"`, `0` tokens
`unclassified`, `0` aliases rotos.

## 3. Completar el Brand System

```bash
npx neuraz-ds brand set name "Eurotech"
npx neuraz-ds brand set purpose "..."
npx neuraz-ds brand principle add --statement "Confiable, técnica y directa" --source user-confirmed
```

O equivalentemente desde el Editor visual (`neuraz-ds view` → "Enter edit mode" → sección Brand).

## 4. Vincular assets ya importados

```bash
npx neuraz-ds asset import plan ./logo-primary.svg
npx neuraz-ds asset import apply ./logo-primary.svg --license proprietary-acme
npx neuraz-ds brand asset link logos/logo-primary.svg --role primary
```

Si falta una variante requerida (p. ej. `monochrome`), `quality` la reporta explícitamente — nunca se
autogenera.

## 5. Aplicar un pack

```bash
npx neuraz-ds presets apply web-complete    # prerequisito
npx neuraz-ds packs apply commerce
npx neuraz-ds packs apply commerce          # segunda vez -> unchanged
```

## 6. Crear y trazar un component token

```bash
npx neuraz-ds token create component.button.primary.background.default \
  --type color --value '{color.semantic.action.primary}' \
  --layer component --component button --part background --variant primary --state default
```

En el Viewer (`components` view): seguir la cadena
`component.button.primary.background.default → color.semantic.action.primary → color.brand.primary →
color.base.gray-10`, con la `layer` de cada salto visible.

## 7. Verificar compatibilidad hacia atrás

```bash
cd un-proyecto-001-a-010-sin-brand/
npx neuraz-ds validate --json    # debe comportarse exactamente igual que antes de 011
npx neuraz-ds view --json        # sección "brand": absent, mensaje explícito, nunca error
```

## 8. Build/export incluyendo brand documentation

```bash
npx neuraz-ds build --json
# artifacts esperados: tokens.css, tokens.resolved.json, tokens.ts, manifest.json (sin cambios de forma)
# + brand.json / brand documentation projection (segura, no todo el branding a CSS)
```
