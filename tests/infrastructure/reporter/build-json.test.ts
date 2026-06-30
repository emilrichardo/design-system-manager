// T106 (006) — Contrato y bytes de `BuildJsonEnvelopeV1`: orden de claves, null policy, artifacts sin
// bytes, conflicts, verification, recovery, error seguro, internal-error de adapter, serializer
// determinista (2 espacios + LF, sin BOM) y ausencia de markers internos.
import { describe, expect, it } from "vitest";
import { buildInternalErrorJsonEnvelope, mapBuildResultToJsonEnvelope } from "../../../src/application/build-export/build-json/map-build.js";
import { serializeBuildJsonV1 } from "../../../src/infrastructure/reporter/build-json-serializer.js";
import type { BuildOutcome } from "../../../src/domain/build-export/build-outcome.js";
import { buildResult } from "./build-reporter-fixtures.js";

const ROOT_KEYS = ["formatVersion", "command", "outcome", "source", "outputDirectory", "wrote", "outputAvailable", "artifacts", "manifest", "verification", "backupRelativePath", "recoveryRequired", "conflict", "error"];
const ALL: readonly BuildOutcome[] = ["built", "unchanged", "invalid-design-system", "unsupported-value", "conflict", "not-found", "read-error", "write-error", "verification-error"];

describe("BuildJsonEnvelopeV1 (T098/T106)", () => {
  it("mapea todas las variantes con formatVersion/command exactos", () => {
    for (const outcome of ALL) {
      const env = mapBuildResultToJsonEnvelope(buildResult(outcome));
      expect(env.formatVersion).toBe("1.0.0");
      expect(env.command).toBe("build");
      expect(env.outcome).toBe(outcome);
    }
  });

  it("orden de claves raíz exactamente contractual", () => {
    const text = serializeBuildJsonV1(mapBuildResultToJsonEnvelope(buildResult("built")));
    const positions = ROOT_KEYS.map((k) => text.indexOf(`"${k}"`));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it("null policy: campos no aplicables son null; artifacts es [] cuando no hay", () => {
    const env = mapBuildResultToJsonEnvelope(buildResult("not-found"));
    expect(env.source).toBeNull();
    expect(env.outputDirectory).toBeNull();
    expect(env.manifest).toBeNull();
    expect(env.verification).toBeNull();
    expect(env.conflict).toBeNull();
    expect(env.artifacts).toEqual([]);
  });

  it("artifacts incluyen metadata pero NO bytes", () => {
    const env = mapBuildResultToJsonEnvelope(buildResult("built"));
    expect(env.artifacts.map((a) => a.format)).toEqual(["css", "json", "typescript"]);
    for (const a of env.artifacts) {
      expect(a.contentHash).toMatch(/^[0-9a-f]{64}$/);
      expect("bytes" in a).toBe(false);
    }
  });

  it("conflict preserva código/path/format/severity/blocksWrite", () => {
    const env = mapBuildResultToJsonEnvelope(buildResult("conflict"));
    expect(env.conflict).toMatchObject({ code: "required-path-owned-by-unknown", path: "tokens.css", format: "css", severity: "error", blocksWrite: true });
  });

  it("verification-error conserva wrote:true, backup relativo y recoveryRequired:true", () => {
    const env = mapBuildResultToJsonEnvelope(buildResult("verification-error"));
    expect(env.outcome).toBe("verification-error");
    expect(env.wrote).toBe(true);
    expect(env.outputAvailable).toBe(true);
    expect(env.backupRelativePath).toBe(".neuraz-build-backup");
    expect(env.recoveryRequired).toBe(true);
    expect(env.verification?.status).toBe("failed");
  });

  it("write-error con restore fallido: outputAvailable false, backup retenido, recovery", () => {
    const env = mapBuildResultToJsonEnvelope(buildResult("write-error"));
    expect(env.wrote).toBe(false);
    expect(env.outputAvailable).toBe(false);
    expect(env.recoveryRequired).toBe(true);
    expect(env.backupRelativePath).toBe(".neuraz-build-backup");
  });

  it("internal-error envelope de adapter es seguro y genérico", () => {
    const env = buildInternalErrorJsonEnvelope();
    expect(env.outcome).toBe("internal-error");
    expect(env.wrote).toBe(false);
    expect(env.error?.code).toBe("internal-error");
  });

  it("serializer: 2 espacios, LF final único, sin BOM, parseable", () => {
    const text = serializeBuildJsonV1(mapBuildResultToJsonEnvelope(buildResult("built")));
    expect(text.endsWith("}\n")).toBe(true);
    expect(text.endsWith("}\n\n")).toBe(false);
    expect(text.startsWith("﻿")).toBe(false);
    expect(text).toContain('\n  "command": "build"');
    expect(() => JSON.parse(text)).not.toThrow();
  });

  it("determinismo: dos mapeos del mismo resultado → mismos bytes; no muta", () => {
    const r = buildResult("conflict");
    const a = serializeBuildJsonV1(mapBuildResultToJsonEnvelope(r));
    const b = serializeBuildJsonV1(mapBuildResultToJsonEnvelope(r));
    expect(a).toBe(b);
  });

  it("seguridad: sin markers internos en ningún envelope", () => {
    for (const outcome of ALL) {
      const text = serializeBuildJsonV1(mapBuildResultToJsonEnvelope(buildResult(outcome)));
      for (const marker of ["/Volumes/", "stack", "rawBytes", "decodedText", "parsedDocument", "Error:", "	cause", "hostname", "cwd"]) {
        expect(text.includes(marker)).toBe(false);
      }
    }
  });
});
