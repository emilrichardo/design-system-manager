// T110 (005) — Regresión de 003-json-output: la feature de presets NO altera los bytes del contrato JSON
// v1 de `validate --json` / `inspect --json`. Verifica determinismo byte-a-byte, invariantes de formato
// (2 espacios, newline final, sin BOM, sin ANSI), constantes del contrato y bytes exactos del envelope
// de error interno (lo que probaría una mutación del union `JsonCommand`).
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { JSON_FORMAT_VERSION } from "../../../src/application/json/format-version.js";
import { toJsonInternalErrorEnvelope } from "../../../src/application/json/map-internal-error.js";
import { serializeJsonV1 } from "../../../src/infrastructure/reporter/json-serializer.js";
import { ensureBuilt, runBinary } from "../../helpers/run-binary.js";
import { makeProject } from "../../helpers/ds-fixtures.js";
import type { TmpProject } from "../../helpers/tmp-project.js";

const ESC = String.fromCharCode(27); // secuencias ANSI comienzan con ESC
const BOM = String.fromCharCode(0xfeff);

const bag: TmpProject[] = [];
beforeAll(() => {
  ensureBuilt();
}, 180000);
afterEach(async () => {
  await Promise.all(bag.splice(0).map((p) => p.cleanup()));
});

describe("regression 003 — validate/inspect JSON byte-identity (T110)", () => {
  it.each(["validate", "inspect"] as const)("%s --json is deterministic and well-formed", async (command) => {
    const dir = await makeProject(bag);
    const a = await runBinary([command, "--json"], dir);
    const b = await runBinary([command, "--json"], dir);

    expect(a.code).toBe(0);
    expect(a.stderr).toBe("");
    // Determinismo byte-a-byte.
    expect(a.stdout).toBe(b.stdout);
    // Formato: 2 espacios de indentación, newline final único, sin BOM, sin ANSI.
    expect(a.stdout.endsWith("}\n")).toBe(true);
    expect(a.stdout.endsWith("}\n\n")).toBe(false);
    expect(a.stdout.startsWith(BOM)).toBe(false);
    expect(a.stdout.includes(ESC)).toBe(false);
    expect(a.stdout.startsWith('{\n  "formatVersion": "1.0.0",\n')).toBe(true);
    expect(JSON.parse(a.stdout)).toMatchObject({ formatVersion: "1.0.0", command, outcome: "valid" });
  });

  it("keeps the JSON v1 format version and the internal-error envelope bytes stable", () => {
    expect(JSON_FORMAT_VERSION).toBe("1.0.0");
    expect(serializeJsonV1(toJsonInternalErrorEnvelope("validate"))).toBe(`{
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
    expect(serializeJsonV1(toJsonInternalErrorEnvelope("inspect"))).toBe(`{
  "formatVersion": "1.0.0",
  "command": "inspect",
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
