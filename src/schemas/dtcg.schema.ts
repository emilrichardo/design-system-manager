// T024 — JSON Schema 2020-12 del subconjunto DTCG 2025.10 soportado por `init`.
// Un nodo es un token (tiene `$value`) o un grupo (contiene otros nodos). Rechaza `$type`
// no soportado y propiedades extra. El `$value` de un token es:
//   - un objeto de color sRGB (valor concreto, DTCG 2025.10 Color Module), o
//   - una cadena (referencia/alias `{...}`; su formato/existencia/ciclos los valida el código).
// Un string hexadecimal plano NO es un valor de color concreto válido: lo rechaza el código.
export const dtcgSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://neuraz.dev/schemas/dtcg-tokens.json",
  title: "Minimal DTCG token document",
  type: "object",
  minProperties: 1,
  additionalProperties: { $ref: "#/$defs/node" },
  $defs: {
    type: { type: "string", enum: ["color"] },
    colorValue: {
      type: "object",
      additionalProperties: false,
      required: ["colorSpace", "components"],
      properties: {
        colorSpace: { const: "srgb" },
        components: {
          type: "array",
          minItems: 3,
          maxItems: 3,
          items: { type: "number", minimum: 0, maximum: 1 },
        },
        alpha: { type: "number", minimum: 0, maximum: 1 },
        hex: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" },
      },
    },
    node: {
      type: "object",
      if: { type: "object", required: ["$value"] },
      then: {
        properties: {
          // objeto de color sRGB o cadena de alias; el código distingue alias vs hex plano.
          $value: { anyOf: [{ type: "string" }, { $ref: "#/$defs/colorValue" }] },
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
