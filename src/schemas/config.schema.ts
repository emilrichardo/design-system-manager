// T022 — JSON Schema 2020-12 de la configuración del gestor (contracts/neuraz-ds.config.schema.md).
// Se expone como objeto TS (en vez de .json) para que el build sea autosuficiente sin copiar
// assets; el contenido es idéntico al contrato. additionalProperties:false rechaza campos extra.
export const configSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://neuraz.dev/schemas/neuraz-ds.config.json",
  title: "Neuraz DS Manager Config",
  type: "object",
  additionalProperties: false,
  required: ["configSchemaVersion", "designSystemDir"],
  properties: {
    configSchemaVersion: {
      type: "string",
      pattern: "^\\d+\\.\\d+\\.\\d+(?:-[0-9A-Za-z-.]+)?$",
    },
    designSystemDir: { type: "string", minLength: 1 },
    formatVersion: { type: "string" },
  },
};
