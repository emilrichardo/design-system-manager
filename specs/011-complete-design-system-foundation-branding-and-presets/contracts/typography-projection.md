# Contract: Typography Projection (Viewer) and Font Matching

**Feature**: `011` | Fixes: defecto observado en sesión de aceptación previa —
`renderTypography`/`ViewerTypographyEntryV1` atribuía `family=(none)` y `license=no-matching-asset` a
tokens `dimension` (font-size, line-height) que nunca deberían portar esos campos.

## Problem

La proyección actual de tipografía trata toda entrada bajo el grupo `typography.*` de forma homogénea,
sin distinguir tipo efectivo. Un token `typography.font-size.h1` (`dimension`) recibe los mismos campos
que `typography.font-family.heading` (`fontFamily`), mostrando valores vacíos/engañosos.

## Contract

`ViewerTypographyEntryV1` se **discrimina por tipo efectivo**:

```text
kind: "font-family" | "font-size" | "font-weight" | "line-height" | "letter-spacing" | "typography-composite"
```

| `kind` | Fields shown | Font matching applies? |
|---|---|---|
| `font-family` | `path`, `family` (resuelto), `matchedAssets: FontAssetMatchV1[]` | Sí |
| `font-size` / `line-height` / `letter-spacing` | `path`, `value` (dimension/number resuelto) | No — nunca `family`/`license` |
| `font-weight` | `path`, `value` | No |
| `typography-composite` (`$type: "typography"`) | Todos los sub-campos anteriores agregados, `matchedAssets` a partir de su `fontFamily` interno | Sí, derivado del sub-campo `fontFamily` |

### `FontAssetMatchV1`

| Field | Type | Notes |
|---|---|---|
| `logicalPath` | `string` | Asset real de `007` (`assets.json`). |
| `family`, `weight`, `style`, `format` | `string \| null` | Extraídos de la metadata del asset (`007`) — nunca del nombre de archivo únicamente. |
| `license` | `{status: "declared" \| "unspecified" \| "missing"; identifier: string \| null}` | Reutiliza exactamente `AssetLicenseV1` de `007`, sin duplicar el modelo. |
| `matchState` | `"matched" \| "no-candidates" \| "ambiguous"` | `"no-candidates"` reemplaza el actual `license=no-matching-asset` mal ubicado — y solo se calcula para `kind: "font-family"`/`"typography-composite"`. |

## Rules

1. **R1** — Ningún campo de matching de fuente (`family`, `matchedAssets`, `license`) se calcula ni se
   muestra para `kind` distinto de `font-family`/`typography-composite`.
2. **R2** — El matching busca en el inventario real de `007` (`asset list`); nunca inventa ni asume una
   fuente por convención de nombre sin verificar la metadata del asset importado.
3. **R3** — `matchState: "ambiguous"` cuando hay ≥2 assets con la misma family/weight/style (nunca se
   elige uno arbitrariamente sin señalarlo).

## Compatibility

Reutiliza `AssetLicenseV1`/`asset list` de `007` sin cambios en su contrato. Solo cambia la proyección del
Viewer (`009`, capa `application/viewer`), no el motor de tokens ni el Asset Manager.
