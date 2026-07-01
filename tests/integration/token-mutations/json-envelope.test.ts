// T041 (008) — TokenMutationJsonEnvelopeV1: parseable, formatVersion propio, paths lógicos (sin rutas
// absolutas), determinismo del serializer; y confirmación de que los formatVersion/contratos de
// `003`/`004`/`006`/`007` no cambiaron con la introducción de este envelope independiente.
import { describe, expect, it } from "vitest";
import { toTokenMutationInternalErrorEnvelope, toTokenMutationJsonEnvelope } from "../../../src/application/token-mutations/json/index.js";
import { serializeTokenMutationJsonV1 } from "../../../src/infrastructure/reporter/token-mutation-json-serializer.js";
import { planTokenMutation } from "../../../src/application/token-mutations/plan-token-mutation.js";
import { aliasedDoc, command, fakeSnapshot, sourceFrom, stubSerialize } from "../../application/token-mutations/fixtures.js";
import { JSON_FORMAT_VERSION } from "../../../src/application/json/format-version.js";
import { FOUNDATIONS_JSON_FORMAT_VERSION } from "../../../src/application/foundations/json/format-version.js";
import { serializeBuildJsonV1 } from "../../../src/infrastructure/reporter/build-json-serializer.js";
import { buildInternalErrorJsonEnvelope } from "../../../src/application/build-export/build-json/map-build.js";
import { PRESETS_JSON_FORMAT_VERSION } from "../../../src/application/presets/json/format-version.js";

describe("TokenMutationJsonEnvelopeV1 (T041)", () => {
  it("planned: parseable, formatVersion propio, command token-plan, sin paths absolutos", async () => {
    const r = await planTokenMutation(
      { executionDir: "/x" },
      command({ kind: "rename-token", path: "color.brand.500", newName: "primary" }),
      { snapshot: fakeSnapshot(sourceFrom(aliasedDoc())), serialize: stubSerialize },
    );
    const env = toTokenMutationJsonEnvelope("token-plan", r);
    expect(env.formatVersion).toBe("1.0.0");
    expect(env.command).toBe("token-plan");
    expect(env.outcome).toBe("planned");
    const text = serializeTokenMutationJsonV1(env);
    expect(() => JSON.parse(text)).not.toThrow();
    expect(text).not.toMatch(/\/(Users|home|Volumes)\//);
    expect(text).toContain('"logicalPath": "design-system/tokens/base.tokens.json"');
  });

  it("conflict/invalid-command: result no null, conflicts mapeados con dependents", async () => {
    const r = await planTokenMutation({ executionDir: "/x" }, command({ kind: "remove-token", path: "color.brand.500" }), {
      snapshot: fakeSnapshot(sourceFrom(aliasedDoc())),
      serialize: stubSerialize,
    });
    const env = toTokenMutationJsonEnvelope("token-plan", r);
    expect(env.outcome).toBe("conflict");
    expect(env.result?.conflicts.some((c) => c.code === "removal-with-dependents" && c.dependents.includes("accent"))).toBe(true);
  });

  it("internal-error: envelope propio con result null", () => {
    const env = toTokenMutationInternalErrorEnvelope("token-apply");
    expect(env).toMatchObject({ formatVersion: "1.0.0", command: "token-apply", outcome: "internal-error", result: null });
    expect(env.error?.message).not.toMatch(/\/(Users|home|Volumes)\//);
  });

  it("serializer determinista: 2 espacios, LF final único, mismo input → mismos bytes", async () => {
    const r = await planTokenMutation({ executionDir: "/x" }, command({ kind: "update-value", path: "color.brand.500", value: "#000" }), {
      snapshot: fakeSnapshot(sourceFrom(aliasedDoc())),
      serialize: stubSerialize,
    });
    const env = toTokenMutationJsonEnvelope("token-plan", r);
    const a = serializeTokenMutationJsonV1(env);
    const b = serializeTokenMutationJsonV1(env);
    expect(a).toBe(b);
    expect(a).toContain('\n  "');
    expect(a.endsWith("}\n")).toBe(true);
    expect(a.endsWith("}\n\n")).toBe(false);
  });

  it("independiente de 003/004/006/007: sus formatVersion propios no cambiaron", () => {
    expect(JSON_FORMAT_VERSION).toBe("1.0.0");
    expect(FOUNDATIONS_JSON_FORMAT_VERSION).toBe("1.0.0");
    expect(PRESETS_JSON_FORMAT_VERSION).toBe("1.0.0");
    const buildEnvelope = buildInternalErrorJsonEnvelope();
    expect(buildEnvelope.command).toBe("build");
    expect(serializeBuildJsonV1(buildEnvelope)).toContain('"formatVersion": "1.0.0"');
  });
});
