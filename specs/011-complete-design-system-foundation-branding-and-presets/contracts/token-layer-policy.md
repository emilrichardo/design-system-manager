# Contract: Token Layer Policy

**Feature**: `011` | Applies to: `token create/update` shorthands, `token plan/apply` (`008`), `foundations` (`004`), Viewer `components`/`quality` views (`009`, extended).

## Layers

```text
primitive/brand → semantic → component
```

- **`primitive`**: valor concreto, no depende de otro token. Puede portar `brandRole: "brand"` como
  metadata adicional (no cambia su naturaleza estructural de primitivo).
- **`semantic`**: alias (directo o encadenado) que resuelve a un `primitive`. Expresa un **rol de uso**
  (`action.primary`, `text.secondary`), nunca un valor de marca directo.
- **`component`**: alias (directo o encadenado) que resuelve a través de un `semantic`. Expresa
  `component/part/variant/state/size`.

## Rules

1. **R1 — Un token declara como máximo una `layer`.** No existe superposición `semantic`+`component`.
2. **R2 — Un `component` token NUNCA debe aliasar directo a un `primitive`.** Debe pasar por al menos un
   `semantic`. Violarlo produce el warning `brand-token-bypasses-semantic` si el primitivo tiene
   `brandRole: "brand"`, o `component-token-bypasses-semantic` en caso general. **Warning, no error** en
   `011` (para no romper `001`–`010` retroactivamente); candidato a error duro en una feature futura tras
   ADR.
3. **R3 — La `layer` NUNCA se infiere del path.** `color.brand.primary` sin metadata `layer` explícita se
   trata como `primitive` sin rol de marca (comportamiento `001`–`010` sin cambios); solo con
   `$extensions["ar.neuraz.design-system"].layer` declarado se activa la política de capas.
4. **R4 — Ausencia de metadata de capa nunca invalida un Design System.** Es warning informativo
   (`token-layer-unclassified`), igual severidad que `dtcg-description-missing` hoy.
5. **R5 — Los campos `component/part/variant/state/size` solo se leen cuando `layer: "component"`.** En
   cualquier otro caso se ignoran (no se valida su forma), preservando compatibilidad hacia atrás.

## Error/warning vocabulary (nuevo, aditivo — no reemplaza códigos existentes)

| Code | Severity | Meaning |
|---|---|---|
| `token-layer-unclassified` | warning | Token sin `layer` declarada; foundations lo sigue tratando como hoy. |
| `component-token-bypasses-semantic` | warning | Alias `component → primitive` directo. |
| `brand-token-bypasses-semantic` | warning | Alias `component → primitive(brandRole=brand)` directo. |
| `token-layer-invalid` | error | Valor de `layer` fuera del enum (`primitive/semantic/component`). |

## Non-goals of this contract

- No define anatomy/parts/slots completos por componente (ver `012`).
- No convierte `R2` en bloqueante — eso requiere una decisión de gobernanza futura documentada como ADR.
