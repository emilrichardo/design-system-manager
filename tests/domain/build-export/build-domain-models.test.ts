// T006 (006) — Invariantes de los modelos de dominio build-export: formatos, artifact, outcomes,
// recovery y verificación. Puro, sin filesystem.
import { describe, expect, it } from "vitest";
import {
  BUILD_FORMATS,
  artifactContentType,
  artifactFilename,
  isBuildFormat,
} from "../../../src/domain/build-export/build-format.js";
import { artifactMetadata, createBuildArtifact } from "../../../src/domain/build-export/artifact.js";
import {
  BUILD_OUTCOMES,
  EXPORT_OUTCOMES,
  recoveryInvariantHolds,
  wroteInvariantHolds,
} from "../../../src/domain/build-export/build-outcome.js";
import {
  VERIFICATION_CHECK_ORDER,
  orderVerificationChecks,
  type VerificationCheck,
} from "../../../src/domain/build-export/verification.js";

describe("BuildFormat (T001)", () => {
  it("orden canónico estable css/json/typescript", () => {
    expect(BUILD_FORMATS).toEqual(["css", "json", "typescript"]);
  });
  it("guard acepta los tres y rechaza desconocidos y `ts`", () => {
    expect(isBuildFormat("css")).toBe(true);
    expect(isBuildFormat("json")).toBe(true);
    expect(isBuildFormat("typescript")).toBe(true);
    expect(isBuildFormat("ts")).toBe(false);
    expect(isBuildFormat("manifest")).toBe(false);
    expect(isBuildFormat("CSS")).toBe(false);
    expect(isBuildFormat(undefined)).toBe(false);
  });
  it("filenames y content types deterministas", () => {
    expect(artifactFilename("css")).toBe("tokens.css");
    expect(artifactFilename("json")).toBe("tokens.resolved.json");
    expect(artifactFilename("typescript")).toBe("tokens.ts");
    expect(artifactContentType("json")).toContain("application/json");
  });
});

describe("BuildArtifact (T002)", () => {
  it("copia defensiva de bytes y byteLength coherente; metadata sin bytes", () => {
    const src = new Uint8Array([1, 2, 3]);
    const artifact = createBuildArtifact({ format: "css", relativePath: "tokens.css", contentType: "text/css", bytes: src, contentHash: "deadbeef" });
    src[0] = 99; // mutar la fuente no afecta al artefacto
    expect(Array.from(artifact.bytes)).toEqual([1, 2, 3]);
    expect(artifact.byteLength).toBe(3);
    const meta = artifactMetadata(artifact);
    expect(meta).toEqual({ format: "css", relativePath: "tokens.css", contentType: "text/css", contentHash: "deadbeef", byteLength: 3 });
    expect("bytes" in meta).toBe(false);
  });
});

describe("Outcomes (T003)", () => {
  it("build tiene 9 outcomes exactos y no incluye prohibidos", () => {
    expect(BUILD_OUTCOMES).toHaveLength(9);
    for (const forbidden of ["partial", "success", "blocked", "validation", "unexpected", "internal-error"]) {
      expect((BUILD_OUTCOMES as readonly string[]).includes(forbidden)).toBe(false);
    }
  });
  it("export tiene 5 outcomes exactos read-only", () => {
    expect(EXPORT_OUTCOMES).toEqual(["exported", "invalid-design-system", "unsupported-value", "not-found", "read-error"]);
  });
  it("invariante de wrote por outcome", () => {
    expect(wroteInvariantHolds("built", true)).toBe(true);
    expect(wroteInvariantHolds("built", false)).toBe(false);
    expect(wroteInvariantHolds("unchanged", false)).toBe(true);
    expect(wroteInvariantHolds("unchanged", true)).toBe(false);
    expect(wroteInvariantHolds("verification-error", true)).toBe(true);
    expect(wroteInvariantHolds("conflict", false)).toBe(true);
  });
  it("invariante de recovery: verification-error y write-error", () => {
    expect(recoveryInvariantHolds("verification-error", { outputAvailable: true, backupRelativePath: ".bak", recoveryRequired: true })).toBe(true);
    expect(recoveryInvariantHolds("verification-error", { outputAvailable: true, backupRelativePath: null, recoveryRequired: true })).toBe(false);
    // write-error antes de mover build:
    expect(recoveryInvariantHolds("write-error", { outputAvailable: true, backupRelativePath: null, recoveryRequired: false })).toBe(true);
    // write-error con restore catastrófico:
    expect(recoveryInvariantHolds("write-error", { outputAvailable: false, backupRelativePath: ".bak", recoveryRequired: true })).toBe(true);
    expect(recoveryInvariantHolds("write-error", { outputAvailable: false, backupRelativePath: null, recoveryRequired: false })).toBe(false);
  });
});

describe("BuildVerification (T004)", () => {
  it("orden canónico de check kinds", () => {
    expect(VERIFICATION_CHECK_ORDER).toEqual(["source", "css", "json", "typescript", "build-manifest", "filesystem"]);
  });
  it("orderVerificationChecks ordena de forma estable", () => {
    const unordered: VerificationCheck[] = [
      { kind: "filesystem", status: "passed", code: null, message: null },
      { kind: "source", status: "passed", code: null, message: null },
      { kind: "json", status: "passed", code: null, message: null },
    ];
    expect(orderVerificationChecks(unordered).map((c) => c.kind)).toEqual(["source", "json", "filesystem"]);
  });
});
