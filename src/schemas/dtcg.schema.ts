// T024 — JSON Schema 2020-12 del subconjunto DTCG 2025.10 soportado por `init`.
// Un nodo es un token (tiene `$value`) o un grupo (contiene otros nodos). Rechaza `$type`
// no soportado y propiedades extra en tokens. Las referencias/ciclos los valida el código
// (no expresables en JSON Schema) en dtcg-validator.ts.
export const dtcgSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://neuraz.dev/schemas/dtcg-tokens.json",
  title: "Minimal DTCG token document",
  type: "object",
  minProperties: 1,
  additionalProperties: { $ref: "#/$defs/node" },
  $defs: {
    type: { type: "string", enum: ["color"] },
    node: {
      type: "object",
      if: { type: "object", required: ["$value"] },
      then: {
        properties: {
          $value: { type: "string", minLength: 1 },
          $type: { $ref: "#/$defs/type" },
          $description: { type: "string" },
        },
        required: ["$value"],
        additionalProperties: false,
      },
      else: {
        properties: {
          $type: { $ref: "#/$defs/type" },
          $description: { type: "string" },
        },
        additionalProperties: { $ref: "#/$defs/node" },
      },
    },
  },
};
