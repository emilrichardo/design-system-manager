// T138 (006) — Niveles de verificación por separado: input (precondición del DS), candidate (conjunto
// recién renderizado antes de publicar) y post-publication (re-lectura del conjunto publicado). Además,
// la semántica de `verification-error` (T135): posterior al commit point con backup retenido y sin
// rollback automático.
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  verifyCandidate,
  verifyInput,
  verifyPostPublication,
  verificationErrorSemanticsHold,
  type ArtifactSetVerificationInput,
} from "../../../src/application/build-export/verification.js";
import { createArtifactSetWriter } from "../../../src/infrastructure/build-export/artifact-set-writer.js";
import { createBuildArtifact, type BuildArtifact } from "../../../src/domain/build-export/artifact.js";
import { artifactFilename } from "../../../src/domain/build-export/build-format.js";
import { BUILD_MANIFEST_FILENAME, BUILD_OUTPUT_ROOT, type BuildManifestV1 } from "../../../src/domain/build-export/build-manifest.js";
import { sha256Hex } from "../../../src/infrastructure/build-export/hash.js";
import { serializeBuildManifestV1 } from "../../../src/infrastructure/build-export/json-renderer.js";
import { createTmpProject, writeFileIn, type TmpProject } from "../../helpers/tmp-project.js";
import { failingFs, makeRequest } from "../../helpers/writer-fakes.js";

const enc = (s: string): Uint8Array => new TextEncoder().encode(s);

function artifact(format: "css" | "json" | "typescript", text: string): BuildArtifact {
  const bytes = enc(text);
  return createBuildArtifact({ format, relativePath: artifactFilename(format), contentType: "text/plain", bytes, contentHash: sha256Hex(bytes) });
}

function validSet(): ArtifactSetVerificationInput {
  const artifacts = [
    artifact("css", ":root {\n  --color-x: #fff;\n}\n"),
    artifact("json", '{\n  "formatVersion": "1.0.0"\n}\n'),
    artifact("typescript", "export const tokens = {} as const;\n"),
  ];
  const manifest: BuildManifestV1 = {
    formatVersion: "1.0.0",
    source: "design-system/tokens/base.tokens.json",
    sourceHash: "a".repeat(64),
    artifacts: artifacts.map((a) => ({ format: a.format, relativePath: a.relativePath, contentHash: a.contentHash, byteLength: a.byteLength })),
  };
  const manifestBytes = serializeBuildManifestV1(manifest);
  const manifestHash = sha256Hex(manifestBytes);
  return {
    artifacts,
    manifest: { relativePath: BUILD_MANIFEST_FILENAME, bytes: manifestBytes, contentHash: manifestHash, byteLength: manifestBytes.byteLength },
    expected: {
      artifacts: Object.fromEntries(artifacts.map((a) => [a.relativePath, { contentHash: a.contentHash, byteLength: a.byteLength }])),
      manifest: { contentHash: manifestHash, byteLength: manifestBytes.byteLength },
    },
  };
}

describe("verification — input level (T132)", () => {
  it("DS válido sin errores → passed, no bloquea el render", () => {
    const r = verifyInput({ designSystemValid: true, aliasErrors: 0, typeErrors: 0, foundationErrors: 0, limitsHit: false });
    expect(r.verification.status).toBe("passed");
    expect(r.blocksRender).toBe(false);
  });

  it("alias inválido → failed y bloquea el render", () => {
    const r = verifyInput({ designSystemValid: true, aliasErrors: 1, typeErrors: 0, foundationErrors: 0, limitsHit: false });
    expect(r.verification.status).toBe("failed");
    expect(r.blocksRender).toBe(true);
    expect(r.verification.checks[0]?.code).toBe("input-verification-failed");
  });
});

describe("verification — candidate level (T133)", () => {
  it("conjunto coherente y bien formado → passed", () => {
    const v = verifyCandidate(validSet());
    expect(v.status).toBe("passed");
    expect(v.checks.map((c) => c.kind)).toEqual(["css", "json", "typescript", "build-manifest"]);
  });

  it("hash inesperado de un artifact → failed", () => {
    const input = validSet();
    const tampered: ArtifactSetVerificationInput = {
      ...input,
      expected: { ...input.expected, artifacts: { ...input.expected.artifacts, "tokens.css": { contentHash: "0".repeat(64), byteLength: 1 } } },
    };
    const v = verifyCandidate(tampered);
    expect(v.status).toBe("failed");
    expect(v.checks.find((c) => c.kind === "css")?.code).toBe("artifact-hash-mismatch");
  });

  it("CSS con @import (runtime import) → failed estructural", () => {
    const input = validSet();
    const badCss = artifact("css", ':root {}\n@import "x.css";\n');
    const broken: ArtifactSetVerificationInput = {
      ...input,
      artifacts: input.artifacts.map((a) => (a.format === "css" ? badCss : a)),
      expected: { ...input.expected, artifacts: { ...input.expected.artifacts, "tokens.css": { contentHash: badCss.contentHash, byteLength: badCss.byteLength } } },
    };
    const v = verifyCandidate(broken);
    expect(v.checks.find((c) => c.kind === "css")?.code).toBe("artifact-structure-invalid");
  });
});

describe("verification — post-publication level (T134)", () => {
  it("mismas comprobaciones estructurales tras publicar → passed", () => {
    expect(verifyPostPublication(validSet()).status).toBe("passed");
  });

  it("TypeScript con import en runtime → failed", () => {
    const input = validSet();
    const badTs = artifact("typescript", 'import x from "y";\nexport const tokens = {} as const;\n');
    const broken: ArtifactSetVerificationInput = {
      ...input,
      artifacts: input.artifacts.map((a) => (a.format === "typescript" ? badTs : a)),
      expected: { ...input.expected, artifacts: { ...input.expected.artifacts, "tokens.ts": { contentHash: badTs.contentHash, byteLength: badTs.byteLength } } },
    };
    expect(verifyPostPublication(broken).checks.find((c) => c.kind === "typescript")?.code).toBe("artifact-structure-invalid");
  });
});

describe("verification-error semantics (T135)", () => {
  let project: TmpProject;
  beforeEach(async () => {
    project = await createTmpProject();
  });
  afterEach(async () => {
    await project.cleanup();
  });

  it("verificación post-commit fallida ⇒ verification-error con backup retenido, sin rollback", async () => {
    await writeFileIn(project.dir, `${BUILD_OUTPUT_ROOT}/manifest.json`, "{}");
    await writeFileIn(project.dir, `${BUILD_OUTPUT_ROOT}/tokens.css`, "OLD");
    const corruptTarget = join(project.dir, BUILD_OUTPUT_ROOT, "tokens.css");
    const fs = failingFs(undefined, { readFile: (p) => (p === corruptTarget ? enc("CORRUPT") : undefined) });
    const r = await createArtifactSetWriter(project.dir, fs).write(makeRequest());

    expect(r.outcome).toBe("verification-error");
    expect(verificationErrorSemanticsHold(r)).toBe(true);
    expect(r.backupRelativePath).toBe("design-system/build.backup");
    expect((await readdir(join(project.dir, "design-system"))).sort()).toContain("build.backup");
  });
});
