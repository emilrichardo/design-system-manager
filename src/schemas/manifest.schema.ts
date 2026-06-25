// T023 — JSON Schema 2020-12 del manifiesto (contracts/design-system.manifest.schema.md).
// Objeto TS (ver nota en config.schema.ts). Las reglas estrictas de slug/SemVer las impone
// además el dominio (fuente única de verdad) en los validadores zod.
export const manifestSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://neuraz.dev/schemas/design-system.manifest.json",
  title: "Design System Manifest",
  type: "object",
  additionalProperties: false,
  required: ["manifestSchemaVersion", "name", "slug", "version"],
  properties: {
    manifestSchemaVersion: {
      type: "string",
      pattern: "^\\d+\\.\\d+\\.\\d+(?:-[0-9A-Za-z-.]+)?$",
    },
    name: { type: "string", minLength: 1 },
    slug: { type: "string", pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" },
    description: { type: "string" },
    version: {
      type: "string",
      pattern: "^\\d+\\.\\d+\\.\\d+(?:-[0-9A-Za-z-.]+)?(?:\\+[0-9A-Za-z-.]+)?$",
    },
    tokensDir: { type: "string" },
  },
};
