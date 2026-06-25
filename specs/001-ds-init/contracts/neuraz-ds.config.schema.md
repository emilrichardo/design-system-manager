# Contract — Manager Config (`neuraz-ds.config.json`)

Configuración mínima del gestor en la raíz anfitriona. Su única función en esta fase es permitir
que futuras ejecuciones (validate/inspect/dev/Studio/MCP) **localicen** el Design System. No
duplica los datos del manifiesto.

## JSON Schema (draft 2020-12) — preliminar

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://neuraz.dev/schemas/neuraz-ds.config.json",
  "title": "Neuraz DS Manager Config",
  "type": "object",
  "additionalProperties": false,
  "required": ["configSchemaVersion", "designSystemDir"],
  "properties": {
    "configSchemaVersion": {
      "type": "string",
      "description": "Versión SemVer del schema de configuración.",
      "pattern": "^\\d+\\.\\d+\\.\\d+(?:-[0-9A-Za-z-.]+)?$"
    },
    "designSystemDir": {
      "type": "string",
      "description": "Ruta relativa (POSIX) a la carpeta del Design System.",
      "minLength": 1
    },
    "formatVersion": {
      "type": "string",
      "description": "Versión del formato de tokens administrado (DTCG).",
      "default": "2025.10"
    }
  }
}
```

## Ejemplo generado por `init`

```json
{
  "configSchemaVersion": "0.1.0",
  "designSystemDir": "design-system",
  "formatVersion": "2025.10"
}
```

## Reglas

- `designSystemDir` debe ser una ruta **relativa** que resuelva dentro de la raíz anfitriona
  (ADR-0002). Rutas absolutas o que escapen ⇒ inválidas.
- Si ya existe un `neuraz-ds.config.json` válido ⇒ estado `complete`/`partial` (no se sobrescribe).
