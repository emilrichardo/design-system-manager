import { describe, expect, it } from "vitest";
import { JSON_FORMAT_VERSION } from "../../../src/application/json/format-version.js";
import { toJsonInternalErrorEnvelope } from "../../../src/application/json/map-internal-error.js";
import { serializeJsonV1 } from "../../../src/infrastructure/reporter/json-serializer.js";
import { FOUNDATIONS_JSON_FORMAT_VERSION, toFoundationsInternalErrorEnvelope } from "../../../src/application/foundations/json/index.js";
import { serializeFoundationsJsonV1 } from "../../../src/infrastructure/reporter/foundations-json-serializer.js";

describe("003/004 JSON regression while adding preset JSON", () => {
  it("mantiene constantes y bytes del contrato JSON 003", () => {
    const envelope = toJsonInternalErrorEnvelope("validate");

    expect(JSON_FORMAT_VERSION).toBe("1.0.0");
    expect(serializeJsonV1(envelope)).toBe(`{
  "formatVersion": "1.0.0",
  "command": "validate",
  "outcome": "internal-error",
  "result": null,
  "error": {
    "code": "internal-cli-error",
    "message": "Ocurrió un error interno."
  }
}
`);
  });

  it("mantiene constantes y bytes del contrato foundations JSON 004", () => {
    const envelope = toFoundationsInternalErrorEnvelope("foundations");

    expect(FOUNDATIONS_JSON_FORMAT_VERSION).toBe("1.0.0");
    expect(serializeFoundationsJsonV1(envelope)).toBe(`{
  "formatVersion": "1.0.0",
  "command": "foundations",
  "outcome": "internal-error",
  "result": null,
  "error": {
    "code": "internal-cli-error",
    "message": "Ocurrió un error interno."
  }
}
`);
  });
});
