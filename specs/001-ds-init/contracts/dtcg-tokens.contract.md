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
        "$value": "#3b82f6",
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
- **Representación del color**: se usa la forma hex string por máxima compatibilidad de
  herramientas actuales. La eventual migración a la forma de objeto de color
  (`{ "colorSpace": "...", "components": [...] }`) de 2025.10 es una decisión de la fase de
  validación/generación (ADR-0004 / próxima spec), no de `init`.
- Las extensiones propias, si llegaran a necesitarse, irán bajo `$extensions` (Constitución III).

## Validación

- Validado con `ajv` (JSON Schema 2020-12) contra el subconjunto DTCG soportado **antes** de
  escribir y **después** de escribir (relectura). Una referencia inexistente, un ciclo o un
  `$type` no soportado ⇒ error crítico que impide la escritura (FR-008, FR-017, Constitución VIII).
