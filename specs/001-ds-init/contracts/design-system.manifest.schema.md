# Contract — Design System Manifest (`design-system/design-system.json`)

Identidad canónica del Design System. Legible sin el gestor (Constitución XVII). **No contiene
valores visuales.**

## JSON Schema (draft 2020-12) — preliminar

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://neuraz.dev/schemas/design-system.manifest.json",
  "title": "Design System Manifest",
  "type": "object",
  "additionalProperties": false,
  "required": ["manifestSchemaVersion", "name", "slug", "version"],
  "properties": {
    "manifestSchemaVersion": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+\\.\\d+(?:-[0-9A-Za-z-.]+)?$"
    },
    "name": { "type": "string", "minLength": 1 },
    "slug": { "type": "string", "pattern": "^[a-z0-9]+(?:-[a-z0-9]+)*$" },
    "description": { "type": "string" },
    "version": {
      "type": "string",
      "description": "Versión SemVer del Design System.",
      "pattern": "^\\d+\\.\\d+\\.\\d+(?:-[0-9A-Za-z-.]+)?(?:\\+[0-9A-Za-z-.]+)?$"
    },
    "tokensDir": {
      "type": "string",
      "description": "Ruta relativa a las fuentes de tokens, si es necesaria."
    }
  }
}
```

## Ejemplo generado por `init`

```json
{
  "manifestSchemaVersion": "0.1.0",
  "name": "Acme Design System",
  "slug": "acme-design-system",
  "description": "Design System del proyecto Acme.",
  "version": "0.1.0",
  "tokensDir": "tokens"
}
```

## Reglas

- `slug` validado con la regex aprobada (ADR-0003).
- `version` por defecto `0.1.0`; debe cumplir SemVer (validado además con el paquete `semver`).
- La validación SemVer canónica (capa de dominio) prevalece sobre la `pattern` del schema, que es
  un filtro de forma.
