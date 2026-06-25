# Contract — Minimal DTCG Token Document (`design-system/tokens/base.tokens.json`)

Documento de tokens **DTCG 2025.10** mínimo y válido creado por `init`. Propósito: demostrar la
estructura canónica y servir de comprobación de que la validación funciona. **No** es una identidad
visual completa ni una paleta extensa.

## Qué demuestra (y por qué exactamente esto)

- **Un grupo** (`color`) con `$type` a nivel de grupo (herencia de tipo) → demuestra grupos +
  `$type`.
- **Un token base** con `$value` y `$description` → demuestra valores y documentación.
- **Un token semántico aliased** que referencia al base con `{color.base.blue-500}` → demuestra
  **alias/referencia** válida y resolución futura por herramientas compatibles.

Es el conjunto más pequeño que cubre simultáneamente: grupo, `$type`, `$value`, `$description` y un
alias, sin introducir ambigüedad ni inventar una paleta.

## Contenido propuesto

```json
{
  "color": {
    "$type": "color",
    "base": {
      "blue-500": {
        "$value": {
          "colorSpace": "srgb",
          "components": [0.231372549, 0.509803922, 0.964705882],
          "alpha": 1,
          "hex": "#3b82f6"
        },
        "$description": "Color base de ejemplo (azul 500). Reemplazar por la paleta real del proyecto."
      }
    },
    "brand": {
      "primary": {
        "$value": "{color.base.blue-500}",
        "$description": "Color de marca primario, definido como alias del color base."
      }
    }
  }
}
```

## Notas de conformidad DTCG 2025.10

- `$type: "color"` se hereda por los tokens del grupo `color` (incluye subgrupos `base` y `brand`).
- El alias usa la sintaxis de referencia `{ruta.al.token}` del estándar.
- **Representación del color (DTCG 2025.10 Color Module)**: un valor concreto de color es un
  **objeto** con `colorSpace` (`srgb`), `components` (3 números en `[0,1]`), `alpha` opcional en
  `[0,1]` y `hex` opcional (`#RRGGBB`) como fallback. Un **string hexadecimal plano NO** es un
  valor de color concreto válido; las cadenas solo se admiten como alias `{...}`.
- Las extensiones propias, si llegaran a necesitarse, irán bajo `$extensions` (Constitución III).

## Validación

- Validado con `ajv` (JSON Schema 2020-12) contra el subconjunto DTCG soportado **antes** de
  escribir y **después** de escribir (relectura). Una referencia inexistente, un ciclo o un
  `$type` no soportado ⇒ error crítico que impide la escritura (FR-008, FR-017, Constitución VIII).
