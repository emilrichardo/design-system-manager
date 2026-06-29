import { describe, expect, it } from "vitest";
import { PRESETS_JSON_FORMAT_VERSION, toPresetsInternalErrorEnvelope, type PresetsJsonEnvelopeV1 } from "../../../src/application/presets/json/index.js";
import { PresetsJsonReporter } from "../../../src/infrastructure/reporter/presets-json-reporter.js";
import { serializePresetsJsonV1 } from "../../../src/infrastructure/reporter/presets-json-serializer.js";
import { undefinedPaths } from "../json/json-test-utils.js";
import { applyResult, presetEntry } from "./presets-test-fixtures.js";

function capture() {
  const out: string[] = [];
  const err: string[] = [];
  return { io: { out: (text: string) => out.push(text), err: (text: string) => err.push(text) }, out, err };
}

describe("Presets JSON DTO v1", () => {
  it("define envelope propio para list/inspect/plan/apply con orden de claves contractual", () => {
    const commands = ["preset-list", "preset-inspect", "preset-plan", "preset-apply"] as const;

    for (const command of commands) {
      const envelope: PresetsJsonEnvelopeV1<null> = {
        formatVersion: PRESETS_JSON_FORMAT_VERSION,
        command,
        outcome: "success",
        result: null,
        error: null,
      };

      expect(Object.keys(envelope)).toEqual(["formatVersion", "command", "outcome", "result", "error"]);
      expect(JSON.parse(serializePresetsJsonV1(envelope))).toEqual(envelope);
    }
  });

  it("aplica null policy, no emite undefined y usa serializer determinista con newline final", () => {
    const envelope: PresetsJsonEnvelopeV1<{ readonly items: readonly unknown[]; readonly record: Record<string, never>; readonly stable: null }> = {
      formatVersion: "1.0.0",
      command: "preset-plan",
      outcome: "not-found",
      result: { items: [], record: {}, stable: null },
      error: null,
    };

    const text = serializePresetsJsonV1(envelope);
    expect(text).toBe(serializePresetsJsonV1(envelope));
    expect(text.startsWith("{\n")).toBe(true);
    expect(text).toContain('\n  "command": "preset-plan"');
    expect(text.match(/\n+$/)?.[0]).toBe("\n");
    expect(text.charCodeAt(0)).not.toBe(0xfeff);
    expect(undefinedPaths(JSON.parse(text))).toEqual([]);
  });

  it("internal-error es seguro, va en envelope propio y conserva error como ultimo campo", () => {
    const envelope = toPresetsInternalErrorEnvelope("preset-apply");

    expect(envelope).toEqual({
      formatVersion: "1.0.0",
      command: "preset-apply",
      outcome: "internal-error",
      result: null,
      error: { code: "internal-cli-error", message: "Ocurrió un error interno." },
    });
    expect(Object.keys(envelope)).toEqual(["formatVersion", "command", "outcome", "result", "error"]);
    expect(JSON.stringify(envelope)).not.toMatch(/stack|cause|ENOENT|\/Users\//i);
  });

  it("PresetsJsonReporter escribe outcomes esperados a stdout e internal-error a stderr", () => {
    const expected = capture();
    const internal = capture();

    new PresetsJsonReporter(expected.io).listCompleted({ outcome: "success", presets: [presetEntry()], validation: null });
    new PresetsJsonReporter(expected.io).applyCompleted(applyResult());
    new PresetsJsonReporter(internal.io).internalError("preset-plan");

    expect(expected.err).toEqual([]);
    expect(expected.out).toHaveLength(2);
    expect(JSON.parse(expected.out[0]!).command).toBe("preset-list");
    expect(JSON.parse(expected.out[1]!).command).toBe("preset-apply");
    expect(internal.out).toEqual([]);
    expect(internal.err).toHaveLength(1);
    expect(JSON.parse(internal.err[0]!)).toMatchObject({ command: "preset-plan", outcome: "internal-error" });
  });
});
